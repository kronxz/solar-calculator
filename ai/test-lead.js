const { analisarLead } = require("./lead-analysis");

async function iniciar() {

  const resultado = await analisarLead({
    nome: "Carlos Silva",
    conta: "950",
    cidade: "Maricá",
    tipo: "Residencial",
    origem: "Instagram",
  });

  console.log("\nANÁLISE DO LEAD:\n");

  console.log(resultado);
}

iniciar();