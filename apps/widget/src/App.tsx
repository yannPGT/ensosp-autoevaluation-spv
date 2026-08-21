import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { axesEvaluation, indicateursEvaluation, Niveau } from "./evaluation-data.js";
import { chargerUtilisateurCourant } from "./grist-context.js";
import {
  EntreeMenu,
  indicateursAccueil,
  libellesRoles,
  menuPour,
  UtilisateurCourant,
} from "./portal-data.js";

type EtapeEvaluation = "QUESTIONNAIRE" | "BILAN";

const libellesNiveaux: Record<Niveau, string> = {
  ROUGE: "Action corrective nécessaire",
  ORANGE: "Vigilance requise",
  VERT: "Bonne pratique",
};

export function App() {
  const [etatUtilisateur, setEtatUtilisateur] = useState<
    { statut: "chargement" } |
    { statut: "pret"; utilisateur: UtilisateurCourant } |
    { statut: "erreur"; message: string }
  >({ statut: "chargement" });
  const [tentativeConnexion, setTentativeConnexion] = useState(0);
  const [pageActive, setPageActive] = useState("accueil");
  const [reponses, setReponses] = useState<Record<string, Niveau>>({});
  const [etapeEvaluation, setEtapeEvaluation] = useState<EtapeEvaluation>("QUESTIONNAIRE");
  const utilisateur = etatUtilisateur.statut === "pret" ? etatUtilisateur.utilisateur : null;
  const menu = useMemo(() => utilisateur ? menuPour(utilisateur) : [], [utilisateur]);
  const entreeActive = menu.find((entree) => entree.id === pageActive) ?? {
    id: "accueil",
    libelle: "Accueil",
    description: "Vue d’ensemble de votre espace personnel.",
  };

  useEffect(() => {
    let actif = true;
    setEtatUtilisateur({ statut: "chargement" });
    chargerUtilisateurCourant()
      .then((profil) => { if (actif) setEtatUtilisateur({ statut: "pret", utilisateur: profil }); })
      .catch((erreur: unknown) => {
        const message = erreur instanceof Error ? erreur.message : "Une erreur inconnue empêche l’identification.";
        if (actif) setEtatUtilisateur({ statut: "erreur", message });
      });
    return () => { actif = false; };
  }, [tentativeConnexion]);

  if (etatUtilisateur.statut === "chargement") {
    return <EcranConnexion titre="Connexion à Grist" message="Identification de votre compte et chargement de vos habilitations…" />;
  }
  if (etatUtilisateur.statut === "erreur") {
    return <EcranConnexion titre="Profil indisponible" message={etatUtilisateur.message} reessayer={() => setTentativeConnexion((valeur) => valeur + 1)} />;
  }
  if (!utilisateur) return null;

  return (
    <main>
      <Bandeau utilisateur={utilisateur} />
      <div className="application-shell">
        <MenuNavigation menu={menu} pageActive={pageActive} changerPage={setPageActive} />
        <div className="contenu-application">
          {pageActive === "accueil" && <Accueil utilisateur={utilisateur} menu={menu} changerPage={setPageActive} />}
          {pageActive === "profil" && <Profil utilisateur={utilisateur} />}
          {pageActive === "evaluation" && (
            <Questionnaire
              reponses={reponses}
              setReponses={setReponses}
              etape={etapeEvaluation}
              setEtape={setEtapeEvaluation}
            />
          )}
          {pageActive === "resultats" && (
            etapeEvaluation === "BILAN"
              ? <Bilan reponses={reponses} modifier={() => { setEtapeEvaluation("QUESTIONNAIRE"); setPageActive("evaluation"); }} />
              : <VueMetier entree={entreeActive} message="Aucune évaluation validée n’est disponible pour le moment." />
          )}
          {!(["accueil", "profil", "evaluation", "resultats"].includes(pageActive)) && (
            <VueMetier entree={entreeActive} message={messageEtatVide(pageActive)} />
          )}
        </div>
      </div>
    </main>
  );
}

function EcranConnexion({ titre, message, reessayer }: { titre: string; message: string; reessayer?: () => void }) {
  return (
    <main>
      <header><p className="marque">ENSOSPP</p><h1>Auto-évaluation des pratiques de recrutement SPV</h1></header>
      <section className="page-carte ecran-connexion" aria-live="polite">
        <p className="surtitre">Identification sécurisée</p><h2>{titre}</h2><p>{message}</p>
        {reessayer && <button type="button" onClick={reessayer}>Réessayer</button>}
      </section>
    </main>
  );
}

function Bandeau({ utilisateur }: { utilisateur: UtilisateurCourant }) {
  return (
    <header>
      <span className="badge-beta">Bêta</span>
      <p className="marque">ENSOSPP <span>· {utilisateur.prenom} {utilisateur.nom}</span></p>
      <h1>Auto-évaluation des pratiques de recrutement SPV</h1>
      <div className="contexte-utilisateur" aria-label="Informations de l’utilisateur connecté">
        <span>{libellesRoles[utilisateur.role]}</span>
        <span>{utilisateur.perimetrePrincipal}</span>
      </div>
      <p>13 indicateurs · 3 axes · vos données restent protégées par Grist</p>
      <p className="version-widget">Version 1.0 · © YannPGT</p>
    </header>
  );
}

function MenuNavigation({ menu, pageActive, changerPage }: {
  menu: readonly EntreeMenu[];
  pageActive: string;
  changerPage: (page: string) => void;
}) {
  return (
    <aside className="menu-lateral">
      <p className="titre-menu">Mon espace</p>
      <nav aria-label="Navigation principale">
        {menu.map((entree) => (
          <button
            className={pageActive === entree.id ? "entree-menu entree-menu-active" : "entree-menu"}
            type="button"
            aria-current={pageActive === entree.id ? "page" : undefined}
            onClick={() => changerPage(entree.id)}
            key={entree.id}
          >
            {entree.libelle}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function Accueil({ utilisateur, menu, changerPage }: {
  utilisateur: UtilisateurCourant;
  menu: readonly EntreeMenu[];
  changerPage: (page: string) => void;
}) {
  const raccourcis = menu.filter((entree) => !["accueil", "profil"].includes(entree.id)).slice(0, 4);
  return (
    <section className="page-carte" aria-labelledby="titre-accueil">
      <p className="surtitre">{libellesRoles[utilisateur.role]}</p>
      <h2 id="titre-accueil">Bonjour {utilisateur.prenom}</h2>
      <p>Retrouvez ici les informations et opérations correspondant à votre rôle et à vos périmètres autorisés.</p>
      <div className="indicateurs-accueil">
        {indicateursAccueil(utilisateur.role).map((indicateur) => (
          <article key={indicateur.libelle}>
            <strong>{indicateur.valeur}</strong>
            <span>{indicateur.libelle}</span>
          </article>
        ))}
      </div>
      <h3 className="titre-section">Accès rapides</h3>
      <div className="raccourcis">
        {raccourcis.map((entree) => (
          <button type="button" onClick={() => changerPage(entree.id)} key={entree.id}>
            <strong>{entree.libelle}</strong>
            <span>{entree.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Profil({ utilisateur }: { utilisateur: UtilisateurCourant }) {
  return (
    <section className="page-carte" aria-labelledby="titre-profil">
      <p className="surtitre">Compte utilisateur</p>
      <h2 id="titre-profil">Mon profil</h2>
      <p>Ces informations déterminent votre espace fonctionnel. Les droits réels restent appliqués par les ACL Grist.</p>
      <div className="profil-grille">
        <BlocProfil titre="Identité">
          <LigneProfil libelle="Prénom" valeur={utilisateur.prenom} />
          <LigneProfil libelle="Nom" valeur={utilisateur.nom} />
          <LigneProfil libelle="Adresse électronique" valeur={utilisateur.email} />
          <LigneProfil libelle="Statut" valeur={utilisateur.actif ? "Compte actif" : "Compte désactivé"} />
        </BlocProfil>
        <BlocProfil titre="Organisation">
          <LigneProfil libelle="Entité" valeur={utilisateur.entite} />
          <LigneProfil libelle="Périmètre principal" valeur={utilisateur.perimetrePrincipal} />
          <LigneProfil
            libelle="Périmètres supervisés"
            valeur={utilisateur.perimetresSupervises.length ? utilisateur.perimetresSupervises.join(" · ") : "Aucun"}
          />
        </BlocProfil>
        <BlocProfil titre="Habilitations">
          <LigneProfil libelle="Rôle" valeur={libellesRoles[utilisateur.role]} />
          <LigneProfil libelle="Droit pédagogique" valeur={utilisateur.peutGererPedagogie ? "Autorisé" : "Non autorisé"} />
          <LigneProfil libelle="Portée des données" valeur={porteeUtilisateur(utilisateur)} />
        </BlocProfil>
      </div>
    </section>
  );
}

function BlocProfil({ titre, children }: { titre: string; children: React.ReactNode }) {
  return <article className="bloc-profil"><h3>{titre}</h3><dl>{children}</dl></article>;
}

function LigneProfil({ libelle, valeur }: { libelle: string; valeur: string }) {
  return <div><dt>{libelle}</dt><dd>{valeur}</dd></div>;
}

function Questionnaire({ reponses, setReponses, etape, setEtape }: {
  reponses: Record<string, Niveau>;
  setReponses: React.Dispatch<React.SetStateAction<Record<string, Niveau>>>;
  etape: EtapeEvaluation;
  setEtape: (etape: EtapeEvaluation) => void;
}) {
  if (etape === "BILAN") return <Bilan reponses={reponses} modifier={() => setEtape("QUESTIONNAIRE")} />;
  const nombreReponses = Object.keys(reponses).length;
  const nombreRestant = indicateursEvaluation.length - nombreReponses;
  const complet = nombreRestant === 0;
  const valider = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (complet) {
      setEtape("BILAN");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  return (
    <section className="page-carte" aria-labelledby="questionnaire">
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
            <div className="axe-titre"><span>Axe {axeIndex + 1}</span><h3 id={`titre-${axe.code}`}>{axe.titre}</h3></div>
            {axe.indicateurs.map((indicateur) => (
              <fieldset key={indicateur.code}>
                <legend><strong>{indicateur.code}</strong><span>{indicateur.titre}</span></legend>
                <div className="choix">
                  {indicateur.options.map((choix, optionIndex) => {
                    const selectionne = reponses[indicateur.code] === choix.niveau;
                    return (
                      <label className={`option${selectionne ? " option-selectionnee" : ""}`} key={choix.niveau}>
                        <input required type="radio" name={indicateur.code} checked={selectionne} onChange={() => setReponses((courantes) => ({ ...courantes, [indicateur.code]: choix.niveau }))} />
                        <span className="option-contenu"><span className="option-repere">Situation {optionIndex + 1}</span>
                          {choix.criteres.length === 1 ? <span>{choix.criteres[0]}</span> : <ul>{choix.criteres.map((critere) => <li key={critere}>{critere}</li>)}</ul>}
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
  );
}

function Bilan({ reponses, modifier }: { reponses: Record<string, Niveau>; modifier: () => void }) {
  const totaux = useMemo(() => {
    const resultat: Record<Niveau, number> = { ROUGE: 0, ORANGE: 0, VERT: 0 };
    Object.values(reponses).forEach((niveau) => { resultat[niveau] = (resultat[niveau] ?? 0) + 1; });
    return resultat;
  }, [reponses]);
  return (
    <section className="page-carte" aria-labelledby="bilan">
      <p className="surtitre">Résultats</p><h2 id="bilan">Bilan de votre évaluation</h2>
      <p>Les couleurs apparaissent maintenant que le questionnaire est terminé.</p>
      <div className="synthese">
        {(["ROUGE", "ORANGE", "VERT"] as Niveau[]).map((niveau) => (
          <article className={`synthese-carte niveau-${niveau.toLowerCase()}`} key={niveau}><strong>{totaux[niveau]}</strong><span>{libellesNiveaux[niveau]}</span></article>
        ))}
      </div>
      <div className="resultats-detail">
        {axesEvaluation.map((axe) => (
          <section className="resultat-axe" key={axe.code}><h3>{axe.titre}</h3>
            {axe.indicateurs.map((indicateur) => {
              const niveau = reponses[indicateur.code];
              if (!niveau) return null;
              const choix = indicateur.options.find((optionCourante) => optionCourante.niveau === niveau);
              if (!choix) return null;
              return <article className="resultat" key={indicateur.code}><div><p><strong>{indicateur.code}</strong> — {indicateur.titre}</p><ul>{choix.criteres.map((critere) => <li key={critere}>{critere}</li>)}</ul></div><span className={`badge niveau-${niveau.toLowerCase()}`}>{niveau}</span></article>;
            })}
          </section>
        ))}
      </div>
      <button type="button" className="bouton-secondaire" onClick={modifier}>Modifier mes réponses</button>
    </section>
  );
}

function VueMetier({ entree, message }: { entree: EntreeMenu; message: string }) {
  return (
    <section className="page-carte" aria-labelledby={`titre-${entree.id}`}>
      <p className="surtitre">Espace fonctionnel</p>
      <h2 id={`titre-${entree.id}`}>{entree.libelle}</h2>
      <p>{entree.description}</p>
      <div className="etat-vide"><strong>Aucune donnée à afficher</strong><p>{message}</p><span>Les données seront chargées depuis Grist dans la prochaine étape de raccordement.</span></div>
    </section>
  );
}

function porteeUtilisateur(utilisateur: UtilisateurCourant): string {
  if (utilisateur.role === "ADMIN") return "Ensemble du document selon les ACL administrateur";
  if (utilisateur.role === "SUPERVISEUR") return "Recruteurs et données des périmètres supervisés";
  return "Données personnelles et évaluations propres";
}

function messageEtatVide(page: string): string {
  const messages: Record<string, string> = {
    progression: "Vos actions de progression, modules pédagogiques et demandes de validation apparaîtront ici.",
    fiches: "Les fiches pédagogiques affectées à vos résultats apparaîtront ici.",
    historique: "Vos évaluations et décisions antérieures apparaîtront ici.",
    recruteurs: "Les recruteurs appartenant à vos périmètres supervisés apparaîtront ici.",
    "evaluations-recruteurs": "Les évaluations des recruteurs autorisés apparaîtront ici avec les filtres prévus.",
    "progres-a-valider": "Les actions déclarées et en attente de votre décision apparaîtront ici.",
    "progres-ouverts": "Tous les indicateurs rouge et orange encore ouverts apparaîtront ici.",
    echeances: "Les actions proches de leur échéance ou en retard apparaîtront ici.",
    utilisateurs: "La gestion des utilisateurs, rôles et habilitations apparaîtra ici.",
    territoires: "La gestion des entités et périmètres apparaîtra ici.",
    affectations: "Les affectations des superviseurs apparaîtront ici.",
    referentiel: "Les axes, indicateurs, critères et campagnes apparaîtront ici.",
    pedagogie: "Les fiches pédagogiques et leurs versions PDF apparaîtront ici.",
    parametres: "Les paramètres fonctionnels de l’application apparaîtront ici.",
    "audit-exports": "Le journal d’audit et les exports autorisés apparaîtront ici.",
  };
  return messages[page] ?? "Les informations correspondant à cette rubrique apparaîtront ici.";
}
