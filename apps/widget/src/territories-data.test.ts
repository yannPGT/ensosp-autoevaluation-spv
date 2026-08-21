import { describe, expect, it } from "vitest";
import { construireDonneesTerritoires, validerEntite, validerPerimetre } from "./territories-data.js";

function donnees() {
  return construireDonneesTerritoires({
    id: [1, 2, 3], Code: ["ENSOSPP", "SIS_33", "SIS_40"], Nom: ["ENSOSPP", "SDIS de la Gironde", "SDIS des Landes"], Parent: [null, 1, 1], Actif: [true, true, false],
  }, {
    id: [11, 12], Code: ["PER_33_GLOBAL", "PER_33_NORD"], Nom: ["SDIS 33 global", "Groupement Nord"], Entite: [2, 2], Actif: [true, true],
  }, {
    id: [7], Entite: [2], PerimetrePrincipal: [12], Actif: [true],
  }, {
    id: [4], Perimetre: [12], Actif: [true],
  });
}

describe("données du module Entités et périmètres", () => {
  it("calcule les dépendances actives", () => {
    const resultat = donnees();
    expect(resultat.entites.find((entite) => entite.id === 2)).toMatchObject({ perimetres: 2, perimetresActifs: 2, utilisateursActifs: 1 });
    expect(resultat.perimetres.find((perimetre) => perimetre.id === 12)).toMatchObject({ utilisateursActifs: 1, affectationsActives: 1 });
  });

  it("interdit la réutilisation d’un code inactif et les cycles hiérarchiques", () => {
    const resultat = donnees();
    expect(() => validerEntite({ code: "SIS_40", nom: "Nouvelle entité", parentId: 0, actif: true }, resultat)).toThrow(/existe déjà/);
    expect(() => validerEntite({ id: 1, code: "ENSOSPP", nom: "ENSOSPP", parentId: 2, actif: true }, resultat)).toThrow(/boucle/);
    expect(() => validerEntite({ code: "SIS_64", nom: "SDIS test", parentId: 3, actif: true }, resultat)).toThrow(/parente inactive/);
  });

  it("protège les références encore utilisées lors d’une désactivation", () => {
    const resultat = donnees();
    expect(() => validerEntite({ id: 2, code: "SIS_33", nom: "SDIS de la Gironde", parentId: 1, actif: false }, resultat)).toThrow(/périmètres actifs/);
    expect(() => validerEntite({ id: 1, code: "ENSOSPP", nom: "ENSOSPP", parentId: 0, actif: false }, resultat)).toThrow(/enfants actives/);
    expect(() => validerPerimetre({ id: 12, code: "PER_33_NORD", nom: "Groupement Nord", entiteId: 2, actif: false }, resultat)).toThrow(/Réaffectez/);
  });
});
