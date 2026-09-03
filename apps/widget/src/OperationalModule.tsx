import React, { FormEvent, useEffect, useState } from "react";
import { Niveau } from "./evaluation-data.js";
import { UtilisateurCourant } from "./portal-data.js";
import {
  ActionMetier,
  chargerDonneesOperationnelles,
  deciderAction,
  DecisionValidation,
  declarerProgression,
  debloquerEvaluationRecruteur,
  definirEcheance,
  demarrerAction,
  DonneesOperationnelles,
  FicheDisponible,
  journaliserConsultation,
  urlPieceJointe,
} from "./operational-data.js";

type Etat =
  | { statut: "chargement" }
  | { statut: "erreur"; message: string }
  | { statut: "pret"; donnees: DonneesOperationnelles };

const titres: Record<string, [string, string]> = {
  progression: ["Ma progression", "Suivez vos actions et transmettez vos progrès à votre superviseur."],
  fiches: ["Fiches d’enseignement", "Consultez ou téléchargez toutes les fiches publiées après votre première évaluation validée."],
  historique: ["Historique", "Retrouvez vos évaluations et les décisions de progression."],
  recruteurs: ["Mes recruteurs", "Consultez les recruteurs visibles dans vos périmètres supervisés."],
  "gestion-recruteurs": ["Gestion des recruteurs", "Gérez les autorisations de nouvelle auto-évaluation dans les limites de vos ACL."],
  "evaluations-recruteurs": ["Évaluations des recruteurs", "Analysez les évaluations validées ou en cours de vos périmètres."],
  "progres-a-valider": ["Progrès à valider", "Traitez les demandes transmises par les recruteurs."],
  "progres-ouverts": ["Progrès restant à valider", "Fixez et suivez une échéance pour chaque résultat rouge ou orange encore ouvert."],
  echeances: ["Échéances et retards", "Repérez les actions proches de leur échéance ou déjà dépassées."],
  resultats: ["Mes résultats", "Consultez le bilan de votre dernière évaluation validée."],
};

export function ModuleOperationnel({ page, utilisateur }: { page: string; utilisateur: UtilisateurCourant }) {
  const [etat, setEtat] = useState<Etat>({ statut: "chargement" });
  const [tentative, setTentative] = useState(0);
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(null);

  useEffect(() => {
    let actif = true;
    setEtat({ statut: "chargement" });
    chargerDonneesOperationnelles()
      .then((donnees) => { if (actif) setEtat({ statut: "pret", donnees }); })
      .catch((e) => { if (actif) setEtat({ statut: "erreur", message: e instanceof Error ? e.message : "Les données métier n’ont pas pu être chargées." }); });
    return () => { actif = false; };
  }, [tentative]);

  if (etat.statut === "chargement") return <EtatOp texte="Chargement des données autorisées par Grist…" />;
  if (etat.statut === "erreur") return <EtatOp texte={etat.message} action={() => setTentative((x) => x + 1)} />;

  const notifier = (type: "succes" | "erreur", texte: string) => setMessage({ type, texte });
  const recharger = () => setTentative((x) => x + 1);

  return (
    <section className="page-carte module-operationnel" aria-labelledby={`titre-${page}`}>
      <div className="entete-module">
        <div>
          <p className="surtitre">{utilisateur.role === "RECRUTEUR" ? "Espace recruteur" : "Supervision"}</p>
          <h2 id={`titre-${page}`}>{titres[page]?.[0] || "Suivi opérationnel"}</h2>
          <p>{titres[page]?.[1]}</p>
        </div>
      </div>
      {message && <p className={`message-formulaire message-${message.type}`} role="status">{message.texte}</p>}
      <Vue page={page} d={etat.donnees} utilisateur={utilisateur} notifier={notifier} recharger={recharger} />
    </section>
  );
}

function Vue({ page, d, utilisateur, notifier, recharger }: {
  page: string;
  d: DonneesOperationnelles;
  utilisateur: UtilisateurCourant;
  notifier: (t: "succes" | "erreur", x: string) => void;
  recharger: () => void;
}) {
  if (page === "resultats") return <Resultats d={d} />;
  if (page === "progression") return <Progression actions={d.actions} utilisateur={utilisateur} notifier={notifier} recharger={recharger} />;
  if (page === "fiches") return <Fiches d={d} utilisateur={utilisateur} notifier={notifier} />;
  if (page === "historique") return <Historique d={d} />;
  if (page === "recruteurs" || page === "gestion-recruteurs") return <Recruteurs d={d} utilisateur={utilisateur} notifier={notifier} recharger={recharger} />;
  if (page === "evaluations-recruteurs") return <Evaluations d={d} />;
  if (page === "progres-a-valider") return <Validation actions={d.actions.filter((a) => a.statut === "EN_ATTENTE_VALIDATION" || a.statut === "PRISE_EN_COMPTE_DECLAREE")} utilisateur={utilisateur} notifier={notifier} recharger={recharger} />;
  if (page === "progres-ouverts") return <ActionsOuvertes actions={d.actions.filter((a) => !(["PROGRESSION_VALIDEE", "ARCHIVEE"] as string[]).includes(a.statut) && a.niveauCourant !== "VERT")} utilisateur={utilisateur} notifier={notifier} recharger={recharger} />;
  if (page === "echeances") return <Echeances actions={d.actions} utilisateur={utilisateur} notifier={notifier} recharger={recharger} />;
  return null;
}

function Resultats({ d }: { d: DonneesOperationnelles }) {
  const evaluation = d.evaluations.find((e) => e.statut === "VALIDEE");
  if (!evaluation) return <Vide texte="Aucune évaluation validée n’est disponible pour le moment." />;
  const totaux: Record<Niveau, number> = { ROUGE: 0, ORANGE: 0, VERT: 0 };
  evaluation.reponses.forEach((r) => totaux[r.niveau]++);
  return (
    <div className="resultats-operationnels">
      <div className="synthese">{(["ROUGE", "ORANGE", "VERT"] as Niveau[]).map((n) => <article className={`synthese-carte niveau-${n.toLowerCase()}`} key={n}><strong>{totaux[n]}</strong><span>{n}</span></article>)}</div>
      <p>Évaluation validée le {evaluation.dateValidation} · {evaluation.perimetre}</p>
      <div className="resultats-detail">{evaluation.reponses.map((r) => <article className="resultat" key={r.id}><div><p><strong>{r.codeIndicateur}</strong> — {r.indicateur}</p>{r.commentaire && <small>{r.commentaire}</small>}</div><span className={`badge niveau-${r.niveau.toLowerCase()}`}>{r.niveau}</span></article>)}</div>
    </div>
  );
}

function Progression({ actions, utilisateur, notifier, recharger }: {
  actions: readonly ActionMetier[];
  utilisateur: UtilisateurCourant;
  notifier: (t: "succes" | "erreur", x: string) => void;
  recharger: () => void;
}) {
  if (!actions.length) return <Vide texte="Aucune action de progression n’est ouverte pour le moment." />;
  return <div className="liste-actions-progres">{actions.map((a) => <ActionRecruteur key={a.id} action={a} utilisateur={utilisateur} notifier={notifier} recharger={recharger} />)}</div>;
}

function ActionRecruteur({ action: a, utilisateur, notifier, recharger }: {
  action: ActionMetier;
  utilisateur: UtilisateurCourant;
  notifier: (t: "succes" | "erreur", x: string) => void;
  recharger: () => void;
}) {
  const [commentaire, setCommentaire] = useState(a.commentaireRecruteur);
  const [priseEnCompte, setPriseEnCompte] = useState(a.priseEnCompteFiche);
  const [operation, setOperation] = useState(false);
  const agir = async (type: "DEMARRER" | "ENVOYER") => {
    setOperation(true);
    try {
      if (type === "DEMARRER") await demarrerAction(a.id);
      else await declarerProgression(a, commentaire, utilisateur, priseEnCompte);
      notifier("succes", type === "DEMARRER" ? "L’action est maintenant en cours." : "La prise en compte de la fiche et la demande de validation ont été transmises.");
      recharger();
    } catch (e) {
      notifier("erreur", e instanceof Error ? e.message : "L’opération a échoué.");
    } finally { setOperation(false); }
  };
  const ouvrir = async (type: "OUVERTURE" | "TELECHARGEMENT") => {
    if (!a.ficheVersionId || !a.attachmentId) return;
    setOperation(true);
    try {
      await ouvrirFiche(a.ficheVersionId, a.attachmentId, a.id, utilisateur, type, a.nomFichier);
      notifier("succes", type === "OUVERTURE" ? "La consultation de la fiche a été tracée." : "Le téléchargement de la fiche a été tracé.");
    } catch (e) {
      notifier("erreur", e instanceof Error ? e.message : "La fiche n’a pas pu être ouverte.");
    } finally { setOperation(false); }
  };
  const modifiable = ["A_PRENDRE_EN_COMPTE", "EN_COURS", "COMPLEMENT_DEMANDE", "VALIDATION_REFUSEE"].includes(a.statut);
  return (
    <article className="carte-action-progres">
      <EnteteAction action={a} />
      <p><strong>Échéance :</strong> {a.echeance}</p>
      {a.ficheVersionId && <div className="ressource-associee"><p>Fiche proposée : <strong>{a.fiche}</strong> · version {a.version}</p><div className="actions-formulaire"><button type="button" className="bouton-secondaire" disabled={operation} onClick={() => ouvrir("OUVERTURE")}>Consulter</button><button type="button" className="bouton-secondaire" disabled={operation} onClick={() => ouvrir("TELECHARGEMENT")}>Télécharger</button></div></div>}
      {!a.ficheVersionId && <p className="message-formulaire message-erreur">Aucune fiche publiée n’est disponible pour cet indicateur. Contactez l’administrateur.</p>}
      <label>Progrès réalisés (facultatif)<textarea rows={3} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} disabled={!modifiable} /></label>
      {modifiable && <label className="confirmation-fiche"><input type="checkbox" checked={priseEnCompte} onChange={(e) => setPriseEnCompte(e.target.checked)} /> Prise en compte de la fiche d’enseignement réalisée</label>}
      <div className="actions-formulaire">
        {a.statut === "A_PRENDRE_EN_COMPTE" && <button type="button" className="bouton-secondaire" disabled={operation} onClick={() => agir("DEMARRER")}>Commencer l’action</button>}
        {modifiable && <button type="button" disabled={operation || !a.ficheVersionId || !priseEnCompte} onClick={() => agir("ENVOYER")}>Demander le passage au vert</button>}
        {a.statut === "EN_ATTENTE_VALIDATION" && <span>Prise en compte déclarée · demande transmise au superviseur.</span>}
      </div>
    </article>
  );
}

function Fiches({ d, utilisateur, notifier }: { d: DonneesOperationnelles; utilisateur: UtilisateurCourant; notifier: (t: "succes" | "erreur", x: string) => void }) {
  const autorise = d.evaluations.some((e) => e.recruteurId === utilisateur.id && e.statut === "VALIDEE" && e.progression === 100);
  if (!autorise) return <Vide texte="Les fiches d’enseignement seront accessibles après votre première évaluation complète et validée." />;
  if (!d.fiches.length) return <Vide texte="Aucune fiche d’enseignement publiée n’est disponible." />;
  const ouvrir = async (fiche: FicheDisponible, type: "OUVERTURE" | "TELECHARGEMENT") => {
    try {
      await ouvrirFiche(fiche.versionId, fiche.attachmentId, null, utilisateur, type, fiche.nomFichier);
      notifier("succes", type === "OUVERTURE" ? "La consultation de la fiche a été tracée." : "Le téléchargement de la fiche a été tracé.");
    } catch (e) { notifier("erreur", e instanceof Error ? e.message : "Le PDF n’a pas pu être ouvert."); }
  };
  return <div className="grille-fiches-recruteur">{d.fiches.map((fiche) => <article key={fiche.id}><div><p className="surtitre">{fiche.codeIndicateur} · {fiche.niveau}</p><h3>{fiche.titre}</h3><p>{fiche.indicateur}</p>{fiche.description && <p>{fiche.description}</p>}<small>{fiche.nomFichier} · version {fiche.version}</small></div><div className="actions-formulaire"><button type="button" onClick={() => ouvrir(fiche, "OUVERTURE")}>Consulter</button><button type="button" className="bouton-secondaire" onClick={() => ouvrir(fiche, "TELECHARGEMENT")}>Télécharger</button></div></article>)}</div>;
}

async function ouvrirFiche(versionId: number, attachmentId: number, actionId: number | null, utilisateur: UtilisateurCourant, type: "OUVERTURE" | "TELECHARGEMENT", nomFichier: string) {
  await journaliserConsultation(versionId, actionId, utilisateur, type);
  const url = await urlPieceJointe(attachmentId);
  const lien = document.createElement("a");
  lien.href = url;
  lien.rel = "noopener";
  if (type === "OUVERTURE") lien.target = "_blank";
  else lien.download = nomFichier || "fiche-enseignement.pdf";
  lien.click();
}

function Historique({ d }: { d: DonneesOperationnelles }) {
  return <div className="historique-metier"><section><h3>Évaluations</h3>{d.evaluations.length ? d.evaluations.map((e) => <article key={e.id}><div><strong>{e.dateValidation !== "—" ? e.dateValidation : e.dateDebut}</strong><span className="badge-statut">{e.statut}</span></div><p>{e.reponses.length} réponse(s) · progression {e.progression}%</p></article>) : <Vide texte="Aucune évaluation enregistrée." />}</section><section><h3>Décisions de progression</h3>{d.validations.length ? d.validations.map((v) => <article key={v.id}><div><strong>{v.date}</strong><span className="badge-statut">{v.decision}</span></div><p>{v.ancienNiveau}{v.nouveauNiveau ? ` → ${v.nouveauNiveau}` : ""} · {v.commentaire || "Sans commentaire"}</p></article>) : <Vide texte="Aucune décision enregistrée." />}</section></div>;
}

function Recruteurs({ d, utilisateur, notifier, recharger }: {
  d: DonneesOperationnelles;
  utilisateur: UtilisateurCourant;
  notifier: (t: "succes" | "erreur", x: string) => void;
  recharger: () => void;
}) {
  const liste = d.profils.filter((p) => p.role === "RECRUTEUR");
  if (!liste.length) return <Vide texte="Aucun recruteur n’est visible dans vos périmètres." />;
  const debloquer = async (id: number, nom: string) => {
    if (!window.confirm(`Autoriser ${nom} à réaliser une nouvelle auto-évaluation ? L’évaluation validée restera conservée dans l’historique.`)) return;
    try {
      await debloquerEvaluationRecruteur(id, utilisateur);
      notifier("succes", `Une nouvelle auto-évaluation est autorisée pour ${nom}.`);
      recharger();
    } catch (e) { notifier("erreur", e instanceof Error ? e.message : "Le déblocage n’a pas pu être enregistré."); }
  };
  return (
    <div className="liste-recruteurs-op">
      {liste.map((p) => {
        const evals = d.evaluations.filter((e) => e.recruteurId === p.id);
        const brouillon = evals.some((e) => e.statut === "BROUILLON");
        const derniereValidee = evals.filter((e) => e.statut === "VALIDEE").sort((a, b) => b.dateValidationTimestamp - a.dateValidationTimestamp || b.id - a.id)[0];
        const autorisee = Boolean(derniereValidee && p.dateDeblocageEvaluationTimestamp > derniereValidee.dateValidationTimestamp);
        const verrouillee = Boolean(derniereValidee && !brouillon && !autorisee);
        const actions = d.actions.filter((a) => a.recruteurId === p.id && !(["PROGRESSION_VALIDEE", "ARCHIVEE"] as string[]).includes(a.statut));
        const statutEvaluation = brouillon ? "Évaluation en cours" : autorisee ? "Nouvelle évaluation autorisée" : verrouillee ? "Nouvelle évaluation verrouillée" : "Première évaluation autorisée";
        return (
          <article key={p.id}>
            <div className="identite-utilisateur"><span className="avatar-utilisateur">{p.nom.split(" ").map((x) => x[0]).join("").slice(0, 2)}</span><div><h3>{p.nom}</h3><p>{p.email}</p></div></div>
            <dl><div><dt>Périmètre</dt><dd>{p.perimetre}</dd></div><div><dt>Évaluations</dt><dd>{evals.length}</dd></div><div><dt>Actions ouvertes</dt><dd>{actions.length}</dd></div><div><dt>Nouvelle auto-évaluation</dt><dd>{statutEvaluation}</dd></div></dl>
            {verrouillee && <button type="button" onClick={() => debloquer(p.id, p.nom)}>Autoriser une nouvelle auto-évaluation</button>}
          </article>
        );
      })}
    </div>
  );
}

function Evaluations({ d }: { d: DonneesOperationnelles }) {
  const [selection, setSelection] = useState(d.evaluations[0]?.id ?? 0);
  const e = d.evaluations.find((x) => x.id === selection);
  if (!d.evaluations.length) return <Vide texte="Aucune évaluation n’est visible dans vos périmètres." />;
  return <div className="corps-evaluations-superviseur"><div className="liste-evaluations-superviseur">{d.evaluations.map((x) => <button className={selection === x.id ? "selectionnee" : ""} key={x.id} onClick={() => setSelection(x.id)}><strong>{x.recruteur}</strong><span>{x.statut} · {x.progression}%</span><small>{x.dateValidation !== "—" ? x.dateValidation : x.dateDebut}</small></button>)}</div>{e && <article className="detail-evaluation-superviseur"><h3>{e.recruteur}</h3><p>{e.perimetre} · {e.statut}</p>{e.reponses.map((r) => <div key={r.id}><span><code>{r.codeIndicateur}</code><strong>{r.indicateur}</strong></span><span className={`badge niveau-${r.niveau.toLowerCase()}`}>{r.niveau}</span></div>)}</article>}</div>;
}

function Validation({ actions, utilisateur, notifier, recharger }: { actions: readonly ActionMetier[]; utilisateur: UtilisateurCourant; notifier: (t: "succes" | "erreur", x: string) => void; recharger: () => void }) {
  if (!actions.length) return <Vide texte="Aucune demande n’est actuellement en attente de votre décision." />;
  return <div className="liste-validations-op">{actions.map((a) => <FormDecision key={a.id} action={a} utilisateur={utilisateur} notifier={notifier} recharger={recharger} />)}</div>;
}

function FormDecision({ action: a, utilisateur, notifier, recharger }: { action: ActionMetier; utilisateur: UtilisateurCourant; notifier: (t: "succes" | "erreur", x: string) => void; recharger: () => void }) {
  const [decision, setDecision] = useState<DecisionValidation>("VALIDEE");
  const niveau: Niveau = "VERT";
  const [commentaire, setCommentaire] = useState("");
  const [encours, setEncours] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setEncours(true);
    try { await deciderAction(a, decision, decision === "VALIDEE" ? niveau : null, commentaire, utilisateur); notifier("succes", "La décision a été enregistrée et historisée."); recharger(); }
    catch (err) { notifier("erreur", err instanceof Error ? err.message : "La décision n’a pas pu être enregistrée."); }
    finally { setEncours(false); }
  };
  return <form className="carte-action-progres" onSubmit={submit}><EnteteAction action={a} /><p><strong>Fiche d’enseignement :</strong> {a.fiche}</p><p><strong>Déclaration :</strong> {a.priseEnCompteFiche ? "Prise en compte de la fiche d’enseignement réalisée" : "Prise en compte non confirmée"}</p>{a.commentaireRecruteur && <p><strong>Commentaire du recruteur :</strong> {a.commentaireRecruteur}</p>}<div className="grille-decision"><label>Décision<select value={decision} onChange={(e) => setDecision(e.target.value as DecisionValidation)}><option value="VALIDEE">Valider le passage au vert</option><option value="COMPLEMENT_DEMANDE">Demander un complément</option><option value="REFUSEE">Refuser</option></select></label>{decision === "VALIDEE" && <label>Nouveau niveau<select value="VERT" disabled><option value="VERT">VERT</option></select></label>}</div><label>Commentaire<textarea rows={3} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} required={decision !== "VALIDEE"} /></label><button disabled={encours || !a.priseEnCompteFiche}>{encours ? "Enregistrement…" : "Enregistrer la décision"}</button></form>;
}

function ActionsOuvertes({ actions, utilisateur, notifier, recharger }: { actions: readonly ActionMetier[]; utilisateur: UtilisateurCourant; notifier: (t: "succes" | "erreur", x: string) => void; recharger: () => void }) {
  if (!actions.length) return <Vide texte="Aucun indicateur rouge ou orange n’est encore ouvert." />;
  return <div className="liste-actions-progres">{actions.map((a) => <article className="carte-action-progres" key={a.id}><EnteteAction action={a} /><p>{a.recruteur} · {a.perimetre}</p><p><strong>Échéance :</strong> {a.echeance}</p><FormEcheance action={a} utilisateur={utilisateur} notifier={notifier} recharger={recharger} /></article>)}</div>;
}

function Echeances({ actions, utilisateur, notifier, recharger }: { actions: readonly ActionMetier[]; utilisateur: UtilisateurCourant; notifier: (t: "succes" | "erreur", x: string) => void; recharger: () => void }) {
  const maintenant = Date.now() / 1000;
  const liste = [...actions].filter((a) => a.echeanceTimestamp && !["PROGRESSION_VALIDEE", "ARCHIVEE"].includes(a.statut)).sort((a, b) => a.echeanceTimestamp - b.echeanceTimestamp);
  if (!liste.length) return <Vide texte="Aucune échéance active. Les échéances se définissent dans « Progrès restant à valider »." />;
  return <div className="liste-echeances">{liste.map((a) => { const retard = a.echeanceTimestamp < maintenant; return <article className={retard ? "en-retard" : ""} key={a.id}><div><strong>{a.recruteur}</strong><span>{a.codeIndicateur} · {a.indicateur}</span></div><div><strong>{a.echeance}</strong><span>{retard ? "En retard" : "À venir"}</span></div><FormEcheance action={a} utilisateur={utilisateur} notifier={notifier} recharger={recharger} /></article>; })}</div>;
}

function FormEcheance({ action, utilisateur, notifier, recharger }: { action: ActionMetier; utilisateur: UtilisateurCourant; notifier: (t: "succes" | "erreur", x: string) => void; recharger: () => void }) {
  const [date, setDate] = useState(formatDateInput(action.echeanceTimestamp));
  const [encours, setEncours] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setEncours(true);
    try { await definirEcheance(action, date, utilisateur); notifier("succes", `Échéance enregistrée pour ${action.codeIndicateur}.`); recharger(); }
    catch (err) { notifier("erreur", err instanceof Error ? err.message : "L’échéance n’a pas pu être enregistrée."); }
    finally { setEncours(false); }
  };
  return <form className="actions-formulaire" onSubmit={submit}><label>Définir l’échéance<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label><button disabled={encours}>{encours ? "Enregistrement…" : action.echeanceTimestamp ? "Modifier l’échéance" : "Définir l’échéance"}</button></form>;
}

function formatDateInput(timestamp: number): string {
  if (!timestamp) return "";
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function EnteteAction({ action: a }: { action: ActionMetier }) {
  return <div className="entete-action-progres"><div><code>{a.codeIndicateur}</code><h3>{a.indicateur}</h3></div><div><span className={`badge niveau-${a.niveauCourant.toLowerCase()}`}>{a.niveauCourant}</span><span className="badge-statut">{libelleStatut(a.statut)}</span></div></div>;
}

function Vide({ texte }: { texte: string }) { return <p className="aucun-suivi">{texte}</p>; }
function EtatOp({ texte, action }: { texte: string; action?: () => void }) { return <section className="page-carte etat-tableau"><p>{texte}</p>{action && <button onClick={action}>Réessayer</button>}</section>; }
function libelleStatut(s: string) { return s.replaceAll("_", " ").toLocaleLowerCase("fr").replace(/^./, (x) => x.toLocaleUpperCase("fr")); }
