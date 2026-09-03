import { RoleUtilisateur, UtilisateurCourant, utilisateurPrototype } from "./portal-data.js";

export type TableGrist = Record<string, unknown[]>;

export interface DocApiGrist {
  applyUserActions(actions: unknown[][]): Promise<unknown>;
  fetchTable(tableId: string): Promise<TableGrist>;
  getAccessToken?(options?: { readOnly?: boolean }): Promise<{ baseUrl: string; token: string }>;
}

interface ApiGrist {
  ready(options?: { requiredAccess?: string }): void;
  docApi: DocApiGrist;
}

declare global {
  interface Window {
    grist?: ApiGrist;
  }
}

const TABLE_CONTEXTE = "ContexteWidget";

export async function chargerUtilisateurCourant(): Promise<UtilisateurCourant> {
  if (window.parent === window) {
    if (new URLSearchParams(window.location.search).has("role")) return utilisateurPrototype();
    throw new Error("Ce widget doit être ouvert depuis votre document Grist.");
  }
  const grist = window.grist;
  if (!grist) throw new Error("L’API Grist n’a pas pu être chargée.");

  grist.ready({ requiredAccess: "full" });
  const cleSession = crypto.randomUUID();
  let contexteId: number | null = null;

  try {
    await grist.docApi.applyUserActions([
      ["AddRecord", TABLE_CONTEXTE, null, { CleSession: cleSession }],
    ]);

    const contexte = await grist.docApi.fetchTable(TABLE_CONTEXTE);
    const indexContexte = trouverIndex(contexte, "CleSession", cleSession);
    if (indexContexte < 0) throw new Error("La ligne d’identification du widget est introuvable.");

    contexteId = nombre(contexte.id?.[indexContexte]);
    const utilisateurId = referenceId(contexte.Utilisateur?.[indexContexte]);
    if (!utilisateurId || !booleen(contexte.EstIdentifie?.[indexContexte])) {
      throw new Error("Votre adresse Grist ne correspond à aucun compte actif dans Utilisateurs.");
    }

    const [utilisateurs, entites, perimetres, affectationsSuperviseurs] = await Promise.all([
      grist.docApi.fetchTable("Utilisateurs"),
      grist.docApi.fetchTable("Entites"),
      grist.docApi.fetchTable("Perimetres"),
      grist.docApi.fetchTable("AffectationsSuperviseurs").catch(() => ({} as TableGrist)),
    ]);

    return construireUtilisateur(utilisateurId, utilisateurs, entites, perimetres, affectationsSuperviseurs);
  } finally {
    if (contexteId) {
      try {
        await grist.docApi.applyUserActions([["RemoveRecord", TABLE_CONTEXTE, contexteId]]);
      } catch (erreur) {
        console.warn("La ligne technique ContexteWidget n’a pas pu être supprimée.", erreur);
      }
    }
  }
}

export function construireUtilisateur(
  utilisateurId: number,
  utilisateurs: TableGrist,
  entites: TableGrist,
  perimetres: TableGrist,
  affectationsSuperviseurs: TableGrist = {},
): UtilisateurCourant {
  const index = trouverIndex(utilisateurs, "id", utilisateurId);
  if (index < 0) throw new Error("Votre fiche Utilisateurs n’est pas accessible avec les ACL actuelles.");

  const actif = booleen(utilisateurs.Actif?.[index]);
  if (!actif) throw new Error("Votre compte applicatif est désactivé.");

  const role = normaliserRole(utilisateurs.Role?.[index]);
  const perimetrePrincipalId = referenceId(utilisateurs.PerimetrePrincipal?.[index]);

  return {
    id: utilisateurId,
    prenom: texte(utilisateurs.Prenom?.[index]) || "Utilisateur",
    nom: texte(utilisateurs.Nom?.[index]),
    email: texte(utilisateurs.Email?.[index]),
    role,
    entite: libelleReference(utilisateurs.Entite?.[index], entites),
    perimetrePrincipal: libelleReference(utilisateurs.PerimetrePrincipal?.[index], perimetres),
    perimetresSupervises: listeReferences(utilisateurs.PerimetresSupervises?.[index])
      .map((id) => libelleReference(id, perimetres))
      .filter(Boolean),
    superviseurNom: role === "RECRUTEUR"
      ? trouverSuperviseur(perimetrePrincipalId, affectationsSuperviseurs, utilisateurs)
      : "—",
    peutGererPedagogie: role === "ADMIN",
    actif,
  };
}

export function obtenirDocApiGrist(): DocApiGrist | null {
  if (window.parent === window) return null;
  return window.grist?.docApi ?? null;
}

function trouverSuperviseur(
  perimetreId: number | null,
  affectations: TableGrist,
  utilisateurs: TableGrist,
): string {
  if (!perimetreId) return "Non renseigné";
  const index = (affectations.id ?? []).findIndex((_, i) =>
    referenceId(affectations.Perimetre?.[i]) === perimetreId
    && booleen(affectations.Actif?.[i])
  );
  if (index < 0) return "Non renseigné";
  const superviseurId = referenceId(affectations.Superviseur?.[index]);
  if (!superviseurId) return "Non renseigné";
  const ui = trouverIndex(utilisateurs, "id", superviseurId);
  if (ui < 0) return "Non renseigné";
  return `${texte(utilisateurs.Prenom?.[ui])} ${texte(utilisateurs.Nom?.[ui])}`.trim() || texte(utilisateurs.Email?.[ui]) || "Non renseigné";
}

function trouverIndex(table: TableGrist, colonne: string, valeur: unknown): number {
  return (table[colonne] ?? []).findIndex((cellule) => cellule === valeur);
}

function normaliserRole(valeur: unknown): RoleUtilisateur {
  const role = texte(valeur).trim().toUpperCase();
  if (role === "ADMIN" || role === "ADMINISTRATEUR") return "ADMIN";
  if (role === "SUPERVISEUR") return "SUPERVISEUR";
  if (role === "RECRUTEUR") return "RECRUTEUR";
  throw new Error(`Le rôle applicatif « ${texte(valeur) || "vide"} » n’est pas reconnu.`);
}

function libelleReference(valeur: unknown, table: TableGrist): string {
  const id = referenceId(valeur);
  if (id) {
    const index = trouverIndex(table, "id", id);
    if (index >= 0) return texte(table.Nom?.[index]) || texte(table.Code?.[index]);
  }
  return typeof valeur === "string" ? valeur : "Non renseigné";
}

function listeReferences(valeur: unknown): number[] {
  if (!Array.isArray(valeur)) return [];
  return valeur.filter((element): element is number => typeof element === "number");
}

function referenceId(valeur: unknown): number | null {
  if (typeof valeur === "number" && valeur > 0) return valeur;
  if (Array.isArray(valeur)) {
    for (let index = valeur.length - 1; index >= 0; index -= 1) {
      const id = valeur[index];
      if (typeof id === "number" && id > 0) return id;
    }
  }
  return null;
}

function nombre(valeur: unknown): number | null {
  return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : null;
}

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

function booleen(valeur: unknown): boolean {
  return valeur === true || valeur === 1;
}
