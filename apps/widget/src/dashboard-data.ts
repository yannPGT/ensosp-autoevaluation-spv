import { obtenirDocApiGrist, TableGrist } from "./grist-context.js";
import { RoleUtilisateur, UtilisateurCourant } from "./portal-data.js";

export interface CarteTableauDeBord {
  valeur: string;
  libelle: string;
  detail?: string;
}

export interface LigneTableauDeBord {
  titre: string;
  detail: string;
  valeur: string;
}

export interface PersonnelTableauDeBord {
  id: number;
  nom: string;
  email: string;
  role: RoleUtilisateur;
  perimetre: string;
  derniereEvaluation: string;
  actionsOuvertes: number;
}

export interface TableauDeBord {
  cartes: readonly CarteTableauDeBord[];
  repartition?: { rouge: number; orange: number; vert: number };
  titreSuivi?: string;
  lignes: readonly LigneTableauDeBord[];
  personnel: readonly PersonnelTableauDeBord[];
  note?: string;
}

const STATUTS_ACTION_FERMEE = new Set(["PROGRESSION_VALIDEE", "ARCHIVEE"]);

export async function chargerTableauDeBord(utilisateur: UtilisateurCourant): Promise<TableauDeBord> {
  const docApi = obtenirDocApiGrist();
  if (!docApi) return construireTableauDeBord(utilisateur, tablesVides());

  const nomsTables = tablesPourRole(utilisateur.role);
  const valeurs = await Promise.all(nomsTables.map((nom) => docApi.fetchTable(nom)));
  const tables: Record<string, TableGrist> = {};
  nomsTables.forEach((nom, index) => { tables[nom] = valeurs[index]!; });
  return construireTableauDeBord(utilisateur, tables);
}

export function construireTableauDeBord(
  utilisateur: UtilisateurCourant,
  tables: Record<string, TableGrist>,
): TableauDeBord {
  if (utilisateur.role === "RECRUTEUR") return tableauRecruteur(utilisateur, tables);
  if (utilisateur.role === "SUPERVISEUR") return tableauSuperviseur(tables);
  return tableauAdministrateur(tables);
}

function tableauRecruteur(utilisateur: UtilisateurCourant, tables: Record<string, TableGrist>): TableauDeBord {
  const evaluations = lignes(tables.Evaluations).filter((ligne) => ref(ligne.Recruteur) === utilisateur.id);
  const actions = lignes(tables.ActionsProgres).filter((ligne) => ref(ligne.Recruteur) === utilisateur.id);
  const actionsOuvertes = actions.filter(actionOuverte);
  const evaluationsValidees = evaluations.filter((ligne) => choix(ligne.Statut) === "VALIDEE");
  const derniereEvaluation = plusRecente(evaluationsValidees, "DateValidation", "UpdatedAt", "CreatedAt");
  const reponses = lignes(tables.Reponses).filter((ligne) => ref(ligne.Evaluation) === nombre(derniereEvaluation?.id));
  const prochaine = prochaineEcheance(actionsOuvertes);
  const enRetard = actionsOuvertes.filter(estEnRetard).length;
  const fiches = new Set(actionsOuvertes.map((ligne) => ref(ligne.FicheVersion)).filter(Boolean));

  return {
    cartes: [
      {
        valeur: derniereEvaluation ? dateFr(derniereEvaluation.DateValidation ?? derniereEvaluation.UpdatedAt) : "Aucune",
        libelle: "Dernière évaluation",
        detail: derniereEvaluation ? "Évaluation validée" : "Aucune évaluation validée",
      },
      { valeur: String(actionsOuvertes.length), libelle: "Actions ouvertes", detail: `${enRetard} en retard` },
      {
        valeur: prochaine ? dateFr(prochaine.Echeance) : "Aucune",
        libelle: "Prochaine échéance",
        detail: prochaine ? choix(prochaine.Statut).replaceAll("_", " ") : "Aucune échéance planifiée",
      },
      { valeur: String(fiches.size), libelle: "Fiches affectées", detail: "Ressources liées aux actions ouvertes" },
      { valeur: String(evaluationsValidees.length), libelle: "Historique", detail: "Évaluations validées" },
      {
        valeur: String(actionsOuvertes.filter((ligne) => choix(ligne.Statut) === "EN_ATTENTE_VALIDATION").length),
        libelle: "Validations en attente",
        detail: "Demandes transmises au superviseur",
      },
    ],
    repartition: repartitionNiveaux(reponses),
    titreSuivi: "Mes prochaines actions",
    lignes: actionsOuvertes
      .sort((a, b) => temps(a.Echeance) - temps(b.Echeance))
      .slice(0, 5)
      .map((ligne) => ({
        titre: choix(ligne.Statut).replaceAll("_", " "),
        detail: ligne.Echeance ? `Échéance : ${dateFr(ligne.Echeance)}` : "Sans échéance",
        valeur: choix(ligne.NiveauCourant) || choix(ligne.NiveauInitial),
      })),
    personnel: [],
    note: "La répartition correspond à votre dernière évaluation validée. Elle ne constitue pas une note globale.",
  };
}

function tableauSuperviseur(tables: Record<string, TableGrist>): TableauDeBord {
  const utilisateurs = lignes(tables.Utilisateurs);
  const recruteurs = utilisateurs.filter((ligne) => choix(ligne.Role) === "RECRUTEUR" && booleen(ligne.Actif));
  const evaluations = lignes(tables.Evaluations);
  const dernieres = dernieresEvaluationsValidees(evaluations);
  const idsEvaluations = new Set(dernieres.map((ligne) => nombre(ligne.id)).filter((id): id is number => Boolean(id)));
  const reponses = lignes(tables.Reponses).filter((ligne) => idsEvaluations.has(ref(ligne.Evaluation) ?? 0));
  const actionsOuvertes = lignes(tables.ActionsProgres).filter(actionOuverte);
  const taux = recruteurs.length ? Math.round((dernieres.length / recruteurs.length) * 100) : 0;
  const personnel = construirePersonnel(recruteurs, dernieres, actionsOuvertes, lignes(tables.Perimetres));

  return {
    cartes: [
      { valeur: String(recruteurs.length), libelle: "Recruteurs suivis", detail: "Comptes actifs visibles par vos ACL" },
      { valeur: `${taux} %`, libelle: "Taux de réalisation", detail: "Recruteurs avec une évaluation validée" },
      {
        valeur: String(actionsOuvertes.filter((ligne) => choix(ligne.Statut) === "EN_ATTENTE_VALIDATION").length),
        libelle: "Progrès à valider",
        detail: "Demandes en attente de décision",
      },
      { valeur: String(actionsOuvertes.length), libelle: "Progrès ouverts", detail: "Toutes les actions non terminées" },
      { valeur: String(actionsOuvertes.filter(estEnRetard).length), libelle: "Échéances dépassées", detail: "Actions ouvertes en retard" },
      { valeur: String(dernieres.length), libelle: "Bilans disponibles", detail: "Dernières évaluations validées" },
    ],
    repartition: repartitionNiveaux(reponses),
    titreSuivi: "Progression individuelle",
    lignes: recruteurs.slice(0, 8).map((recruteur) => {
      const recruteurId = nombre(recruteur.id);
      const evaluation = dernieres.find((ligne) => ref(ligne.Recruteur) === recruteurId);
      const actions = actionsOuvertes.filter((ligne) => ref(ligne.Recruteur) === recruteurId);
      return {
        titre: `${texte(recruteur.Prenom)} ${texte(recruteur.Nom)}`.trim() || texte(recruteur.Email),
        detail: evaluation ? `Dernière évaluation : ${dateFr(evaluation.DateValidation)}` : "Aucune évaluation validée",
        valeur: `${actions.length} action${actions.length > 1 ? "s" : ""}`,
      };
    }),
    personnel,
    note: "Les résultats agrègent uniquement la dernière évaluation validée de chaque recruteur visible.",
  };
}

function tableauAdministrateur(tables: Record<string, TableGrist>): TableauDeBord {
  const utilisateurs = lignes(tables.Utilisateurs);
  const utilisateursActifs = utilisateurs.filter((ligne) => booleen(ligne.Actif));
  const recruteurs = utilisateursActifs.filter((ligne) => choix(ligne.Role) === "RECRUTEUR");
  const perimetres = lignes(tables.Perimetres);
  const perimetresActifs = perimetres.filter((ligne) => booleen(ligne.Actif));
  const evaluations = lignes(tables.Evaluations);
  const evaluationsValidees = evaluations.filter((ligne) => choix(ligne.Statut) === "VALIDEE");
  const dernieres = dernieresEvaluationsValidees(evaluations);
  const idsEvaluations = new Set(dernieres.map((ligne) => nombre(ligne.id)).filter((id): id is number => Boolean(id)));
  const reponses = lignes(tables.Reponses).filter((ligne) => idsEvaluations.has(ref(ligne.Evaluation) ?? 0));
  const actionsOuvertes = lignes(tables.ActionsProgres).filter(actionOuverte);
  const fiches = lignes(tables.FichesEnseignement);
  const taux = recruteurs.length ? Math.round((dernieres.length / recruteurs.length) * 100) : 0;
  const nomsPerimetres = new Map(perimetres.map((ligne) => [nombre(ligne.id), texte(ligne.Nom) || texte(ligne.Code)]));
  const personnel = construirePersonnel(utilisateursActifs, dernieres, actionsOuvertes, perimetres);

  const repartitionPerimetres = new Map<number, number>();
  dernieres.forEach((evaluation) => {
    const perimetre = ref(evaluation.Perimetre);
    if (perimetre) repartitionPerimetres.set(perimetre, (repartitionPerimetres.get(perimetre) ?? 0) + 1);
  });

  return {
    cartes: [
      {
        valeur: String(utilisateursActifs.length),
        libelle: "Utilisateurs actifs",
        detail: resumeRoles(utilisateursActifs),
      },
      { valeur: String(perimetresActifs.length), libelle: "Périmètres actifs", detail: "Organisation territoriale active" },
      { valeur: String(evaluationsValidees.length), libelle: "Évaluations validées", detail: "Historique consolidé" },
      { valeur: `${taux} %`, libelle: "Taux de complétion", detail: "Recruteurs avec une évaluation validée" },
      { valeur: String(actionsOuvertes.length), libelle: "Actions ouvertes", detail: `${actionsOuvertes.filter(estEnRetard).length} en retard` },
      {
        valeur: String(fiches.filter((ligne) => choix(ligne.Statut) === "PUBLIEE" && booleen(ligne.Actif)).length),
        libelle: "Fiches publiées",
        detail: `${fiches.filter((ligne) => choix(ligne.Statut) === "BROUILLON").length} brouillon(s)`,
      },
    ],
    repartition: repartitionNiveaux(reponses),
    titreSuivi: "Répartition par périmètre",
    lignes: [...repartitionPerimetres.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, total]) => ({
        titre: nomsPerimetres.get(id) || `Périmètre ${id}`,
        detail: "Recruteurs disposant d’un bilan récent",
        valeur: String(total),
      })),
    personnel,
    note: "La consolidation utilise la dernière évaluation validée de chaque recruteur, sans classement ni note globale.",
  };
}

function tablesPourRole(role: RoleUtilisateur): string[] {
  const communes = ["Evaluations", "Reponses", "ActionsProgres"];
  if (role === "RECRUTEUR") return communes;
  if (role === "SUPERVISEUR") return [...communes, "Utilisateurs", "Perimetres"];
  return [...communes, "Utilisateurs", "Perimetres", "FichesEnseignement"];
}

function construirePersonnel(
  utilisateurs: Record<string, unknown>[],
  dernieresEvaluations: Record<string, unknown>[],
  actionsOuvertes: Record<string, unknown>[],
  perimetres: Record<string, unknown>[],
): PersonnelTableauDeBord[] {
  const nomsPerimetres = new Map(perimetres.map((ligne) => [nombre(ligne.id), texte(ligne.Nom) || texte(ligne.Code)]));
  return utilisateurs
    .map((utilisateur) => {
      const id = nombre(utilisateur.id);
      const role = roleUtilisateur(utilisateur.Role);
      if (!id || !role) return null;
      const evaluation = dernieresEvaluations.find((ligne) => ref(ligne.Recruteur) === id);
      const actions = actionsOuvertes.filter((ligne) => ref(ligne.Recruteur) === id).length;
      const nom = `${texte(utilisateur.Prenom)} ${texte(utilisateur.Nom)}`.trim();
      return {
        id,
        nom: nom || texte(utilisateur.Email) || `Utilisateur ${id}`,
        email: texte(utilisateur.Email),
        role,
        perimetre: nomsPerimetres.get(ref(utilisateur.PerimetrePrincipal)) || "Non renseigné",
        derniereEvaluation: role === "RECRUTEUR"
          ? (evaluation ? dateFr(evaluation.DateValidation ?? evaluation.UpdatedAt) : "Aucune évaluation")
          : "Non concerné",
        actionsOuvertes: actions,
      } satisfies PersonnelTableauDeBord;
    })
    .filter((personne): personne is PersonnelTableauDeBord => personne !== null)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

function tablesVides(): Record<string, TableGrist> {
  return {
    Evaluations: { id: [] }, Reponses: { id: [] }, ActionsProgres: { id: [] },
    Utilisateurs: { id: [] }, Perimetres: { id: [] }, FichesEnseignement: { id: [] },
  };
}

function lignes(table: TableGrist | undefined): Record<string, unknown>[] {
  if (!table) return [];
  const total = table.id?.length ?? 0;
  return Array.from({ length: total }, (_, index) => Object.fromEntries(
    Object.entries(table).map(([colonne, valeurs]) => [colonne, valeurs[index]]),
  ));
}

function dernieresEvaluationsValidees(evaluations: Record<string, unknown>[]): Record<string, unknown>[] {
  const parRecruteur = new Map<number, Record<string, unknown>>();
  evaluations.filter((ligne) => choix(ligne.Statut) === "VALIDEE").forEach((evaluation) => {
    const recruteur = ref(evaluation.Recruteur);
    if (!recruteur) return;
    const actuelle = parRecruteur.get(recruteur);
    if (!actuelle || temps(evaluation.DateValidation ?? evaluation.UpdatedAt) > temps(actuelle.DateValidation ?? actuelle.UpdatedAt)) {
      parRecruteur.set(recruteur, evaluation);
    }
  });
  return [...parRecruteur.values()];
}

function repartitionNiveaux(reponses: Record<string, unknown>[]): { rouge: number; orange: number; vert: number } {
  return reponses.reduce<{ rouge: number; orange: number; vert: number }>((resultat, ligne) => {
    const niveau = choix(ligne.Niveau).toLowerCase();
    if (niveau === "rouge" || niveau === "orange" || niveau === "vert") resultat[niveau] += 1;
    return resultat;
  }, { rouge: 0, orange: 0, vert: 0 });
}

function actionOuverte(ligne: Record<string, unknown>): boolean {
  return !STATUTS_ACTION_FERMEE.has(choix(ligne.Statut));
}

function estEnRetard(ligne: Record<string, unknown>): boolean {
  const echeance = temps(ligne.Echeance);
  return Boolean(echeance && echeance < debutAujourdhui());
}

function prochaineEcheance(actions: Record<string, unknown>[]): Record<string, unknown> | undefined {
  return actions.filter((ligne) => temps(ligne.Echeance) >= debutAujourdhui())
    .sort((a, b) => temps(a.Echeance) - temps(b.Echeance))[0];
}

function plusRecente(lignesSource: Record<string, unknown>[], ...colonnes: string[]): Record<string, unknown> | undefined {
  return [...lignesSource].sort((a, b) => {
    const tempsA = Math.max(...colonnes.map((colonne) => temps(a[colonne])));
    const tempsB = Math.max(...colonnes.map((colonne) => temps(b[colonne])));
    return tempsB - tempsA;
  })[0];
}

function resumeRoles(utilisateurs: Record<string, unknown>[]): string {
  const total = (role: string) => utilisateurs.filter((ligne) => choix(ligne.Role) === role).length;
  return `${total("ADMIN")} admin. · ${total("SUPERVISEUR")} supervis. · ${total("RECRUTEUR")} recrut.`;
}

function debutAujourdhui(): number {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dateFr(valeur: unknown): string {
  const valeurTemps = temps(valeur);
  return valeurTemps ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(valeurTemps) : "Non renseignée";
}

function temps(valeur: unknown): number {
  if (typeof valeur === "number") return valeur > 10_000_000_000 ? valeur : valeur * 1000;
  if (typeof valeur === "string") return Date.parse(valeur) || 0;
  return 0;
}

function ref(valeur: unknown): number | null {
  return typeof valeur === "number" && valeur > 0 ? valeur : null;
}

function nombre(valeur: unknown): number | null {
  return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : null;
}

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

function choix(valeur: unknown): string {
  return texte(valeur).trim().toUpperCase();
}

function roleUtilisateur(valeur: unknown): RoleUtilisateur | null {
  const role = choix(valeur);
  if (role === "ADMIN" || role === "ADMINISTRATEUR") return "ADMIN";
  if (role === "SUPERVISEUR") return "SUPERVISEUR";
  if (role === "RECRUTEUR") return "RECRUTEUR";
  return null;
}

function booleen(valeur: unknown): boolean {
  return valeur === true || valeur === 1;
}
