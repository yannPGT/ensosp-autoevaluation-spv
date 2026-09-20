import { Niveau } from "./evaluation-data.js";

export function compterReponsesNonEnregistrees(
  reponses: Record<string, Niveau>,
  reponsesSauvegardees: Record<string, Niveau>,
): number {
  return Object.entries(reponses)
    .filter(([code, niveau]) => reponsesSauvegardees[code] !== niveau).length;
}

export function messageEchecSauvegarde(erreur: unknown): string {
  const detail = erreur instanceof Error ? erreur.message : "La réponse n’a pas pu être enregistrée.";
  return `Échec de la sauvegarde : ${detail}`;
}
