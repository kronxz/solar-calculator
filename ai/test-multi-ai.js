const { perguntarIA } = require("./ai-provider");

async function iniciar() {

  const resposta = await perguntarIA(
    "Crie uma frase vendendo energia solar."
  );

  console.log("\nRESPOSTA:\n");

  console.log(resposta);
}

iniciar();