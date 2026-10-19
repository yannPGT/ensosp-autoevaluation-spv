import { EvaluationMetier } from "./operational-data.js";

/** Compare les bilans initiaux validés, sans intégrer les progrès ultérieurs. */
export function evolutionRecruteur(evaluations: readonly EvaluationMetier[], recruteurId: number) {
  const bilans = evaluations.filter((e) => e.recruteurId === recruteurId && e.statut === "VALIDEE")
    .sort((a, b) => a.dateValidationTimestamp - b.dateValidationTimestamp || a.id - b.id);
  const indicateurs = new Map<number, { id: number; code: string; titre: string }>();
  bilans.forEach((e) => e.reponses.forEach((r) => indicateurs.set(r.indicateurId, { id: r.indicateurId, code: r.codeIndicateur, titre: r.indicateur })));
  return {
    bilans,
    indicateurs: [...indicateurs.values()].sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true }) || a.id - b.id)
      .map((i) => ({ ...i, niveaux: bilans.map((e) => e.reponses.find((r) => r.indicateurId === i.id)?.niveau ?? null) })),
  };
}
