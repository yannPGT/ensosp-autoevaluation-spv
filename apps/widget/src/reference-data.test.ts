import { describe, expect, it } from "vitest";
import { construireDonneesReferentiel, validerAxe, validerCampagne, validerCritere, validerIndicateur } from "./reference-data.js";

function donnees() {
  return construireDonneesReferentiel(
    { id:[1], Code:["AXE_1"], Ordre:[1], Titre:["Premier contact"], Description:[""], Actif:[true] },
    { id:[11], Code:["IND_01"], Axe:[1], Ordre:[1], Titre:["Délai"], Description:[""], Obligatoire:[true], Actif:[true] },
    { id:[21,22], Indicateur:[11,11], Niveau:["ROUGE","VERT"], Ordre:[1,1], Libelle:["Plus de deux semaines","Dans les trois jours"], Actif:[true,true] },
    { id:[31], Code:["CAMP_2026_S1"], Titre:["Semestre 1"], Perimetre:[41], DateDebut:[1767225600], DateFin:[1782921600], Statut:["BROUILLON"] },
    { id:[41], Nom:["Périmètre national"], Actif:[true] },
    { id:[51], Campagne:[31] },
    { id:[61], Indicateur:[11] },
  );
}

describe("données du module Référentiel", () => {
  it("résout les relations et compte les usages", () => {
    const resultat = donnees();
    expect(resultat.axes[0]).toMatchObject({ indicateurs: 1 });
    expect(resultat.indicateurs[0]).toMatchObject({ axe: "Premier contact", criteres: 2, reponses: 1 });
    expect(resultat.campagnes[0]).toMatchObject({ perimetre: "Périmètre national", evaluations: 1 });
  });

  it("protège les codes, les ordres et les références déjà utilisées", () => {
    const resultat = donnees();
    expect(() => validerAxe({ code:"AXE_1", ordre:2, titre:"Doublon", description:"", actif:true }, resultat)).toThrow(/existe déjà/);
    expect(() => validerAxe({ id:1, code:"AXE_1", ordre:1, titre:"Premier contact", description:"", actif:false }, resultat)).toThrow(/indicateurs rattachés/);
    expect(() => validerIndicateur({ id:11, code:"IND_01", axeId:1, ordre:1, titre:"Délai", description:"", obligatoire:true, actif:false }, resultat)).toThrow(/réponses/);
    expect(() => validerCritere({ indicateurId:11, niveau:"ROUGE", ordre:1, libelle:"Doublon", actif:true }, resultat)).toThrow(/déjà utilisé/);
  });

  it("contrôle les dates et les transitions des campagnes", () => {
    const resultat = donnees();
    expect(() => validerCampagne({ id:31, code:"CAMP_2026_S1", titre:"Semestre 1", perimetreId:41, dateDebut:"2026-06-01", dateFin:"2026-05-01", statut:"BROUILLON" }, resultat)).toThrow(/précéder/);
    expect(() => validerCampagne({ id:31, code:"CAMP_2026_S1", titre:"Semestre 1", perimetreId:41, dateDebut:"2026-01-01", dateFin:"2026-07-01", statut:"CLOTUREE" }, resultat)).toThrow(/Transition interdite/);
    expect(() => validerCampagne({ id:31, code:"CAMP_2026_S1", titre:"Semestre 1", perimetreId:41, dateDebut:"2026-01-01", dateFin:"2026-07-01", statut:"OUVERTE" }, resultat)).not.toThrow();
  });
});
