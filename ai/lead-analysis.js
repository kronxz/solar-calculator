const { perguntarIA } = require("./ai-provider");

async function analisarLead(lead) {

  const prompt = `
Você é um especialista em vendas de energia solar.

Analise o lead abaixo e responda:

1. Temperatura do lead:
- quente
- morno
- frio

2. Chance de fechamento:
- baixa
- média
- alta

3. Estratégia recomendada.

4. Melhor abordagem comercial.

5. Resuma o perfil do cliente.

LEAD:

Nome: ${lead.nome}
Conta de luz: ${lead.conta}
Cidade: ${lead.cidade}
Tipo: ${lead.tipo}
Origem: ${lead.origem}
`;

  const resposta = await perguntarIA(prompt);

  return resposta;
}

module.exports = {
  analisarLead,
};