import { obtenirDocApiGrist, TableGrist } from "./grist-context.js";
import { UtilisateurCourant } from "./portal-data.js";

export interface ReglagePerimetre {
  id: number;
  perimetreId: number;
  perimetre: string;
  indicateurId: number;
  indicateur: string;
  codeIndicateur: string;
  actif: boolean;
}

export async function chargerReglagesPerimetres(utilisateur: UtilisateurCourant): Promise<readonly ReglagePerimetre[]> {
  const api = obtenirDocApiGrist();
  if (!api) return donneesDemonstration();
  const [reglages, indicateurs, perimetres] = await Promise.all([
    api.fetchTable("ParametragesPerimetres"), api.fetchTable("Indicateurs"), api.fetchTable("Perimetres"),
  ]);
  return construireReglages(reglages, indicateurs, perimetres, utilisateur.id);
}

export async function enregistrerReglage(reglage: ReglagePerimetre, actif: boolean, utilisateur: Pick<UtilisateurCourant, "id" | "email">): Promise<void> {
  const api = obtenirDocApiGrist();
  if (!api) throw new Error("L’enregistrement est disponible uniquement depuis le widget Grist.");
  await api.applyUserActions([
    ["UpdateRecord", "ParametragesPerimetres", reglage.id, { Actif: actif }],
    ["AddRecord", "JournalAudit", null, {
      Uid: crypto.randomUUID(), ActeurEmail: utilisateur.email.trim().toLocaleLowerCase("fr"), Acteur: utilisateur.id,
      Perimetre: reglage.perimetreId, TypeObjet: "PARAMETRE", ObjetUid: String(reglage.id),
      Action: "MODIFICATION_PARAMETRAGE_PERIMETRE", Resume: `${reglage.codeIndicateur} — ${reglage.perimetre} : ${actif ? "activé" : "désactivé"}`,
    }],
  ]);
}

export function construireReglages(reglages: TableGrist, indicateurs: TableGrist, perimetres: TableGrist, superviseurId: number): ReglagePerimetre[] {
  const nomsPerimetres = new Map((perimetres.id ?? []).map((id, i) => [nombre(id), texte(perimetres.Nom?.[i]) || texte(perimetres.Code?.[i])]));
  const infosIndicateurs = new Map((indicateurs.id ?? []).map((id, i) => [nombre(id), { titre: texte(indicateurs.Titre?.[i]), code: texte(indicateurs.Code?.[i]) }]));
  return (reglages.id ?? []).flatMap((id, i) => {
    const reglageId = nombre(id); const perimetreId = reference(reglages.Perimetre?.[i]); const indicateurId = reference(reglages.Indicateur?.[i]);
    const responsable = reference(reglages.SuperviseurResponsable?.[i]); const info = indicateurId ? infosIndicateurs.get(indicateurId) : undefined;
    if (!reglageId || !perimetreId || !indicateurId || (responsable && responsable !== superviseurId) || !info) return [];
    return [{ id: reglageId, perimetreId, perimetre: nomsPerimetres.get(perimetreId) || `Périmètre ${perimetreId}`, indicateurId, indicateur: info.titre || `Indicateur ${indicateurId}`, codeIndicateur: info.code, actif: booleen(reglages.Actif?.[i]) }];
  }).sort((a, b) => a.perimetre.localeCompare(b.perimetre, "fr") || a.codeIndicateur.localeCompare(b.codeIndicateur, "fr"));
}

function donneesDemonstration(): ReglagePerimetre[] { return [{ id: 1, perimetreId: 1, perimetre: "Périmètre national", indicateurId: 11, indicateur: "Délai du premier contact", codeIndicateur: "IND_01", actif: true }]; }
function reference(v: unknown): number | null { if (typeof v === "number" && v > 0) return v; if (Array.isArray(v)) return v.filter((x): x is number => typeof x === "number" && x > 0).at(-1) ?? null; return null; }
function nombre(v: unknown): number | null { return typeof v === "number" && Number.isFinite(v) ? v : null; }
function texte(v: unknown): string { return typeof v === "string" ? v : ""; }
function booleen(v: unknown): boolean { return v === true || v === 1; }
