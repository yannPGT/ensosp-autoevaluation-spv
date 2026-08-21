import React, { FormEvent, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { axesEvaluation, indicateursEvaluation, Niveau } from "./evaluation-data.js";
import "./style.css";

type Etape = "QUESTIONNAIRE" | "BILAN";

const libellesNiveaux: Record<Niveau, string> = {
  ROUGE: "Action corrective nécessaire",
  ORANGE: "Vigilance requise",
  VERT: "Bonne pratique",
};

function App() {
  const [reponses, setReponses] = useState<Record<string, Niveau>>({});
  const [etape, setEtape] = useState<Etape>("QUESTIONNAIRE");
  const nombreReponses = Object.keys(reponses).length;
  const nombreRestant = indicateursEvaluation.length - nombreReponses;
  const complet = nombreRestant === 0;
  const totaux = useMemo(() => {
    const resultat: Record<Niveau, number> = { ROUGE: 0, ORANGE: 0, VERT: 0 };
    Object.values(reponses).forEach((niveau) => {
      resultat[niveau] = (resultat[niveau] ?? 0) + 1;
    });
    return resultat;
  }, [reponses]);

  const valider = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (complet) {
      setEtape("BILAN");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <main>
      <header>
        <p className="marque">ENSOSP</p>
        <h1>Auto-évaluation des pratiques de recrutement SPV</h1>
        <p>13 indicateurs · 3 axes · vos données restent protégées par Grist</p>
      </header>

      {etape === "QUESTIONNAIRE" ? (
        <section aria-labelledby="questionnaire">
          <div className="section-intro">
            <div>
              <p className="surtitre">Questionnaire</p>
              <h2 id="questionnaire">Décrivez votre pratique actuelle</h2>
              <p>Pour chaque indicateur, sélectionnez la situation qui correspond le mieux à votre pratique. Votre résultat ne sera révélé qu’au bilan.</p>
            </div>
            <p className="progression" aria-live="polite"><strong>{nombreReponses}</strong> / {indicateursEvaluation.length}<span>réponses</span></p>
          </div>

          <form onSubmit={valider}>
            {axesEvaluation.map((axe, axeIndex) => (
              <section className="axe" aria-labelledby={`titre-${axe.code}`} key={axe.code}>
                <div className="axe-titre">
                  <span>Axe {axeIndex + 1}</span>
                  <h3 id={`titre-${axe.code}`}>{axe.titre}</h3>
                </div>
                {axe.indicateurs.map((indicateur) => (
                  <fieldset key={indicateur.code}>
                    <legend><strong>{indicateur.code}</strong><span>{indicateur.titre}</span></legend>
                    <div className="choix">
                      {indicateur.options.map((choix, optionIndex) => {
                        const selectionne = reponses[indicateur.code] === choix.niveau;
                        return (
                          <label className={`option${selectionne ? " option-selectionnee" : ""}`} key={choix.niveau}>
                            <input
                              required
                              type="radio"
                              name={indicateur.code}
                              checked={selectionne}
                              onChange={() => setReponses((courantes) => ({ ...courantes, [indicateur.code]: choix.niveau }))}
                            />
                            <span className="option-contenu">
                              <span className="option-repere">Situation {optionIndex + 1}</span>
                              {choix.criteres.length === 1 ? (
                                <span>{choix.criteres[0]}</span>
                              ) : (
                                <ul>{choix.criteres.map((critere) => <li key={critere}>{critere}</li>)}</ul>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </section>
            ))}
            <div className="actions-formulaire">
              <p>{complet ? "Toutes les réponses sont renseignées." : `${nombreRestant} indicateur${nombreRestant > 1 ? "s" : ""} restant${nombreRestant > 1 ? "s" : ""}.`}</p>
              <button type="submit" disabled={!complet}>Afficher mon bilan</button>
            </div>
          </form>
        </section>
      ) : (
        <section aria-labelledby="bilan">
          <p className="surtitre">Résultats</p>
          <h2 id="bilan">Bilan de votre évaluation</h2>
          <p>Les couleurs apparaissent maintenant que le questionnaire est terminé.</p>
          <div className="synthese">
            {(["ROUGE", "ORANGE", "VERT"] as Niveau[]).map((niveau) => (
              <article className={`synthese-carte niveau-${niveau.toLowerCase()}`} key={niveau}>
                <strong>{totaux[niveau]}</strong>
                <span>{libellesNiveaux[niveau]}</span>
              </article>
            ))}
          </div>
          <div className="resultats-detail">
            {axesEvaluation.map((axe) => (
              <section className="resultat-axe" key={axe.code}>
                <h3>{axe.titre}</h3>
                {axe.indicateurs.map((indicateur) => {
                  const niveau = reponses[indicateur.code];
                  if (!niveau) return null;
                  const choix = indicateur.options.find((optionCourante) => optionCourante.niveau === niveau);
                  if (!choix) return null;
                  return (
                    <article className="resultat" key={indicateur.code}>
                      <div>
                        <p><strong>{indicateur.code}</strong> — {indicateur.titre}</p>
                        <ul>{choix.criteres.map((critere) => <li key={critere}>{critere}</li>)}</ul>
                      </div>
                      <span className={`badge niveau-${niveau.toLowerCase()}`}>{niveau}</span>
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
          <button type="button" className="bouton-secondaire" onClick={() => setEtape("QUESTIONNAIRE")}>Modifier mes réponses</button>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
