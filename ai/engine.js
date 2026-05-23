require('dotenv').config({ path: '../.env' });

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

  // PROVIDER 1 — GROQ
  try {

    console.log("\n[GROQ ONLINE]\n");

    const resposta = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return resposta.choices[0].message.content;

  } catch (erro) {

    console.log("\n[GROQ FALHOU]\n");

  }

  // PROVIDER 2 — OPENROUTER
  try {

    console.log("\n[OPENROUTER ONLINE]\n");

    const resposta = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-r1",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return resposta.choices[0].message.content;

  } catch (erro) {

    console.log("\n[OPENROUTER FALHOU]\n");

  }

  return "Nenhum provider disponível.";

}

module.exports = {
  perguntarIA,
};