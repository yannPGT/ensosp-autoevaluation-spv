import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { chargerTableauDeBord, PersonnelTableauDeBord, TableauDeBord } from "./dashboard-data.js";
import { axesEvaluation, indicateursEvaluation, Niveau } from "./evaluation-data.js";
import { chargerSessionEvaluation, creerEvaluation, enregistrerReponse, validerEvaluation } from "./evaluation-store.js";
import { chargerUtilisateurCourant } from "./grist-context.js";
import { ModuleUtilisateurs } from "./UsersModule.js";
import { ModuleTerritoires } from "./TerritoriesModule.js";
import { ModuleAffectations } from "./AssignmentsModule.js";
import { ModuleReferentiel } from "./ReferenceModule.js";
import { ModulePedagogique } from "./TeachingModule.js";
import { ModuleParametres } from "./SettingsModule.js";
import { ModuleAudit } from "./AuditModule.js";
import { ModuleOperationnel } from "./OperationalModule.js";
import {
  EntreeMenu,
  libellesRoles,
  menuPour,
  UtilisateurCourant,
} from "./portal-data.js";

type EtapeEvaluation = "QUESTIONNAIRE" | "FINALISEE" | "BILAN";
type EtatTableauDeBord =
  | { statut: "chargement" }
  | { statut: "pret"; tableau: TableauDeBord }
  | { statut: "erreur"; message: string };

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
  const [tentativeTableau, setTentativeTableau] = useState(0);
  const [etatTableau, setEtatTableau] = useState<EtatTableauDeBord>({ statut: "chargement" });
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

  useEffect(() => {
    if (!utilisateur) return;
    let actif = true;
    setEtatTableau({ statut: "chargement" });
    chargerTableauDeBord(utilisateur)
      .then((tableau) => { if (actif) setEtatTableau({ statut: "pret", tableau }); })
      .catch((erreur: unknown) => {
        const message = erreur instanceof Error ? erreur.message : "Le tableau de bord n’a pas pu être chargé.";
        if (actif) setEtatTableau({ statut: "erreur", message });
      });
    return () => { actif = false; };
  }, [utilisateur, tentativeTableau]);

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
          {pageActive === "accueil" && (
            <Accueil
              utilisateur={utilisateur}
              menu={menu}
              changerPage={setPageActive}
              etatTableau={etatTableau}
              rechargerTableau={() => setTentativeTableau((valeur) => valeur + 1)}
            />
          )}
          {pageActive === "profil" && <Profil utilisateur={utilisateur} />}
          {pageActive === "tableau-bord" && (
            <PageTableauDeBord
              utilisateur={utilisateur}
              etatTableau={etatTableau}
              recharger={() => setTentativeTableau((valeur) => valeur + 1)}
            />
          )}
          {pageActive === "utilisateurs" && <ModuleUtilisateurs utilisateurCourantId={utilisateur.id} />}
          {pageActive === "territoires" && <ModuleTerritoires />}
          {pageActive === "affectations" && <ModuleAffectations />}
          {pageActive === "referentiel" && <ModuleReferentiel />}
          {pageActive === "pedagogie" && <ModulePedagogique utilisateur={utilisateur} />}
          {pageActive === "parametres" && <ModuleParametres utilisateur={utilisateur} />}
          {pageActive === "audit-exports" && <ModuleAudit utilisateur={utilisateur} />}
          {(["progression", "fiches", "historique", "recruteurs", "evaluations-recruteurs", "progres-a-valider", "progres-ouverts", "echeances", "gestion-recruteurs"].includes(pageActive)) && <ModuleOperationnel page={pageActive} utilisateur={utilisateur} />}
          {pageActive === "parametrage-indicateurs" && <ModuleReferentiel />}
          {pageActive === "evaluation" && (
            <Questionnaire
              utilisateur={utilisateur}
              reponses={reponses}
              setReponses={setReponses}
              etape={etapeEvaluation}
              setEtape={setEtapeEvaluation}
            />
          )}
          {pageActive === "resultats" && (
            etapeEvaluation === "BILAN"
              ? <Bilan reponses={reponses} modifier={() => { setEtapeEvaluation("QUESTIONNAIRE"); setPageActive("evaluation"); }} />
              : <ModuleOperationnel page="resultats" utilisateur={utilisateur} />
          )}
          {!(["accueil", "profil", "tableau-bord", "utilisateurs", "territoires", "affectations", "referentiel", "pedagogie", "parametres", "audit-exports", "evaluation", "resultats", "progression", "fiches", "historique", "recruteurs", "evaluations-recruteurs", "progres-a-valider", "progres-ouverts", "echeances", "gestion-recruteurs", "parametrage-indicateurs"].includes(pageActive)) && (
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
      <header><p className="marque">ENSOSP</p><h1>Auto-évaluation des pratiques de recrutement SPV</h1></header>
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
      <p className="marque">ENSOSP <span>· {utilisateur.prenom} {utilisateur.nom}</span></p>
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

function Accueil({ utilisateur, menu, changerPage, etatTableau, rechargerTableau }: {
  utilisateur: UtilisateurCourant;
  menu: readonly EntreeMenu[];
  changerPage: (page: string) => void;
  etatTableau: EtatTableauDeBord;
  rechargerTableau: () => void;
}) {
  const raccourcis = menu.filter((entree) => !["accueil", "profil"].includes(entree.id)).slice(0, 4);
  return (
    <section className="page-carte" aria-labelledby="titre-accueil">
      <p className="surtitre">{libellesRoles[utilisateur.role]}</p>
      <h2 id="titre-accueil">Bonjour {utilisateur.prenom}</h2>
      <p>Retrouvez ici les informations et opérations correspondant à votre rôle et à vos périmètres autorisés.</p>
      <ContenuTableauDeBord etat={etatTableau} recharger={rechargerTableau} />
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

function PageTableauDeBord({ utilisateur, etatTableau, recharger }: {
  utilisateur: UtilisateurCourant;
  etatTableau: EtatTableauDeBord;
  recharger: () => void;
}) {
  const titre = utilisateur.role === "ADMIN" ? "Tableau de bord global" : "Tableau de bord du périmètre";
  return (
    <section className="page-carte" aria-labelledby="titre-tableau-de-bord">
      <p className="surtitre">Pilotage</p>
      <h2 id="titre-tableau-de-bord">{titre}</h2>
      <p>Consultez les effectifs, les évaluations et les actions visibles dans le respect de vos ACL Grist.</p>
      <ContenuTableauDeBord etat={etatTableau} recharger={recharger} afficherPersonnel />
    </section>
  );
}

function ContenuTableauDeBord({ etat, recharger, afficherPersonnel = false }: {
  etat: EtatTableauDeBord;
  recharger: () => void;
  afficherPersonnel?: boolean;
}) {
  if (etat.statut === "chargement") {
    return <div className="etat-tableau" aria-live="polite">Chargement des indicateurs autorisés par Grist…</div>;
  }
  if (etat.statut === "erreur") {
    return (
      <div className="etat-tableau etat-tableau-erreur" role="alert">
        <strong>Tableau de bord indisponible</strong><p>{etat.message}</p>
        <button type="button" onClick={recharger}>Réessayer</button>
      </div>
    );
  }

  const { tableau } = etat;
  return (
    <>
      <div className="indicateurs-accueil">
        {tableau.cartes.map((indicateur) => (
          <article key={indicateur.libelle}>
            <strong>{indicateur.valeur}</strong><span>{indicateur.libelle}</span>
            {indicateur.detail && <small>{indicateur.detail}</small>}
          </article>
        ))}
      </div>
      {tableau.repartition && (
        <section className="bloc-tableau" aria-labelledby="titre-repartition">
          <h3 id="titre-repartition" className="titre-section">Répartition des indicateurs</h3>
          <div className="repartition-niveaux">
            <article className="niveau-rouge"><strong>{tableau.repartition.rouge}</strong><span>Priorités rouges</span></article>
            <article className="niveau-orange"><strong>{tableau.repartition.orange}</strong><span>Vigilances orange</span></article>
            <article className="niveau-vert"><strong>{tableau.repartition.vert}</strong><span>Points d’appui verts</span></article>
          </div>
        </section>
      )}
      {afficherPersonnel && <PersonnelSuivi personnel={tableau.personnel} />}
      {tableau.titreSuivi && (
        <section className="bloc-tableau" aria-labelledby="titre-suivi">
          <h3 id="titre-suivi" className="titre-section">{tableau.titreSuivi}</h3>
          {tableau.lignes.length ? (
            <div className="liste-suivi">
              {tableau.lignes.map((ligne, index) => (
                <article key={`${ligne.titre}-${index}`}>
                  <div><strong>{ligne.titre}</strong><span>{ligne.detail}</span></div><b>{ligne.valeur}</b>
                </article>
              ))}
            </div>
          ) : <p className="aucun-suivi">Aucune donnée correspondante pour le moment.</p>}
        </section>
      )}
      {tableau.note && <p className="note-tableau">{tableau.note}</p>}
    </>
  );
}

function PersonnelSuivi({ personnel }: { personnel: readonly PersonnelTableauDeBord[] }) {
  const [recherche, setRecherche] = useState("");
  const [role, setRole] = useState("TOUS");
  const rechercheNormalisee = recherche.trim().toLocaleLowerCase("fr");
  const personnelFiltre = personnel.filter((personne) => {
    const correspondRole = role === "TOUS" || personne.role === role;
    const texteRecherche = `${personne.nom} ${personne.email} ${personne.perimetre}`.toLocaleLowerCase("fr");
    return correspondRole && (!rechercheNormalisee || texteRecherche.includes(rechercheNormalisee));
  });

  return (
    <section className="bloc-tableau" aria-labelledby="titre-personnel">
      <div className="entete-personnel">
        <div><h3 id="titre-personnel" className="titre-section">Personnel suivi</h3><p>{personnel.length} profil{personnel.length > 1 ? "s" : ""} actif{personnel.length > 1 ? "s" : ""}</p></div>
        <div className="filtres-personnel">
          <label>Rechercher<input type="search" value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Nom, courriel ou périmètre" /></label>
          <label>Rôle<select value={role} onChange={(event) => setRole(event.target.value)}><option value="TOUS">Tous</option><option value="ADMIN">Administrateurs</option><option value="SUPERVISEUR">Superviseurs</option><option value="RECRUTEUR">Recruteurs</option></select></label>
        </div>
      </div>
      {personnelFiltre.length ? (
        <div className="table-personnel">
          <div className="ligne-personnel ligne-personnel-entete"><span>Identité</span><span>Rôle et périmètre</span><span>Dernière évaluation</span><span>Actions</span></div>
          {personnelFiltre.map((personne) => (
            <article className="ligne-personnel" key={personne.id}>
              <div><strong>{personne.nom}</strong><small>{personne.email || "Courriel non renseigné"}</small></div>
              <div><strong>{libellesRoles[personne.role]}</strong><small>{personne.perimetre}</small></div>
              <span>{personne.derniereEvaluation}</span>
              <b>{personne.actionsOuvertes}</b>
            </article>
          ))}
        </div>
      ) : <p className="aucun-suivi">Aucun profil ne correspond aux filtres sélectionnés.</p>}
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

function Questionnaire({ utilisateur, reponses, setReponses, etape, setEtape }: {
  utilisateur: UtilisateurCourant;
  reponses: Record<string, Niveau>;
  setReponses: React.Dispatch<React.SetStateAction<Record<string, Niveau>>>;
  etape: EtapeEvaluation;
  setEtape: (etape: EtapeEvaluation) => void;
}) {
  const [evaluationId, setEvaluationId] = useState<number | null>(null);
  const [etatSauvegarde, setEtatSauvegarde] = useState("Chargement du brouillon…");
  const [erreurSauvegarde, setErreurSauvegarde] = useState("");
  const [avertissementFinalisation, setAvertissementFinalisation] = useState("");
  const [operationEvaluation, setOperationEvaluation] = useState(false);
  const creationEnCours = useRef<Promise<number> | null>(null);
  const derniereSauvegarde = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let actif = true;
    chargerSessionEvaluation(utilisateur).then((session) => {
      if (!actif) return;
      setEvaluationId(session.evaluationId);
      setReponses(session.reponses);
      if (session.statut === "VALIDEE") {
        setEtape("FINALISEE");
        setEtatSauvegarde("Dernière évaluation validée chargée");
      } else {
        setEtape("QUESTIONNAIRE");
        setEtatSauvegarde(session.evaluationId ? "Brouillon Grist chargé" : "Le brouillon sera créé à la première réponse");
      }
    }).catch((erreur: unknown) => {
      if (actif) setErreurSauvegarde(erreur instanceof Error ? erreur.message : "Le brouillon n’a pas pu être chargé.");
    });
    return () => { actif = false; };
  }, [utilisateur, setReponses, setEtape]);

  const assurerEvaluation = async () => {
    if (window.parent === window) return -1;
    if (evaluationId) return evaluationId;
    if (!creationEnCours.current) creationEnCours.current = creerEvaluation(utilisateur);
    const id = await creationEnCours.current;
    setEvaluationId(id);
    return id;
  };
  const choisirReponse = async (code: string, niveau: Niveau) => {
    setReponses((courantes) => ({ ...courantes, [code]: niveau }));
    setEtatSauvegarde("Enregistrement dans Grist…"); setErreurSauvegarde("");
    derniereSauvegarde.current = derniereSauvegarde.current.catch(() => undefined).then(async () => {
      const id = await assurerEvaluation(); if (id !== -1) await enregistrerReponse(id, code, niveau); setEtatSauvegarde("Brouillon enregistré dans Grist");
    });
    try { await derniereSauvegarde.current; }
    catch (erreur) { setErreurSauvegarde(erreur instanceof Error ? erreur.message : "La réponse n’a pas pu être enregistrée."); }
  };
  if (etape === "BILAN") return <Bilan reponses={reponses} modifier={() => setEtape("QUESTIONNAIRE")} />;
  if (etape === "FINALISEE") return (
    <section className="page-carte confirmation-evaluation" aria-labelledby="evaluation-finalisee">
      <p className="surtitre">Évaluation enregistrée</p>
      <h2 id="evaluation-finalisee">Votre évaluation est finalisée</h2>
      <p>{avertissementFinalisation ? "Vos réponses sont désormais validées et ne peuvent plus être modifiées." : "Vos réponses sont désormais validées et votre parcours de progression a été créé. Elles ne peuvent plus être modifiées."}</p>
      {avertissementFinalisation && <p className="message-formulaire message-avertissement" role="status">{avertissementFinalisation}</p>}
      <div className="actions-formulaire">
        <button type="button" onClick={() => { setEtape("BILAN"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Voir mon bilan</button>
        <button type="button" className="bouton-secondaire" onClick={() => {
          setEvaluationId(null);
          creationEnCours.current = null;
          derniereSauvegarde.current = Promise.resolve();
          setReponses({});
          setAvertissementFinalisation("");
          setErreurSauvegarde("");
          setEtatSauvegarde("Nouvelle auto-évaluation : le brouillon sera créé à la première réponse");
          setEtape("QUESTIONNAIRE");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}>Commencer une nouvelle auto-évaluation</button>
      </div>
    </section>
  );
  const nombreReponses = Object.keys(reponses).length;
  const nombreRestant = indicateursEvaluation.length - nombreReponses;
  const complet = nombreRestant === 0;
  const enregistrerBrouillon = async () => {
    setOperationEvaluation(true); setEtatSauvegarde("Enregistrement du brouillon…"); setErreurSauvegarde("");
    try {
      await derniereSauvegarde.current;
      await assurerEvaluation();
      setEtatSauvegarde("Brouillon enregistré : votre évaluation n’est pas validée et reste modifiable.");
    } catch (erreur) {
      setErreurSauvegarde(erreur instanceof Error ? erreur.message : "L’évaluation n’a pas pu être enregistrée.");
    } finally { setOperationEvaluation(false); }
  };
  const valider = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (complet) {
      setOperationEvaluation(true);
      setEtatSauvegarde("Validation et création du parcours…"); setErreurSauvegarde("");
      try {
        await derniereSauvegarde.current;
        const id = await assurerEvaluation();
        if (id !== -1) {
          const resultat = await validerEvaluation(id, utilisateur);
          setAvertissementFinalisation(resultat.avertissement ?? "");
        }
        setEtatSauvegarde("Évaluation validée"); setEtape("FINALISEE");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (erreur) { setErreurSauvegarde(erreur instanceof Error ? erreur.message : "L’évaluation n’a pas pu être validée."); }
      finally { setOperationEvaluation(false); }
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
                <legend>{indicateur.titre}</legend>
                <p>{indicateur.description}</p>
                <div className="choix-niveaux">
                  {indicateur.criteres.map((critere) => (
                    <label className={reponses[indicateur.code] === critere.niveau ? "choix-niveau choix-selectionne" : "choix-niveau"} key={critere.niveau}>
                      <input type="radio" name={indicateur.code} value={critere.niveau} checked={reponses[indicateur.code] === critere.niveau} onChange={() => choisirReponse(indicateur.code, critere.niveau)} />
                      <span>{critere.libelle}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </section>
        ))}
        <div className="actions-formulaire">
          <button type="button" className="bouton-secondaire" onClick={enregistrerBrouillon} disabled={operationEvaluation}>Enregistrer le brouillon</button>
          <button type="submit" disabled={!complet || operationEvaluation}>Valider mon auto-évaluation</button>
        </div>
        <p className="message-formulaire" aria-live="polite">{etatSauvegarde}</p>
        {erreurSauvegarde && <p className="message-formulaire message-erreur" role="alert">{erreurSauvegarde}</p>}
        {!complet && <p className="message-formulaire">Il reste {nombreRestant} indicateur{nombreRestant > 1 ? "s" : ""} à renseigner avant validation.</p>}
      </form>
    </section>
  );
}

function Bilan({ reponses, modifier }: { reponses: Record<string, Niveau>; modifier: () => void }) {
  const total = Object.values(reponses).reduce((acc, niveau) => {
    acc[niveau] += 1;
    return acc;
  }, { ROUGE: 0, ORANGE: 0, VERT: 0 } as Record<Niveau, number>);
  return (
    <section className="page-carte" aria-labelledby="bilan">
      <p className="surtitre">Bilan</p><h2 id="bilan">Synthèse de votre auto-évaluation</h2>
      <div className="repartition-niveaux">
        <article className="niveau-rouge"><strong>{total.ROUGE}</strong><span>Priorités rouges</span></article>
        <article className="niveau-orange"><strong>{total.ORANGE}</strong><span>Vigilances orange</span></article>
        <article className="niveau-vert"><strong>{total.VERT}</strong><span>Points d’appui verts</span></article>
      </div>
      <div className="liste-suivi">
        {indicateursEvaluation.map((indicateur) => {
          const niveau = reponses[indicateur.code];
          return <article key={indicateur.code}><div><strong>{indicateur.titre}</strong><span>{niveau ? libellesNiveaux[niveau] : "Non renseigné"}</span></div><b>{niveau ?? "—"}</b></article>;
        })}
      </div>
      <button type="button" onClick={modifier}>Retour au questionnaire</button>
    </section>
  );
}

function VueMetier({ entree, message }: { entree: EntreeMenu; message: string }) {
  return <section className="page-carte"><p className="surtitre">Module</p><h2>{entree.libelle}</h2><p>{message}</p></section>;
}

function messageEtatVide(page: string): string {
  const messages: Record<string, string> = {
    progression: "Votre feuille de route et vos actions de progression apparaîtront ici.",
    fiches: "Les fiches pédagogiques qui vous sont attribuées apparaîtront ici.",
    historique: "Vos évaluations validées seront conservées ici sans modification de l’historique.",
    recruteurs: "Les recruteurs de vos périmètres seront disponibles ici.",
    "evaluations-recruteurs": "Les évaluations visibles sur vos périmètres seront disponibles ici.",
    "progres-a-valider": "Les progrès déclarés par les recruteurs apparaîtront ici pour validation.",
    "progres-ouverts": "Les indicateurs rouge et orange encore ouverts apparaîtront ici.",
    echeances: "Les échéances et retards seront présentés ici.",
    "gestion-recruteurs": "La gestion des recruteurs sera disponible ici.",
  };
  return messages[page] ?? "Ce module sera disponible dans une prochaine étape de développement.";
}

function porteeUtilisateur(utilisateur: UtilisateurCourant): string {
  if (utilisateur.role === "ADMIN") return "Ensemble des données autorisées par les ACL administrateur";
  if (utilisateur.role === "SUPERVISEUR") return utilisateur.perimetresSupervises.length ? utilisateur.perimetresSupervises.join(" · ") : utilisateur.perimetrePrincipal;
  return utilisateur.perimetrePrincipal;
}
