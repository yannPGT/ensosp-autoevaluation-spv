import { describe, expect, it } from "vitest";
import { construireDonneesPedagogiques, validerFiche, validerLiaison, validerVersion } from "./teaching-data.js";

function donnees(){return construireDonneesPedagogiques(
  {id:[1],Code:["FICHE_IND_01"],Titre:["Premier contact"],Description:["Guide"],Perimetre:[4],Statut:["BROUILLON"],VersionActive:[2],Actif:[true]},
  {id:[2],Uid:["v1"],Fiche:[1],NumeroVersion:["1.0"],FichierPDF:[["L",101]],NomFichier:["guide.pdf"],TailleOctets:[1024],EmpreinteSHA256:["abc"],Auteur:[7],EstPubliee:[true],DatePublication:[1_700_000_000],DateFinValidite:[null]},
  {id:[3],Fiche:[1],Indicateur:[11],DeclencheRouge:[true],DeclencheOrange:[false],Actif:[true]},
  {id:[4],Nom:["Groupement Nord"],Actif:[true]},
  {id:[11,12],Code:["IND_01","IND_02"],Titre:["Délai","Accueil"],Actif:[true,true]},
  {id:[7],Prenom:["Yann"],Nom:["Admin"]},
)}
function fichier(nom:string,type:string,taille:number){return{name:nom,type,size:taille} as File}

describe("données du module pédagogique",()=>{
  it("résout le périmètre, la version active et les liaisons",()=>{const d=donnees();expect(d.fiches[0]).toMatchObject({perimetre:"Groupement Nord",versionActive:"1.0",versions:1,liaisons:1});expect(d.versions[0]).toMatchObject({attachmentId:101,auteur:"Yann Admin"});expect(d.liaisons[0]).toMatchObject({codeIndicateur:"IND_01",rouge:true});});
  it("protège les codes et impose un indicateur avec un seul niveau",()=>{const d=donnees();expect(()=>validerFiche({code:"FICHE_IND_01",titre:"Doublon",description:"",perimetreId:0,actif:true,indicateurId:11,niveau:"ROUGE"},d)).toThrow(/existe déjà/);expect(()=>validerLiaison({ficheId:1,indicateurId:12,rouge:false,orange:false,actif:true},d)).toThrow(/un seul niveau/);expect(()=>validerLiaison({ficheId:1,indicateurId:12,rouge:true,orange:true,actif:true},d)).toThrow(/un seul niveau/);expect(()=>validerLiaison({ficheId:1,indicateurId:12,rouge:true,orange:false,actif:true},d)).toThrow(/déjà une liaison/);});
  it("contrôle le PDF, sa taille et le numéro de version",()=>{const d=donnees();expect(()=>validerVersion({ficheId:1,numero:"1.0",dateFin:"",fichier:fichier("guide.pdf","application/pdf",1000)},d)).toThrow(/existe déjà/);expect(()=>validerVersion({ficheId:1,numero:"1.1",dateFin:"",fichier:fichier("guide.txt","text/plain",1000)},d)).toThrow(/PDF/);expect(()=>validerVersion({ficheId:1,numero:"1.1",dateFin:"",fichier:fichier("guide.pdf","application/pdf",11*1024*1024)},d)).toThrow(/moins de 10 Mo/);expect(()=>validerVersion({ficheId:1,numero:"1.1",dateFin:"2027-01-01",fichier:fichier("guide.pdf","application/pdf",1000)},d)).not.toThrow();});
});
