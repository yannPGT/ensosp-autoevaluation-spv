import { describe, expect, it } from "vitest";
import { axesEvaluation } from "./evaluation-data.js";
import { construireQuestionnaire, indicateursQuestionnaire, questionnaireDepuisSnapshot, questionnaireHistorique, serialiserQuestionnaire } from "./questionnaire-data.js";

describe("questionnaire restauré", () => {
  it("conserve les trois axes et les treize indicateurs historiques sans réécriture", () => {
    const questionnaire = questionnaireHistorique();
    expect(questionnaire.axes).toBe(axesEvaluation);
    expect(questionnaire.axes).toHaveLength(3);
    expect(indicateursQuestionnaire(questionnaire)).toHaveLength(13);
  });
  it("conserve un instantané même si le référentiel courant change", () => {
    const questionnaire = questionnaireHistorique();
    expect(questionnaireDepuisSnapshot(serialiserQuestionnaire(questionnaire))).toEqual(questionnaire);
    expect(questionnaireDepuisSnapshot("")).toBeNull();
    expect(questionnaireDepuisSnapshot("invalide")).toBeNull();
  });
  it("utilise les lignes actives du référentiel Grist et leurs critères", () => {
    const questionnaire = construireQuestionnaire(
      { id: [1], Code: ["AXE_1"], Titre: ["Axe existant"], Actif: [true] },
      { id: [10, 11], Axe: [1, 1], Code: ["IND_01", "IND_02"], Titre: ["Premier", "Inactif"], Actif: [true, false] },
      { id: [20], Indicateur: [10], Niveau: ["VERT"], Libelle: ["Critère existant"], Actif: [true] },
    );
    expect(indicateursQuestionnaire(questionnaire)).toEqual([
      { code: "IND_01", titre: "Premier", options: [{ niveau: "VERT", criteres: ["Critère existant"] }] },
    ]);
  });
});
