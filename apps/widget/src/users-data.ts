import { obtenirDocApiGrist, TableGrist } from "./grist-context.js";
import { RoleUtilisateur } from "./portal-data.js";

export interface ReferenceAdministration {
  id: number;
  code: string;
  nom: string;
  entiteId?: number;
  actif: boolean;
}

export interface UtilisateurAdministration {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: RoleUtilisateur;
  peutGererPedagogie: boolean;
  entiteId: number | null;
  entite: string;
  perimetrePrincipalId: number | null;
  perimetrePrincipal: string;
  perimetresSupervisesIds: readonly number[];
  perimetresSupervises: readonly string[];
  actif: boolean;
  dateActivation: string;
  dateDesactivation: string;
}

export interface DonneesUtilisateurs {
  utilisateurs: readonly UtilisateurAdministration[];
  entites: readonly ReferenceAdministration[];
  perimetres: readonly ReferenceAdministration[];
}

export interface SaisieUtilisateur {
  id?: number;
  actifInitial?: boolean;
  email: string;
  nom: string;
  prenom: string;
  role: RoleUtilisateur;
  peutGererPedagogie: boolean;
  entiteId: number;
  perimetrePrincipalId: number;
  actif: boolean;
}

export async function chargerDonneesUtilisateurs(): Promise<DonneesUtilisateurs> {
  const docApi = obtenirDocApiGrist();
  if (!docApi) return donneesDemonstration();
  const [utilisateurs, entites, perimetres] = await Promise.all([
    docApi.fetchTable("Utilisateurs"),
    docApi.fetchTable("Entites"),
    docApi.fetchTable("Perimetres"),
  ]);
  return construireDonneesUtilisateurs(utilisateurs, entites, perimetres);
}

export async function enregistrerUtilisateur(saisie: SaisieUtilisateur): Promise<void> {
  const docApi = obtenirDocApiGrist();
  if (!docApi) throw new Error("L’enregistrement est disponible uniquement depuis le widget Grist.");
  const champs = preparerChampsUtilisateur(saisie);
  const action = saisie.id
    ? ["UpdateRecord", "Utilisateurs", saisie.id, champs]
    : ["AddRecord", "Utilisateurs", null, { ...champs, CreatedAt: maintenant() }];
  await docApi.applyUserActions([action]);
}

export function construireDonneesUtilisateurs(
  tableUtilisateurs: TableGrist,
  tableEntites: TableGrist,
  tablePerimetres: TableGrist,
): DonneesUtilisateurs {
  const entites = construireReferences(tableEntites);
  const perimetres = construireReferences(tablePerimetres, true);
  const nomsEntites = new Map(entites.map((entite) => [entite.id, entite.nom]));
  const nomsPerimetres = new Map(perimetres.map((perimetre) => [perimetre.id, perimetre.nom]));
  const ids = tableUtilisateurs.id ?? [];

  const utilisateurs: UtilisateurAdministration[] = [];
  ids.forEach((valeur, index) => {
    const id = nombre(valeur);
    const role = normaliserRole(tableUtilisateurs.Role?.[index]);
    if (!id || !role) return;
    const entiteId = referenceId(tableUtilisateurs.Entite?.[index]);
    const perimetrePrincipalId = referenceId(tableUtilisateurs.PerimetrePrincipal?.[index]);
    const perimetresSupervisesIds = listeReferences(tableUtilisateurs.PerimetresSupervises?.[index]);
    utilisateurs.push({
      id,
      email: texte(tableUtilisateurs.Email?.[index]),
      nom: texte(tableUtilisateurs.Nom?.[index]),
      prenom: texte(tableUtilisateurs.Prenom?.[index]),
      role,
      peutGererPedagogie: role === "ADMIN",
      entiteId,
      entite: (entiteId && nomsEntites.get(entiteId)) || "Non renseignée",
      perimetrePrincipalId,
      perimetrePrincipal: (perimetrePrincipalId && nomsPerimetres.get(perimetrePrincipalId)) || "Non renseigné",
      perimetresSupervisesIds,
      perimetresSupervises: perimetresSupervisesIds.map((perimetreId) => nomsPerimetres.get(perimetreId) || `Périmètre ${perimetreId}`),
      actif: booleen(tableUtilisateurs.Actif?.[index]),
      dateActivation: dateFr(tableUtilisateurs.DateActivation?.[index]),
      dateDesactivation: dateFr(tableUtilisateurs.DateDesactivation?.[index]),
    });
  });
  utilisateurs.sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"));

  return { utilisateurs, entites, perimetres };
}

export function preparerChampsUtilisateur(saisie: SaisieUtilisateur): Record<string, unknown> {
  const email = saisie.email.trim().toLocaleLowerCase("fr");
  if (!email || !email.includes("@")) throw new Error("Une adresse électronique valide est obligatoire.");
  if (!saisie.nom.trim() || !saisie.prenom.trim()) throw new Error("Le nom et le prénom sont obligatoires.");
  if (!saisie.entiteId || !saisie.perimetrePrincipalId) throw new Error("L’entité et le périmètre principal sont obligatoires.");
  const horodatage = maintenant();
  const champs: Record<string, unknown> = {
    Email: email,
    Nom: saisie.nom.trim().toLocaleUpperCase("fr"),
    Prenom: normaliserPrenom(saisie.prenom),
    Role: saisie.role,
    PeutGererPedagogie: saisie.role === "ADMIN",
    Entite: saisie.entiteId,
    PerimetrePrincipal: saisie.perimetrePrincipalId,
    Actif: saisie.actif,
    UpdatedAt: horodatage,
  };
  const creation = !saisie.id;
  const changementStatut = saisie.actifInitial !== undefined && saisie.actifInitial !== saisie.actif;
  if (creation || changementStatut) {
    champs.DateActivation = saisie.actif ? debutJour() : null;
    champs.DateDesactivation = saisie.actif ? null : debutJour();
  }
  return champs;
}

function construireReferences(table: TableGrist, avecEntite = false): ReferenceAdministration[] {
  const references: ReferenceAdministration[] = [];
  (table.id ?? []).forEach((valeur, index) => {
    const id = nombre(valeur);
    if (!id) return;
    const reference: ReferenceAdministration = {
      id,
      code: texte(table.Code?.[index]),
      nom: texte(table.Nom?.[index]) || texte(table.Code?.[index]) || `Référence ${id}`,
      actif: booleen(table.Actif?.[index]),
    };
    const entiteId = avecEntite ? referenceId(table.Entite?.[index]) : null;
    if (entiteId) reference.entiteId = entiteId;
    references.push(reference);
  });
  return references.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

function donneesDemonstration(): DonneesUtilisateurs {
  const entites: ReferenceAdministration[] = [{ id: 1, code: "ENSOSPP", nom: "ENSOSPP", actif: true }];
  const perimetres: ReferenceAdministration[] = [{ id: 1, code: "NATIONAL", nom: "Périmètre national", entiteId: 1, actif: true }];
  return construireDonneesUtilisateurs({
    id: [1, 2, 3], Email: ["alex@example.invalid", "camille@example.invalid", "morgan@example.invalid"],
    Nom: ["MARTIN", "BERNARD", "ROBERT"], Prenom: ["Alex", "Camille", "Morgan"],
    Role: ["ADMIN", "SUPERVISEUR", "RECRUTEUR"], PeutGererPedagogie: [true, false, false],
    Entite: [1, 1, 1], PerimetrePrincipal: [1, 1, 1], PerimetresSupervises: [["L"], ["L", 1], ["L"]],
    Actif: [true, true, false], DateActivation: [1_700_006_400, 1_700_006_400, 1_700_006_400], DateDesactivation: [null, null, 1_730_000_000],
  }, referencesVersTable(entites), referencesVersTable(perimetres, true));
}

function referencesVersTable(references: ReferenceAdministration[], avecEntite = false): TableGrist {
  return {
    id: references.map((reference) => reference.id), Code: references.map((reference) => reference.code),
    Nom: references.map((reference) => reference.nom), Actif: references.map((reference) => reference.actif),
    ...(avecEntite ? { Entite: references.map((reference) => reference.entiteId ?? null) } : {}),
  };
}

function normaliserRole(valeur: unknown): RoleUtilisateur | null {
  const role = texte(valeur).trim().toUpperCase();
  if (role === "ADMIN" || role === "ADMINISTRATEUR") return "ADMIN";
  if (role === "SUPERVISEUR") return "SUPERVISEUR";
  if (role === "RECRUTEUR") return "RECRUTEUR";
  return null;
}

function normaliserPrenom(valeur: string): string {
  return valeur.trim().toLocaleLowerCase("fr").replace(/(^|[-' ])\p{L}/gu, (lettre) => lettre.toLocaleUpperCase("fr"));
}

function listeReferences(valeur: unknown): number[] {
  if (!Array.isArray(valeur)) return [];
  return valeur.filter((element): element is number => typeof element === "number" && element > 0);
}

function referenceId(valeur: unknown): number | null {
  if (typeof valeur === "number" && valeur > 0) return valeur;
  if (Array.isArray(valeur)) return listeReferences(valeur).at(-1) ?? null;
  return null;
}

function dateFr(valeur: unknown): string {
  const timestamp = nombre(valeur);
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" }).format(new Date(timestamp * 1000));
}

function maintenant(): number { return Math.floor(Date.now() / 1000); }
function debutJour(): number {
  const date = new Date();
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000);
}
function nombre(valeur: unknown): number | null { return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : null; }
function texte(valeur: unknown): string { return typeof valeur === "string" ? valeur : ""; }
function booleen(valeur: unknown): boolean { return valeur === true || valeur === 1; }
