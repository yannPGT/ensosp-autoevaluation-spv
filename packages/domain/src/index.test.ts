import { describe, expect, it } from "vitest";
import { creerActionsInitiales, RegleMetierError, verifierEvaluationComplete, verifierTransitionAction } from "./index.js";

describe("règles d'évaluation", () => {
  it("refuse une évaluation incomplète", () => {
    expect(() => verifierEvaluationComplete([{ indicateurId: "IND_01", niveau: "VERT" }], ["IND_01", "IND_02"])).toThrow(RegleMetierError);
  });

  it("crée des actions pour les niveaux rouge et orange seulement", () => {
    expect(creerActionsInitiales([
      { indicateurId: "IND_01", niveau: "ROUGE" },
      { indicateurId: "IND_02", niveau: "ORANGE" },
      { indicateurId: "IND_03", niveau: "VERT" }
    ])).toHaveLength(2);
  });

  it("contrôle les transitions de suivi", () => {
    expect(() => verifierTransitionAction("EN_ATTENTE_VALIDATION", "PROGRESSION_VALIDEE")).not.toThrow();
    expect(() => verifierTransitionAction("PROGRESSION_VALIDEE", "EN_COURS")).toThrow(RegleMetierError);
  });
});
