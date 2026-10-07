import { AxeEvaluation, axesEvaluation, IndicateurEvaluation, Niveau } from "./evaluation-data.js";
import { TableGrist } from "./grist-context.js";

export interface QuestionnaireDefinition {
  version: string;
  axes: readonly AxeEvaluation[];
}

export function questionnaireHistorique(): QuestionnaireDefinition {
  return { version: "historique-1", axes: axesEvaluation };
}

export function indicateursQuestionnaire(questionnaire: QuestionnaireDefinition): readonly IndicateurEvaluation[] {
  return questionnaire.axes.flatMap((axe) => axe.indicateurs);
}

export function serialiserQuestionnaire(questionnaire: QuestionnaireDefinition): string {
  return JSON.stringify(questionnaire);
}

export function questionnaireDepuisSnapshot(snapshot: string): QuestionnaireDefinition | null {
  if (!snapshot.trim()) return null;
  try {
    const valeur = JSON.parse(snapshot) as QuestionnaireDefinition;
    if (!valeur || typeof valeur.version !== "string" || !Array.isArray(valeur.axes)) return null;
    const indicateurs = valeur.axes.flatMap((axe) => Array.isArray(axe.indicateurs) ? axe.indicateurs : []);
    if (!indicateurs.length || indicateurs.some((i) => !i.code || !i.titre || !Array.isArray(i.options))) return null;
    return valeur;
  } catch {
    return null;
  }
}

export function construireQuestionnaire(axes: TableGrist, indicateurs: TableGrist, criteres: TableGrist): QuestionnaireDefinition {
  const axesActifs = (axes.id ?? []).map((v, i) => ({
    id: nombre(v), code: texte(axes.Code?.[i]), titre: texte(axes.Titre?.[i]), ordre: nombre(axes.Ordre?.[i]) ?? i + 1, actif: booleen(axes.Actif?.[i]),
  })).filter((a) => a.id && a.actif).sort((a,b) => a.ordre - b.ordre);

  const indicateursActifs = (indicateurs.id ?? []).map((v, i) => ({
    id: nombre(v), axe: referenceId(indicateurs.Axe?.[i]), code: texte(indicateurs.Code?.[i]), titre: texte(indicateurs.Titre?.[i]), ordre: nombre(indicateurs.Ordre?.[i]) ?? i + 1, actif: booleen(indicateurs.Actif?.[i]),
  })).filter((ind) => ind.id && ind.axe && ind.code && ind.actif);

  const criteresActifs = (criteres.id ?? []).map((v, i) => ({
    indicateur: referenceId(criteres.Indicateur?.[i]), niveau: normaliserNiveau(criteres.Niveau?.[i]), ordre: nombre(criteres.Ordre?.[i]) ?? i + 1, libelle: texte(criteres.Libelle?.[i]), actif: booleen(criteres.Actif?.[i]),
  })).filter((c) => c.indicateur && c.niveau && c.libelle && c.actif);

  const resultat: AxeEvaluation[] = axesActifs.map((axe) => ({
    code: axe.code || `AXE_${axe.id}`,
    titre: axe.titre || axe.code,
    indicateurs: indicateursActifs.filter((ind) => ind.axe === axe.id).sort((a,b) => a.ordre - b.ordre).map((ind) => ({
      code: ind.code,
      titre: ind.titre || ind.code,
      options: (["ROUGE","ORANGE","VERT"] as Niveau[]).map((niveau) => ({
        niveau,
        criteres: criteresActifs.filter((c) => c.indicateur === ind.id && c.niveau === niveau).sort((a,b) => a.ordre - b.ordre).map((c) => c.libelle),
      })).filter((option) => option.criteres.length),
    })),
  })).filter((axe) => axe.indicateurs.length);

  if (!resultat.length) return questionnaireHistorique();
  return { version: empreinteQuestionnaire(resultat), axes: resultat };
}

function empreinteQuestionnaire(axes: readonly AxeEvaluation[]): string {
  const codes = axes.flatMap((axe) => axe.indicateurs.map((i) => i.code)).join("-");
  return `grist-${codes || "referentiel"}`;
}
function referenceId(v: unknown): number | null { if (typeof v === "number" && v > 0) return v; if (Array.isArray(v)) { for (let i=v.length-1;i>=0;i--) if (typeof v[i] === "number" && (v[i] as number)>0) return v[i] as number; } return null; }
function nombre(v: unknown): number | null { return typeof v === "number" && Number.isFinite(v) ? v : null; }
function texte(v: unknown): string { return typeof v === "string" ? v : ""; }
function booleen(v: unknown): boolean { return v === true || v === 1; }
function normaliserNiveau(v: unknown): Niveau | null { const n=texte(v).toUpperCase(); return n === "ROUGE" || n === "ORANGE" || n === "VERT" ? n : null; }
