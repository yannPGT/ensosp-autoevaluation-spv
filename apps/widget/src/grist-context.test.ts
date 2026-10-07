import { afterEach, describe, expect, it, vi } from "vitest";
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
      peutGererPedagogie: false,
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


describe("cloisonnement du mode démonstration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("refuse l API hors Grist sans paramètre demo=1", async () => {
    vi.stubGlobal("window", { parent: null, location: { search: "" } });
    (window as unknown as {parent:unknown}).parent = window;
    const { obtenirDocApiGrist } = await import("./grist-context.js");
    expect(() => obtenirDocApiGrist()).toThrow(/document Grist/);
  });

  it("neutralise explicitement l API avec demo=1", async () => {
    vi.stubGlobal("window", { parent: null, location: { search: "?demo=1&role=RECRUTEUR" } });
    (window as unknown as {parent:unknown}).parent = window;
    const { obtenirDocApiGrist } = await import("./grist-context.js");
    expect(obtenirDocApiGrist()).toBeNull();
  });
});
