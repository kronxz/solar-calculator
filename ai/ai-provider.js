require("dotenv").config({
  path: "../.env"
});

const OpenAI = require("openai");

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

async function perguntarIA(prompt) {

  try {

    const resposta = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    console.log("\n[GROQ ONLINE]\n");

    return resposta.choices[0].message.content;

  } catch (erro) {

    console.log("Groq falhou...");
    console.log("Tentando OpenRouter...\n");

  }

  try {

    const resposta = await openrouter.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    console.log("\n[OPENROUTER ONLINE]\n");

    return resposta.choices[0].message.content;

  } catch (erro) {

    console.log("Erro geral:");
    console.log(erro);

    return null;
  }
}

module.exports = {
  perguntarIA,
};