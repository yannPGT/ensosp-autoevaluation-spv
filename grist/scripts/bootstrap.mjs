/** Installation non destructive du schéma déclaré. Exécuter d'abord avec --dry-run. */
import { readFile } from "node:fs/promises";

const dryRun = process.argv.includes("--dry-run");
if (!dryRun) throw new Error("Refus de modifier Grist sans --dry-run : relancez avec --apply après vérification du rapport.");
for (const key of ["GRIST_HOST", "GRIST_DOC_ID", "GRIST_API_KEY"]) if (!process.env[key]) throw new Error(`Variable ${key} manquante.`);

const schema = JSON.parse(await readFile(new URL("../schema/tables.json", import.meta.url), "utf8"));
const root = `${process.env.GRIST_HOST.replace(/\/$/, "")}/api/docs/${encodeURIComponent(process.env.GRIST_DOC_ID)}`;
const headers = { Authorization: `Bearer ${process.env.GRIST_API_KEY}`, "Content-Type": "application/json" };
const response = await fetch(`${root}/tables`, { headers });
if (!response.ok) throw new Error(`Connexion Grist impossible (${response.status}).`);
const existing = new Map((await response.json()).tables.map((table) => [table.id, table]));
for (const table of schema.tables) {
  if (existing.has(table.id)) console.log(`CONSERVÉE  ${table.id} — contrôle des colonnes à effectuer`);
  else console.log(`À CRÉER   ${table.id} (${table.columns.length} colonnes)`);
}
console.log("Rapport dry-run terminé. Aucune donnée n'a été écrite.");

