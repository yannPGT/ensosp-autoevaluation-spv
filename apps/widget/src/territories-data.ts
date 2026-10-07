import { obtenirDocApiGrist, TableGrist } from "./grist-context.js";

export interface EntiteAdministration {
  id: number;
  code: string;
  nom: string;
  parentId: number | null;
  parent: string;
  actif: boolean;
  perimetres: number;
  perimetresActifs: number;
  utilisateursActifs: number;
}

export interface PerimetreAdministration {
  id: number;
  code: string;
  nom: string;
  entiteId: number;
  entite: string;
  actif: boolean;
  utilisateursActifs: number;
  affectationsActives: number;
}

export interface DonneesTerritoires {
  entites: readonly EntiteAdministration[];
  perimetres: readonly PerimetreAdministration[];
}

export interface SaisieEntite {
  id?: number;
  code: string;
  nom: string;
  parentId: number;
  actif: boolean;
}

export interface SaisiePerimetre {
  id?: number;
  code: string;
  nom: string;
  entiteId: number;
  actif: boolean;
}

export async function chargerDonneesTerritoires(): Promise<DonneesTerritoires> {
  const docApi = obtenirDocApiGrist();
  if (!docApi) return donneesDemonstration();
  const [entites, perimetres, utilisateurs, affectations] = await Promise.all([
    docApi.fetchTable("Entites"), docApi.fetchTable("Perimetres"),
    docApi.fetchTable("Utilisateurs"), docApi.fetchTable("AffectationsSuperviseurs"),
  ]);
  return construireDonneesTerritoires(entites, perimetres, utilisateurs, affectations);
}

export async function enregistrerEntite(saisie: SaisieEntite, donnees: DonneesTerritoires): Promise<void> {
  validerEntite(saisie, donnees);
  const docApi = obtenirDocApiGrist();
  if (!docApi) { enregistrerEntiteDemo(saisie); return; }
  const champs = { Code: normaliserCode(saisie.code), Nom: saisie.nom.trim(), Parent: saisie.parentId || null, Actif: saisie.actif };
  await docApi.applyUserActions([saisie.id
    ? ["UpdateRecord", "Entites", saisie.id, champs]
    : ["AddRecord", "Entites", null, champs]]);
}

export async function enregistrerPerimetre(saisie: SaisiePerimetre, donnees: DonneesTerritoires): Promise<void> {
  validerPerimetre(saisie, donnees);
  const docApi = obtenirDocApiGrist();
  if (!docApi) { enregistrerPerimetreDemo(saisie); return; }
  const champs = { Code: normaliserCode(saisie.code), Nom: saisie.nom.trim(), Entite: saisie.entiteId, Actif: saisie.actif };
  await docApi.applyUserActions([saisie.id
    ? ["UpdateRecord", "Perimetres", saisie.id, champs]
    : ["AddRecord", "Perimetres", null, champs]]);
}

export function construireDonneesTerritoires(
  tableEntites: TableGrist,
  tablePerimetres: TableGrist,
  tableUtilisateurs: TableGrist,
  tableAffectations: TableGrist,
): DonneesTerritoires {
  const nomsEntites = new Map<number, string>();
  (tableEntites.id ?? []).forEach((valeur, index) => {
    const id = nombre(valeur);
    if (id) nomsEntites.set(id, texte(tableEntites.Nom?.[index]) || texte(tableEntites.Code?.[index]));
  });

  const perimetres: PerimetreAdministration[] = [];
  (tablePerimetres.id ?? []).forEach((valeur, index) => {
    const id = nombre(valeur);
    const entiteId = referenceId(tablePerimetres.Entite?.[index]);
    if (!id || !entiteId) return;
    perimetres.push({
      id, code: texte(tablePerimetres.Code?.[index]), nom: texte(tablePerimetres.Nom?.[index]),
      entiteId, entite: nomsEntites.get(entiteId) || `Entité ${entiteId}`,
      actif: booleen(tablePerimetres.Actif?.[index]),
      utilisateursActifs: compterReferencesActives(tableUtilisateurs, "PerimetrePrincipal", id),
      affectationsActives: compterReferencesActives(tableAffectations, "Perimetre", id),
    });
  });

  const entites: EntiteAdministration[] = [];
  (tableEntites.id ?? []).forEach((valeur, index) => {
    const id = nombre(valeur);
    if (!id) return;
    const parentId = referenceId(tableEntites.Parent?.[index]);
    const perimetresEntite = perimetres.filter((perimetre) => perimetre.entiteId === id);
    entites.push({
      id, code: texte(tableEntites.Code?.[index]), nom: texte(tableEntites.Nom?.[index]),
      parentId, parent: (parentId && nomsEntites.get(parentId)) || "—",
      actif: booleen(tableEntites.Actif?.[index]),
      perimetres: perimetresEntite.length,
      perimetresActifs: perimetresEntite.filter((perimetre) => perimetre.actif).length,
      utilisateursActifs: compterReferencesActives(tableUtilisateurs, "Entite", id),
    });
  });

  entites.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  perimetres.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return { entites, perimetres };
}

export function validerEntite(saisie: SaisieEntite, donnees: DonneesTerritoires): void {
  const code = normaliserCode(saisie.code);
  if (!code || !saisie.nom.trim()) throw new Error("Le code et le nom de l’entité sont obligatoires.");
  if (!/^SIS_[A-Z0-9]{2,10}$/.test(code) && code !== "ENSOSPP") throw new Error("Le code doit respecter la convention SIS_XX (ou ENSOSPP). ");
  if (donnees.entites.some((entite) => entite.id !== saisie.id && entite.code.toUpperCase() === code)) throw new Error("Ce code d’entité existe déjà, y compris dans les lignes inactives.");
  if (saisie.id && saisie.parentId === saisie.id) throw new Error("Une entité ne peut pas être son propre parent.");
  if (saisie.id && creeraitCycle(saisie.id, saisie.parentId, donnees.entites)) throw new Error("Ce rattachement créerait une boucle dans la hiérarchie des entités.");
  const parent = saisie.parentId ? donnees.entites.find((entite) => entite.id === saisie.parentId) : null;
  if (saisie.actif && parent && !parent.actif) throw new Error("Une entité active ne peut pas dépendre d’une entité parente inactive.");
  const existante = saisie.id ? donnees.entites.find((entite) => entite.id === saisie.id) : null;
  if (existante?.actif && !saisie.actif && existante.perimetresActifs > 0) throw new Error("Désactivez d’abord tous les périmètres actifs de cette entité.");
  if (existante?.actif && !saisie.actif && donnees.entites.some((entite) => entite.actif && entite.parentId === saisie.id)) throw new Error("Désactivez ou rattachez d’abord les entités enfants actives.");
}

export function validerPerimetre(saisie: SaisiePerimetre, donnees: DonneesTerritoires): void {
  const code = normaliserCode(saisie.code);
  if (!code || !saisie.nom.trim() || !saisie.entiteId) throw new Error("Le code, le nom et l’entité du périmètre sont obligatoires.");
  if (!/^PER_[A-Z0-9_]{2,30}$/.test(code)) throw new Error("Le code doit respecter la convention PER_XX_GLOBAL ou PER_XX_NORD.");
  if (donnees.perimetres.some((perimetre) => perimetre.id !== saisie.id && perimetre.code.toUpperCase() === code)) throw new Error("Ce code de périmètre existe déjà, y compris dans les lignes inactives.");
  const entite = donnees.entites.find((element) => element.id === saisie.entiteId);
  if (!entite) throw new Error("L’entité sélectionnée est introuvable.");
  if (saisie.actif && !entite.actif) throw new Error("Un périmètre actif doit appartenir à une entité active.");
  const existant = saisie.id ? donnees.perimetres.find((perimetre) => perimetre.id === saisie.id) : null;
  if (existant?.actif && !saisie.actif && (existant.utilisateursActifs > 0 || existant.affectationsActives > 0)) {
    throw new Error("Réaffectez les utilisateurs et clôturez les affectations actives avant de désactiver ce périmètre.");
  }
}

function creeraitCycle(entiteId: number, parentId: number, entites: readonly EntiteAdministration[]): boolean {
  let courant = parentId;
  const visites = new Set<number>();
  while (courant) {
    if (courant === entiteId || visites.has(courant)) return true;
    visites.add(courant);
    courant = entites.find((entite) => entite.id === courant)?.parentId ?? 0;
  }
  return false;
}

function compterReferencesActives(table: TableGrist, colonne: string, id: number): number {
  let total = 0;
  (table.id ?? []).forEach((_valeur, index) => {
    if (referenceId(table[colonne]?.[index]) === id && booleen(table.Actif?.[index])) total += 1;
  });
  return total;
}

const CLE_DEMO_TERRITOIRES="spv-demo-admin-territoires-v1";
type EtatTerritoiresDemo={entites:SaisieEntite[];perimetres:SaisiePerimetre[]};
function lireTerritoiresDemo():EtatTerritoiresDemo{try{const b=sessionStorage.getItem(CLE_DEMO_TERRITOIRES);if(b)return JSON.parse(b) as EtatTerritoiresDemo;}catch{}return{entites:[],perimetres:[]};}
function ecrireTerritoiresDemo(e:EtatTerritoiresDemo){try{sessionStorage.setItem(CLE_DEMO_TERRITOIRES,JSON.stringify(e));}catch{}}
function enregistrerEntiteDemo(s:SaisieEntite){const e=lireTerritoiresDemo(),id=s.id??(100+e.entites.length);e.entites=e.entites.filter(x=>x.id!==id).concat({...s,id});ecrireTerritoiresDemo(e);}
function enregistrerPerimetreDemo(s:SaisiePerimetre){const e=lireTerritoiresDemo(),id=s.id??(200+e.perimetres.length);e.perimetres=e.perimetres.filter(x=>x.id!==id).concat({...s,id});ecrireTerritoiresDemo(e);}
function donneesDemonstration(): DonneesTerritoires {
  const d=lireTerritoiresDemo();
  const baseEntites:SaisieEntite[]=[{id:1,code:"ENSOSPP",nom:"ENSOSPP",parentId:0,actif:true},{id:2,code:"SIS_33",nom:"SDIS de la Gironde",parentId:1,actif:true}];
  const basePerimetres:SaisiePerimetre[]=[{id:1,code:"PER_NATIONAL",nom:"Périmètre national",entiteId:1,actif:true},{id:2,code:"PER_33_NORD",nom:"SDIS 33 groupement NORD",entiteId:2,actif:true}];
  const re=new Map(d.entites.filter(x=>x.id&&x.id<=2).map(x=>[x.id!,x])),rp=new Map(d.perimetres.filter(x=>x.id&&x.id<=2).map(x=>[x.id!,x]));
  const entites=baseEntites.map(x=>re.get(x.id!)??x).concat(d.entites.filter(x=>(x.id??0)>2));
  const perimetres=basePerimetres.map(x=>rp.get(x.id!)??x).concat(d.perimetres.filter(x=>(x.id??0)>2));
  return construireDonneesTerritoires({
    id:entites.map(x=>x.id!),Code:entites.map(x=>normaliserCode(x.code)),Nom:entites.map(x=>x.nom),Parent:entites.map(x=>x.parentId||null),Actif:entites.map(x=>x.actif),
  }, {
    id:perimetres.map(x=>x.id!),Code:perimetres.map(x=>normaliserCode(x.code)),Nom:perimetres.map(x=>x.nom),Entite:perimetres.map(x=>x.entiteId),Actif:perimetres.map(x=>x.actif),
  }, {id:[1,2,3],Entite:[1,2,2],PerimetrePrincipal:[1,2,2],Actif:[true,true,true]}, {id:[20],Perimetre:[2],Actif:[true]});
}

function normaliserCode(valeur: string): string { return valeur.trim().toLocaleUpperCase("fr").replace(/[\s-]+/g, "_"); }
function referenceId(valeur: unknown): number | null {
  if (typeof valeur === "number" && valeur > 0) return valeur;
  if (Array.isArray(valeur)) return valeur.filter((element): element is number => typeof element === "number" && element > 0).at(-1) ?? null;
  return null;
}
function nombre(valeur: unknown): number | null { return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : null; }
function texte(valeur: unknown): string { return typeof valeur === "string" ? valeur : ""; }
function booleen(valeur: unknown): boolean { return valeur === true || valeur === 1; }
