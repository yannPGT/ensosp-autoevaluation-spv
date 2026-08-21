import { describe, expect, it } from "vitest";
import { construireDonneesUtilisateurs, preparerChampsUtilisateur } from "./users-data.js";

describe("données du module Utilisateurs", () => {
  it("résout les références et les périmètres supervisés", () => {
    const donnees = construireDonneesUtilisateurs({
      id: [7], Email: ["alice@example.fr"], Nom: ["DURAND"], Prenom: ["Alice"],
      Role: ["SUPERVISEUR"], PeutGererPedagogie: [true], Entite: [2], PerimetrePrincipal: [11],
      PerimetresSupervises: [["L", 11, 12]], Actif: [true], DateActivation: [1_700_006_400],
    }, {
      id: [2], Code: ["SDIS33"], Nom: ["SDIS de la Gironde"], Actif: [true],
    }, {
      id: [11, 12], Code: ["NORD", "SUD"], Nom: ["Groupement Nord", "Groupement Sud"], Entite: [2, 2], Actif: [true, true],
    });

    expect(donnees.utilisateurs[0]).toMatchObject({
      entite: "SDIS de la Gironde",
      perimetrePrincipal: "Groupement Nord",
      perimetresSupervises: ["Groupement Nord", "Groupement Sud"],
    });
  });

  it("normalise les identités et retire le droit pédagogique d’un recruteur", () => {
    const champs = preparerChampsUtilisateur({
      email: "  Morgan.ROBERT@EXAMPLE.FR ", nom: " robert ", prenom: "mORGAN",
      role: "RECRUTEUR", peutGererPedagogie: true, entiteId: 2, perimetrePrincipalId: 11, actif: true,
    });

    expect(champs).toMatchObject({
      Email: "morgan.robert@example.fr", Nom: "ROBERT", Prenom: "Morgan",
      Role: "RECRUTEUR", PeutGererPedagogie: false, Entite: 2, PerimetrePrincipal: 11, Actif: true,
    });
    expect(champs).toHaveProperty("DateActivation");
    expect(champs.DateDesactivation).toBeNull();
  });

  it("ne réécrit les dates d’activation que lors d’un changement de statut", () => {
    const base = {
      id: 7, email: "alice@example.fr", nom: "DURAND", prenom: "Alice", role: "SUPERVISEUR" as const,
      peutGererPedagogie: true, entiteId: 2, perimetrePrincipalId: 11,
    };
    const sansChangement = preparerChampsUtilisateur({ ...base, actif: true, actifInitial: true });
    const desactivation = preparerChampsUtilisateur({ ...base, actif: false, actifInitial: true });

    expect(sansChangement).not.toHaveProperty("DateActivation");
    expect(sansChangement).not.toHaveProperty("DateDesactivation");
    expect(desactivation.DateActivation).toBeNull();
    expect(desactivation).toHaveProperty("DateDesactivation");
  });
});
