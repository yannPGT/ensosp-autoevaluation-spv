import { obtenirDocApiGrist, TableGrist } from "./grist-context.js";

export type NiveauCritere = "ROUGE" | "ORANGE" | "VERT";
export type StatutCampagne = "BROUILLON" | "OUVERTE" | "CLOTUREE" | "ARCHIVEE";

export interface AxeReferentiel { id: number; code: string; ordre: number; titre: string; description: string; actif: boolean; indicateurs: number; }
export interface IndicateurReferentiel { id: number; code: string; axeId: number; axe: string; ordre: number; titre: string; description: string; obligatoire: boolean; actif: boolean; criteres: number; reponses: number; }
export interface CritereReferentiel { id: number; indicateurId: number; indicateur: string; codeIndicateur: string; niveau: NiveauCritere; ordre: number; libelle: string; actif: boolean; }
export interface CampagneReferentiel { id: number; code: string; titre: string; perimetreId: number | null; perimetre: string; dateDebut: string; dateFin: string; dateDebutValeur: number | null; dateFinValeur: number | null; statut: StatutCampagne; evaluations: number; }
export interface PerimetreReferentiel { id: number; nom: string; actif: boolean; }
export interface DonneesReferentiel { axes: readonly AxeReferentiel[]; indicateurs: readonly IndicateurReferentiel[]; criteres: readonly CritereReferentiel[]; campagnes: readonly CampagneReferentiel[]; perimetres: readonly PerimetreReferentiel[]; }

export interface SaisieAxe { id?: number; code: string; ordre: number; titre: string; description: string; actif: boolean; }
export interface SaisieIndicateur { id?: number; code: string; axeId: number; ordre: number; titre: string; description: string; obligatoire: boolean; actif: boolean; }
export interface SaisieCritere { id?: number; indicateurId: number; niveau: NiveauCritere; ordre: number; libelle: string; actif: boolean; }
export interface SaisieCampagne { id?: number; code: string; titre: string; perimetreId: number; dateDebut: string; dateFin: string; statut: StatutCampagne; }

export async function chargerDonneesReferentiel(): Promise<DonneesReferentiel> {
  const docApi = obtenirDocApiGrist();
  if (!docApi) return donneesDemonstration();
  const [axes, indicateurs, criteres, campagnes, perimetres, evaluations, reponses] = await Promise.all([
    docApi.fetchTable("Axes"), docApi.fetchTable("Indicateurs"), docApi.fetchTable("Criteres"),
    docApi.fetchTable("Campagnes"), docApi.fetchTable("Perimetres"), docApi.fetchTable("Evaluations"), docApi.fetchTable("Reponses"),
  ]);
  return construireDonneesReferentiel(axes, indicateurs, criteres, campagnes, perimetres, evaluations, reponses);
}

export async function enregistrerAxe(saisie: SaisieAxe, donnees: DonneesReferentiel): Promise<void> {
  validerAxe(saisie, donnees); await appliquer(saisie.id ? "UpdateRecord" : "AddRecord", "Axes", saisie.id, { Code: code(saisie.code), Ordre: saisie.ordre, Titre: saisie.titre.trim(), Description: saisie.description.trim(), Actif: saisie.actif });
}
export async function enregistrerIndicateur(saisie: SaisieIndicateur, donnees: DonneesReferentiel): Promise<void> {
  validerIndicateur(saisie, donnees); await appliquer(saisie.id ? "UpdateRecord" : "AddRecord", "Indicateurs", saisie.id, { Code: code(saisie.code), Axe: saisie.axeId, Ordre: saisie.ordre, Titre: saisie.titre.trim(), Description: saisie.description.trim(), Obligatoire: saisie.obligatoire, Actif: saisie.actif });
}
export async function enregistrerCritere(saisie: SaisieCritere, donnees: DonneesReferentiel): Promise<void> {
  validerCritere(saisie, donnees); await appliquer(saisie.id ? "UpdateRecord" : "AddRecord", "Criteres", saisie.id, { Indicateur: saisie.indicateurId, Niveau: saisie.niveau, Ordre: saisie.ordre, Libelle: saisie.libelle.trim(), Actif: saisie.actif });
}
export async function enregistrerCampagne(saisie: SaisieCampagne, donnees: DonneesReferentiel): Promise<void> {
  validerCampagne(saisie, donnees); await appliquer(saisie.id ? "UpdateRecord" : "AddRecord", "Campagnes", saisie.id, { Code: code(saisie.code), Titre: saisie.titre.trim(), Perimetre: saisie.perimetreId || null, DateDebut: dateTimestamp(saisie.dateDebut), DateFin: saisie.dateFin ? dateTimestamp(saisie.dateFin) : null, Statut: saisie.statut });
}

export function construireDonneesReferentiel(ta: TableGrist, ti: TableGrist, tc: TableGrist, tca: TableGrist, tp: TableGrist, te: TableGrist, tr: TableGrist): DonneesReferentiel {
  const axesBase = lignes(ta).map((ligne) => ({ id: n(ligne.id), code: s(ligne.Code), ordre: n(ligne.Ordre), titre: s(ligne.Titre), description: s(ligne.Description), actif: b(ligne.Actif) })).filter((x) => x.id) as Array<{id:number;code:string;ordre:number;titre:string;description:string;actif:boolean}>;
  const nomsAxes = new Map(axesBase.map((axe) => [axe.id, axe.titre]));
  const indicateursBase = lignes(ti).map((ligne) => ({ id: n(ligne.id), code: s(ligne.Code), axeId: ref(ligne.Axe), ordre: n(ligne.Ordre), titre: s(ligne.Titre), description: s(ligne.Description), obligatoire: b(ligne.Obligatoire), actif: b(ligne.Actif) })).filter((x) => x.id && x.axeId) as Array<{id:number;code:string;axeId:number;ordre:number;titre:string;description:string;obligatoire:boolean;actif:boolean}>;
  const nomsIndicateurs = new Map(indicateursBase.map((indicateur) => [indicateur.id, { titre: indicateur.titre, code: indicateur.code }]));
  const criteres: CritereReferentiel[] = lignes(tc).map((ligne) => {
    const id = n(ligne.id); const indicateurId = ref(ligne.Indicateur); const niveauCritere = niveau(ligne.Niveau);
    if (!id || !indicateurId || !niveauCritere) return null;
    const indicateur = nomsIndicateurs.get(indicateurId);
    return { id, indicateurId, indicateur: indicateur?.titre || `Indicateur ${indicateurId}`, codeIndicateur: indicateur?.code || "", niveau: niveauCritere, ordre: n(ligne.Ordre), libelle: s(ligne.Libelle), actif: b(ligne.Actif) };
  }).filter((x): x is CritereReferentiel => x !== null).sort((a,b) => a.codeIndicateur.localeCompare(b.codeIndicateur) || a.ordre-b.ordre);
  const indicateurs: IndicateurReferentiel[] = indicateursBase.map((x) => ({ ...x, axe: nomsAxes.get(x.axeId) || `Axe ${x.axeId}`, criteres: criteres.filter((c) => c.indicateurId === x.id).length, reponses: compterRef(tr, "Indicateur", x.id) })).sort((a,b) => a.ordre-b.ordre);
  const axes: AxeReferentiel[] = axesBase.map((x) => ({ ...x, indicateurs: indicateurs.filter((i) => i.axeId === x.id).length })).sort((a,b) => a.ordre-b.ordre);
  const perimetres: PerimetreReferentiel[] = lignes(tp).map((ligne) => ({ id: n(ligne.id), nom: s(ligne.Nom) || s(ligne.Code), actif: b(ligne.Actif) })).filter((x) => x.id) as PerimetreReferentiel[];
  const nomsPerimetres = new Map(perimetres.map((p) => [p.id, p.nom]));
  const campagnes: CampagneReferentiel[] = lignes(tca).map((ligne) => {
    const id = n(ligne.id); const statut = statutCampagne(ligne.Statut); if (!id || !statut) return null;
    const perimetreId = ref(ligne.Perimetre); const debut = nombreNullable(ligne.DateDebut); const fin = nombreNullable(ligne.DateFin);
    return { id, code: s(ligne.Code), titre: s(ligne.Titre), perimetreId, perimetre: perimetreId ? nomsPerimetres.get(perimetreId) || `Périmètre ${perimetreId}` : "Campagne globale", dateDebut: dateFr(debut), dateFin: dateFr(fin), dateDebutValeur: debut, dateFinValeur: fin, statut, evaluations: compterRef(te, "Campagne", id) };
  }).filter((x): x is CampagneReferentiel => x !== null).sort((a,b) => (b.dateDebutValeur ?? 0)-(a.dateDebutValeur ?? 0));
  return { axes, indicateurs, criteres, campagnes, perimetres: perimetres.sort((a,b) => a.nom.localeCompare(b.nom,"fr")) };
}

export function validerAxe(x:SaisieAxe,d:DonneesReferentiel) { if(!/^AXE_[1-9][0-9]*$/.test(code(x.code))||!x.titre.trim()||x.ordre<1) throw new Error("Le code AXE_n, l’ordre et le titre sont obligatoires."); if(d.axes.some(a=>a.id!==x.id&&a.code.toUpperCase()===code(x.code))) throw new Error("Ce code d’axe existe déjà."); if(d.axes.some(a=>a.id!==x.id&&a.ordre===x.ordre)) throw new Error("Cet ordre d’axe est déjà utilisé."); const e=x.id?d.axes.find(a=>a.id===x.id):null; if(e?.actif&&!x.actif&&e.indicateurs>0) throw new Error("Désactivez d’abord les indicateurs rattachés à cet axe."); }
export function validerIndicateur(x:SaisieIndicateur,d:DonneesReferentiel) { if(!/^IND_[0-9]{2,3}$/.test(code(x.code))||!x.titre.trim()||x.ordre<1||!x.axeId) throw new Error("Le code IND_XX, l’axe, l’ordre et le titre sont obligatoires."); if(d.indicateurs.some(i=>i.id!==x.id&&i.code.toUpperCase()===code(x.code))) throw new Error("Ce code d’indicateur existe déjà."); if(d.indicateurs.some(i=>i.id!==x.id&&i.ordre===x.ordre)) throw new Error("Cet ordre d’indicateur est déjà utilisé."); const axe=d.axes.find(a=>a.id===x.axeId); if(x.actif&&!axe?.actif) throw new Error("Un indicateur actif doit dépendre d’un axe actif."); const e=x.id?d.indicateurs.find(i=>i.id===x.id):null; if(e?.actif&&!x.actif&&e.reponses>0) throw new Error("Cet indicateur possède déjà des réponses et ne peut pas être désactivé sans analyse d’impact."); }
export function validerCritere(x:SaisieCritere,d:DonneesReferentiel) { if(!x.indicateurId||x.ordre<1||!x.libelle.trim()) throw new Error("L’indicateur, le niveau, l’ordre et le libellé sont obligatoires."); if(d.criteres.some(c=>c.id!==x.id&&c.indicateurId===x.indicateurId&&c.niveau===x.niveau&&c.ordre===x.ordre)) throw new Error("Cet ordre est déjà utilisé pour ce niveau et cet indicateur."); const indicateur=d.indicateurs.find(i=>i.id===x.indicateurId); if(x.actif&&!indicateur?.actif) throw new Error("Un critère actif doit dépendre d’un indicateur actif."); }
export function validerCampagne(x:SaisieCampagne,d:DonneesReferentiel) { const c=code(x.code); const debut=dateTimestamp(x.dateDebut); const fin=x.dateFin?dateTimestamp(x.dateFin):null; if(!/^CAMP_[A-Z0-9_]{2,30}$/.test(c)||!x.titre.trim()||!debut) throw new Error("Le code CAMP_..., le titre et la date de début sont obligatoires."); if(d.campagnes.some(a=>a.id!==x.id&&a.code.toUpperCase()===c)) throw new Error("Ce code de campagne existe déjà."); if(fin&&fin<debut) throw new Error("La date de fin ne peut pas précéder la date de début."); if(x.perimetreId&&!d.perimetres.find(p=>p.id===x.perimetreId)?.actif&&["BROUILLON","OUVERTE"].includes(x.statut)) throw new Error("Une campagne active doit utiliser un périmètre actif."); const e=x.id?d.campagnes.find(a=>a.id===x.id):null; if(!e&&x.statut!=="BROUILLON") throw new Error("Une nouvelle campagne doit être créée en brouillon."); if(e&&!transitionCampagne(e.statut,x.statut)) throw new Error(`Transition interdite : ${e.statut} → ${x.statut}.`); }

function transitionCampagne(a:StatutCampagne,b:StatutCampagne):boolean { const ordre:StatutCampagne[]=["BROUILLON","OUVERTE","CLOTUREE","ARCHIVEE"]; return b===a||ordre.indexOf(b)===ordre.indexOf(a)+1; }
async function appliquer(type:string,table:string,id:number|undefined,champs:Record<string,unknown>) { const api=obtenirDocApiGrist(); if(!api) throw new Error("L’enregistrement est disponible uniquement depuis le widget Grist."); await api.applyUserActions([[type,table,id??null,champs]]); }
function donneesDemonstration():DonneesReferentiel { return construireDonneesReferentiel({id:[1,2,3],Code:["AXE_1","AXE_2","AXE_3"],Ordre:[1,2,3],Titre:["Attractivité et premier contact","Sélection et engagement","Résultats"],Description:["","",""] ,Actif:[true,true,true]}, {id:[11,12],Code:["IND_01","IND_02"],Axe:[1,1],Ordre:[1,2],Titre:["Délai du premier contact","Qualité du premier accueil"],Description:["",""],Obligatoire:[true,true],Actif:[true,true]}, {id:[21,22,23],Indicateur:[11,11,11],Niveau:["ROUGE","ORANGE","VERT"],Ordre:[1,1,1],Libelle:["Plus de 2 semaines","Entre 4 et 14 jours","Dans les 3 jours"],Actif:[true,true,true]}, {id:[31],Code:["CAMP_2026_S1"],Titre:["Campagne S1 2026"],Perimetre:[41],DateDebut:[1_767_225_600],DateFin:[1_782_921_600],Statut:["BROUILLON"]}, {id:[41],Nom:["Périmètre national"],Actif:[true]}, {id:[],Campagne:[]}, {id:[],Indicateur:[]}); }
function lignes(t:TableGrist):Record<string,unknown>[] { return (t.id??[]).map((_,i)=>Object.fromEntries(Object.entries(t).map(([k,v])=>[k,v[i]]))); }
function compterRef(t:TableGrist,col:string,id:number):number { let total=0;(t.id??[]).forEach((_,i)=>{if(ref(t[col]?.[i])===id)total+=1;});return total; }
function code(v:string):string{return v.trim().toUpperCase().replace(/[\s-]+/g,"_");}
function dateTimestamp(v:string):number|null { if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const ms=Date.parse(`${v}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/1000):null; }
function dateFr(v:number|null):string { return v?new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(v*1000)):"—"; }
function niveau(v:unknown):NiveauCritere|null { const x=s(v).toUpperCase();return x==="ROUGE"||x==="ORANGE"||x==="VERT"?x:null; }
function statutCampagne(v:unknown):StatutCampagne|null { const x=s(v).toUpperCase();return x==="BROUILLON"||x==="OUVERTE"||x==="CLOTUREE"||x==="ARCHIVEE"?x:null; }
function ref(v:unknown):number|null { if(typeof v==="number"&&v>0)return v;if(Array.isArray(v))return v.filter(x=>typeof x==="number"&&x>0).at(-1)??null;return null; }
function n(v:unknown):number{return typeof v==="number"&&Number.isFinite(v)?v:0;} function nombreNullable(v:unknown):number|null{return n(v)||null;} function s(v:unknown):string{return typeof v==="string"?v:"";} function b(v:unknown):boolean{return v===true||v===1;}
