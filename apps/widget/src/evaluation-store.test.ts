import { afterEach, describe, expect, it, vi } from "vitest";
import { enregistrerReponse, ficheDeclenchee, validerEvaluation } from "./evaluation-store.js";
import { DocApiGrist, TableGrist } from "./grist-context.js";

const tables: Record<string, TableGrist> = {
  Evaluations: {
    id: [10],
    Recruteur: [7],
    Perimetre: [3],
    Statut: ["BROUILLON"],
  },
  Indicateurs: {
    id: [21],
    Code: ["I01"],
  },
};

function installerGrist(reponses: TableGrist) {
  const lotsAppliques: unknown[][][] = [];
  const applyUserActions = vi.fn(async (actions: unknown[][]) => {
    lotsAppliques.push(actions);
  });
  const docApi: DocApiGrist = {
    applyUserActions,
    fetchTable: vi.fn(async (tableId: string) => tableId === "Reponses" ? reponses : (tables[tableId] ?? {})),
  };
  vi.stubGlobal("window", { parent: {}, grist: { docApi } });
  return { applyUserActions, lotsAppliques };
}

function installerValidation(nombreReponses: number, options: { statut?: string; niveauInvalide?: boolean; horsReferentiel?: boolean } = {}) {
  const idsIndicateurs = Array.from({ length: 13 }, (_, index) => index + 1);
  const idsReponses = Array.from({ length: nombreReponses }, (_, index) => index + 101);
  const tablesValidation: Record<string, TableGrist> = {
    Evaluations: {
      id: [10], Uid: ["evaluation-10"], Recruteur: [7], Perimetre: [3], Statut: [options.statut ?? "BROUILLON"],
    },
    Indicateurs: {
      id: idsIndicateurs, Actif: idsIndicateurs.map(() => true), Obligatoire: idsIndicateurs.map(() => true),
    },
    Reponses: {
      id: idsReponses,
      Evaluation: idsReponses.map(() => 10),
      Indicateur: idsReponses.map((_, index) => options.horsReferentiel && index === 0 ? 999 : idsIndicateurs[index]),
      Niveau: idsReponses.map((_, index) => options.niveauInvalide && index === 0 ? "BLEU" : "VERT"),
    },
    FeuillesRoute: { id: [40], Evaluation: [10] },
    FicheIndicateurs: { id: [] },
    FichesEnseignement: { id: [] },
    ActionsProgres: { id: [] },
  };
  const lotsAppliques: unknown[][][] = [];
  const applyUserActions = vi.fn(async (actions: unknown[][]) => {
    lotsAppliques.push(actions);
  });
  const docApi: DocApiGrist = {
    applyUserActions,
    fetchTable: vi.fn(async (tableId: string) => tablesValidation[tableId] ?? {}),
  };
  vi.stubGlobal("window", { parent: {}, grist: { docApi } });
  return { applyUserActions, lotsAppliques };
}

const recruteur = {
  id: 7, prenom: "Emy", nom: "TEST", email: "emy@example.invalid", role: "RECRUTEUR" as const,
  entite: "SDIS test", perimetrePrincipal: "Groupement test", perimetresSupervises: [],
  superviseurNom: "Superviseur", peutGererPedagogie: false, actif: true,
};

afterEach(() => vi.unstubAllGlobals());

describe("ficheDeclenchee", () => {
  it.each([
    ["VERT", false, true, false],
    ["ORANGE", false, true, true],
    ["ROUGE", false, true, true],
    ["ORANGE", true, false, false],
    ["ROUGE", true, false, true],
    ["ROUGE", true, true, true],
  ] as const)(
    "niveau %s avec seuil rouge=%s et orange=%s retourne %s",
    (niveau, declencheRouge, declencheOrange, attendu) => {
      expect(ficheDeclenchee(niveau, declencheRouge, declencheOrange)).toBe(attendu);
    },
  );
});

describe("enregistrerReponse", () => {
  it("crée une réponse sans écrire les horodatages techniques protégés", async () => {
    const { applyUserActions: appliquer, lotsAppliques } = installerGrist({ id: [], Evaluation: [], Indicateur: [] });

    await enregistrerReponse(10, "I01", "ORANGE");

    expect(appliquer).toHaveBeenCalledOnce();
    const actions = lotsAppliques[0] ?? [];
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject([
      "AddRecord",
      "Reponses",
      null,
      { Evaluation: 10, Recruteur: 7, Perimetre: 3, Indicateur: 21, Niveau: "ORANGE" },
    ]);
    expect(actions[0]?.[3]).not.toHaveProperty("DateReponse");
  });

  it("modifie uniquement le niveau d’une réponse existante", async () => {
    const { applyUserActions: appliquer } = installerGrist({ id: [30], Evaluation: [10], Indicateur: [21] });

    await enregistrerReponse(10, "I01", "VERT");

    expect(appliquer).toHaveBeenCalledWith([
      ["UpdateRecord", "Reponses", 30, { Niveau: "VERT" }],
    ]);
  });
});

describe("validerEvaluation", () => {
  it("refuse une évaluation limitée à 12 réponses sur 13", async () => {
    const { applyUserActions } = installerValidation(12);

    await expect(validerEvaluation(10, recruteur)).rejects.toThrow("Tous les indicateurs obligatoires");
    expect(applyUserActions).not.toHaveBeenCalled();
  });

  it("valide 13 réponses sans écrire les colonnes calculées ou techniques", async () => {
    const { lotsAppliques } = installerValidation(13);

    await validerEvaluation(10, recruteur);

    expect(lotsAppliques[0]).toEqual([["UpdateRecord", "Evaluations", 10, {
      Statut: "VALIDEE",
      DateValidation: expect.any(Number),
    }]]);
    expect(lotsAppliques[0]?.[0]?.[3]).not.toHaveProperty("ProgressionComplete");
    expect(lotsAppliques[0]?.[0]?.[3]).not.toHaveProperty("UpdatedAt");
  });

  it.each([
    [{ niveauInvalide: true }, "niveau invalide"],
    [{ horsReferentiel: true }, "indicateur hors référentiel"],
  ])("refuse une réponse invalide : %s", async (options, _libelle) => {
    const { applyUserActions } = installerValidation(13, options);

    await expect(validerEvaluation(10, recruteur)).rejects.toThrow("réponses sont invalides");
    expect(applyUserActions).not.toHaveBeenCalled();
  });

  it("ne recrée rien lorsqu’une évaluation est déjà validée", async () => {
    const { applyUserActions } = installerValidation(13, { statut: "VALIDEE" });

    await validerEvaluation(10, recruteur);

    expect(applyUserActions).not.toHaveBeenCalled();
  });

  it("reprend la génération d’une évaluation validée sans modifier le bilan ni doubler une action", async () => {
    const idsIndicateurs = Array.from({ length: 3 }, (_, index) => index + 1);
    const idsReponses = Array.from({ length: 3 }, (_, index) => index + 101);
    const tablesReprise: Record<string, TableGrist> = {
      Evaluations: { id: [10], Uid: ["evaluation-10"], Recruteur: [7], Perimetre: [3], Statut: ["VALIDEE"] },
      Indicateurs: { id: idsIndicateurs, Code: ["IND_01", "IND_02", "IND_03"], Actif: [true, true, true], Obligatoire: [true, true, true] },
      Reponses: { id: idsReponses, Evaluation: [10, 10, 10], Indicateur: idsIndicateurs, Niveau: ["ORANGE", "ORANGE", "VERT"] },
      FeuillesRoute: { id: [40], Evaluation: [10] },
      ActionsProgres: { id: [50], FeuilleRoute: [40], Reponse: [101] },
      FicheIndicateurs: { id: [] }, FichesEnseignement: { id: [] },
    };
    const lots: unknown[][][] = [];
    const applyUserActions = vi.fn(async (actions: unknown[][]) => { lots.push(actions); });
    vi.stubGlobal("window", { parent: {}, grist: { docApi: {
      applyUserActions,
      fetchTable: vi.fn(async (tableId: string) => tablesReprise[tableId] ?? {}),
    } } });

    const resultat = await validerEvaluation(10, recruteur);

    expect(resultat).toEqual({ avertissement: null, generation: "COMPLETE" });
    expect(lots).toHaveLength(1);
    expect(lots[0]).toHaveLength(1);
    expect(lots[0]?.[0]?.[0]).toBe("AddRecord");
    expect(lots[0]?.[0]?.[1]).toBe("ActionsProgres");
    expect(lots[0]?.[0]?.[3]).toMatchObject({ Evaluation: 10, FeuilleRoute: 40, Reponse: 102 });
    expect(lots[0]?.some((action) => action[1] === "Evaluations")).toBe(false);
  });
});
