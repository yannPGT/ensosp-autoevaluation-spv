import{obtenirDocApiGrist,TableGrist}from"./grist-context.js";import{Niveau}from"./evaluation-data.js";import{UtilisateurCourant}from"./portal-data.js";
export type StatutSessionEvaluation="BROUILLON"|"VALIDEE"|null;
export interface SessionEvaluation{evaluationId:number|null;reponses:Record<string,Niveau>;statut:StatutSessionEvaluation}
export interface ResultatValidation{avertissement:string|null}
export async function chargerSessionEvaluation(utilisateur:UtilisateurCourant):Promise<SessionEvaluation>{const api=obtenirDocApiGrist();if(!api)return{evaluationId:null,reponses:{},statut:null};const[evaluations,reponses,indicateurs]=await Promise.all([api.fetchTable("Evaluations"),api.fetchTable("Reponses"),api.fetchTable("Indicateurs")]);const candidats=(evaluations.id??[]).map((v,i)=>({i,id:nombre(v),recruteur:referenceId(evaluations.Recruteur?.[i]),statut:texte(evaluations.Statut?.[i])})).filter(e=>e.id&&e.recruteur===utilisateur.id);const brouillon=candidats.filter(e=>e.statut==="BROUILLON").sort((a,b)=>(b.id??0)-(a.id??0))[0];const validee=candidats.filter(e=>e.statut==="VALIDEE").sort((a,b)=>(b.id??0)-(a.id??0))[0];const cible=brouillon??validee;if(!cible?.id)return{evaluationId:null,reponses:{},statut:null};const evaluationId=cible.id;const codes=new Map<number,string>();(indicateurs.id??[]).forEach((v,i)=>{const id=nombre(v);if(id)codes.set(id,texte(indicateurs.Code?.[i]));});const resultat:Record<string,Niveau>={};(reponses.id??[]).forEach((_,i)=>{if(referenceId(reponses.Evaluation?.[i])!==evaluationId)return;const code=codes.get(referenceId(reponses.Indicateur?.[i])??0),niveau=normaliserNiveau(reponses.Niveau?.[i]);if(code&&niveau)resultat[code]=niveau;});return{evaluationId,reponses:resultat,statut:cible.statut==="BROUILLON"?"BROUILLON":"VALIDEE"};}
export async function creerEvaluation(utilisateur:UtilisateurCourant):Promise<number>{const api=exigerApi();const[utilisateurs,campagnes]=await Promise.all([api.fetchTable("Utilisateurs"),api.fetchTable("Campagnes")]);const ui=(utilisateurs.id??[]).findIndex(v=>nombre(v)===utilisateur.id),perimetre=referenceId(utilisateurs.PerimetrePrincipal?.[ui]);if(!perimetre)throw new Error("Votre périmètre principal n’est pas configuré.");const campagneIndex=(campagnes.id??[]).findIndex((_,i)=>texte(campagnes.Statut?.[i])==="OUVERTE"&&(!referenceId(campagnes.Perimetre?.[i])||referenceId(campagnes.Perimetre?.[i])===perimetre));const campagne=campagneIndex>=0?nombre(campagnes.id?.[campagneIndex]):null,uid=crypto.randomUUID();await api.applyUserActions([["AddRecord","Evaluations",null,{Uid:uid,Recruteur:utilisateur.id,Perimetre:perimetre,Campagne:campagne,Statut:"BROUILLON"}]]);const evaluations=await api.fetchTable("Evaluations"),i=(evaluations.Uid??[]).findIndex(v=>v===uid),id=nombre(evaluations.id?.[i]);if(!id)throw new Error("Le brouillon d’évaluation n’a pas pu être retrouvé.");return id;}
export async function enregistrerReponse(evaluationId:number,code:string,niveau:Niveau):Promise<void>{const api=exigerApi();const[evaluations,indicateurs,reponses]=await Promise.all([api.fetchTable("Evaluations"),api.fetchTable("Indicateurs"),api.fetchTable("Reponses")]);const ei=(evaluations.id??[]).findIndex(v=>nombre(v)===evaluationId);if(ei<0)throw new Error("Cette évaluation est introuvable.");if(texte(evaluations.Statut?.[ei])!=="BROUILLON")throw new Error("Cette évaluation n’est plus modifiable.");const recruteur=referenceId(evaluations.Recruteur?.[ei]),perimetre=referenceId(evaluations.Perimetre?.[ei]);if(!recruteur||!perimetre)throw new Error("Le contexte recruteur ou périmètre de cette évaluation est incomplet.");const ii=(indicateurs.Code??[]).findIndex(v=>v===code),indicateurId=nombre(indicateurs.id?.[ii]);if(!indicateurId)throw new Error(`L’indicateur ${code} est absent du référentiel Grist.`);const ri=(reponses.id??[]).findIndex((_,i)=>referenceId(reponses.Evaluation?.[i])===evaluationId&&referenceId(reponses.Indicateur?.[i])===indicateurId),reponseId=nombre(reponses.id?.[ri]);const action=reponseId?["UpdateRecord","Reponses",reponseId,{Niveau:niveau,DateReponse:maintenant()}]:["AddRecord","Reponses",null,{Uid:crypto.randomUUID(),Evaluation:evaluationId,Recruteur:recruteur,Perimetre:perimetre,Indicateur:indicateurId,Niveau:niveau,DateReponse:maintenant()}];await api.applyUserActions([action]);}
export async function validerEvaluation(evaluationId:number,utilisateur:UtilisateurCourant):Promise<ResultatValidation>{
  const api=exigerApi();
  const[evaluations,reponses,indicateurs]=await Promise.all([
    api.fetchTable("Evaluations"),
    api.fetchTable("Reponses"),
    api.fetchTable("Indicateurs"),
  ]);
  const ei=(evaluations.id??[]).findIndex(v=>nombre(v)===evaluationId);
  if(ei<0)throw new Error("Cette évaluation est introuvable.");
  const statut=texte(evaluations.Statut?.[ei]);
  if(statut==="VALIDEE")return{avertissement:null};
  if(statut!=="BROUILLON")throw new Error("Cette évaluation n’est plus modifiable.");
  const recruteur=referenceId(evaluations.Recruteur?.[ei]),perimetre=referenceId(evaluations.Perimetre?.[ei]);
  if(!recruteur||!perimetre)throw new Error("Le contexte recruteur ou périmètre de cette évaluation est incomplet.");

  const obligatoires=new Set<number>();
  (indicateurs.id??[]).forEach((v,i)=>{
    const id=nombre(v);
    if(id&&booleen(indicateurs.Obligatoire?.[i])&&booleen(indicateurs.Actif?.[i]))obligatoires.add(id);
  });
  const lignes:(typeof ligneReponse)[]=[];
  (reponses.id??[]).forEach((v,i)=>{
    if(referenceId(reponses.Evaluation?.[i])!==evaluationId)return;
    const id=nombre(v),indicateur=referenceId(reponses.Indicateur?.[i]),niveau=normaliserNiveau(reponses.Niveau?.[i]);
    if(id&&indicateur&&niveau)lignes.push({id,indicateur,niveau});
  });
  if(obligatoires.size&&[...obligatoires].some(id=>!lignes.some(r=>r.indicateur===id))){
    throw new Error("Tous les indicateurs obligatoires doivent être renseignés.");
  }

  await api.applyUserActions([["UpdateRecord","Evaluations",evaluationId,{Statut:"VALIDEE",DateValidation:maintenant()}]]);

  let avertissement:string|null=null;
  try{
    const[feuilles,liaisons,fiches,actionsExistantes]=await Promise.all([
      api.fetchTable("FeuillesRoute"),
      api.fetchTable("FicheIndicateurs"),
      api.fetchTable("FichesEnseignement"),
      api.fetchTable("ActionsProgres"),
    ]);
    let feuilleId=trouverFeuille(feuilles,evaluationId);
    if(!feuilleId){
      const uid=crypto.randomUUID();
      await api.applyUserActions([["AddRecord","FeuillesRoute",null,{Uid:uid,Evaluation:evaluationId,Recruteur:recruteur,Perimetre:perimetre,Statut:"OUVERTE"}]]);
      const table=await api.fetchTable("FeuillesRoute"),fi=(table.Uid??[]).findIndex(v=>v===uid);
      feuilleId=nombre(table.id?.[fi]);
    }
    if(!feuilleId)throw new Error("La feuille de route n’a pas pu être créée.");

    const versionParIndicateur=new Map<number,number>();
    (liaisons.id??[]).forEach((_,i)=>{
      if(!booleen(liaisons.Actif?.[i]))return;
      const indicateur=referenceId(liaisons.Indicateur?.[i]),fiche=referenceId(liaisons.Fiche?.[i]);
      if(!indicateur||!fiche)return;
      const niveau=lignes.find(r=>r.indicateur===indicateur)?.niveau;
      const declenche=niveau==="ROUGE"?booleen(liaisons.DeclencheRouge?.[i]):niveau==="ORANGE"?booleen(liaisons.DeclencheOrange?.[i]):false;
      if(!declenche)return;
      const f=(fiches.id??[]).findIndex(v=>nombre(v)===fiche),version=referenceId(fiches.VersionActive?.[f]);
      if(version)versionParIndicateur.set(indicateur,version);
    });
    const reponsesDejaTraitees=new Set<number>();
    (actionsExistantes.id??[]).forEach((_,i)=>{
      if(referenceId(actionsExistantes.FeuilleRoute?.[i])===feuilleId){
        const reponse=referenceId(actionsExistantes.Reponse?.[i]);
        if(reponse)reponsesDejaTraitees.add(reponse);
      }
    });
    const actions=lignes
      .filter(r=>r.niveau!=="VERT"&&!reponsesDejaTraitees.has(r.id))
      .map(r=>["AddRecord","ActionsProgres",null,{Uid:crypto.randomUUID(),FeuilleRoute:feuilleId,Evaluation:evaluationId,Reponse:r.id,Recruteur:recruteur,Perimetre:perimetre,Indicateur:r.indicateur,FicheVersion:versionParIndicateur.get(r.indicateur)??null,NiveauInitial:r.niveau,NiveauCourant:r.niveau,Statut:"A_PRENDRE_EN_COMPTE"}]);
    if(actions.length)await api.applyUserActions(actions);
  }catch{
    avertissement="L’évaluation est bien validée, mais le parcours de progression n’a pas pu être créé automatiquement. Contactez un administrateur.";
  }

  try{
    await api.applyUserActions([["AddRecord","JournalAudit",null,{Uid:crypto.randomUUID(),Acteur:utilisateur.id,Perimetre:perimetre,TypeObjet:"EVALUATION",ObjetUid:texte(evaluations.Uid?.[ei])||String(evaluationId),Action:"VALIDATION",Resume:"Auto-évaluation validée"}]]);
  }catch{}
  return{avertissement};
}
const ligneReponse={id:0,indicateur:0,niveau:"ROUGE"as Niveau};function trouverFeuille(t:TableGrist,e:number):number|null{const i=(t.id??[]).findIndex((_,x)=>referenceId(t.Evaluation?.[x])===e);return nombre(t.id?.[i]);}function exigerApi(){const a=obtenirDocApiGrist();if(!a)throw new Error("Cette opération est disponible uniquement depuis le widget Grist.");return a;}function referenceId(v:unknown):number|null{if(typeof v==="number"&&v>0)return v;if(Array.isArray(v)){for(let i=v.length-1;i>=0;i--)if(typeof v[i]==="number"&&(v[i]as number)>0)return v[i]as number;}return null;}function nombre(v:unknown):number|null{return typeof v==="number"&&Number.isFinite(v)?v:null;}function texte(v:unknown):string{return typeof v==="string"?v:"";}function booleen(v:unknown):boolean{return v===true||v===1;}function normaliserNiveau(v:unknown):Niveau|null{const n=texte(v);return n==="ROUGE"||n==="ORANGE"||n==="VERT"?n:null;}function maintenant(){return Math.floor(Date.now()/1000);}