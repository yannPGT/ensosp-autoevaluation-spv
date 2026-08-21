import React, { FormEvent, useEffect, useState } from "react";
import {
  chargerDonneesTerritoires,
  DonneesTerritoires,
  enregistrerEntite,
  enregistrerPerimetre,
  EntiteAdministration,
  PerimetreAdministration,
  SaisieEntite,
  SaisiePerimetre,
} from "./territories-data.js";

type OngletTerritoire = "ENTITES" | "PERIMETRES";
type PanneauTerritoire = { type: "ENTITE"; valeur: SaisieEntite } | { type: "PERIMETRE"; valeur: SaisiePerimetre };
type EtatTerritoires = { statut: "chargement" } | { statut: "erreur"; message: string } | { statut: "pret"; donnees: DonneesTerritoires };

export function ModuleTerritoires() {
  const [etat, setEtat] = useState<EtatTerritoires>({ statut: "chargement" });
  const [tentative, setTentative] = useState(0);
  const [onglet, setOnglet] = useState<OngletTerritoire>("ENTITES");
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState("ACTIFS");
  const [entiteFiltre, setEntiteFiltre] = useState(0);
  const [panneau, setPanneau] = useState<PanneauTerritoire | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(null);

  useEffect(() => {
    let actif = true;
    setEtat({ statut: "chargement" });
    chargerDonneesTerritoires()
      .then((donnees) => { if (actif) setEtat({ statut: "pret", donnees }); })
      .catch((erreur: unknown) => { if (actif) setEtat({ statut: "erreur", message: erreur instanceof Error ? erreur.message : "Le référentiel territorial n’a pas pu être chargé." }); });
    return () => { actif = false; };
  }, [tentative]);

  if (etat.statut === "chargement") return <EtatTerritoires texte="Chargement des entités et périmètres autorisés par Grist…" />;
  if (etat.statut === "erreur") return <EtatTerritoires texte={etat.message} action={() => setTentative((valeur) => valeur + 1)} />;

  const { donnees } = etat;
  const rechercheNormalisee = recherche.trim().toLocaleLowerCase("fr");
  const correspondStatut = (actif: boolean) => statut === "TOUS" || (statut === "ACTIFS" ? actif : !actif);
  const entites = donnees.entites.filter((entite) => correspondStatut(entite.actif) && (!rechercheNormalisee || `${entite.code} ${entite.nom} ${entite.parent}`.toLocaleLowerCase("fr").includes(rechercheNormalisee)));
  const perimetres = donnees.perimetres.filter((perimetre) => correspondStatut(perimetre.actif) && (!entiteFiltre || perimetre.entiteId === entiteFiltre) && (!rechercheNormalisee || `${perimetre.code} ${perimetre.nom} ${perimetre.entite}`.toLocaleLowerCase("fr").includes(rechercheNormalisee)));

  const ouvrirEntite = (entite?: EntiteAdministration) => {
    setMessage(null);
    setPanneau({ type: "ENTITE", valeur: entite
      ? { id: entite.id, code: entite.code, nom: entite.nom, parentId: entite.parentId ?? 0, actif: entite.actif }
      : { code: "SIS_", nom: "", parentId: 0, actif: true } });
  };
  const ouvrirPerimetre = (perimetre?: PerimetreAdministration) => {
    const entiteId = perimetre?.entiteId || entiteFiltre || donnees.entites.find((entite) => entite.actif)?.id || 0;
    setMessage(null);
    setPanneau({ type: "PERIMETRE", valeur: perimetre
      ? { id: perimetre.id, code: perimetre.code, nom: perimetre.nom, entiteId, actif: perimetre.actif }
      : { code: "PER_", nom: "", entiteId, actif: true } });
  };

  const soumettre = async (event: FormEvent) => {
    event.preventDefault();
    if (!panneau) return;
    setEnregistrement(true);
    setMessage(null);
    try {
      if (panneau.type === "ENTITE") await enregistrerEntite(panneau.valeur, donnees);
      else await enregistrerPerimetre(panneau.valeur, donnees);
      setMessage({ type: "succes", texte: `${panneau.type === "ENTITE" ? "L’entité" : "Le périmètre"} a été ${panneau.valeur.id ? "mis à jour" : "créé"}.` });
      setPanneau(null);
      setTentative((valeur) => valeur + 1);
    } catch (erreur) {
      setMessage({ type: "erreur", texte: erreur instanceof Error ? erreur.message : "L’enregistrement a échoué." });
    } finally {
      setEnregistrement(false);
    }
  };

  const voirPerimetres = (entiteId: number) => {
    setOnglet("PERIMETRES"); setEntiteFiltre(entiteId); setRecherche(""); setStatut("TOUS"); setPanneau(null);
  };

  return (
    <section className="page-carte module-territoires" aria-labelledby="titre-territoires">
      <div className="entete-module"><div><p className="surtitre">Organisation territoriale</p><h2 id="titre-territoires">Entités et périmètres</h2><p>Administrez le référentiel des SIS et les zones utilisées par les ACL. Une ligne utilisée est désactivée, jamais supprimée.</p></div><button type="button" onClick={() => onglet === "ENTITES" ? ouvrirEntite() : ouvrirPerimetre()}>Ajouter {onglet === "ENTITES" ? "une entité" : "un périmètre"}</button></div>

      <div className="synthese-territoires">
        <IndicateurTerritoire valeur={donnees.entites.filter((entite) => entite.actif).length} libelle="Entités actives" />
        <IndicateurTerritoire valeur={donnees.perimetres.filter((perimetre) => perimetre.actif).length} libelle="Périmètres actifs" />
        <IndicateurTerritoire valeur={donnees.entites.filter((entite) => entite.actif && entite.perimetresActifs === 0).length} libelle="Entités sans périmètre actif" alerte />
      </div>

      {message && <p className={`message-formulaire message-${message.type}`} role="status">{message.texte}</p>}

      <div className="onglets-territoires" role="tablist" aria-label="Type de référentiel"><button type="button" role="tab" aria-selected={onglet === "ENTITES"} className={onglet === "ENTITES" ? "onglet-actif" : ""} onClick={() => { setOnglet("ENTITES"); setPanneau(null); }}>Entités <span>{donnees.entites.length}</span></button><button type="button" role="tab" aria-selected={onglet === "PERIMETRES"} className={onglet === "PERIMETRES" ? "onglet-actif" : ""} onClick={() => { setOnglet("PERIMETRES"); setPanneau(null); }}>Périmètres <span>{donnees.perimetres.length}</span></button></div>

      <div className="filtres-territoires">
        <label>Rechercher<input type="search" value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Code, nom ou rattachement" /></label>
        {onglet === "PERIMETRES" && <label>Entité<select value={entiteFiltre} onChange={(event) => setEntiteFiltre(Number(event.target.value))}><option value={0}>Toutes les entités</option>{donnees.entites.map((entite) => <option value={entite.id} key={entite.id}>{entite.nom}</option>)}</select></label>}
        <label>Statut<select value={statut} onChange={(event) => setStatut(event.target.value)}><option value="ACTIFS">Actifs</option><option value="INACTIFS">Inactifs</option><option value="TOUS">Tous</option></select></label>
      </div>

      <div className={panneau ? "corps-territoires avec-formulaire" : "corps-territoires"}>
        {onglet === "ENTITES" ? <ListeEntites entites={entites} modifier={ouvrirEntite} voirPerimetres={voirPerimetres} /> : <ListePerimetres perimetres={perimetres} modifier={ouvrirPerimetre} />}
        {panneau && <FormulaireTerritoire panneau={panneau} setPanneau={setPanneau} donnees={donnees} soumettre={soumettre} fermer={() => setPanneau(null)} enregistrement={enregistrement} />}
      </div>
    </section>
  );
}

function IndicateurTerritoire({ valeur, libelle, alerte = false }: { valeur: number; libelle: string; alerte?: boolean }) {
  return <div className={alerte && valeur ? "indicateur-territoire alerte" : "indicateur-territoire"}><strong>{valeur}</strong><span>{libelle}</span></div>;
}

function ListeEntites({ entites, modifier, voirPerimetres }: { entites: readonly EntiteAdministration[]; modifier: (entite: EntiteAdministration) => void; voirPerimetres: (id: number) => void }) {
  if (!entites.length) return <p className="aucun-suivi">Aucune entité ne correspond aux filtres sélectionnés.</p>;
  return <div className="liste-territoires">{entites.map((entite) => <article className="carte-territoire" key={entite.id}><div className="titre-territoire"><div><code>{entite.code}</code><h3>{entite.nom}</h3></div><span className={entite.actif ? "badge-statut statut-actif" : "badge-statut statut-inactif"}>{entite.actif ? "Active" : "Inactive"}</span></div><dl><div><dt>Parent</dt><dd>{entite.parent}</dd></div><div><dt>Périmètres</dt><dd>{entite.perimetresActifs} actif(s) sur {entite.perimetres}</dd></div><div><dt>Utilisateurs actifs</dt><dd>{entite.utilisateursActifs}</dd></div></dl><div className="actions-territoire"><button className="bouton-secondaire" type="button" onClick={() => voirPerimetres(entite.id)}>Voir les périmètres</button><button className="bouton-secondaire" type="button" onClick={() => modifier(entite)}>Modifier</button></div></article>)}</div>;
}

function ListePerimetres({ perimetres, modifier }: { perimetres: readonly PerimetreAdministration[]; modifier: (perimetre: PerimetreAdministration) => void }) {
  if (!perimetres.length) return <p className="aucun-suivi">Aucun périmètre ne correspond aux filtres sélectionnés.</p>;
  return <div className="liste-territoires">{perimetres.map((perimetre) => <article className="carte-territoire" key={perimetre.id}><div className="titre-territoire"><div><code>{perimetre.code}</code><h3>{perimetre.nom}</h3></div><span className={perimetre.actif ? "badge-statut statut-actif" : "badge-statut statut-inactif"}>{perimetre.actif ? "Actif" : "Inactif"}</span></div><dl><div><dt>Entité</dt><dd>{perimetre.entite}</dd></div><div><dt>Utilisateurs actifs</dt><dd>{perimetre.utilisateursActifs}</dd></div><div><dt>Affectations actives</dt><dd>{perimetre.affectationsActives}</dd></div></dl><div className="actions-territoire"><button className="bouton-secondaire" type="button" onClick={() => modifier(perimetre)}>Modifier</button></div></article>)}</div>;
}

function FormulaireTerritoire({ panneau, setPanneau, donnees, soumettre, fermer, enregistrement }: { panneau: PanneauTerritoire; setPanneau: (panneau: PanneauTerritoire) => void; donnees: DonneesTerritoires; soumettre: (event: FormEvent) => void; fermer: () => void; enregistrement: boolean }) {
  const estEntite = panneau.type === "ENTITE";
  const existante = estEntite && panneau.valeur.id ? donnees.entites.find((entite) => entite.id === panneau.valeur.id) : null;
  const perimetreExistant = !estEntite && panneau.valeur.id ? donnees.perimetres.find((perimetre) => perimetre.id === panneau.valeur.id) : null;
  const modifierEntite = (modification: Partial<SaisieEntite>) => estEntite && setPanneau({ type: "ENTITE", valeur: { ...panneau.valeur, ...modification } });
  const modifierPerimetre = (modification: Partial<SaisiePerimetre>) => !estEntite && setPanneau({ type: "PERIMETRE", valeur: { ...panneau.valeur, ...modification } });
  return <aside className="panneau-utilisateur panneau-territoire" aria-labelledby="titre-formulaire-territoire"><div className="entete-panneau"><div><p className="surtitre">{panneau.valeur.id ? "Modification" : "Création"}</p><h3 id="titre-formulaire-territoire">{estEntite ? "Entité" : "Périmètre"}</h3></div><button className="fermer-panneau" type="button" onClick={fermer} aria-label="Fermer le formulaire">×</button></div><form className="formulaire-utilisateur" onSubmit={soumettre}>
    <label>Code stable<input value={panneau.valeur.code} onChange={(event) => estEntite ? modifierEntite({ code: event.target.value }) : modifierPerimetre({ code: event.target.value })} disabled={Boolean(panneau.valeur.id)} required /><small>{panneau.valeur.id ? "Un code existant ne peut plus être modifié ni réutilisé." : estEntite ? "Convention : SIS_XX" : "Convention : PER_XX_GLOBAL"}</small></label>
    <label>Nom<input value={panneau.valeur.nom} onChange={(event) => estEntite ? modifierEntite({ nom: event.target.value }) : modifierPerimetre({ nom: event.target.value })} required /></label>
    {estEntite ? <label>Entité parente<select value={panneau.valeur.parentId} onChange={(event) => modifierEntite({ parentId: Number(event.target.value) })}><option value={0}>Aucune</option>{donnees.entites.filter((entite) => entite.id !== panneau.valeur.id && (entite.actif || entite.id === panneau.valeur.parentId)).map((entite) => <option value={entite.id} key={entite.id}>{entite.nom}</option>)}</select></label> : <label>Entité de rattachement<select value={panneau.valeur.entiteId} onChange={(event) => modifierPerimetre({ entiteId: Number(event.target.value) })} required><option value={0}>Sélectionner…</option>{donnees.entites.filter((entite) => entite.actif || entite.id === panneau.valeur.entiteId).map((entite) => <option value={entite.id} key={entite.id}>{entite.nom}</option>)}</select></label>}
    <label className="ligne-case"><input type="checkbox" checked={panneau.valeur.actif} onChange={(event) => estEntite ? modifierEntite({ actif: event.target.checked }) : modifierPerimetre({ actif: event.target.checked })} /> Référence active</label>
    {estEntite && existante?.actif && !panneau.valeur.actif && existante.perimetresActifs > 0 && <p className="alerte-desactivation">Cette entité possède encore {existante.perimetresActifs} périmètre(s) actif(s).</p>}
    {!estEntite && perimetreExistant?.actif && !panneau.valeur.actif && (perimetreExistant.utilisateursActifs > 0 || perimetreExistant.affectationsActives > 0) && <p className="alerte-desactivation">Ce périmètre est encore utilisé par {perimetreExistant.utilisateursActifs} utilisateur(s) et {perimetreExistant.affectationsActives} affectation(s) active(s).</p>}
    <div className="actions-formulaire"><button className="bouton-secondaire" type="button" onClick={fermer}>Annuler</button><button type="submit" disabled={enregistrement}>{enregistrement ? "Enregistrement…" : "Enregistrer"}</button></div>
  </form></aside>;
}

function EtatTerritoires({ texte, action }: { texte: string; action?: () => void }) {
  return <section className="page-carte etat-tableau" aria-live="polite"><p>{texte}</p>{action && <button type="button" onClick={action}>Réessayer</button>}</section>;
}
