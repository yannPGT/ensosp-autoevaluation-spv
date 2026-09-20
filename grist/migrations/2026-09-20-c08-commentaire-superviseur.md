# C-08 — Migration de `ActionsProgres.CommentaireSuperviseur`

Le champ doit être une colonne de données `Text`, et non une colonne de formule.

## Opération Grist

1. Ouvrir la colonne `ActionsProgres.CommentaireSuperviseur`.
2. Remplacer la formule `return None` par le type **Texte** / colonne de données.
3. Conserver le même identifiant de colonne et les ACL de mise à jour applicables aux superviseurs et administrateurs.
4. Ne modifier aucune ligne de `Validations` : son champ `Commentaire` constitue l’historique immuable de la décision.

## Contrôles

- vérifier que la colonne n’affiche plus d’icône de formule ;
- exécuter un refus et un complément avec commentaire ;
- vérifier que chaque lot comporte l’ajout dans `Validations` et la mise à jour de `ActionsProgres` ;
- confirmer la restitution du commentaire après reconnexion du recruteur ;
- vérifier qu’un refus ou complément sans commentaire reste refusé côté widget.

La migration ne modifie ni les identifiants d’actions, ni les validations existantes, ni les liens historiques.
