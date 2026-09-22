import { ActionMetier, EvaluationMetier } from "./operational-data.js";
import { UtilisateurCourant } from "./portal-data.js";

export function suiviCsv(actions: readonly ActionMetier[], utilisateur: UtilisateurCourant): string {
  const colonnes = ["Recruteur", "Périmètre", "Code indicateur", "Indicateur", "Niveau initial", "Niveau courant", "Statut", "Échéance", "Fiche", "Version", "Commentaire recruteur", "Commentaire superviseur"];
  const visibles = actions.filter((a) => utilisateur.role === "ADMIN" || a.recruteurId === utilisateur.id || utilisateur.perimetresSupervises.includes(a.perimetre));
  const cellule = (v: unknown) => { const s = v == null ? "" : String(v); return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [colonnes.join(";"), ...visibles.map((a) => [a.recruteur, a.perimetre, a.codeIndicateur, a.indicateur, a.niveauInitial, a.niveauCourant, libelleStatut(a.statut), a.echeance, a.fiche, a.version, a.commentaireRecruteur, a.commentaireSuperviseur].map(cellule).join(";"))].join("\r\n");
}

export function imprimerPdf(titre: string, contenu: string): void {
  const fenetre = window.open("", "_blank", "noopener,noreferrer");
  if (!fenetre) throw new Error("La fenêtre d’export a été bloquée. Autorisez les fenêtres secondaires puis réessayez.");
  fenetre.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapperHtml(titre)}</title><style>@page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;color:#182230;line-height:1.4}h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 8px;border-bottom:1px solid #ccd4df;padding-bottom:4px}.meta{color:#536273;font-size:12px;margin-bottom:16px}.ligne{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #e2e7ec;padding:7px 0}.niveau{font-weight:bold}.note{white-space:pre-wrap;color:#536273;font-size:12px}@media print{button{display:none}}</style></head><body>${contenu}</body></html>`);
  fenetre.document.close();
  fenetre.focus();
  window.setTimeout(() => { fenetre.print(); fenetre.close(); }, 120);
}

export function bilanHtml(evaluation: EvaluationMetier, utilisateur: UtilisateurCourant): string {
  const lignes = evaluation.reponses.map((r) => `<div class="ligne"><span><strong>${echapperHtml(r.codeIndicateur)}</strong> — ${echapperHtml(r.indicateur)}${r.commentaire ? `<br><span class="note">${echapperHtml(r.commentaire)}</span>` : ""}</span><span class="niveau">${r.niveau}</span></div>`).join("");
  return `<h1>Bilan individuel d’auto-évaluation</h1><p class="meta">${echapperHtml(evaluation.recruteur)} · ${echapperHtml(evaluation.perimetre)}<br>Évaluation ${echapperHtml(evaluation.uid || String(evaluation.id))} · ${echapperHtml(evaluation.dateValidation)} · Référentiel ${echapperHtml(evaluation.referentielVersion || "non renseigné")}<br>Export demandé par ${echapperHtml(utilisateur.prenom)} ${echapperHtml(utilisateur.nom)}</p><h2>Résultats (${evaluation.progression} %)</h2>${lignes}`;
}

export function feuilleRouteHtml(actions: readonly ActionMetier[], utilisateur: UtilisateurCourant): string {
  const lignes = actions.filter((a) => a.recruteurId === utilisateur.id || utilisateur.role !== "RECRUTEUR").map((a) => `<div class="ligne"><span><strong>${echapperHtml(a.codeIndicateur)}</strong> — ${echapperHtml(a.indicateur)}<br><span class="note">${echapperHtml(a.perimetre)} · ${echapperHtml(a.fiche)}${a.version ? ` · version ${echapperHtml(a.version)}` : ""}</span></span><span class="niveau">${echapperHtml(a.niveauCourant)}<br><span class="note">${echapperHtml(libelleStatut(a.statut))} · ${echapperHtml(a.echeance)}</span></span></div>`).join("");
  return `<h1>Feuille de route de progression</h1><p class="meta">${echapperHtml(utilisateur.prenom)} ${echapperHtml(utilisateur.nom)} · ${echapperHtml(utilisateur.perimetrePrincipal)}<br>Éditée le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date())}</p><h2>Actions suivies</h2>${lignes || "<p>Aucune action à restituer.</p>"}`;
}

export function telechargerTexte(nom: string, contenu: string): void {
  const blob = new Blob(["\uFEFF", contenu], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const lien = document.createElement("a"); lien.href = url; lien.download = nom; lien.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function echapperHtml(v: string): string { return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)); }
function libelleStatut(s: string): string { return s.replaceAll("_", " ").toLocaleLowerCase("fr").replace(/^./, (x) => x.toLocaleUpperCase("fr")); }
