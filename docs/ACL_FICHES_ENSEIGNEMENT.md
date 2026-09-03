# ACL Grist — fiches d’enseignement

Ces règles sont obligatoires avant la mise en production. L’interface du widget ne constitue pas une barrière de sécurité.

## Identité de référence

Configurer un attribut utilisateur Grist reliant `user.Email` à `Utilisateurs.Email`. Les règles ci-dessous doivent s’appuyer sur l’identifiant, le rôle, l’état actif et les périmètres issus de cette relation, jamais sur une valeur transmise par le widget.

## Matrice minimale

| Tables / colonnes | Administrateur | Superviseur | Recruteur |
|---|---|---|---|
| `FichesEnseignement`, `FicheVersions`, `FicheIndicateurs` | Lecture et écriture | Lecture des fiches publiées autorisées, aucune écriture | Lecture des fiches publiées seulement après au moins une évaluation personnelle `VALIDEE` avec `ProgressionComplete = 100`, aucune écriture |
| Pièces jointes de `FicheVersions.FichierPDF` | Accès complet | Lecture selon le périmètre autorisé | Lecture soumise à la même condition que la fiche |
| `ConsultationsFiches` | Lecture complète | Lecture limitée aux recruteurs de ses périmètres, aucune modification | Ajout uniquement pour soi ; lecture de ses traces ; aucune modification ni suppression |
| `ActionsProgres.PriseEnCompteFiche` | Lecture | Lecture des recruteurs supervisés | Modification uniquement sur sa propre action encore ouverte |
| `ActionsProgres.Statut` et commentaires | Selon les fonctions d’administration | Décision sur les actions du périmètre supervisé | Mise à jour uniquement de ses propres actions dans les transitions autorisées |

## Contraintes métier à contrôler dans Grist

- Seul un compte actif de rôle `ADMIN` peut créer, modifier, publier ou archiver une fiche et ses versions.
- Une fiche publiée possède exactement une liaison active dans `FicheIndicateurs`.
- Cette liaison désigne exactement un niveau déclencheur : `DeclencheRouge` ou `DeclencheOrange`, jamais les deux.
- Une version publiée et une fiche archivée ne sont pas modifiables par un Recruteur.
- Un Recruteur ne peut créer une trace que pour son propre identifiant. `DateEvenement` doit être calculée côté Grist à la création.
- Une validation positive par le Superviseur est refusée si `PriseEnCompteFiche` est faux et son `NouveauNiveau` doit être `VERT`.
- Les PDF restent dans Grist ; aucun lien permanent, jeton d’accès ou fichier confidentiel ne doit être publié dans GitHub Pages.

## Migration

Ajouter la colonne booléenne `ActionsProgres.PriseEnCompteFiche` avec `false` comme valeur initiale. Vérifier ensuite les anciennes fiches : conserver une seule liaison active et choisir un seul niveau déclencheur avant toute nouvelle publication.
