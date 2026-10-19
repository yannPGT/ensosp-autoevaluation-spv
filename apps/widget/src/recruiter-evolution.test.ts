import { describe, expect, it } from "vitest";
import { EvaluationMetier, ReponseMetier } from "./operational-data.js";
import { evolutionRecruteur } from "./recruiter-evolution.js";

const reponse = (indicateurId: number, niveau: ReponseMetier["niveau"]): ReponseMetier => ({ id: indicateurId, evaluationId: 1, indicateurId, codeIndicateur: `IND_${indicateurId}`, indicateur: `Indicateur ${indicateurId}`, niveau, commentaire: "" });
const bilan = (id: number, recruteurId: number, date: number, reponses: ReponseMetier[], statut = "VALIDEE"): EvaluationMetier => ({ id, recruteurId, dateValidationTimestamp: date, reponses, statut, uid: String(id), recruteur: "Nom", perimetre: "Périmètre", progression: 100, dateDebut: "—", dateValidation: "—" });

describe("évolution du recruteur", () => {
  it("isole le recruteur, exclut les brouillons et classe les bilans par date puis identifiant", () => {
    const evaluations = [bilan(3, 1, 20, []), bilan(8, 2, 1, []), bilan(4, 1, 10, []), bilan(2, 1, 20, []), bilan(5, 1, 30, [], "BROUILLON")];
    expect(evolutionRecruteur(evaluations, 1).bilans.map((e) => e.id)).toEqual([4, 2, 3]);
    expect(evaluations.map((e) => e.id)).toEqual([3, 8, 4, 2, 5]);
  });
  it("aligne les indicateurs par identité et laisse les réponses absentes à null", () => {
    const resultat = evolutionRecruteur([bilan(1, 1, 10, [reponse(2, "ROUGE"), reponse(1, "ORANGE")]), bilan(2, 1, 20, [reponse(1, "VERT")])], 1);
    expect(resultat.indicateurs.map((i) => [i.id, i.niveaux])).toEqual([[1, ["ORANGE", "VERT"]], [2, ["ROUGE", null]]]);
  });
  it("gère un historique vide ou un seul bilan sans inventer de résultats", () => {
    expect(evolutionRecruteur([], 1)).toEqual({ bilans: [], indicateurs: [] });
    expect(evolutionRecruteur([bilan(1, 1, 10, [reponse(1, "VERT")])], 1).indicateurs[0]?.niveaux).toEqual(["VERT"]);
  });
});
