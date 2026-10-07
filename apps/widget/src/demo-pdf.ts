function echapperPdf(texte:string):string{return texte.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");}
function normaliserAscii(texte:string):string{return texte.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’‘]/g,"'").replace(/[–—]/g,"-").replace(/[^\x20-\x7E\n]/g,"?");}

export function urlPdfPresentationDemo(titre:string,reference:string):string{
  const lignes=[
    "ENSOSP - AUTO-EVALUATION SPV",
    "DOCUMENT DE PRESENTATION - MODE DEMONSTRATION",
    "",
    normaliserAscii(titre),
    reference ? `Reference de demonstration : ${normaliserAscii(reference)}` : "",
    "",
    "Ce PDF est un document fictif de presentation du demonstrateur.",
    "Il illustre uniquement l'ouverture, la consultation et le telechargement",
    "d'une ressource associee au parcours de progression.",
    "",
    "Ce document ne constitue pas une fiche ou un document d'enseignement ENSOSP",
    "et ne reproduit aucun contenu pedagogique reel.",
    "",
    "Aucun document Grist reel, aucune donnee nominative et aucun contenu",
    "confidentiel ne sont exposes dans ce fichier.",
  ].filter((ligne,index,table)=>ligne!==""||table[index-1]!=="");
  const commandes:string[]=["BT","/F1 18 Tf","72 770 Td"];
  lignes.forEach((ligne,index)=>{
    if(index===1)commandes.push("/F1 13 Tf");
    if(index===3)commandes.push("/F1 15 Tf");
    if(index===5)commandes.push("/F1 11 Tf");
    commandes.push(`(${echapperPdf(ligne)}) Tj`,"0 -24 Td");
  });
  commandes.push("ET");
  const flux=commandes.join("\n");
  const objets=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf="%PDF-1.4\n",position=pdf.length;const offsets=[0];
  objets.forEach((objet,index)=>{offsets[index+1]=position;const bloc=`${index+1} 0 obj\n${objet}\nendobj\n`;pdf+=bloc;position+=bloc.length;});
  const xref=position;
  pdf+=`xref\n0 ${objets.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<=objets.length;i++)pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
  pdf+=`trailer\n<< /Size ${objets.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return URL.createObjectURL(new Blob([new TextEncoder().encode(pdf)],{type:"application/pdf"}));
}
