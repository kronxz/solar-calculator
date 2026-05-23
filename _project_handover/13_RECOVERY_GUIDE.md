# GUIA DE RECUPERAÇÃO DO PROJETO

# OBJETIVO

Este arquivo permite recuperar e continuar o projeto rapidamente em:

- outra conta IA
- outro computador
- outro ambiente
- outro modelo
- outro dia

---

# ESTRUTURA PRINCIPAL

Projeto principal:

solar-calculator-main

---

# COMO ABRIR O PROJETO

Abrir pasta:

solar-calculator-main

no:
- VSCode
- Antigravity IDE

---

# COMO RODAR LOCALMENTE

Abrir terminal na pasta do projeto.

Executar:

node server.js

ou:

Visualizar_Projeto.bat

---

# ENDEREÇO LOCAL

http://localhost:3000

---

# FIREBASE

## PRODUÇÃO

Projeto:
mf-solucoes-crm

NÃO alterar diretamente.

---

## DESENVOLVIMENTO

Projeto:
mf-solucoes-dev

Usado para:
- testes
- validações
- desenvolvimento seguro

---

# ARQUIVOS MAIS IMPORTANTES

## firebase/config.js

Controla:
- Firebase
- Firestore
- Analytics
- Storage

---

## firebase/firestore.rules

Regras segurança Firestore.

---

## index.html

Landing page principal.

Arquivo crítico.

---

## crm/index.html

Painel CRM.

---

## login.html

Sistema login.

---

# ANTES DE ALTERAR QUALQUER COISA

## REGRAS

- criar backup .bak
- validar localhost
- testar DEV primeiro
- nunca quebrar produção

---

# FLUXO PRINCIPAL DO SISTEMA

Landing →
Lead →
Firestore →
CRM →
PDF →
WhatsApp →
Analytics

---

# PRIORIDADE ATUAL

Validar:
- login
- leads
- firestore
- CRM
- PDF
- analytics

---

# CASO O PROJETO QUEBRE

## VERIFICAR

### 1

firebase/config.js

---

### 2

server.js

---

### 3

console do navegador

F12 →
Console

---

### 4

Firestore DEV conectado

Projeto correto:
mf-solucoes-dev

---

# CASO MUDE DE IA

Sempre enviar:

- pasta _project_handover
- screenshots
- contexto atual
- arquivos Firebase
- status atual

---

# IMPORTANTE

Projeto extremamente importante para operação da empresa.

Mudanças devem ser incrementais e seguras.

Objetivo final:
transformar o sistema em plataforma comercial solar profissional completa.