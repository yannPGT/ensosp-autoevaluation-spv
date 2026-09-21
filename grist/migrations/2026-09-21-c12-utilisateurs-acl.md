# Migration C-12 — droits d’identité des administrateurs

## Objectif

Permettre à un administrateur applicatif actif (profil `ADMIN`, accès Grist
Éditeur) d’utiliser les commandes d’administration exposées par le widget,
sans le promouvoir `OWNER` et sans élargir les droits des superviseurs ou des
recruteurs.

## Règles à ajouter dans Grist

Dans la table `Utilisateurs`, ajouter une règle de mise à jour (`U`) ciblée sur
les colonnes suivantes : `Nom`, `Prenom`, `Email` et
`DateDeblocageEvaluation`.

Condition commune :

```text
user.Profil.Actif and user.Profil.Role == "ADMIN"
```

Les règles existantes `OWNER` restent en place. Les règles de lecture et de
mise à jour propres aux superviseurs et recruteurs ne doivent pas être
modifiées. Ne pas accorder globalement `OWNER` aux comptes administrateurs.

## Traçabilité

Le widget écrit dans le même lot que la création ou la mise à jour du compte
un événement `JournalAudit` de type `UTILISATEUR`. L’événement renseigne
l’acteur authentifié, l’opération (`CREATION_UTILISATEUR` ou
`MODIFICATION_UTILISATEUR`) et l’identifiant du compte concerné.

## Recette

Avec un compte `ADMIN`/Éditeur :

1. créer un utilisateur ;
2. corriger son nom, prénom et courriel ;
3. modifier son rôle ;
4. activer puis désactiver le compte ;
5. autoriser une nouvelle évaluation et vérifier la trace d’audit ;
6. vérifier la persistance après reconnexion.

Avec un compte `SUPERVISEUR` puis `RECRUTEUR`, confirmer que les restrictions
existantes restent inchangées. Vérifier également qu’un administrateur inactif
ne bénéficie d’aucune exception.
