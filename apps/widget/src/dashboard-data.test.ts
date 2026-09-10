import { describe, expect, it } from "vitest";
import { construireTableauDeBord } from "./dashboard-data.js";
import { UtilisateurCourant } from "./portal-data.js";

const baseUtilisateur: UtilisateurCourant = {
  id: 7,
  prenom: "Alice",
  nom: "DURAND",
  email: "alice@example.invalid",
  role: "RECRUTEUR",
  entite: "SDIS de test",
  perimetrePrincipal: "Groupement Nord",
  perimetresSupervises: [],
  superviseurNom: "Camille BERNARD",
  peutGererPedagogie: false,
  actif: true,
};

describe("construireTableauDeBord", () => {
  it("calcule le tableau personnel du recruteur avec les niveaux courants validés", () => {
    const tableau = construireTableauDeBord(baseUtilisateur, {
      Evaluations: {
        id: [10, 11], Recruteur: [7, 7], Statut: ["VALIDEE", "BROUILLON"],
        DateValidation: [1_700_000_000, null],
      },
      Reponses: { id: [1, 2, 3], Evaluation: [10, 10, 10], Niveau: ["ROUGE", "ORANGE", "VERT"] },
      ActionsProgres: {
        id: [20, 21, 22], Recruteur: [7, 7, 7], Reponse: [1, 2, 2],
        Statut: ["EN_COURS", "PROGRESSION_VALIDEE", "EN_ATTENTE_VALIDATION"],
        Echeance: [4_102_444_800, 4_102_444_800, 4_102_444_800],
        FicheVersion: [5, 5, 6], NiveauCourant: ["ROUGE", "VERT", "ORANGE"],
      },
    });

    expect(carte(tableau, "Actions ouvertes").valeur).toBe("2");
    expect(carte(tableau, "Validations en attente").valeur).toBe("1");
    expect(carte(tableau, "Fiches affectées").valeur).toBe("2");
    expect(tableau.repartition).toEqual({ rouge: 1, orange: 0, vert: 2 });
  });

  it("agrège seulement la dernière évaluation validée de chaque recruteur", () => {
    const tableau = construireTableauDeBord({ ...baseUtilisateur, role: "SUPERVISEUR" }, {
      Utilisateurs: {
        id: [7, 8, 9], Prenom: ["Alice", "Bob", "Claire"], Nom: ["DURAND", "MARTIN", "PETIT"],
        Role: ["RECRUTEUR", "RECRUTEUR", "RECRUTEUR"], Actif: [true, true, true],
      },
      Evaluations: {
        id: [10, 11, 12], Recruteur: [["Ref", 7], ["Ref", 7], ["Ref", 8]], Statut: ["VALIDEE", "VALIDEE", "VALIDEE"],
        DateValidation: [1_600_000_000, 1_700_000_000, 1_700_000_000],
      },
      Reponses: {
        id: [1, 2, 3], Evaluation: [["Ref", 10], ["Ref", 11], ["Ref", 12]],
        Indicateur: [["Ref", 101], ["Ref", 101], ["Ref", 102]], Niveau: ["ROUGE", "VERT", "ORANGE"],
      },
      Indicateurs: {
        id: [101, 102, 103], Code: ["IND_01", "IND_02", "IND_03"],
        Titre: ["Premier contact", "Premier accueil", "Décision"], Actif: [true, true, true],
      },
      ActionsProgres: { id: [], Statut: [] },
    });

    expect(carte(tableau, "Taux de réalisation").valeur).toBe("67 %");
    expect(tableau.repartition).toEqual({ rouge: 0, orange: 1, vert: 1 });
    expect(tableau.suiviPedagogique).toEqual([
      { id: 102, code: "IND_02", titre: "Premier accueil", rouge: 0, orange: 1, total: 1, echantillon: 1 },
      { id: 101, code: "IND_01", titre: "Premier contact", rouge: 0, orange: 0, total: 0, echantillon: 1 },
      { id: 103, code: "IND_03", titre: "Décision", rouge: 0, orange: 0, total: 0, echantillon: 0 },
    ]);
    expect(tableau.lignes).toHaveLength(3);
    expect(tableau.personnel).toHaveLength(3);
    expect(tableau.personnel.find((personne) => personne.id === 9)?.derniereEvaluation).toBe("Aucune évaluation");
  });

  it("applique les progrès validés au suivi pédagogique par indicateur", () => {
    const tableau = construireTableauDeBord({ ...baseUtilisateur, role: "ADMIN" }, {
      Utilisateurs: { id: [7], Role: ["RECRUTEUR"], Actif: [true] },
      Perimetres: { id: [], Actif: [] },
      Evaluations: { id: [10], Recruteur: [7], Statut: ["VALIDEE"], DateValidation: [1_700_000_000] },
      Reponses: {
        id: [1, 2], Evaluation: [10, 10], Indicateur: [101, 102], Niveau: ["ROUGE", "ORANGE"],
      },
      ActionsProgres: {
        id: [20], Reponse: [1], NiveauCourant: ["VERT"], Statut: ["PROGRESSION_VALIDEE"],
      },
      Indicateurs: {
        id: [101, 102], Code: ["IND_01", "IND_02"], Titre: ["Contact", "Accueil"], Actif: [true, true],
      },
      FichesEnseignement: { id: [], Statut: [], Actif: [] },
    });

    expect(tableau.suiviPedagogique).toEqual([
      { id: 102, code: "IND_02", titre: "Accueil", rouge: 0, orange: 1, total: 1, echantillon: 1 },
      { id: 101, code: "IND_01", titre: "Contact", rouge: 0, orange: 0, total: 0, echantillon: 1 },
    ]);
  });

  it("produit la consolidation administrateur sans classement", () => {
    const tableau = construireTableauDeBord({ ...baseUtilisateur, role: "ADMIN" }, {
      Utilisateurs: {
        id: [1, 7, 8], Role: ["ADMIN", "RECRUTEUR", "SUPERVISEUR"], Actif: [true, true, true],
      },
      Perimetres: { id: [3], Nom: ["Groupement Nord"], Actif: [true] },
      Evaluations: { id: [10], Recruteur: [7], Perimetre: [3], Statut: ["VALIDEE"], DateValidation: [1_700_000_000] },
      Reponses: { id: [1], Evaluation: [10], Niveau: ["VERT"] },
      ActionsProgres: { id: [], Statut: [] },
      FichesEnseignement: { id: [4, 5], Statut: ["PUBLIEE", "BROUILLON"], Actif: [true, true] },
    });

    expect(carte(tableau, "Utilisateurs actifs").valeur).toBe("3");
    expect(carte(tableau, "Taux de complétion").valeur).toBe("100 %");
    expect(carte(tableau, "Fiches publiées").valeur).toBe("1");
    expect(tableau.lignes[0]?.titre).toBe("Groupement Nord");
  });
});

function carte(tableau: ReturnType<typeof construireTableauDeBord>, libelle: string) {
  const resultat = tableau.cartes.find((element) => element.libelle === libelle);
  if (!resultat) throw new Error(`Carte manquante : ${libelle}`);
  return resultat;
}
