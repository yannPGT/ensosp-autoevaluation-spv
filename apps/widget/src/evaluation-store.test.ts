import { afterEach, describe, expect, it, vi } from "vitest";
import { enregistrerReponse } from "./evaluation-store.js";
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

afterEach(() => vi.unstubAllGlobals());

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
