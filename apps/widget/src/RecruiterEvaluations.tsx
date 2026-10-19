import React, { useState } from "react";
import { DonneesOperationnelles, EvaluationMetier } from "./operational-data.js";
import { evolutionRecruteur } from "./recruiter-evolution.js";

export function EvaluationsRecruteurs({ donnees: d }: { donnees: DonneesOperationnelles }) {
  const [recruteurId, choisirRecruteur] = useState<number | null>(null);
  const [evaluationId, choisirEvaluation] = useState<number | null>(null);
  const recruteurs = new Map(d.profils.filter((p) => p.role === "RECRUTEUR").map((p) => [p.id, p.nom]));
  d.evaluations.forEach((e) => { if (!recruteurs.has(e.recruteurId)) recruteurs.set(e.recruteurId, e.recruteur); });
  if (recruteurId === null) return <div className="choix-recruteurs">{[...recruteurs].sort((a, b) => a[1].localeCompare(b[1], "fr")).map(([id, nom]) => {
    const evaluations = d.evaluations.filter((e) => e.recruteurId === id);
    const validees = evaluations.filter((e) => e.statut === "VALIDEE").length;
    const brouillons = evaluations.filter((e) => e.statut === "BROUILLON").length;
    return <button type="button" key={id} onClick={() => { choisirRecruteur(id); choisirEvaluation(null); }}><strong>{nom}</strong><span>{validees} auto-évaluation{validees > 1 ? "s" : ""} réalisée{validees > 1 ? "s" : ""}</span><small>{brouillons} en cours · Voir la fiche et l’évolution →</small></button>;
  })}{!recruteurs.size && <p>Aucun recruteur visible dans vos périmètres.</p>}</div>;
  const evaluations = d.evaluations.filter((e) => e.recruteurId === recruteurId);
  const selection = evaluations.find((e) => e.id === evaluationId);
  return <div className="fiche-evolution-recruteur">
    <button type="button" className="bouton-secondaire" onClick={() => choisirRecruteur(null)}>← Tous les recruteurs</button>
    <h3>{recruteurs.get(recruteurId)}</h3>
    <GraphiqueEvolution evaluations={evaluations} recruteurId={recruteurId} />
    <section aria-labelledby="titre-evaluations-individuelles"><h3 id="titre-evaluations-individuelles">Consulter une auto-évaluation</h3>
      <div className="liste-evaluations-superviseur">{evaluations.map((e) => <button type="button" aria-pressed={evaluationId === e.id} className={evaluationId === e.id ? "selectionnee" : ""} key={e.id} onClick={() => choisirEvaluation(e.id)}><strong>Évaluation #{e.id}</strong><span>{e.statut} · {e.progression}%</span><small>{e.dateValidation !== "—" ? e.dateValidation : e.dateDebut}</small></button>)}</div>
      {!evaluations.length && <p>Aucune auto-évaluation enregistrée.</p>}
      {selection && <article className="detail-evaluation-superviseur"><h4>Auto-évaluation #{selection.id}</h4><p>{selection.perimetre} · {selection.statut} · {selection.dateValidation !== "—" ? selection.dateValidation : selection.dateDebut}</p>{selection.reponses.map((r) => <div key={r.id}><span><code>{r.codeIndicateur}</code><strong>{r.indicateur}</strong></span><span className={`badge niveau-${r.niveau.toLowerCase()}`}>{r.niveau}</span></div>)}{!selection.reponses.length && <p>Aucune réponse enregistrée.</p>}</article>}
    </section>
  </div>;
}

function GraphiqueEvolution({ evaluations, recruteurId }: { evaluations: readonly EvaluationMetier[]; recruteurId: number }) {
  const { bilans, indicateurs } = evolutionRecruteur(evaluations, recruteurId);
  const valeurs = { ROUGE: 1, ORANGE: 2, VERT: 3 };
  const libelle = (e: EvaluationMetier, i: number) => `A${i + 1} · ${e.dateValidation !== "—" ? e.dateValidation : "Date non renseignée"} · #${e.id}`;
  return <section className="graphique-evolution" aria-labelledby="titre-evolution">
    <h3 id="titre-evolution">Évolution par indicateur</h3>
    <p>Comparaison chronologique des bilans initiaux validés. Les progrès validés après chaque bilan ne modifient pas ces résultats.</p>
    {!bilans.length ? <p>Aucune auto-évaluation validée à comparer.</p> : <>
      <p className="note-tableau">Échelle des niveaux : 1 = ROUGE · 2 = ORANGE · 3 = VERT. Une absence de réponse reste « Non renseigné ».</p>
      {bilans.length === 1 && <p>Une seule auto-évaluation validée : les prochaines permettront de suivre l’évolution.</p>}
      <ol className="legende-evolution">{bilans.map((e, i) => <li key={e.id}>{libelle(e, i)}</li>)}</ol>
      <div className="groupes-evolution">{indicateurs.map((indicateur) => <article key={indicateur.id}>
        <h4><code>{indicateur.code}</code> {indicateur.titre}</h4>
        {bilans.map((e, i) => { const niveau = indicateur.niveaux[i]; return <div className="ligne-evolution" key={e.id} aria-label={`${libelle(e, i)} : ${niveau ?? "Non renseigné"}`}>
          <span aria-hidden="true">A{i + 1}</span><div className="piste-evolution" aria-hidden="true">{niveau && <span className={`barre-evolution barre-${niveau.toLowerCase()}`} style={{ width: `${valeurs[niveau] / 3 * 100}%` }} />}</div><strong aria-hidden="true">{niveau ?? "Non renseigné"}</strong>
        </div>; })}
      </article>)}</div>
      {!indicateurs.length && <p>Aucune réponse exploitable dans les bilans validés.</p>}
    </>}
  </section>;
}
