import { afterEach, describe, expect, it, vi } from "vitest";
import { chargerDonneesOperationnelles, construireDonneesOperationnelles, deciderAction, declarerProgression, journaliserConsultation, peutConsulterFiches, rattacherFicheManquante } from "./operational-data.js";
import { UtilisateurCourant } from "./portal-data.js";

const utilisateur:UtilisateurCourant={id:3,prenom:"Morgan",nom:"ROBERT",email:"m@x",role:"RECRUTEUR",entite:"SDIS",perimetrePrincipal:"Nord",perimetresSupervises:[],superviseurNom:"Camille",peutGererPedagogie:false,actif:true};

describe("données recruteur et superviseur", () => {
  afterEach(()=>vi.unstubAllGlobals());
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

  it("laisse Grist horodater les consultations et la prise en compte",async()=>{
    const applyUserActions=vi.fn().mockResolvedValue(undefined),fetchTable=vi.fn().mockResolvedValue({id:[3],PerimetrePrincipal:[1]});
    vi.stubGlobal("window",{parent:{},grist:{docApi:{applyUserActions,fetchTable}}});
    await journaliserConsultation(40,null,utilisateur,"OUVERTURE");
    const consultation=applyUserActions.mock.calls[0]![0][0][3];
    expect(consultation).toMatchObject({FicheVersion:40,ActionProgres:null,Recruteur:3,Perimetre:1,TypeEvenement:"OUVERTURE"});
    expect(consultation).not.toHaveProperty("DateEvenement");

    const action={id:30,ficheVersionId:40,perimetreId:1} as Parameters<typeof declarerProgression>[0];
    await declarerProgression(action,"",utilisateur,true);
    const [miseAJour,trace]=applyUserActions.mock.calls[1]![0];
    expect(miseAJour[3]).toMatchObject({Statut:"EN_ATTENTE_VALIDATION",PriseEnCompteFiche:true,CommentaireRecruteur:"Prise en compte de la fiche d’enseignement réalisée"});
    expect(trace[3]).toMatchObject({FicheVersion:40,ActionProgres:30,TypeEvenement:"PRISE_EN_COMPTE"});
    expect(trace[3]).not.toHaveProperty("DateEvenement");
  });

  it.each(["resultats","historique"])("charge %s sans lire les tables pédagogiques",async(page)=>{
    const tables:Record<string,Record<string,unknown[]>>={
      Utilisateurs:{id:[3],Prenom:["Morgan"],Nom:["ROBERT"],Email:["m@x"],Role:["RECRUTEUR"],PerimetrePrincipal:[1],Actif:[true]},
      Perimetres:{id:[1],Nom:["Nord"]},
      Evaluations:{id:[10],Uid:["E"],Recruteur:[3],Perimetre:[1],Statut:["BROUILLON"],ProgressionComplete:[8]},
      Reponses:{id:[11],Evaluation:[10],Indicateur:[20],Niveau:["ROUGE"]},
      Indicateurs:{id:[20],Code:["IND_01"],Titre:["Premier contact"]},
      Validations:{id:[]},
    };
    const fetchTable=vi.fn(async(table:string)=>{
      if(["FicheVersions","FichesEnseignement","FicheIndicateurs"].includes(table))throw new Error("Blocked by table read access rules");
      return tables[table]??{id:[]};
    });
    vi.stubGlobal("window",{parent:{},grist:{docApi:{fetchTable,applyUserActions:vi.fn()}}});

    const donnees=await chargerDonneesOperationnelles(page,utilisateur);

    expect(donnees.evaluations[0]).toMatchObject({statut:"BROUILLON",reponses:[{niveau:"ROUGE"}]});
    expect(fetchTable).not.toHaveBeenCalledWith("FicheVersions");
    expect(fetchTable).not.toHaveBeenCalledWith("FichesEnseignement");
    expect(fetchTable).not.toHaveBeenCalledWith("FicheIndicateurs");
  });

  it("traite les fiches non encore autorisées comme un catalogue vide",async()=>{
    const tables:Record<string,Record<string,unknown[]>>={
      Utilisateurs:{id:[3],Prenom:["Morgan"],Nom:["ROBERT"],Email:["m@x"],Role:["RECRUTEUR"],PerimetrePrincipal:[1],Actif:[true]},
      Perimetres:{id:[1],Nom:["Nord"]},
      Evaluations:{id:[10],Uid:["E"],Recruteur:[3],Perimetre:[1],Statut:["BROUILLON"],ProgressionComplete:[8]},
      Reponses:{id:[11],Evaluation:[10],Indicateur:[20],Niveau:["ROUGE"]},
      Indicateurs:{id:[20],Code:["IND_01"],Titre:["Premier contact"]},
    };
    const fetchTable=vi.fn(async(table:string)=>{
      if(["FicheVersions","FichesEnseignement","FicheIndicateurs"].includes(table))throw new Error("Blocked by table read access rules");
      return tables[table]??{id:[]};
    });
    vi.stubGlobal("window",{parent:{},grist:{docApi:{fetchTable,applyUserActions:vi.fn()}}});

    const donnees=await chargerDonneesOperationnelles("fiches",utilisateur);

    expect(donnees.fiches).toEqual([]);
    expect(peutConsulterFiches(donnees.evaluations,utilisateur.id)).toBe(false);
    expect(fetchTable).not.toHaveBeenCalledWith("FichesEnseignement");
  });

  it("affiche un état vide sans évaluation et sans lire la pédagogie",async()=>{
    const fetchTable=vi.fn(async(table:string)=>{
      if(["FicheVersions","FichesEnseignement","FicheIndicateurs"].includes(table))throw new Error("Blocked by table read access rules");
      return table==="Utilisateurs"
        ? {id:[3],Prenom:["Morgan"],Nom:["ROBERT"],Email:["m@x"],Role:["RECRUTEUR"],PerimetrePrincipal:[1],Actif:[true]}
        : table==="Perimetres"?{id:[1],Nom:["Nord"]}:{id:[]};
    });
    vi.stubGlobal("window",{parent:{},grist:{docApi:{fetchTable,applyUserActions:vi.fn()}}});

    const donnees=await chargerDonneesOperationnelles("resultats",utilisateur);

    expect(donnees.evaluations).toEqual([]);
    expect(donnees.fiches).toEqual([]);
    expect(fetchTable).not.toHaveBeenCalledWith("FicheVersions");
  });

  it("charge la pédagogie seulement après une évaluation validée complète",async()=>{
    const tables:Record<string,Record<string,unknown[]>>={
      Utilisateurs:{id:[3],Prenom:["Morgan"],Nom:["ROBERT"],Email:["m@x"],Role:["RECRUTEUR"],PerimetrePrincipal:[1],Actif:[true]},
      Perimetres:{id:[1],Nom:["Nord"]},
      Evaluations:{id:[10],Uid:["E"],Recruteur:[3],Perimetre:[1],Statut:["VALIDEE"],ProgressionComplete:[100]},
      Reponses:{id:[11],Evaluation:[10],Indicateur:[20],Niveau:["ROUGE"]},
      Indicateurs:{id:[20],Code:["IND_01"],Titre:["Premier contact"]},
      FicheVersions:{id:[]},FichesEnseignement:{id:[]},FicheIndicateurs:{id:[]},
    };
    const fetchTable=vi.fn(async(table:string)=>tables[table]??{id:[]});
    vi.stubGlobal("window",{parent:{},grist:{docApi:{fetchTable,applyUserActions:vi.fn()}}});

    await chargerDonneesOperationnelles("fiches",utilisateur);

    expect(fetchTable).toHaveBeenCalledWith("FicheVersions");
    expect(fetchTable).toHaveBeenCalledWith("FichesEnseignement");
    expect(fetchTable).toHaveBeenCalledWith("FicheIndicateurs");
  });

  it("autorise la déclaration et la validation d’une progression sans fiche disponible",async()=>{
    const applyUserActions=vi.fn().mockResolvedValue(undefined),fetchTable=vi.fn();
    vi.stubGlobal("window",{parent:{},grist:{docApi:{applyUserActions,fetchTable}}});
    const action={id:30,uid:"ACT-30",recruteurId:3,perimetreId:1,ficheVersionId:null,priseEnCompteFiche:false,niveauCourant:"ORANGE"} as Parameters<typeof declarerProgression>[0];

    await declarerProgression(action,"",utilisateur,false);

    expect(applyUserActions.mock.calls[0]![0]).toHaveLength(1);
    expect(applyUserActions.mock.calls[0]![0][0][3]).toMatchObject({
      Statut:"EN_ATTENTE_VALIDATION",
      PriseEnCompteFiche:false,
      CommentaireRecruteur:"Progression déclarée sans fiche d’enseignement disponible à cette date",
    });

    const superviseur={...utilisateur,id:2,role:"SUPERVISEUR" as const};
    await deciderAction(action,"VALIDEE","VERT","",superviseur);
    expect(applyUserActions.mock.calls[1]![0][1][3]).toMatchObject({Statut:"PROGRESSION_VALIDEE",NiveauCourant:"VERT"});
  });

  it("rattache ultérieurement une fiche publiée avec une trace d’audit",async()=>{
    const applyUserActions=vi.fn().mockResolvedValue(undefined);
    const fetchTable=vi.fn(async(table:string)=>table==="ActionsProgres"
      ? {id:[30],Uid:["ACT-30"],FicheVersion:[null]}
      : {id:[40],EstPubliee:[true]});
    vi.stubGlobal("window",{parent:{},grist:{docApi:{applyUserActions,fetchTable}}});
    const superviseur={...utilisateur,id:2,role:"SUPERVISEUR" as const};

    await rattacherFicheManquante(30,40,superviseur);

    const [rattachement,audit]=applyUserActions.mock.calls[0]![0];
    expect(rattachement).toEqual(["UpdateRecord","ActionsProgres",30,{FicheVersion:40}]);
    expect(audit[3]).toMatchObject({Acteur:2,TypeObjet:"ACTION_PROGRES",ObjetUid:"ACT-30",Action:"RATTACHEMENT_FICHE"});
  });

  it("interdit de remplacer une version déjà rattachée",async()=>{
    const applyUserActions=vi.fn().mockResolvedValue(undefined);
    const fetchTable=vi.fn(async(table:string)=>table==="ActionsProgres"
      ? {id:[30],Uid:["ACT-30"],FicheVersion:[41]}
      : {id:[40],EstPubliee:[true]});
    vi.stubGlobal("window",{parent:{},grist:{docApi:{applyUserActions,fetchTable}}});
    const superviseur={...utilisateur,id:2,role:"SUPERVISEUR" as const};

    await expect(rattacherFicheManquante(30,40,superviseur)).rejects.toThrow("ne peut pas être remplacée");
    expect(applyUserActions).not.toHaveBeenCalled();
  });
});
