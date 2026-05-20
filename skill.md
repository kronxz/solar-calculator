SKILL — RECONSTRUÇÃO PROFISSIONAL DO CRM + CALCULADORA SOLAR MF SOLUÇÕES

Esta skill serve para reconstruir o projeto do zero de forma:

escalável
organizada
segura
profissional
compatível com mobile
preparada para tráfego pago
preparada para IA
preparada para automações futuras

Ela também corrige os problemas estruturais que apareceram:

perda de dados mobile
inconsistência de localStorage
conflito entre objetos
salvamento parcial no Firebase
rastreamento UTM instável
duplicação de lógica
funções gigantes
dependência de estado temporário
VISÃO GERAL DO PROJETO

O sistema será dividido em:

SITE
│
├── Landing Page
├── Calculadora Solar
├── Rastreamento UTM
├── Captura de Lead
├── Seleção de Kits
├── WhatsApp
├── Firebase
├── CRM
├── Analytics
├── PDF
├── IA futura
└── Automação futura
OBJETIVO PRINCIPAL

Criar um sistema profissional de captação e fechamento de leads solares onde:

o lead nunca é perdido
os dados sempre persistem
qualquer origem é rastreada
mobile funciona igual desktop
CRM recebe dados completos
kits ficam consistentes
Firebase é a fonte oficial
localStorage é apenas cache auxiliar
REGRA MAIS IMPORTANTE DA SKILL
O FIREBASE É A VERDADE

NUNCA confiar:

apenas em localStorage
apenas em window.*
apenas em variáveis temporárias

Toda ação importante deve:

salvar no Firebase
confirmar sucesso
depois abrir WhatsApp
depois atualizar UI
ESTRUTURA PROFISSIONAL
1. PASTAS
/solar-calculator

/assets
/css
/js
/firebase
/components
/crm
/pdf
/utils
/data
2. JAVASCRIPT SEPARADO

NUNCA deixar tudo no index.html.

Separar:

/js

analytics.js
utm.js
firebase.js
lead.js
kits.js
calc.js
crm.js
whatsapp.js
storage.js
ui.js
pdf.js
validators.js
3. FLUXO PROFISSIONAL DO LEAD
ETAPA 1 — ENTRADA

Lead entra por:

Instagram
Facebook
QR Code
WhatsApp
Google
Direto

UTM é salva:

origem
meio
campanha
bairroQR
sessionId
ETAPA 2 — LEAD BASE

Assim que preencher:

nome
telefone

CRIAR LEAD NO FIREBASE.

NÃO esperar clicar no kit.

ETAPA 3 — LEAD ID

Salvar:

localStorage.setItem(
  "leadAtualId",
  doc.id
)
ETAPA 4 — CALCULADORA

A calculadora:

NÃO cria lead novo
apenas atualiza
ETAPA 5 — KITS

Todos os kits:

window.kitsCalculados

e:

localStorage.kitsCalculados

devem ter exatamente a mesma estrutura.

PADRÃO OFICIAL DOS KITS
{
  sistema,
  kit,
  kwp,
  geracao,
  economia,
  investimento,
  payback,
  inversor,
  overload,
  potenciaPlaca,
  placas
}

NUNCA criar versões diferentes.

REGRA CRÍTICA

NUNCA sobrescrever:

window.kitsCalculados

com objeto parcial.

4. MOBILE FIRST

O sistema inteiro deve ser construído pensando primeiro em:

Instagram Browser
WhatsApp Browser
Safari iPhone
Chrome Android

e só depois desktop.

5. PROBLEMA QUE VOCÊ ENCONTROU

O Instagram browser:

mata memória temporária
perde window.*
perde estados rápidos
troca contexto ao abrir WhatsApp

POR ISSO:

tudo precisa ir pro Firebase antes
6. FLUXO CORRETO DO BOTÃO

ERRADO:

pega kit
abre whatsapp
tenta salvar

CERTO:

pega kit
salva firebase
confirma
espera 700ms
abre whatsapp
7. STORAGE PROFISSIONAL
localStorage

Usar apenas para:

cache
continuidade visual
recuperação
Firebase

Usar para:

CRM
lead oficial
status
kits
analytics
automações
8. CRM PROFISSIONAL

CRM deve possuir:

Lead
Origem
Campanha
Kit
Sistema
Investimento
Economia
KWP
Placas
Status
Temperatura
Pontuação
Última ação
WhatsApp
9. SCORE DO LEAD

Sistema de pontuação:

+10 digitou telefone
+15 simulou
+25 clicou whatsapp
+40 financiamento
+50 proposta
10. TRACKING PROFISSIONAL
Capturar:
utm_source
utm_medium
utm_campaign
fbclid
gclid
sessionId
timestamp
pagina
dispositivo
11. PDF PROFISSIONAL

PDF NÃO deve:

recalcular nada
depender do DOM

PDF deve usar:

apenas Firebase
12. ERROS QUE NUNCA MAIS DEVEM ACONTECER
NÃO fazer:
window.kits = {}

em vários lugares.

NÃO criar:
kitEssencial
kitPremium
kitRecomendado

com estruturas diferentes.

NÃO usar:
window.location.href

antes do Firebase terminar.

NÃO depender de:
window.algumaCoisa

em mobile.

13. STACK IDEAL
FRONT
HTML
CSS
JS puro

(no início)

DATABASE
Firebase Firestore
AUTH
Firebase Auth
HOSTING
GitHub Pages
ou
Firebase Hosting
14. FASES DO PROJETO
FASE 1 — CORE
landing
calculadora
lead
firebase
crm
FASE 2 — COMERCIAL
PDF
analytics
score
funil
automação
FASE 3 — IA
resumo do lead
análise automática
follow-up
argumentos automáticos
classificação de temperatura
FASE 4 — MULTIAGENTE
SDR IA
financeiro IA
suporte IA
pós-venda IA
15. REGRA DE OURO
O SISTEMA PRECISA SER À PROVA DE:
Instagram browser
reload
troca de aba
usuário lento
conexão ruim
mobile
WhatsApp abrindo
perda de foco
16. FILOSOFIA DA RECONSTRUÇÃO

Você NÃO está criando:

uma calculadora

Você está criando:

um sistema de aquisição,
rastreamento,
qualificação
e fechamento de leads solares.
17. O QUE ESTA SKILL DEVE ME AJUDAR A FAZER

Quando eu pedir ajuda:

organizar arquitetura
evitar bugs mobile
evitar duplicação
manter consistência
profissionalizar CRM
aumentar conversão
integrar IA
preparar escala
preparar tráfego pago
estruturar Firebase
estruturar funil
estruturar automações
estruturar analytics

A IA deve:

pensar como arquiteto de sistema
pensar mobile-first
priorizar persistência
evitar gambiarra
evitar duplicação
evitar dependência temporária
manter compatibilidade futura
OBJETIVO FINAL

Transformar a MF Soluções em:

uma máquina profissional de geração,
rastreamento,
qualificação
e fechamento de leads solares.