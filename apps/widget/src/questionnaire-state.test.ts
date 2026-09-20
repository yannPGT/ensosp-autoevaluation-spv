import { describe, expect, it } from "vitest";
import { compterReponsesNonEnregistrees, messageEchecSauvegarde } from "./questionnaire-state.js";

describe("état de sauvegarde du questionnaire", () => {
  it("distingue les réponses saisies des réponses réellement enregistrées", () => {
    expect(compterReponsesNonEnregistrees(
      { I01: "ORANGE", I02: "VERT" },
      { I01: "ROUGE", I02: "VERT" },
    )).toBe(1);
  });

  it.each([
    new Error("Blocked by column update access rules"),
    new TypeError("Failed to fetch"),
  ])("présente explicitement un échec sans annoncer de succès", (erreur) => {
    const message = messageEchecSauvegarde(erreur);
    expect(message).toContain("Échec de la sauvegarde");
    expect(message).not.toContain("Brouillon enregistré");
  });
});
