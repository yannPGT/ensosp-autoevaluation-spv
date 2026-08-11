export type Id = string;
export type Niveau = "ROUGE" | "ORANGE" | "VERT";
export type StatutEvaluation = "BROUILLON" | "VALIDEE" | "ARCHIVEE";
export type StatutAction =
  | "A_PRENDRE_EN_COMPTE"
  | "EN_COURS"
  | "PRISE_EN_COMPTE_DECLAREE"
  | "EN_ATTENTE_VALIDATION"
  | "COMPLEMENT_DEMANDE"
  | "PROGRESSION_VALIDEE"
  | "VALIDATION_REFUSEE"
  | "ECHEANCE_DEPASSEE"
  | "ARCHIVEE";

export interface ReponseEvaluation {
  indicateurId: Id;
  niveau: Niveau;
}

export interface ActionProgresInitiale {
  indicateurId: Id;
  niveauInitial: Extract<Niveau, "ROUGE" | "ORANGE">;
  statut: "A_PRENDRE_EN_COMPTE";
}

export class RegleMetierError extends Error {}

export function verifierEvaluationComplete(reponses: readonly ReponseEvaluation[], indicateursObligatoires: readonly Id[]): void {
  const ids = new Set(reponses.map((reponse) => reponse.indicateurId));
  if (ids.size !== reponses.length) throw new RegleMetierError("Chaque indicateur ne peut recevoir qu'une réponse.");
  const manquants = indicateursObligatoires.filter((id) => !ids.has(id));
  if (manquants.length > 0) throw new RegleMetierError("Les 13 indicateurs obligatoires doivent être renseignés.");
}

export function creerActionsInitiales(reponses: readonly ReponseEvaluation[]): ActionProgresInitiale[] {
  return reponses
    .filter((reponse): reponse is ReponseEvaluation & { niveau: "ROUGE" | "ORANGE" } => reponse.niveau !== "VERT")
    .map((reponse) => ({ indicateurId: reponse.indicateurId, niveauInitial: reponse.niveau, statut: "A_PRENDRE_EN_COMPTE" }));
}

const transitions: Readonly<Record<StatutAction, readonly StatutAction[]>> = {
  A_PRENDRE_EN_COMPTE: ["EN_COURS", "PRISE_EN_COMPTE_DECLAREE", "ARCHIVEE"],
  EN_COURS: ["PRISE_EN_COMPTE_DECLAREE", "ECHEANCE_DEPASSEE", "ARCHIVEE"],
  PRISE_EN_COMPTE_DECLAREE: ["EN_ATTENTE_VALIDATION", "EN_COURS"],
  EN_ATTENTE_VALIDATION: ["PROGRESSION_VALIDEE", "COMPLEMENT_DEMANDE", "VALIDATION_REFUSEE"],
  COMPLEMENT_DEMANDE: ["EN_COURS", "PRISE_EN_COMPTE_DECLAREE", "ARCHIVEE"],
  PROGRESSION_VALIDEE: ["ARCHIVEE"],
  VALIDATION_REFUSEE: ["EN_COURS", "ARCHIVEE"],
  ECHEANCE_DEPASSEE: ["EN_COURS", "PRISE_EN_COMPTE_DECLAREE", "ARCHIVEE"],
  ARCHIVEE: []
};

export function verifierTransitionAction(de: StatutAction, vers: StatutAction): void {
  if (!transitions[de].includes(vers)) throw new RegleMetierError(`Transition interdite : ${de} vers ${vers}.`);
}

