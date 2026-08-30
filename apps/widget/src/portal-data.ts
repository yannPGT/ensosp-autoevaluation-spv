export type RoleUtilisateur = "ADMIN" | "SUPERVISEUR" | "RECRUTEUR";

export interface UtilisateurCourant {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  role: RoleUtilisateur;
  entite: string;
  perimetrePrincipal: string;
  perimetresSupervises: readonly string[];
  superviseurNom: string;
  peutGererPedagogie: boolean;
  actif: boolean;
}

export interface EntreeMenu {
  id: string;
  libelle: string;
  description: string;
  pedagogie?: boolean;
}

export const libellesRoles: Record<RoleUtilisateur, string> = {
  ADMIN: "Administrateur",
  SUPERVISEUR: "Superviseur",
  RECRUTEUR: "Recruteur",
};

const entreesCommunes: readonly EntreeMenu[] = [
  { id: "accueil", libelle: "Accueil", description: "Vue d’ensemble de votre espace personnel." },
  { id: "profil", libelle: "Mon profil", description: "Identité, périmètres et habilitations associées à votre compte." },
];

const menusMetier: Record<RoleUtilisateur, readonly EntreeMenu[]> = {
  RECRUTEUR: [
    { id: "evaluation", libelle: "Auto-évaluation", description: "Débuter une nouvelle auto-évaluation ou reprendre une évaluation en cours." },
    { id: "resultats", libelle: "Mes résultats", description: "Consulter le bilan de votre dernière évaluation et les synthèses par axe." },
    { id: "progression", libelle: "Ma progression", description: "Suivre vos actions, consulter les modules et demander leur validation." },
    { id: "fiches", libelle: "Fiches d’enseignement", description: "Consulter les ressources pédagogiques qui vous sont affectées." },
    { id: "historique", libelle: "Historique", description: "Retrouver vos évaluations et les décisions de progression antérieures." },
  ],
  SUPERVISEUR: [
    { id: "tableau-bord", libelle: "Tableau de bord", description: "Suivre l’activité et la progression dans vos périmètres." },
    { id: "recruteurs", libelle: "Mes recruteurs", description: "Consulter les recruteurs rattachés à vos périmètres." },
    { id: "evaluations-recruteurs", libelle: "Évaluations des recruteurs", description: "Consulter les évaluations autorisées et leurs résultats détaillés." },
    { id: "progres-a-valider", libelle: "Progrès à valider", description: "Traiter les demandes de validation transmises par les recruteurs." },
    { id: "progres-ouverts", libelle: "Progrès restant à valider", description: "Suivre tous les indicateurs rouge et orange encore ouverts." },
    { id: "echeances", libelle: "Échéances et retards", description: "Identifier les actions arrivant à échéance ou déjà dépassées." },
    { id: "gestion-recruteurs", libelle: "Gestion des recruteurs", description: "Gérer les informations autorisées des recruteurs supervisés." },
    { id: "parametrage-indicateurs", libelle: "Paramétrage des indicateurs", description: "Configurer les indicateurs applicables dans vos périmètres." },
    { id: "pedagogie", libelle: "Gestion pédagogique", description: "Créer, publier et archiver les fiches d’enseignement.", pedagogie: true },
  ],
  ADMIN: [
    { id: "tableau-bord", libelle: "Tableau de bord global", description: "Consulter les indicateurs consolidés et les tendances par axe." },
    { id: "utilisateurs", libelle: "Utilisateurs et rôles", description: "Administrer les comptes, rôles et habilitations." },
    { id: "territoires", libelle: "Entités et périmètres", description: "Administrer l’organisation territoriale de l’application." },
    { id: "affectations", libelle: "Affectations des superviseurs", description: "Gérer les rattachements des superviseurs aux périmètres." },
    { id: "referentiel", libelle: "Référentiel", description: "Gérer les axes, indicateurs, critères et campagnes." },
    { id: "pedagogie", libelle: "Fiches pédagogiques", description: "Gérer les fiches, leurs versions PDF et leurs publications." },
    { id: "parametres", libelle: "Paramètres", description: "Configurer les paramètres fonctionnels de l’application." },
    { id: "audit-exports", libelle: "Audit et exports", description: "Consulter le journal d’audit et produire les exports autorisés." },
  ],
};

export function menuPour(utilisateur: UtilisateurCourant): readonly EntreeMenu[] {
  return [
    ...entreesCommunes,
    ...menusMetier[utilisateur.role].filter((entree) => !entree.pedagogie || utilisateur.peutGererPedagogie),
  ];
}

const profilsDemonstration: Record<RoleUtilisateur, UtilisateurCourant> = {
  ADMIN: {
    id: 1,
    prenom: "Alex",
    nom: "MARTIN",
    email: "alex.martin@example.invalid",
    role: "ADMIN",
    entite: "ENSOSPP",
    perimetrePrincipal: "Périmètre national",
    perimetresSupervises: [],
    superviseurNom: "—",
    peutGererPedagogie: true,
    actif: true,
  },
  SUPERVISEUR: {
    id: 2,
    prenom: "Camille",
    nom: "BERNARD",
    email: "camille.bernard@example.invalid",
    role: "SUPERVISEUR",
    entite: "SDIS de la Gironde",
    perimetrePrincipal: "SDIS 33 groupement NORD",
    perimetresSupervises: ["SDIS 33 groupement NORD"],
    superviseurNom: "—",
    peutGererPedagogie: true,
    actif: true,
  },
  RECRUTEUR: {
    id: 3,
    prenom: "Morgan",
    nom: "ROBERT",
    email: "morgan.robert@example.invalid",
    role: "RECRUTEUR",
    entite: "SDIS de la Gironde",
    perimetrePrincipal: "SDIS 33 groupement NORD",
    perimetresSupervises: [],
    superviseurNom: "Camille BERNARD",
    peutGererPedagogie: false,
    actif: true,
  },
};

export function utilisateurPrototype(): UtilisateurCourant {
  const roleDemande = new URLSearchParams(window.location.search).get("role")?.toUpperCase();
  if (roleDemande === "ADMIN" || roleDemande === "SUPERVISEUR" || roleDemande === "RECRUTEUR") {
    return profilsDemonstration[roleDemande];
  }
  return profilsDemonstration.ADMIN;
}

export function indicateursAccueil(role: RoleUtilisateur): readonly { valeur: string; libelle: string }[] {
  if (role === "RECRUTEUR") {
    return [
      { valeur: "—", libelle: "Dernière évaluation" },
      { valeur: "—", libelle: "Actions ouvertes" },
      { valeur: "—", libelle: "Prochaine échéance" },
    ];
  }
  if (role === "SUPERVISEUR") {
    return [
      { valeur: "—", libelle: "Recruteurs suivis" },
      { valeur: "—", libelle: "Progrès à valider" },
      { valeur: "—", libelle: "Échéances dépassées" },
    ];
  }
  return [
    { valeur: "—", libelle: "Utilisateurs actifs" },
    { valeur: "—", libelle: "Périmètres actifs" },
    { valeur: "—", libelle: "Évaluations validées" },
  ];
}
