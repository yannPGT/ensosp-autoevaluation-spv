# Historique des versions

## 1.1 — 19 octobre 2026

### Corrections et améliorations
- Rétablissement de la compilation et de GitHub Pages : restauration fidèle du module questionnaire-data depuis l’historique Git, avec deux corrections de compatibilité de typage (58f82a1).
- Suppression du crédit © YannPGT et intégration d’une signature SPM Développement horizontale sur fond transparent, discrète en pied d’accueil (C-23, f07874e).
- Analyse détaillée des résultats repliée par défaut, déployable au clic (057697c).
- Évaluations des recruteurs : sélection par recruteur, nombre de bilans validés et de brouillons, fiche individuelle, graphique comparatif chronologique par indicateur et consultation séparée des évaluations (057697c).
- Bandeau de l’application passé à Version 1.1 ; version du widget et du workspace alignée sur 1.1.0.

### Vérifications et périmètre
- Compilation du widget et contrôle TypeScript réussis ; 77 tests réussis avant le changement de numéro de version.
- Les 13 indicateurs et les 3 axes historiques sont conservés. Aucune modification du schéma Grist, des ACL, des rôles ou des données enregistrées.
- Le graphique compare les bilans initiaux validés ; les brouillons et les progrès ultérieurs restent distincts. Les réponses manquantes ne sont pas remplacées par des résultats fictifs.
- Recette dans un document Grist connecté restant à confirmer ; ESLint non exécutable en l’absence de configuration dans le dépôt.

### Commits de référence
- https://github.com/yannPGT/ensosp-autoevaluation-spv/commit/58f82a12d68d2658c1dedd2a13a80a4ffcfbcaf6
- https://github.com/yannPGT/ensosp-autoevaluation-spv/commit/f07874e49aac1ebe1fde0f00db9f0329acbaca68
- https://github.com/yannPGT/ensosp-autoevaluation-spv/commit/057697c3cb8b2e79918c55ab7e5524181a031762

### Suivi GitHub
- Ticket récapitulatif : https://github.com/yannPGT/ensosp-autoevaluation-spv/issues/33
