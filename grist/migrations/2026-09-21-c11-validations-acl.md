# C-11 — ACL de `Validations`

La table `Validations` ne doit pas comporter de règle finale accordant des droits à tout superviseur actif. Cette règle contourne les contrôles de périmètre et de cohérence de décision.

## Migration Grist

Dans les permissions avancées de `Validations`, supprimer la règle :

```text
user.Profil.Actif and user.Profil.Role == "SUPERVISEUR"
```

Conserver la règle de lecture limitée au périmètre :

```text
user.Profil.Actif
and user.Profil.Role == "SUPERVISEUR"
and rec.Perimetre in user.Profil.PerimetresSupervises
```

Conserver une seule règle de création superviseur, avec les contrôles suivants :

```text
user.Profil.Actif
and user.Profil.Role == "SUPERVISEUR"
and newRec.Superviseur == user.Profil.id
and newRec.Perimetre in user.Profil.PerimetresSupervises
and newRec.ActionPerimetre == newRec.Perimetre
and newRec.ActionRecruteur == newRec.Recruteur
and newRec.AncienNiveau == newRec.ActionNiveauCourant
and (
  (newRec.Decision == "VALIDEE" and (
    (newRec.AncienNiveau == "ROUGE" and newRec.NouveauNiveau in ["ORANGE", "VERT"])
    or (newRec.AncienNiveau == "ORANGE" and newRec.NouveauNiveau == "VERT")
  ))
  or (newRec.Decision in ["COMPLEMENT_DEMANDE", "REFUSEE"] and newRec.Commentaire != "")
)
```

Les règles `OWNER` et `ADMIN` restent inchangées. Ne pas réécrire les validations existantes.

## Recette ACL obligatoire

Avec deux superviseurs affectés à des périmètres distincts, vérifier que les opérations suivantes sont refusées : lecture croisée, création croisée, faux auteur (`newRec.Superviseur`), action étrangère, périmètre incohérent, décision incompatible avec les niveaux et création sur une action inexistante ou non déclarée.
