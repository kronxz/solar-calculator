const { perguntarIA } = require('./engine');

async function iniciar() {

  const resposta = await perguntarIA(
    "Explique rapidamente como vender energia solar para um cliente residencial."
  );

  console.log("\nRESPOSTA:\n");

  console.log(resposta);

}

iniciar();
