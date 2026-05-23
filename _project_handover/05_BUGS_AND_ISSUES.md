# BUGS E PENDÊNCIAS DO PROJETO

# STATUS GERAL

Projeto parcialmente funcional.

Sistema principal roda em:
http://localhost:3000

---

# BUGS JÁ IDENTIFICADOS

## CRM

### POSSÍVEIS PROBLEMAS

- leads às vezes não aparecem
- gráficos podem zerar
- sincronização parcial
- alguns dados podem não atualizar

---

## PDF

### PROBLEMAS IDENTIFICADOS

- PDF às vezes gera incompleto
- campos podem vir vazios
- dados do CRM podem não sincronizar

---

## FIREBASE

### RISCOS

- não alterar produção diretamente
- risco de sobrescrever config
- risco de quebrar autenticação

---

## LOGIN

### VALIDAR

- autenticação funcionando
- sessão persistindo
- acesso ao CRM correto

---

## ANALYTICS

### VALIDAR

- eventos enviados
- origem dos leads
- rastreamento campanhas

---

# PARTES MAIS SENSÍVEIS

## firebase/config.js

Arquivo extremamente crítico.

Pode quebrar:
- login
- firestore
- analytics
- storage

---

## index.html

Arquivo gigante.

Qualquer alteração grande:
- criar backup antes

---

## crm/index.html

CRM ainda em evolução.

Mudanças devem ser cuidadosas.

---

# REGRAS IMPORTANTES

- sempre criar .bak
- validar localhost
- nunca alterar produção diretamente
- testar DEV primeiro

---

# PENDÊNCIAS IMPORTANTES

## PRIORIDADE ALTA

- validar fluxo completo lead
- validar CRM
- validar PDF
- validar analytics

---

## PRIORIDADE MÉDIA

- melhorar UI mobile
- melhorar responsividade
- melhorar performance

---

## PRIORIDADE FUTURA

- IA WhatsApp
- automação
- multiagente
- follow-up automático

---

# OBSERVAÇÃO

Projeto em crescimento contínuo.

Objetivo:
transformar em sistema comercial solar profissional completo.