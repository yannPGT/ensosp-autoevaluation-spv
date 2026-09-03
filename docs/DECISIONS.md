# Décisions d'architecture

## ADR-001 - Ports et adaptateurs

**Décision.** Le domaine dépend de contrats de dépôt abstraits ; Grist et l'API sont des adaptateurs interchangeables.

**Justification.** La version Grist est livrée en premier, sans enfermer l'interface ni les règles métier dans l'API Grist. La migration vers PostgreSQL remplace l'adaptateur, pas les composants métier.

## ADR-002 - Référentiel initial

Le fichier `autoevaluation.ods` n'est pas présent. Le référentiel de 3 axes et 13 indicateurs fourni dans le prompt maître est la source initiale retenue. Le cahier des charges PDF et la présentation HTML ont été repérés comme sources de recoupement.

## ADR-003 - Paramètres à confirmer par le responsable de traitement

Les durées de conservation et la limite de taille PDF ne sont pas encore validées. Aucun effacement automatique ne sera implémenté avant cette validation. La valeur de démarrage proposée pour `PDF_MAX_SIZE_MB` est 10.

## ADR-004 - Rattachement et prise en compte des fiches d’enseignement

Chaque fiche possède une seule liaison active vers un indicateur et un seul niveau déclencheur, rouge ou orange. Le PDF publié reste stocké une seule fois dans `FicheVersions` ; les actions de progression ne conservent qu’une référence vers cette version. La consultation, le téléchargement et la déclaration de prise en compte sont historisés dans `ConsultationsFiches`. La gestion éditoriale est réservée au rôle Administrateur et doit être garantie par les ACL Grist.

