export function formaterNumeroVersion(valeur: unknown): string {
  if (typeof valeur === "string") return valeur.trim();
  if (typeof valeur !== "number" || !Number.isFinite(valeur)) return "";
  return Number.isInteger(valeur) ? valeur.toFixed(1) : String(valeur);
}
