import { describe, expect, it } from "vitest";
import { menuPour, UtilisateurCourant } from "./portal-data.js";

function utilisateur(role:UtilisateurCourant["role"]):UtilisateurCourant{return{id:1,prenom:"Test",nom:"Utilisateur",email:"test@example.invalid",role,entite:"Entité",perimetrePrincipal:"Périmètre",perimetresSupervises:[],superviseurNom:"—",peutGererPedagogie:role==="ADMIN",actif:true};}

describe("menu par rôle",()=>{
  it("réserve la gestion des fiches d’enseignement à l’administrateur",()=>{
    expect(menuPour(utilisateur("ADMIN")).some(e=>e.id==="pedagogie")).toBe(true);
    expect(menuPour(utilisateur("SUPERVISEUR")).some(e=>e.id==="pedagogie")).toBe(false);
    expect(menuPour(utilisateur("RECRUTEUR")).some(e=>e.id==="pedagogie")).toBe(false);
  });
});
