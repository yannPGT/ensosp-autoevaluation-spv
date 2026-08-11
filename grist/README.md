# Installation Grist

1. Créez un document Grist vide, protégé par ProConnect.
2. Configurez localement `GRIST_HOST`, `GRIST_DOC_ID` et `GRIST_API_KEY` (jamais dans le widget).
3. Exécutez `node grist/scripts/bootstrap.mjs --dry-run`.
4. Vérifiez le rapport et la matrice ACL avant toute écriture.

Le schéma source est [`schema/tables.json`](schema/tables.json). Il contient les 20 tables du cahier des charges : aucun script ne doit supprimer ou modifier implicitement une colonne existante.

## Préconditions manuelles restantes

- URL et identifiant du document Grist ; compte administrateur autorisé à créer des tables ;
- configuration et test des ACL par rôle/périmètre dans Grist ;
- compte GitHub réauthentifié pour créer/pousser le dépôt et activer GitHub Pages.

