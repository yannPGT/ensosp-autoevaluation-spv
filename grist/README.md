# Installation Grist

1. Créez un document Grist vide, protégé par ProConnect.
2. Configurez localement `GRIST_HOST`, `GRIST_DOC_ID` et `GRIST_API_KEY` (jamais dans le widget).
3. Exécutez `node grist/scripts/bootstrap.mjs --dry-run`.
4. Vérifiez le rapport et la matrice ACL avant toute écriture.

Le schéma source est [`schema/tables.json`](schema/tables.json). Il contient les tables du cahier des charges : aucun script ne doit supprimer ou modifier implicitement une colonne existante.

L’évolution des fiches d’enseignement nécessite l’ajout de `ActionsProgres.PriseEnCompteFiche` et l’application de la matrice décrite dans [`../docs/ACL_FICHES_ENSEIGNEMENT.md`](../docs/ACL_FICHES_ENSEIGNEMENT.md). La modification de l’interface seule ne sécurise pas les données.

L’évolution des fiches d’enseignement nécessite l’ajout de `ActionsProgres.PriseEnCompteFiche` et l’application de la matrice décrite dans [`../docs/ACL_FICHES_ENSEIGNEMENT.md`](../docs/ACL_FICHES_ENSEIGNEMENT.md). La modification de l’interface seule ne sécurise pas les données.

## Préconditions manuelles restantes

- URL et identifiant du document Grist ; compte administrateur autorisé à créer des tables ;
- configuration et test des ACL par rôle/périmètre dans Grist ;
- compte GitHub réauthentifié pour créer/pousser le dépôt et activer GitHub Pages.

## Migration C-03 — verrouillage des évaluations et échéances

Pour un document Grist déjà créé avant C-03, ajouter manuellement la colonne suivante :

- table `Utilisateurs` : `DateDeblocageEvaluation`, type `DateTime`.

La colonne `ActionsProgres.Echeance` existe déjà et reste la source unique de l'échéance propre à chaque indicateur rouge ou orange.

Les ACL Grist doivent être adaptées et testées avant mise en production. Le widget ne constitue jamais la barrière de sécurité. Les règles minimales attendues sont :

- un Recruteur ne peut pas modifier une `Evaluation` dont le statut est `VALIDEE` ;
- un Recruteur ne peut pas écrire `Utilisateurs.DateDeblocageEvaluation` ni `ActionsProgres.Echeance` ;
- un Superviseur ne peut modifier `DateDeblocageEvaluation` que pour les Recruteurs appartenant à ses périmètres supervisés ;
- un Superviseur ne peut modifier `ActionsProgres.Echeance` que pour les actions relevant de ses périmètres ;
- le Recruteur doit pouvoir lire l'identité de son Superviseur actif, sans obtenir l'accès à des affectations hors de son périmètre ;
- la création d'une nouvelle `Evaluation` après une évaluation validée doit être refusée tant que le déblocage n'a pas été autorisé selon la règle métier. Cette interdiction doit être portée par les ACL/formules Grist adaptées au document et ne doit pas reposer uniquement sur le contrôle du widget.

La recette C-03 n'est considérée complète qu'après vérification de ces ACL avec au minimum un compte Recruteur, un compte Superviseur de son périmètre et un Superviseur hors périmètre.
