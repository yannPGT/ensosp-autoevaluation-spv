# Architecture

L'application est organisée en monorepo TypeScript avec une architecture hexagonale.

```text
React widget -> contrats de données -> adaptateur Grist
             -> contrats de données -> client API -> API Fastify -> PostgreSQL / S3
                    \-> domaine (règles métier pures)
```

Le widget ne connaît ni les noms de tables Grist, ni les identifiants de lignes Grist. Les identifiants du domaine sont des chaînes. La sélection du fournisseur se fait via `VITE_DATA_BACKEND=grist|api`.

## Frontières de confiance

- GitHub Pages sert uniquement le code statique public du widget.
- Grist authentifie l'utilisateur via le SSO et applique les ACL, qui restent l'autorité de sécurité pour la version initiale.
- Le widget demande `full` à Grist afin de lire/écrire plusieurs tables ; cette demande ne contourne aucune ACL.
- L'API d'administration Grist n'est utilisée que par les scripts locaux. Sa clé n'est jamais accessible au navigateur ni aux workflows de build.

## Décisions de mise en oeuvre

- Les règles de validation, de progression et de sélection pédagogique appartiennent à `packages/domain`.
- Les opérations de validation et d'audit sont append-only ; une décision crée toujours une nouvelle trace.
- Les exports CSV neutralisent les valeurs commençant par `=`, `+`, `-` ou `@`.
- La cible PostgreSQL réutilise les mêmes contrats et cas d'usage que le widget.

