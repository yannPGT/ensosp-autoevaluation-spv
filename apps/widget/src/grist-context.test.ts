import { describe, expect, it } from "vitest";
import { construireUtilisateur } from "./grist-context.js";

const entites = { id: [2], Nom: ["SDIS de test"] };
const perimetres = { id: [11, 12], Nom: ["Groupement Nord", "Groupement Sud"] };

describe("construireUtilisateur", () => {
  it("convertit les références Grist en profil applicatif", () => {
    const profil = construireUtilisateur(7, {
      id: [7],
      Prenom: ["Alice"],
      Nom: ["DURAND"],
      Email: ["alice@example.invalid"],
      Role: ["SUPERVISEUR"],
      Entite: [2],
      PerimetrePrincipal: [11],
      PerimetresSupervises: [["L", 11, 12]],
      PeutGererPedagogie: [true],
      Actif: [true],
    }, entites, perimetres);

    expect(profil).toMatchObject({
      prenom: "Alice",
      nom: "DURAND",
      role: "SUPERVISEUR",
      entite: "SDIS de test",
      perimetrePrincipal: "Groupement Nord",
      perimetresSupervises: ["Groupement Nord", "Groupement Sud"],
      peutGererPedagogie: true,
    });
  });

  it("refuse un compte désactivé", () => {
    expect(() => construireUtilisateur(7, { id: [7], Actif: [false] }, entites, perimetres))
      .toThrow("désactivé");
  });

  it("refuse un rôle non prévu", () => {
    expect(() => construireUtilisateur(7, {
      id: [7], Actif: [true], Role: ["INVITE"],
    }, entites, perimetres)).toThrow("n’est pas reconnu");
  });
});
