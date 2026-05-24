import { app, db, collection, addDoc, serverTimestamp } from '../firebase/config.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// =====================================
// SESSION REAL & SESSION ID
// =====================================

const TEMPO_EXPIRACAO = 30 * 60 * 1000; // 30 min

let sessionData = JSON.parse(localStorage.getItem("sessionData"));
const agora = Date.now();

if (
  !sessionData ||
  !sessionData.timestamp ||
  (agora - sessionData.timestamp) > TEMPO_EXPIRACAO
) {
  sessionData = {
    id: crypto.randomUUID(),
    timestamp: agora
  };
} else {
  // atualiza atividade
  sessionData.timestamp = agora;
}

localStorage.setItem("sessionData", JSON.stringify(sessionData));

let sessionId = localStorage.getItem("sessionId");
if (!sessionId) {
  sessionId = crypto.randomUUID();
  localStorage.setItem("sessionId", sessionId);
}

// =====================================
// VISITA ÚNICA POR SESSÃO
// =====================================

export function podeRegistrarVisita(){
  const ultimaVisita = localStorage.getItem("ultimaVisitaSession");
  if (ultimaVisita === sessionId) {
    return false;
  }
  localStorage.setItem("ultimaVisitaSession", sessionId);
  return true;
}

// =====================================
// SCORE
// =====================================

let leadScore = Number(localStorage.getItem("leadScore")) || 0;


// =====================================
// EVENTOS JÁ DISPARADOS
// =====================================

let eventosDisparados =
JSON.parse(
  sessionStorage.getItem(
    "eventosDisparados"
  ) || "[]"
)

function eventoJaDisparou(nome){

  return eventosDisparados.includes(nome)

}

function marcarEvento(nome){

  eventosDisparados.push(nome)

  sessionStorage.setItem(
    "eventosDisparados",
    JSON.stringify(eventosDisparados)
  )

}


export function adicionarScore(valor){

  leadScore += valor

  localStorage.setItem(
    "leadScore",
    leadScore
  )

}


// =====================================
// UTM
// =====================================

function pegarUTM(){

  const params =
  new URLSearchParams(
    window.location.search
  )

  return {

    utm_source:
    params.get("utm_source") || "",

    utm_campaign:
    params.get("utm_campaign") || "",

    utm_medium:
    params.get("utm_medium") || "",

    utm_content:
    params.get("utm_content") || "",

    utm_term:
    params.get("utm_term") || ""

  }

}




// =====================================
// SALVAR EVENTO
// =====================================

export async function salvarEvento(


  
  evento,
  dados = {}

){
let sessionId =
localStorage.getItem("sessionId")

if(!sessionId){

  sessionId =
  crypto.randomUUID()

  localStorage.setItem(
    "sessionId",
    sessionId
  )

}
 

  // evita duplicação

const eventosUnicos = [
  "pagina_abriu",

  "scroll_profundo",

  "ficou_40_segundos",

  "telefone_digitado",

  "clicou_whatsapp",

  "gerou_proposta",

  "clicou_simular"

]

if(

  eventosUnicos.includes(evento)
  &&
  eventoJaDisparou(evento)

){

  return

}

marcarEvento(evento)

  if(!podeSalvarEvento()){

  return

}
  
  try{

    const uid = getAuth(app).currentUser?.uid || null;

    await addDoc(

      collection(
        db,
        "eventos"
      ),

      {

        evento,

        ...dados,

        score: leadScore,

        sessionId,

        userId: uid,

        url:
        window.location.href,

        userAgent:
        navigator.userAgent,

        larguraTela:
        window.innerWidth,

        alturaTela:
        window.innerHeight,

        ...pegarUTM(),

        criadoEm:
        serverTimestamp()

      }

    )

    console.log(
      "🔥 Evento salvo:",
      evento
    )

  }

  catch(error){

    console.error(
      "Erro analytics:",
      error
    )

  }

}

// =====================================
// DEBOUNCE
// =====================================

export function debounce(func, delay = 500){

  let timeout

  return (...args) => {

    clearTimeout(timeout)

    timeout = setTimeout(() => {

      func(...args)

    }, delay)

  }

}

// =====================================
// SANITIZAÇÃO
// =====================================

export function sanitizarTexto(

  texto,
  limite = 120

){

  if(!texto) return ""

  return texto

    .toString()

    // remove tags HTML
    .replace(/<[^>]*>?/gm, "")

    // remove scripts suspeitos
    .replace(/javascript:/gi, "")

    // remove caracteres perigosos
    .replace(/[<>]/g, "")

    // remove excesso espaços
    .replace(/\s+/g, " ")

    // corta tamanho máximo
    .trim()

    .slice(0, limite)

}

// =====================================
// RATE LIMIT
// =====================================

let eventosRecentes = []

export function podeSalvarEvento(){

  const agora = Date.now()

  // mantém apenas últimos 60s
  eventosRecentes = eventosRecentes.filter(

    tempo => agora - tempo < 60000

  )

  // limite
  if(eventosRecentes.length >= 20){

    console.warn(
      "⚠️ Rate limit atingido"
    )

    return false

  }

  eventosRecentes.push(agora)

  return true

}

