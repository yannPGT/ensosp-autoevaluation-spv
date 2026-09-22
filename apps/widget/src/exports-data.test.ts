import { describe, expect, it } from "vitest";
import { suiviCsv, bilanHtml, feuilleRouteHtml } from "./exports-data.js";
import { ActionMetier, EvaluationMetier } from "./operational-data.js";

const utilisateur = { id: 2, prenom: "Zoé", nom: "Éditeur", email: "z@example.invalid", role: "SUPERVISEUR" as const, entite: "SDIS", perimetrePrincipal: "Nord", perimetresSupervises: ["Nord"], superviseurNom: "—", peutGererPedagogie: false, actif: true };
const action: ActionMetier = { id: 1, uid: "A1", recruteurId: 8, recruteur: "Élodie", perimetreId: 1, perimetre: "Nord", codeIndicateur: "IND_01", indicateur: "Accueil; qualité", niveauInitial: "ORANGE", niveauCourant: "ROUGE", statut: "EN_COURS", echeance: "1 janvier 2027", echeanceTimestamp: 0, commentaireRecruteur: "Réponse; à suivre", commentaireSuperviseur: "", priseEnCompteFiche: false, ficheVersionId: null, fiche: "—", version: "", nomFichier: "", attachmentId: null };
const evaluation: EvaluationMetier = { id: 1, uid: "E1", recruteurId: 8, recruteur: "Élodie", perimetre: "Nord", statut: "VALIDEE", progression: 100, dateDebut: "1 janvier 2026", dateValidation: "2 janvier 2026", dateValidationTimestamp: 0, referentielVersion: "grist-abc", reponses: [{ id: 1, evaluationId: 1, indicateurId: 1, indicateur: "Accueil", codeIndicateur: "IND_01", niveau: "ORANGE", commentaire: "Très bien" }] };

describe("exports opérationnels", () => {
  it("produit un suivi métier filtré et échappe les accents/séparateurs", () => { const csv = suiviCsv([action, { ...action, id: 2, perimetre: "Sud" }], utilisateur); expect(csv).toContain("Recruteur;Périmètre;Code indicateur"); expect(csv).toContain('"Accueil; qualité"'); expect(csv).toContain("Nord"); expect(csv).not.toContain("Sud"); });
  it("inclut identité, date et version dans le bilan", () => { const html = bilanHtml(evaluation, utilisateur); expect(html).toContain("Élodie"); expect(html).toContain("2 janvier 2026"); expect(html).toContain("grist-abc"); });
  it("ne perd pas le périmètre dans la feuille de route", () => { expect(feuilleRouteHtml([action], utilisateur)).toContain("Nord"); });
});
