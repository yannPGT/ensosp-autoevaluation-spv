import { describe, expect, it } from "vitest";
import { construireDonneesOperationnelles, peutConsulterFiches } from "./operational-data.js";

describe("données recruteur et superviseur", () => {
  it("rattache les actions et le catalogue publié aux indicateurs", () => {
    const d = construireDonneesOperationnelles(
      { id: [3], Prenom: ["Morgan"], Nom: ["ROBERT"], Email: ["m@x"], Role: ["RECRUTEUR"], PerimetrePrincipal: [1], Actif: [true] },
      { id: [1], Nom: ["Nord"] },
      { id: [10], Uid: ["E"], Recruteur: [3], Perimetre: [1], Statut: ["VALIDEE"], ProgressionComplete: [100] },
      { id: [11], Evaluation: [10], Indicateur: [20], Niveau: ["ROUGE"] },
      { id: [20], Code: ["IND_01"], Titre: ["Premier contact"] },
      { id: [30], Uid: ["A"], Recruteur: [3], Perimetre: [1], Indicateur: [20], NiveauInitial: ["ROUGE"], NiveauCourant: ["ORANGE"], Statut: ["EN_COURS"], PriseEnCompteFiche: [false], FicheVersion: [40] },
      { id: [] },
      { id: [40], Fiche: [50], NumeroVersion: ["1.0"], NomFichier: ["fiche.pdf"], FichierPDF: [["L", 99]], EstPubliee: [true] },
      { id: [50], Code: ["FICHE_01"], Titre: ["Bien accueillir"], Description: ["Repères"], VersionActive: [40], Statut: ["PUBLIEE"], Actif: [true] },
      { id: [60], Fiche: [50], Indicateur: [20], DeclencheRouge: [true], DeclencheOrange: [false], Actif: [true] },
    );
    expect(d.evaluations[0]?.reponses[0]?.codeIndicateur).toBe("IND_01");
    expect(d.actions[0]).toMatchObject({ recruteur: "Morgan ROBERT", fiche: "Bien accueillir", attachmentId: 99, niveauCourant: "ORANGE", priseEnCompteFiche: false });
    expect(d.fiches[0]).toMatchObject({ titre: "Bien accueillir", codeIndicateur: "IND_01", niveau: "ROUGE", versionId: 40 });
  });

  it("ouvre le catalogue seulement après une évaluation complète et validée", () => {
    const base = { id: 1, uid: "E", recruteurId: 3, recruteur: "Morgan", perimetre: "Nord", dateDebut: "—", dateValidation: "—", dateValidationTimestamp: 0, reponses: [] } as const;
    expect(peutConsulterFiches([{ ...base, statut: "BROUILLON", progression: 100 }], 3)).toBe(false);
    expect(peutConsulterFiches([{ ...base, statut: "VALIDEE", progression: 92 }], 3)).toBe(false);
    expect(peutConsulterFiches([{ ...base, statut: "VALIDEE", progression: 100 }], 3)).toBe(true);
  });
});
