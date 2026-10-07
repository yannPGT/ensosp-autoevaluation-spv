import { obtenirDocApiGrist, TableGrist } from "./grist-context.js";

export interface SuperviseurAffectation {
  id: number;
  nom: string;
  email: string;
  actif: boolean;
  perimetresSupervisesIds: readonly number[];
  perimetresSupervises: readonly string[];
  affectationsActives: number;
  synchronise: boolean;
}

export interface PerimetreAffectation {
  id: number;
  code: string;
  nom: string;
  entite: string;
  actif: boolean;
}

export interface AffectationSuperviseur {
  id: number;
  superviseurId: number;
  superviseur: string;
  email: string;
  perimetreId: number;
  perimetre: string;
  entite: string;
  dateDebut: string;
  dateFin: string;
  dateDebutValeur: number | null;
  dateFinValeur: number | null;
  actif: boolean;
}

export interface DonneesAffectations {
  superviseurs: readonly SuperviseurAffectation[];
  perimetres: readonly PerimetreAffectation[];
  affectations: readonly AffectationSuperviseur[];
}

export interface NouvelleAffectation {
  superviseurId: number;
  perimetreId: number;
  dateDebut: string;
}

export async function chargerDonneesAffectations(): Promise<DonneesAffectations> {
  const docApi = obtenirDocApiGrist();
  if (!docApi) return donneesDemonstration();
  const [utilisateurs, perimetres, entites, affectations] = await Promise.all([
    docApi.fetchTable("Utilisateurs"), docApi.fetchTable("Perimetres"),
    docApi.fetchTable("Entites"), docApi.fetchTable("AffectationsSuperviseurs"),
  ]);
  return construireDonneesAffectations(utilisateurs, perimetres, entites, affectations);
}

export async function creerAffectation(saisie: NouvelleAffectation, donnees: DonneesAffectations, acteurId: number): Promise<void> {
  validerNouvelleAffectation(saisie, donnees);
  const docApi = obtenirDocApiGrist();
  if (!docApi) { creerAffectationDemo(saisie); return; }
  const ids = perimetresActifsDuSuperviseur(saisie.superviseurId, donnees, saisie.perimetreId);
  await docApi.applyUserActions([
    ["AddRecord", "AffectationsSuperviseurs", null, {
      Superviseur: saisie.superviseurId, Perimetre: saisie.perimetreId,
      DateDebut: dateVersTimestamp(saisie.dateDebut), DateFin: null, Actif: true,
    }],
    ["UpdateRecord", "Utilisateurs", saisie.superviseurId, { PerimetresSupervises: ["L", ...ids] }],
    ["AddRecord", "JournalAudit", null, { Uid: crypto.randomUUID(), Acteur: acteurId, Perimetre: saisie.perimetreId, TypeObjet: "AFFECTATION", ObjetUid: String(saisie.superviseurId), Action: "CREATION_AFFECTATION", Resume: `Affectation créée pour le périmètre ${saisie.perimetreId}` }],
  ]);
}

export async function cloturerAffectation(affectationId: number, dateFin: string, donnees: DonneesAffectations, acteurId: number): Promise<void> {
  const affectation = validerCloture(affectationId, dateFin, donnees);
  const docApi = obtenirDocApiGrist();
  if (!docApi) { cloturerAffectationDemo(affectationId,dateFin); return; }
  const idsRestants = perimetresActifsDuSuperviseur(affectation.superviseurId, donnees, undefined, affectation.id);
  await docApi.applyUserActions([
    ["UpdateRecord", "AffectationsSuperviseurs", affectation.id, { DateFin: dateVersTimestamp(dateFin), Actif: false }],
    ["UpdateRecord", "Utilisateurs", affectation.superviseurId, { PerimetresSupervises: ["L", ...idsRestants] }],
    ["AddRecord", "JournalAudit", null, { Uid: crypto.randomUUID(), Acteur: acteurId, Perimetre: affectation.perimetreId, TypeObjet: "AFFECTATION", ObjetUid: String(affectation.id), Action: "CLOTURE_AFFECTATION", Resume: `Affectation du périmètre ${affectation.perimetre} clôturée` }],
  ]);
}

export async function synchroniserSuperviseur(superviseurId: number, donnees: DonneesAffectations, acteurId: number): Promise<void> {
  const superviseur = donnees.superviseurs.find((element) => element.id === superviseurId);
  if (!superviseur) throw new Error("Le superviseur est introuvable.");
  const docApi = obtenirDocApiGrist();
  if (!docApi) { synchroniserSuperviseurDemo(superviseurId,donnees); return; }
  const ids = perimetresActifsDuSuperviseur(superviseurId, donnees);
  await docApi.applyUserActions([["UpdateRecord", "Utilisateurs", superviseurId, { PerimetresSupervises: ["L", ...ids] }], ["AddRecord", "JournalAudit", null, { Uid: crypto.randomUUID(), Acteur: acteurId, Perimetre: null, TypeObjet: "AFFECTATION", ObjetUid: String(superviseurId), Action: "SYNCHRONISATION_AFFECTATIONS", Resume: `Affectations synchronisées pour ${superviseur.nom}` }]]);
}

export function construireDonneesAffectations(
  tableUtilisateurs: TableGrist,
  tablePerimetres: TableGrist,
  tableEntites: TableGrist,
  tableAffectations: TableGrist,
): DonneesAffectations {
  const nomsEntites = new Map<number, string>();
  (tableEntites.id ?? []).forEach((valeur, index) => {
    const id = nombre(valeur); if (id) nomsEntites.set(id, texte(tableEntites.Nom?.[index]) || texte(tableEntites.Code?.[index]));
  });
  const perimetres: PerimetreAffectation[] = [];
  (tablePerimetres.id ?? []).forEach((valeur, index) => {
    const id = nombre(valeur); if (!id) return;
    const entiteId = referenceId(tablePerimetres.Entite?.[index]);
    perimetres.push({ id, code: texte(tablePerimetres.Code?.[index]), nom: texte(tablePerimetres.Nom?.[index]) || texte(tablePerimetres.Code?.[index]), entite: (entiteId && nomsEntites.get(entiteId)) || "Non renseignée", actif: booleen(tablePerimetres.Actif?.[index]) });
  });
  const nomsPerimetres = new Map(perimetres.map((perimetre) => [perimetre.id, perimetre]));

  const identites = new Map<number, { nom: string; email: string }>();
  (tableUtilisateurs.id ?? []).forEach((valeur, index) => {
    const id = nombre(valeur); if (!id) return;
    const email = texte(tableUtilisateurs.Email?.[index]);
    identites.set(id, { nom: `${texte(tableUtilisateurs.Prenom?.[index])} ${texte(tableUtilisateurs.Nom?.[index])}`.trim() || email || `Utilisateur ${id}`, email });
  });

  const affectations: AffectationSuperviseur[] = [];
  (tableAffectations.id ?? []).forEach((valeur, index) => {
    const id = nombre(valeur);
    const superviseurId = referenceId(tableAffectations.Superviseur?.[index]);
    const perimetreId = referenceId(tableAffectations.Perimetre?.[index]);
    if (!id || !superviseurId || !perimetreId) return;
    const identite = identites.get(superviseurId);
    const perimetre = nomsPerimetres.get(perimetreId);
    const dateDebutValeur = nombre(tableAffectations.DateDebut?.[index]);
    const dateFinValeur = nombre(tableAffectations.DateFin?.[index]);
    affectations.push({
      id, superviseurId, superviseur: identite?.nom || `Superviseur ${superviseurId}`, email: identite?.email || "",
      perimetreId, perimetre: perimetre?.nom || `Périmètre ${perimetreId}`, entite: perimetre?.entite || "Non renseignée",
      dateDebut: dateFr(dateDebutValeur), dateFin: dateFr(dateFinValeur), dateDebutValeur, dateFinValeur,
      actif: booleen(tableAffectations.Actif?.[index]),
    });
  });

  const superviseurs: SuperviseurAffectation[] = [];
  (tableUtilisateurs.id ?? []).forEach((valeur, index) => {
    const id = nombre(valeur);
    if (!id || choix(tableUtilisateurs.Role?.[index]) !== "SUPERVISEUR") return;
    const perimetresSupervisesIds = listeReferences(tableUtilisateurs.PerimetresSupervises?.[index]);
    const idsAffectations = idsUniques(affectations.filter((affectation) => affectation.superviseurId === id && affectation.actif).map((affectation) => affectation.perimetreId));
    const identite = identites.get(id);
    superviseurs.push({
      id, nom: identite?.nom || `Superviseur ${id}`, email: identite?.email || "", actif: booleen(tableUtilisateurs.Actif?.[index]),
      perimetresSupervisesIds,
      perimetresSupervises: perimetresSupervisesIds.map((perimetreId) => nomsPerimetres.get(perimetreId)?.nom || `Périmètre ${perimetreId}`),
      affectationsActives: idsAffectations.length,
      synchronise: ensemblesEgaux(perimetresSupervisesIds, idsAffectations),
    });
  });

  superviseurs.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  perimetres.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  affectations.sort((a, b) => Number(b.actif) - Number(a.actif) || (b.dateDebutValeur ?? 0) - (a.dateDebutValeur ?? 0));
  return { superviseurs, perimetres, affectations };
}

export function validerNouvelleAffectation(saisie: NouvelleAffectation, donnees: DonneesAffectations): void {
  const superviseur = donnees.superviseurs.find((element) => element.id === saisie.superviseurId);
  const perimetre = donnees.perimetres.find((element) => element.id === saisie.perimetreId);
  const debut = dateVersTimestamp(saisie.dateDebut);
  if (!superviseur?.actif) throw new Error("Sélectionnez un superviseur actif.");
  if (!perimetre?.actif) throw new Error("Sélectionnez un périmètre actif.");
  if (!debut) throw new Error("La date de début est obligatoire.");
  const historiques = donnees.affectations.filter((affectation) => affectation.superviseurId === saisie.superviseurId && affectation.perimetreId === saisie.perimetreId);
  if (historiques.some((affectation) => affectation.actif)) throw new Error("Ce superviseur possède déjà une affectation active sur ce périmètre.");
  const derniereFin = Math.max(0, ...historiques.map((affectation) => affectation.dateFinValeur ?? 0));
  if (derniereFin && debut <= derniereFin) throw new Error("La nouvelle affectation doit commencer après la dernière période clôturée.");
}

export function validerCloture(affectationId: number, dateFin: string, donnees: DonneesAffectations): AffectationSuperviseur {
  const affectation = donnees.affectations.find((element) => element.id === affectationId);
  if (!affectation?.actif) throw new Error("Cette affectation n’est plus active.");
  const fin = dateVersTimestamp(dateFin);
  if (!fin) throw new Error("La date de fin est obligatoire.");
  if (affectation.dateDebutValeur && fin < affectation.dateDebutValeur) throw new Error("La date de fin ne peut pas précéder la date de début.");
  return affectation;
}

function perimetresActifsDuSuperviseur(superviseurId: number, donnees: DonneesAffectations, ajouter?: number, exclureAffectationId?: number): number[] {
  const ids = donnees.affectations.filter((affectation) => affectation.superviseurId === superviseurId && affectation.actif && affectation.id !== exclureAffectationId).map((affectation) => affectation.perimetreId);
  if (ajouter) ids.push(ajouter);
  return idsUniques(ids);
}

const CLE_DEMO_AFFECTATIONS="spv-demo-admin-affectations-v1";
type AffectationDemo={id:number;superviseurId:number;perimetreId:number;dateDebut:number;dateFin:number|null;actif:boolean};
function affectationsDemoInitiales():AffectationDemo[]{return [
  {id:20,superviseurId:2,perimetreId:2,dateDebut:1_700_006_400,dateFin:null,actif:true},
];}
function lireAffectationsDemo():AffectationDemo[]{try{const b=sessionStorage.getItem(CLE_DEMO_AFFECTATIONS);if(b)return JSON.parse(b) as AffectationDemo[];}catch{}return affectationsDemoInitiales();}
function ecrireAffectationsDemo(v:AffectationDemo[]){try{sessionStorage.setItem(CLE_DEMO_AFFECTATIONS,JSON.stringify(v));}catch{}}
function creerAffectationDemo(s:NouvelleAffectation){const v=lireAffectationsDemo();const prochain=Math.max(99,...v.map(a=>a.id))+1;v.push({id:prochain,superviseurId:s.superviseurId,perimetreId:s.perimetreId,dateDebut:dateVersTimestamp(s.dateDebut)!,dateFin:null,actif:true});ecrireAffectationsDemo(v);}
function cloturerAffectationDemo(id:number,dateFin:string){const v=lireAffectationsDemo();const a=v.find(x=>x.id===id);if(!a)throw new Error("Cette affectation est introuvable.");a.dateFin=dateVersTimestamp(dateFin);a.actif=false;ecrireAffectationsDemo(v);}
function synchroniserSuperviseurDemo(_id:number,_d:DonneesAffectations){/* La vue est reconstruite depuis les affectations locales actives. */}
function donneesDemonstration(): DonneesAffectations {
  const affectations=lireAffectationsDemo();
  const perimetresParSuperviseur=(id:number)=>["L",...idsUniques(affectations.filter(a=>a.superviseurId===id&&a.actif).map(a=>a.perimetreId))];
  return construireDonneesAffectations({
    id: [2], Prenom: ["Camille"], Nom: ["BERNARD"], Email: ["camille.bernard@example.invalid"],
    Role: ["SUPERVISEUR"], Actif: [true], PerimetresSupervises: [perimetresParSuperviseur(2)],
  }, {
    id: [1, 2], Code: ["PER_NATIONAL", "PER_33_NORD"], Nom: ["Périmètre national", "SDIS 33 groupement NORD"], Entite: [1, 2], Actif: [true, true],
  }, { id: [1,2], Code: ["ENSOSPP","SIS_33"], Nom: ["ENSOSPP","SDIS de la Gironde"] }, {
    id: affectations.map(a=>a.id), Superviseur: affectations.map(a=>a.superviseurId), Perimetre: affectations.map(a=>a.perimetreId),
    DateDebut: affectations.map(a=>a.dateDebut), DateFin: affectations.map(a=>a.dateFin), Actif: affectations.map(a=>a.actif),
  });
}

function dateVersTimestamp(valeur: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return null;
  const timestamp = Date.parse(`${valeur}T00:00:00Z`);
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null;
}
function dateFr(valeur: number | null): string {
  if (!valeur) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(valeur * 1000));
}
function idsUniques(ids: readonly number[]): number[] { return [...new Set(ids)].sort((a, b) => a - b); }
function ensemblesEgaux(a: readonly number[], b: readonly number[]): boolean { return idsUniques(a).join(",") === idsUniques(b).join(","); }
function listeReferences(valeur: unknown): number[] { return Array.isArray(valeur) ? idsUniques(valeur.filter((element): element is number => typeof element === "number" && element > 0)) : []; }
function referenceId(valeur: unknown): number | null {
  if (typeof valeur === "number" && valeur > 0) return valeur;
  return Array.isArray(valeur) ? listeReferences(valeur).at(-1) ?? null : null;
}
function choix(valeur: unknown): string { return texte(valeur).trim().toUpperCase(); }
function nombre(valeur: unknown): number | null { return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : null; }
function texte(valeur: unknown): string { return typeof valeur === "string" ? valeur : ""; }
function booleen(valeur: unknown): boolean { return valeur === true || valeur === 1; }
