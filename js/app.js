import lead from "./lead.js"

console.log("🚀 APP INICIOU")
console.log("🔥 LEAD RECEBIDO:", lead)

if (!lead) {
  alert("Lead não encontrado")
}

// ===== NOME =====

const nomeCliente =
  document.getElementById("nomeCliente")

if(nomeCliente && lead.nome){
  nomeCliente.innerText = lead.nome
}
