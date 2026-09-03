import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { libellesRoles, RoleUtilisateur } from "./portal-data.js";
import {
  chargerDonneesUtilisateurs,
  DonneesUtilisateurs,
  enregistrerUtilisateur,
  SaisieUtilisateur,
  UtilisateurAdministration,
} from "./users-data.js";

type EtatModule =
  | { statut: "chargement" }
  | { statut: "erreur"; message: string }
  | { statut: "pret"; donnees: DonneesUtilisateurs };

export function ModuleUtilisateurs({ utilisateurCourantId }: { utilisateurCourantId: number }) {
  const [etat, setEtat] = useState<EtatModule>({ statut: "chargement" });
  const [tentative, setTentative] = useState(0);
  const [recherche, setRecherche] = useState("");
  const [filtreRole, setFiltreRole] = useState("TOUS");
  const [filtreStatut, setFiltreStatut] = useState("ACTIFS");
  const [saisie, setSaisie] = useState<SaisieUtilisateur | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(null);

  useEffect(() => {
    let actif = true;
    setEtat({ statut: "chargement" });
    chargerDonneesUtilisateurs()
      .then((donnees) => { if (actif) setEtat({ statut: "pret", donnees }); })
      .catch((erreur: unknown) => {
        if (!actif) return;
        setEtat({ statut: "erreur", message: erreur instanceof Error ? erreur.message : "Les utilisateurs n’ont pas pu être chargés." });
      });
    return () => { actif = false; };
  }, [tentative]);

  if (etat.statut === "chargement") return <EtatModuleUtilisateurs texte="Chargement des comptes autorisés par Grist…" />;
  if (etat.statut === "erreur") return <EtatModuleUtilisateurs texte={etat.message} action={() => setTentative((valeur) => valeur + 1)} />;

  const { donnees } = etat;
  const rechercheNormalisee = recherche.trim().toLocaleLowerCase("fr");
  const utilisateursFiltres = donnees.utilisateurs.filter((utilisateur) => {
    const correspondRole = filtreRole === "TOUS" || utilisateur.role === filtreRole;
    const correspondStatut = filtreStatut === "TOUS" || (filtreStatut === "ACTIFS" ? utilisateur.actif : !utilisateur.actif);
    const texte = `${utilisateur.prenom} ${utilisateur.nom} ${utilisateur.email} ${utilisateur.entite} ${utilisateur.perimetrePrincipal}`.toLocaleLowerCase("fr");
    return correspondRole && correspondStatut && (!rechercheNormalisee || texte.includes(rechercheNormalisee));
  });
  const totalRole = (role: RoleUtilisateur) => donnees.utilisateurs.filter((utilisateur) => utilisateur.actif && utilisateur.role === role).length;

  const commencerCreation = () => {
    const entite = donnees.entites.find((element) => element.actif);
    const perimetre = donnees.perimetres.find((element) => element.actif && (!entite || element.entiteId === entite.id));
    setMessage(null);
    setSaisie({ email: "", nom: "", prenom: "", role: "RECRUTEUR", peutGererPedagogie: false, entiteId: entite?.id ?? 0, perimetrePrincipalId: perimetre?.id ?? 0, actif: true });
  };

  const commencerEdition = (utilisateur: UtilisateurAdministration) => {
    setMessage(null);
    setSaisie({
      id: utilisateur.id, email: utilisateur.email, nom: utilisateur.nom, prenom: utilisateur.prenom,
      role: utilisateur.role, peutGererPedagogie: utilisateur.peutGererPedagogie,
      entiteId: utilisateur.entiteId ?? 0, perimetrePrincipalId: utilisateur.perimetrePrincipalId ?? 0,
      actif: utilisateur.actif, actifInitial: utilisateur.actif,
    });
  };

  const soumettre = async (event: FormEvent) => {
    event.preventDefault();
    if (!saisie) return;
    const profilExistant = saisie.id ? donnees.utilisateurs.find((utilisateur) => utilisateur.id === saisie.id) : null;
    if (saisie.id === utilisateurCourantId && (!saisie.actif || saisie.role !== profilExistant?.role)) {
      setMessage({ type: "erreur", texte: "Vous ne pouvez pas désactiver votre propre compte ni modifier votre propre rôle." });
      return;
    }
    const emailNormalise = saisie.email.trim().toLocaleLowerCase("fr");
    if (donnees.utilisateurs.some((utilisateur) => utilisateur.id !== saisie.id && utilisateur.email.toLocaleLowerCase("fr") === emailNormalise)) {
      setMessage({ type: "erreur", texte: "Cette adresse électronique est déjà associée à un utilisateur." });
      return;
    }
    setEnregistrement(true);
    setMessage(null);
    try {
      await enregistrerUtilisateur(saisie);
      setSaisie(null);
      setMessage({ type: "succes", texte: saisie.id ? "Le compte a été mis à jour." : "Le compte a été créé." });
      setTentative((valeur) => valeur + 1);
    } catch (erreur) {
      setMessage({ type: "erreur", texte: erreur instanceof Error ? erreur.message : "L’enregistrement a échoué." });
    } finally {
      setEnregistrement(false);
    }
  };

  return (
    <section className="page-carte module-utilisateurs" aria-labelledby="titre-utilisateurs">
      <div className="entete-module">
        <div><p className="surtitre">Administration</p><h2 id="titre-utilisateurs">Utilisateurs et rôles</h2><p>Gérez les identités applicatives, les rôles et les habilitations générales. Les ACL Grist restent la barrière de sécurité.</p></div>
        <button type="button" onClick={commencerCreation}>Ajouter un utilisateur</button>
      </div>

      <div className="synthese-utilisateurs" aria-label="Synthèse des comptes actifs">
        <CarteEffectif valeur={donnees.utilisateurs.filter((utilisateur) => utilisateur.actif).length} libelle="Comptes actifs" />
        <CarteEffectif valeur={totalRole("ADMIN")} libelle="Administrateurs" />
        <CarteEffectif valeur={totalRole("SUPERVISEUR")} libelle="Superviseurs" />
        <CarteEffectif valeur={totalRole("RECRUTEUR")} libelle="Recruteurs" />
      </div>

      {message && <p className={`message-formulaire message-${message.type}`} role="status">{message.texte}</p>}

      <div className="barre-filtres-utilisateurs">
        <label>Rechercher<input type="search" value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Nom, courriel, entité ou périmètre" /></label>
        <label>Rôle<select value={filtreRole} onChange={(event) => setFiltreRole(event.target.value)}><option value="TOUS">Tous les rôles</option><option value="ADMIN">Administrateurs</option><option value="SUPERVISEUR">Superviseurs</option><option value="RECRUTEUR">Recruteurs</option></select></label>
        <label>Statut<select value={filtreStatut} onChange={(event) => setFiltreStatut(event.target.value)}><option value="ACTIFS">Actifs</option><option value="INACTIFS">Inactifs</option><option value="TOUS">Tous</option></select></label>
      </div>

      <div className={saisie ? "corps-utilisateurs avec-formulaire" : "corps-utilisateurs"}>
        <ListeUtilisateurs utilisateurs={utilisateursFiltres} editer={commencerEdition} />
        {saisie && <FormulaireUtilisateur saisie={saisie} setSaisie={setSaisie} donnees={donnees} soumettre={soumettre} fermer={() => setSaisie(null)} enregistrement={enregistrement} estProfilCourant={saisie.id === utilisateurCourantId} />}
      </div>
    </section>
  );
}

function CarteEffectif({ valeur, libelle }: { valeur: number; libelle: string }) {
  return <div><strong>{valeur}</strong><span>{libelle}</span></div>;
}

function ListeUtilisateurs({ utilisateurs, editer }: { utilisateurs: readonly UtilisateurAdministration[]; editer: (utilisateur: UtilisateurAdministration) => void }) {
  if (!utilisateurs.length) return <p className="aucun-suivi">Aucun utilisateur ne correspond aux filtres sélectionnés.</p>;
  return (
    <div className="liste-utilisateurs">
      {utilisateurs.map((utilisateur) => (
        <article className="carte-utilisateur" key={utilisateur.id}>
          <div className="identite-utilisateur"><span className="avatar-utilisateur" aria-hidden="true">{initiales(utilisateur)}</span><div><h3>{utilisateur.prenom} {utilisateur.nom}</h3><p>{utilisateur.email}</p></div></div>
          <div className="badges-utilisateur"><span className={`badge-role role-${utilisateur.role.toLocaleLowerCase("fr")}`}>{libellesRoles[utilisateur.role]}</span><span className={utilisateur.actif ? "badge-statut statut-actif" : "badge-statut statut-inactif"}>{utilisateur.actif ? "Actif" : "Inactif"}</span>{utilisateur.role === "ADMIN" && <span className="badge-pedagogie">Gestion des fiches</span>}</div>
          <dl><div><dt>Entité</dt><dd>{utilisateur.entite}</dd></div><div><dt>Périmètre principal</dt><dd>{utilisateur.perimetrePrincipal}</dd></div>{utilisateur.role === "SUPERVISEUR" && <div><dt>Périmètres supervisés</dt><dd>{utilisateur.perimetresSupervises.join(", ") || "Aucun"}</dd></div>}</dl>
          <button className="bouton-secondaire" type="button" onClick={() => editer(utilisateur)}>Modifier la fiche</button>
        </article>
      ))}
    </div>
  );
}

function FormulaireUtilisateur({ saisie, setSaisie, donnees, soumettre, fermer, enregistrement, estProfilCourant }: {
  saisie: SaisieUtilisateur;
  setSaisie: (saisie: SaisieUtilisateur) => void;
  donnees: DonneesUtilisateurs;
  soumettre: (event: FormEvent) => void;
  fermer: () => void;
  enregistrement: boolean;
  estProfilCourant: boolean;
}) {
  const utilisateurExistant = saisie.id ? donnees.utilisateurs.find((utilisateur) => utilisateur.id === saisie.id) : null;
  const perimetresDisponibles = useMemo(() => donnees.perimetres.filter((perimetre) =>
    (perimetre.actif || perimetre.id === saisie.perimetrePrincipalId) && (!perimetre.entiteId || perimetre.entiteId === saisie.entiteId)
  ), [donnees.perimetres, saisie.entiteId, saisie.perimetrePrincipalId]);
  const modifier = <Cle extends keyof SaisieUtilisateur>(cle: Cle, valeur: SaisieUtilisateur[Cle]) => setSaisie({ ...saisie, [cle]: valeur });

  return (
    <aside className="panneau-utilisateur" aria-labelledby="titre-formulaire-utilisateur">
      <div className="entete-panneau"><div><p className="surtitre">{saisie.id ? "Modification" : "Création"}</p><h3 id="titre-formulaire-utilisateur">{saisie.id ? `${saisie.prenom} ${saisie.nom}` : "Nouvel utilisateur"}</h3></div><button className="fermer-panneau" type="button" onClick={fermer} aria-label="Fermer le formulaire">×</button></div>
      <form onSubmit={soumettre} className="formulaire-utilisateur">
        <div className="deux-colonnes"><label>Prénom<input value={saisie.prenom} onChange={(event) => modifier("prenom", event.target.value)} required /></label><label>Nom<input value={saisie.nom} onChange={(event) => modifier("nom", event.target.value)} required /></label></div>
        <label>Adresse électronique Grist<input type="email" value={saisie.email} onChange={(event) => modifier("email", event.target.value)} required autoComplete="off" /><small>Elle doit être identique à l’adresse du compte invité dans Grist.</small></label>
        <label>Rôle<select value={saisie.role} onChange={(event) => modifier("role", event.target.value as RoleUtilisateur)} disabled={estProfilCourant}><option value="RECRUTEUR">Recruteur</option><option value="SUPERVISEUR">Superviseur</option><option value="ADMIN">Administrateur</option></select>{estProfilCourant && <small>Votre propre rôle est protégé pour éviter un verrouillage accidentel.</small>}</label>
        <label>Entité<select value={saisie.entiteId} onChange={(event) => { const entiteId = Number(event.target.value); const premierPerimetre = donnees.perimetres.find((perimetre) => perimetre.actif && perimetre.entiteId === entiteId); setSaisie({ ...saisie, entiteId, perimetrePrincipalId: premierPerimetre?.id ?? 0 }); }} required><option value={0}>Sélectionner…</option>{donnees.entites.filter((entite) => entite.actif || entite.id === saisie.entiteId).map((entite) => <option value={entite.id} key={entite.id}>{entite.nom}</option>)}</select></label>
        <label>Périmètre principal<select value={saisie.perimetrePrincipalId} onChange={(event) => modifier("perimetrePrincipalId", Number(event.target.value))} required><option value={0}>Sélectionner…</option>{perimetresDisponibles.map((perimetre) => <option value={perimetre.id} key={perimetre.id}>{perimetre.nom}</option>)}</select><small>Périmètre d’appartenance ; il ne confère pas à lui seul un droit de supervision.</small></label>
        {saisie.role === "SUPERVISEUR" && <div className="encart-information"><strong>Périmètres supervisés</strong><p>{utilisateurExistant?.perimetresSupervises.join(", ") || "Aucune affectation active."}</p><small>À modifier depuis « Affectations des superviseurs » afin de conserver l’historique.</small></div>}
        {saisie.role === "ADMIN" && <div className="encart-information"><strong>Gestion des fiches d’enseignement</strong><p>Ce droit est réservé automatiquement aux Administrateurs.</p></div>}
        <label className="ligne-case"><input type="checkbox" checked={saisie.actif} onChange={(event) => modifier("actif", event.target.checked)} disabled={estProfilCourant} /> Compte actif</label>
        {!saisie.actif && <p className="alerte-desactivation">Le compte ne pourra plus accéder à l’application. Son historique sera conservé.</p>}
        <div className="actions-formulaire"><button className="bouton-secondaire" type="button" onClick={fermer}>Annuler</button><button type="submit" disabled={enregistrement}>{enregistrement ? "Enregistrement…" : "Enregistrer"}</button></div>
      </form>
    </aside>
  );
}

function EtatModuleUtilisateurs({ texte, action }: { texte: string; action?: () => void }) {
  return <section className="page-carte etat-tableau" aria-live="polite"><p>{texte}</p>{action && <button type="button" onClick={action}>Réessayer</button>}</section>;
}

function initiales(utilisateur: UtilisateurAdministration): string {
  return `${utilisateur.prenom.at(0) ?? ""}${utilisateur.nom.at(0) ?? ""}`.toLocaleUpperCase("fr") || "?";
}
