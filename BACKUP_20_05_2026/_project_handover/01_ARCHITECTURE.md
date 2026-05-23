# ARQUITETURA DO PROJETO

## VISÃO GERAL

Projeto Solar Calculator MF Soluções.

Sistema híbrido:
- landing page
- calculadora solar
- CRM
- Firebase
- PDF
- analytics
- automações futuras

---

# ESTRUTURA PRINCIPAL

## index.html

Página principal.

Responsável por:
- landing page
- captura de leads
- cálculo solar
- integração Firebase
- integração analytics
- geração PDF
- tracking

---

## login.html

Tela de login do CRM.

Responsável por:
- autenticação
- entrada administrativa

---

## crm/index.html

Painel CRM.

Responsável por:
- visualizar leads
- gestão comercial
- eventos
- métricas
- pipeline

---

# FIREBASE

## firebase/config.js

Arquivo MAIS IMPORTANTE do Firebase.

Responsável por:
- inicializar Firebase
- conectar Firestore
- conectar Storage
- conectar Analytics
- alternar DEV/PROD

Atualmente conectado:
mf-solucoes-dev

---

## firebase/firestore.rules

Regras de segurança Firestore.

Protege:
- leads
- eventos
- crm_config

---

# JAVASCRIPT

## js/

Contém:
- cálculos
- analytics
- kits
- viabilidade
- gráficos
- WhatsApp
- automações

---

# SERVER

## server.js

Servidor local Node.js.

Usado para:
- localhost
- testes locais

---

# FLUXO PRINCIPAL

Usuário:
Landing →
Calculadora →
Lead →
Firestore →
CRM →
PDF →
WhatsApp →
Analytics

---

# REGRA CRÍTICA

NUNCA alterar:
- arquitetura inteira
- fluxo principal
- produção diretamente

Sempre testar DEV primeiro.