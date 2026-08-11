import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

type Niveau = "ROUGE" | "ORANGE" | "VERT";
const indicateurs = [
  "Délai du premier contact", "Qualité du premier accueil", "Délai entre contact et décision", "Valeurs et engagements du SIS",
  "Exploration des motivations", "Disponibilité réelle", "Adéquation aux valeurs SPV", "Compatibilité à 360 degrés", "Transparence sur la réalité du métier",
  "Parcours de formation FISPV", "Implication du tuteur", "Suivi post-engagement", "Indicateurs de résultat"
];

function App() {
  const [reponses, setReponses] = useState<Record<number, Niveau>>({});
  const complet = Object.keys(reponses).length === indicateurs.length;
  return <main><header><p>ENSOSP</p><h1>Auto-évaluation des pratiques de recrutement SPV</h1><p>13 indicateurs · 3 axes · vos données restent protégées par Grist</p></header>
    <section aria-labelledby="questionnaire"><h2 id="questionnaire">Votre évaluation</h2><p>Choisissez le niveau qui décrit le mieux votre pratique actuelle.</p>
      {indicateurs.map((titre, index) => <fieldset key={titre}><legend><strong>IND_{String(index + 1).padStart(2, "0")}</strong> — {titre}</legend><div className="choix">{(["ROUGE", "ORANGE", "VERT"] as Niveau[]).map(niveau => <label key={niveau}><input required type="radio" name={`ind-${index}`} checked={reponses[index] === niveau} onChange={() => setReponses({ ...reponses, [index]: niveau })}/><span className={niveau.toLowerCase()}>{niveau}</span></label>)}</div></fieldset>)}
      <button disabled={!complet} onClick={() => alert("Validation prête à être raccordée à Grist.")}>{complet ? "Valider l’évaluation" : `Répondez aux ${indicateurs.length - Object.keys(reponses).length} indicateurs restants`}</button>
    </section></main>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);

