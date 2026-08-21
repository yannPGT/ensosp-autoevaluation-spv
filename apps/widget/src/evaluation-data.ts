export type Niveau = "ROUGE" | "ORANGE" | "VERT";

export interface OptionEvaluation {
  niveau: Niveau;
  criteres: readonly string[];
}

export interface IndicateurEvaluation {
  code: string;
  titre: string;
  options: readonly OptionEvaluation[];
}

export interface AxeEvaluation {
  code: string;
  titre: string;
  indicateurs: readonly IndicateurEvaluation[];
}

const option = (niveau: Niveau, ...criteres: string[]): OptionEvaluation => ({ niveau, criteres });

export const axesEvaluation: readonly AxeEvaluation[] = [
  {
    code: "AXE_1",
    titre: "Processus et réactivité du chef de centre",
    indicateurs: [
      {
        code: "IND_01",
        titre: "Délai du premier contact",
        options: [
          option("ROUGE", "Plus de 2 semaines sans retour du chef de centre"),
          option("ORANGE", "Contact établi entre 4 et 14 jours"),
          option("VERT", "Contact établi dans les 3 jours (pic de motivation sous 72 h)"),
        ],
      },
      {
        code: "IND_02",
        titre: "Qualité du premier accueil",
        options: [
          option("ROUGE", "Aucun accueil structuré", "Renvoi vers un formulaire sans contact humain"),
          option("ORANGE", "Entretien réalisé mais sans préparation", "Informations parcellaires données au candidat"),
          option("VERT", "Entretien informel chaleureux", "Présentation du centre et de l’équipe", "Le candidat repart avec des informations concrètes"),
        ],
      },
      {
        code: "IND_03",
        titre: "Délai entre premier contact et décision",
        options: [
          option("ROUGE", "Plus d’un mois sans étape formalisée", "Candidat « ghosté »"),
          option("ORANGE", "Délai de 1 à 3 semaines", "Relance nécessaire de la part du candidat"),
          option("VERT", "Réponse ou étape suivante sous 1 semaine", "Calendrier clair proposé au candidat"),
        ],
      },
      {
        code: "IND_04",
        titre: "Communication sur les valeurs et engagements du SIS",
        options: [
          option("ROUGE", "Aucun argument sur les valeurs et l’identité du SIS", "Recrutement purement fonctionnel et administratif"),
          option("ORANGE", "Communication orale sans support", "Seule la mission opérationnelle est mise en avant"),
          option("VERT", "Arguments concrets sur les projets du SIS", "Support de communication remis au candidat", "Engagement sociétal et citoyen valorisé"),
        ],
      },
    ],
  },
  {
    code: "AXE_2",
    titre: "Adéquation entre les attentes du SIS et du candidat",
    indicateurs: [
      {
        code: "IND_05",
        titre: "Exploration des motivations (Pourquoi / Pour quoi)",
        options: [
          option("ROUGE", "Aucune exploration des motivations", "Entretien uniquement administratif et unilatéral"),
          option("ORANGE", "Questions posées mais peu approfondies", "Discours centré sur le centre, pas sur le candidat"),
          option("VERT", "Questions ouvertes sur le pourquoi et le pour quoi", "Écoute active réelle", "Engagements extra-professionnels explorés"),
        ],
      },
      {
        code: "IND_06",
        titre: "Vérification de la disponibilité réelle",
        options: [
          option("ROUGE", "Aucune vérification de la disponibilité effective", "Engagement formalisé sans tenir compte des contraintes réelles"),
          option("ORANGE", "Disponibilité abordée superficiellement", "Seule la disponibilité déclarée est retenue"),
          option("VERT", "Disponibilités hebdomadaires et annuelles explorées", "Compatibilité vie professionnelle / vie personnelle vérifiée", "Accord du conjoint ou de l’employeur évoqué"),
        ],
      },
      {
        code: "IND_07",
        titre: "Adéquation aux valeurs SPV (avec mini-cas)",
        options: [
          option("ROUGE", "Valeurs non abordées", "Aucune vérification de l’adhésion à la culture SPV"),
          option("ORANGE", "Valeurs évoquées de façon générale", "Pas de mise en situation proposée"),
          option("VERT", "Valeurs du service explorées", "Mini-cas concret soumis au candidat", "Cohérence valeurs / profil vérifiée"),
        ],
      },
      {
        code: "IND_08",
        titre: "Évaluation de la compatibilité à 360 degrés (Ikigaï)",
        options: [
          option("ROUGE", "Aucune approche globale de la situation de vie", "Engagement sans vérification de la viabilité à long terme"),
          option("ORANGE", "Exploration partielle (seule la sphère professionnelle est abordée)", "Sphère familiale ou personnelle non évoquée"),
          option("VERT", "Triptyque vie professionnelle / vie personnelle / SPV exploré", "Ikigaï du candidat esquissé", "Risques de conflit identifiés et discutés"),
        ],
      },
      {
        code: "IND_09",
        titre: "Transparence sur la réalité du métier",
        options: [
          option("ROUGE", "Tableau idéalisé ou, au contraire, décourageant", "Absence de mention des contraintes réelles"),
          option("ORANGE", "Réalité partiellement présentée", "Seuls les aspects positifs sont mis en avant"),
          option("VERT", "Contraintes et difficultés présentées honnêtement", "Réalité opérationnelle (nuit, week-end) abordée", "Ni pessimisme excessif ni idéalisation"),
        ],
      },
    ],
  },
  {
    code: "AXE_3",
    titre: "Intégration et fidélisation",
    indicateurs: [
      {
        code: "IND_10",
        titre: "Présentation du parcours de formation (FISPV)",
        options: [
          option("ROUGE", "Formation non abordée ou perçue comme un obstacle", "Aucun parcours d’accueil prévu"),
          option("ORANGE", "Formation évoquée sans détail sur le calendrier", "Parcours d’intégration non formalisé"),
          option("VERT", "FISPV et formations initiales expliquées", "Délai avant la première intervention présenté", "Parcours d’intégration avec tuteur ou référent proposé"),
        ],
      },
      {
        code: "IND_11",
        titre: "Implication du tuteur ou référent",
        options: [
          option("ROUGE", "Pas de tuteur identifié", "Intégration livrée au hasard des gardes"),
          option("ORANGE", "Tuteur désigné tardivement", "Aucune rencontre avec l’équipe avant signature"),
          option("VERT", "Référent identifié dès l’entretien d’accueil", "Rencontre avec l’équipe avant l’engagement", "Tuteur formé à l’accompagnement"),
        ],
      },
      {
        code: "IND_12",
        titre: "Suivi post-engagement (première année)",
        options: [
          option("ROUGE", "Aucun suivi structuré pendant la première année", "Absence de détection des risques de décrochage"),
          option("ORANGE", "Suivi informel, sans calendrier", "Seules les difficultés visibles sont traitées"),
          option("VERT", "Points de suivi formalisés à 1, 3 et 6 mois", "Difficultés identifiées et traitées rapidement", "Le tuteur fait remonter les signaux faibles"),
        ],
      },
      {
        code: "IND_13",
        titre: "Indicateurs de résultat (retour sur investissement)",
        options: [
          option("ROUGE", "Rupture d’engagement pendant la première année", "Départ non anticipé, sans analyse des causes"),
          option("ORANGE", "SPV engagé mais disponibilité en baisse", "Tensions ou difficultés d’intégration signalées"),
          option("VERT", "SPV toujours engagé à 12 mois", "Disponibilité effective conforme aux engagements", "Intégration dans l’équipe satisfaisante"),
        ],
      },
    ],
  },
];

export const indicateursEvaluation = axesEvaluation.flatMap((axe) => axe.indicateurs);
