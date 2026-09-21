# C-10 — Horodatage des événements

Migration manuelle à appliquer dans Grist sur `JournalAudit.DateEvenement` et `ConsultationsFiches.DateEvenement`.

Pour chaque colonne :

1. conserver le type `Date et Heure` et la colonne de données ;
2. définir la formule d’initialisation à `NOW()` ;
3. appliquer cette formule aux nouvelles lignes uniquement ;
4. désactiver toute réapplication lors de la modification d’une ligne.

Le widget n’envoie volontairement aucune valeur `DateEvenement` lors des `AddRecord` : Grist produit ainsi la date de création, dans son fuseau document, et la fige. Les lignes historiques dont la date est vide restent inchangées et sont affichées comme « Date non reconstituable ».
