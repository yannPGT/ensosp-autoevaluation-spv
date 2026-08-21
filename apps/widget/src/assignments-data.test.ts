import { describe, expect, it } from "vitest";
import { construireDonneesAffectations, validerCloture, validerNouvelleAffectation } from "./assignments-data.js";

function donnees() {
  return construireDonneesAffectations({
    id: [2, 3], Prenom: ["Camille", "Nora"], Nom: ["BERNARD", "DUPONT"], Email: ["camille@example.fr", "nora@example.fr"],
    Role: ["SUPERVISEUR", "SUPERVISEUR"], Actif: [true, true], PerimetresSupervises: [["L", 11], ["L", 12]],
  }, {
    id: [11, 12], Code: ["PER_33_NORD", "PER_33_SUD"], Nom: ["Groupement Nord", "Groupement Sud"], Entite: [1, 1], Actif: [true, true],
  }, { id: [1], Nom: ["SDIS de la Gironde"] }, {
    id: [20, 21], Superviseur: [2, 3], Perimetre: [11, 11], DateDebut: [1_700_006_400, 1_650_067_200], DateFin: [null, 1_680_048_000], Actif: [true, false],
  });
}

describe("données du module Affectations", () => {
  it("détecte les profils désynchronisés avec l’historique actif", () => {
    const resultat = donnees();
    expect(resultat.superviseurs.find((superviseur) => superviseur.id === 2)).toMatchObject({ affectationsActives: 1, synchronise: true });
    expect(resultat.superviseurs.find((superviseur) => superviseur.id === 3)).toMatchObject({ affectationsActives: 0, synchronise: false });
  });

  it("refuse une seconde affectation active identique", () => {
    const resultat = donnees();
    expect(() => validerNouvelleAffectation({ superviseurId: 2, perimetreId: 11, dateDebut: "2026-08-21" }, resultat)).toThrow(/déjà une affectation active/);
    expect(() => validerNouvelleAffectation({ superviseurId: 3, perimetreId: 11, dateDebut: "2023-03-01" }, resultat)).toThrow(/après la dernière période/);
    expect(() => validerNouvelleAffectation({ superviseurId: 3, perimetreId: 11, dateDebut: "2024-01-01" }, resultat)).not.toThrow();
  });

  it("contrôle la date de clôture et le statut de la ligne", () => {
    const resultat = donnees();
    expect(() => validerCloture(20, "2020-01-01", resultat)).toThrow(/précéder/);
    expect(() => validerCloture(21, "2026-08-21", resultat)).toThrow(/plus active/);
    expect(validerCloture(20, "2026-08-21", resultat).id).toBe(20);
  });
});
