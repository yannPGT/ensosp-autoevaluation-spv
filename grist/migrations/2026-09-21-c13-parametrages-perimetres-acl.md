# Migration C-13 — réglages locaux des périmètres

Le menu superviseur `Paramétrage des indicateurs` doit exploiter uniquement la
table `ParametragesPerimetres`. Le référentiel central (`Axes`, `Indicateurs`,
`Criteres`, `Campagnes`) reste consultable selon les ACL de lecture, sans
commande d’écriture pour un superviseur.

## ACL minimales

Sur `ParametragesPerimetres` :

- lecture (`R`) pour un superviseur actif lorsque
  `rec.Perimetre in user.Profil.PerimetresSupervises` ;
- mise à jour (`U`) limitée à la colonne `Actif` avec la même condition et,
  si la responsabilité est portée par la ligne, `rec.SuperviseurResponsable == user.Profil.id` ;
- aucune création (`C`) ni suppression (`D`) pour un superviseur.

Les administrateurs conservent la gestion complète prévue par la matrice. Les
recruteurs ne reçoivent aucun droit d’écriture sur cette table.

Le widget écrit le changement de `Actif` et un événement `JournalAudit` dans
le même lot. Les champs techniques `UpdatedAt` et `UpdatedByEmail` ne sont pas
écrits côté client.

## Recette

Avec un superviseur affecté au périmètre A :

1. consulter les réglages du périmètre A ;
2. activer puis désactiver un indicateur local ;
3. vérifier la ligne `JournalAudit` ;
4. confirmer l’absence des périmètres étrangers ;
5. ouvrir le référentiel central et vérifier l’absence des commandes d’écriture.

Avec un superviseur du périmètre B et un recruteur, vérifier qu’aucune écriture
croisée ou modification du référentiel central n’est possible.
