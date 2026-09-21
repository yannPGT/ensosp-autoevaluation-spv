import { describe, expect, it } from "vitest";
import { construireReglages } from "./parametrage-data.js";

describe("réglages locaux des périmètres", () => {
  it("ne restitue que les réglages rattachés au superviseur responsable", () => {
    const resultats = construireReglages(
      { id: [1, 2], Perimetre: [10, 20], Indicateur: [100, 101], SuperviseurResponsable: [7, 8], Actif: [true, false] },
      { id: [100, 101], Code: ["IND_01", "IND_02"], Titre: ["Premier contact", "Accueil"] },
      { id: [10, 20], Code: ["NORD", "SUD"], Nom: ["Nord", "Sud"] },
      7,
    );
    expect(resultats).toEqual([{ id: 1, perimetreId: 10, perimetre: "Nord", indicateurId: 100, indicateur: "Premier contact", codeIndicateur: "IND_01", actif: true }]);
  });
});
