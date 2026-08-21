import React, { FormEvent, useEffect, useState } from "react";
import {
  AffectationSuperviseur,
  chargerDonneesAffectations,
  cloturerAffectation,
  creerAffectation,
  DonneesAffectations,
  NouvelleAffectation,
  synchroniserSuperviseur,
} from "./assignments-data.js";

type EtatAffectations = { statut: "chargement" } | { statut: "erreur"; message: string } | { statut: "pret"; donnees: DonneesAffectations };
type PanneauAffectation = { type: "CREATION"; valeur: NouvelleAffectation } | { type: "CLOTURE"; affectationId: number; dateFin: string };

export function ModuleAffectations() {
  const [etat, setEtat] = useState<EtatAffectations>({ statut: "chargement" });
  const [tentative, setTentative] = useState(0);
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState("ACTIVES");
  const [superviseurFiltre, setSuperviseurFiltre] = useState(0);
  const [perimetreFiltre, setPerimetreFiltre] = useState(0);
  const [panneau, setPanneau] = useState<PanneauAffectation | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [synchronisation, setSynchronisation] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(null);

  useEffect(() => {
    let actif = true;
    setEtat({ statut: "chargement" });
    chargerDonneesAffectations()
      .then((donnees) => { if (actif) setEtat({ statut: "pret", donnees }); })
      .catch((erreur: unknown) => { if (actif) setEtat({ statut: "erreur", message: erreur instanceof Error ? erreur.message : "Les affectations n’ont pas pu être chargées." }); });
    return () => { actif = false; };
  }, [tentative]);

  if (etat.statut === "chargement") return <EtatAffectations texte="Chargement des affectations autorisées par Grist…" />;
  if (etat.statut === "erreur") return <EtatAffectations texte={etat.message} action={() => setTentative((valeur) => valeur + 1)} />;

  const { donnees } = etat;
  const rechercheNormalisee = recherche.trim().toLocaleLowerCase("fr");
  const affectations = donnees.affectations.filter((affectation) => {
    const correspondStatut = statut === "TOUTES" || (statut === "ACTIVES" ? affectation.actif : !affectation.actif);
    const texte = `${affectation.superviseur} ${affectation.email} ${affectation.perimetre} ${affectation.entite}`.toLocaleLowerCase("fr");
    return correspondStatut && (!superviseurFiltre || affectation.superviseurId === superviseurFiltre) && (!perimetreFiltre || affectation.perimetreId === perimetreFiltre) && (!rechercheNormalisee || texte.includes(rechercheNormalisee));
  });
  const superviseursDesynchronises = donnees.superviseurs.filter((superviseur) => !superviseur.synchronise);

  const ouvrirCreation = () => {
    const superviseurId = superviseurFiltre || donnees.superviseurs.find((superviseur) => superviseur.actif)?.id || 0;
    const perimetresDejaAffectes = new Set(donnees.affectations.filter((affectation) => affectation.actif && affectation.superviseurId === superviseurId).map((affectation) => affectation.perimetreId));
    const perimetreId = perimetreFiltre || donnees.perimetres.find((perimetre) => perimetre.actif && !perimetresDejaAffectes.has(perimetre.id))?.id || 0;
    setMessage(null);
    setPanneau({ type: "CREATION", valeur: {
      superviseurId,
      perimetreId,
      dateDebut: dateAujourdhui(),
    } });
  };
  const ouvrirCloture = (affectation: AffectationSuperviseur) => {
    setMessage(null); setPanneau({ type: "CLOTURE", affectationId: affectation.id, dateFin: dateAujourdhui() });
  };

  const soumettre = async (event: FormEvent) => {
    event.preventDefault();
    if (!panneau) return;
    setEnregistrement(true); setMessage(null);
    try {
      if (panneau.type === "CREATION") await creerAffectation(panneau.valeur, donnees);
      else await cloturerAffectation(panneau.affectationId, panneau.dateFin, donnees);
      setMessage({ type: "succes", texte: panneau.type === "CREATION" ? "L’affectation a été créée et les ACL ont été synchronisées." : "L’affectation a été clôturée et les ACL ont été synchronisées." });
      setPanneau(null); setTentative((valeur) => valeur + 1);
    } catch (erreur) {
      setMessage({ type: "erreur", texte: erreur instanceof Error ? erreur.message : "L’opération a échoué." });
    } finally { setEnregistrement(false); }
  };

  const synchroniser = async (superviseurId: number) => {
    setSynchronisation(superviseurId); setMessage(null);
    try {
      await synchroniserSuperviseur(superviseurId, donnees);
      setMessage({ type: "succes", texte: "Les périmètres supervisés ont été réalignés sur l’historique des affectations." });
      setTentative((valeur) => valeur + 1);
    } catch (erreur) {
      setMessage({ type: "erreur", texte: erreur instanceof Error ? erreur.message : "La synchronisation a échoué." });
    } finally { setSynchronisation(null); }
  };

  return (
    <section className="page-carte module-affectations" aria-labelledby="titre-affectations">
      <div className="entete-module"><div><p className="surtitre">Habilitations territoriales</p><h2 id="titre-affectations">Affectations des superviseurs</h2><p>Gérez les périodes de supervision. La table d’affectations constitue l’historique officiel et alimente automatiquement les ACL.</p></div><button type="button" onClick={ouvrirCreation}>Nouvelle affectation</button></div>

      <div className="synthese-affectations">
        <IndicateurAffectation valeur={donnees.affectations.filter((affectation) => affectation.actif).length} libelle="Affectations actives" />
        <IndicateurAffectation valeur={donnees.superviseurs.filter((superviseur) => superviseur.actif && superviseur.affectationsActives > 0).length} libelle="Superviseurs affectés" />
        <IndicateurAffectation valeur={superviseursDesynchronises.length} libelle="Synchronisations à corriger" alerte />
      </div>

      {message && <p className={`message-formulaire message-${message.type}`} role="status">{message.texte}</p>}
      {superviseursDesynchronises.length > 0 && <section className="alerte-synchronisation" aria-labelledby="titre-synchronisation"><h3 id="titre-synchronisation">Écart entre historique et ACL</h3><p>Les profils suivants ne contiennent pas la même liste de périmètres que leurs affectations actives.</p>{superviseursDesynchronises.map((superviseur) => <div key={superviseur.id}><span><strong>{superviseur.nom}</strong><small>{superviseur.email}</small></span><button type="button" onClick={() => synchroniser(superviseur.id)} disabled={synchronisation !== null}>{synchronisation === superviseur.id ? "Synchronisation…" : "Synchroniser"}</button></div>)}</section>}

      <div className="filtres-affectations">
        <label>Rechercher<input type="search" value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Superviseur, courriel ou périmètre" /></label>
        <label>Superviseur<select value={superviseurFiltre} onChange={(event) => setSuperviseurFiltre(Number(event.target.value))}><option value={0}>Tous</option>{donnees.superviseurs.map((superviseur) => <option value={superviseur.id} key={superviseur.id}>{superviseur.nom}</option>)}</select></label>
        <label>Périmètre<select value={perimetreFiltre} onChange={(event) => setPerimetreFiltre(Number(event.target.value))}><option value={0}>Tous</option>{donnees.perimetres.map((perimetre) => <option value={perimetre.id} key={perimetre.id}>{perimetre.nom}</option>)}</select></label>
        <label>Statut<select value={statut} onChange={(event) => setStatut(event.target.value)}><option value="ACTIVES">Actives</option><option value="CLOTUREES">Clôturées</option><option value="TOUTES">Toutes</option></select></label>
      </div>

      <div className={panneau ? "corps-affectations avec-formulaire" : "corps-affectations"}>
        <ListeAffectations affectations={affectations} cloturer={ouvrirCloture} />
        {panneau && <FormulaireAffectation panneau={panneau} setPanneau={setPanneau} donnees={donnees} soumettre={soumettre} fermer={() => setPanneau(null)} enregistrement={enregistrement} />}
      </div>
    </section>
  );
}

function IndicateurAffectation({ valeur, libelle, alerte = false }: { valeur: number; libelle: string; alerte?: boolean }) {
  return <div className={alerte && valeur ? "indicateur-affectation alerte" : "indicateur-affectation"}><strong>{valeur}</strong><span>{libelle}</span></div>;
}

function ListeAffectations({ affectations, cloturer }: { affectations: readonly AffectationSuperviseur[]; cloturer: (affectation: AffectationSuperviseur) => void }) {
  if (!affectations.length) return <p className="aucun-suivi">Aucune affectation ne correspond aux filtres sélectionnés.</p>;
  return <div className="liste-affectations">{affectations.map((affectation) => <article className="carte-affectation" key={affectation.id}><div className="titre-affectation"><div><h3>{affectation.superviseur}</h3><p>{affectation.email}</p></div><span className={affectation.actif ? "badge-statut statut-actif" : "badge-statut statut-inactif"}>{affectation.actif ? "Active" : "Clôturée"}</span></div><div className="perimetre-affectation"><strong>{affectation.perimetre}</strong><small>{affectation.entite}</small></div><dl><div><dt>Début</dt><dd>{affectation.dateDebut}</dd></div><div><dt>Fin</dt><dd>{affectation.dateFin}</dd></div></dl>{affectation.actif && <button className="bouton-secondaire" type="button" onClick={() => cloturer(affectation)}>Clôturer l’affectation</button>}</article>)}</div>;
}

function FormulaireAffectation({ panneau, setPanneau, donnees, soumettre, fermer, enregistrement }: { panneau: PanneauAffectation; setPanneau: (panneau: PanneauAffectation) => void; donnees: DonneesAffectations; soumettre: (event: FormEvent) => void; fermer: () => void; enregistrement: boolean }) {
  const affectation = panneau.type === "CLOTURE" ? donnees.affectations.find((element) => element.id === panneau.affectationId) : null;
  const changerSuperviseur = (superviseurId: number) => {
    if (panneau.type !== "CREATION") return;
    const dejaAffectes = new Set(donnees.affectations.filter((element) => element.actif && element.superviseurId === superviseurId).map((element) => element.perimetreId));
    const perimetreActuelDisponible = panneau.valeur.perimetreId && !dejaAffectes.has(panneau.valeur.perimetreId);
    const perimetreId = perimetreActuelDisponible ? panneau.valeur.perimetreId : donnees.perimetres.find((perimetre) => perimetre.actif && !dejaAffectes.has(perimetre.id))?.id || 0;
    setPanneau({ type: "CREATION", valeur: { ...panneau.valeur, superviseurId, perimetreId } });
  };
  return <aside className="panneau-utilisateur panneau-affectation" aria-labelledby="titre-formulaire-affectation"><div className="entete-panneau"><div><p className="surtitre">{panneau.type === "CREATION" ? "Création" : "Clôture"}</p><h3 id="titre-formulaire-affectation">{panneau.type === "CREATION" ? "Nouvelle affectation" : affectation?.superviseur}</h3></div><button className="fermer-panneau" type="button" onClick={fermer} aria-label="Fermer le formulaire">×</button></div><form className="formulaire-utilisateur" onSubmit={soumettre}>
    {panneau.type === "CREATION" ? <>
      <label>Superviseur<select value={panneau.valeur.superviseurId} onChange={(event) => changerSuperviseur(Number(event.target.value))} required><option value={0}>Sélectionner…</option>{donnees.superviseurs.filter((superviseur) => superviseur.actif).map((superviseur) => <option value={superviseur.id} key={superviseur.id}>{superviseur.nom}</option>)}</select></label>
      <label>Périmètre<select value={panneau.valeur.perimetreId} onChange={(event) => setPanneau({ type: "CREATION", valeur: { ...panneau.valeur, perimetreId: Number(event.target.value) } })} required><option value={0}>Sélectionner…</option>{donnees.perimetres.filter((perimetre) => perimetre.actif).map((perimetre) => <option value={perimetre.id} key={perimetre.id}>{perimetre.nom} · {perimetre.entite}</option>)}</select></label>
      <label>Date de début<input type="date" value={panneau.valeur.dateDebut} onChange={(event) => setPanneau({ type: "CREATION", valeur: { ...panneau.valeur, dateDebut: event.target.value } })} required /></label>
      <div className="encart-information"><strong>Synchronisation automatique</strong><p>Le périmètre sera ajouté à la liste `PerimetresSupervises` du profil.</p></div>
    </> : <>
      <div className="encart-information"><strong>{affectation?.perimetre}</strong><p>Début : {affectation?.dateDebut}</p></div>
      <label>Date de fin<input type="date" value={panneau.dateFin} onChange={(event) => setPanneau({ ...panneau, dateFin: event.target.value })} required /></label>
      <p className="alerte-desactivation">La ligne restera dans l’historique. Le périmètre sera retiré des ACL si aucune autre affectation active ne le justifie.</p>
    </>}
    <div className="actions-formulaire"><button className="bouton-secondaire" type="button" onClick={fermer}>Annuler</button><button type="submit" disabled={enregistrement}>{enregistrement ? "Enregistrement…" : panneau.type === "CREATION" ? "Créer l’affectation" : "Confirmer la clôture"}</button></div>
  </form></aside>;
}

function EtatAffectations({ texte, action }: { texte: string; action?: () => void }) {
  return <section className="page-carte etat-tableau" aria-live="polite"><p>{texte}</p>{action && <button type="button" onClick={action}>Réessayer</button>}</section>;
}

function dateAujourdhui(): string { return new Date().toISOString().slice(0, 10); }
