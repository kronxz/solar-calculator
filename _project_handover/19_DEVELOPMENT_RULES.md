# DEVELOPMENT RULES — SOLAR CALCULATOR MF SOLUÇÕES

# OBJETIVO

Definir regras obrigatórias para qualquer IA ou desenvolvedor continuar o projeto sem destruir arquitetura, contexto ou estabilidade.

---

# REGRA PRINCIPAL

NUNCA modificar algo sem antes:

1. analisar impacto
2. entender dependências
3. validar arquitetura existente
4. criar backup

---

# PROIBIDO

## NÃO PODE:

- apagar arquivos antigos
- substituir lógica funcionando
- simplificar código crítico
- remover integrações Firebase
- quebrar mobile
- alterar nomes de collections Firestore sem autorização
- alterar estrutura do CRM sem mapear dependências
- remover scripts utilitários
- alterar IDs HTML críticos
- criar múltiplas inicializações Firebase

---

# FIREBASE RULES

## O projeto usa:

- Firebase modular SDK
- Firestore
- Analytics
- Storage
- autenticação futura

## Regras:

- manter singleton Firebase
- não duplicar initializeApp()
- não criar múltiplos getAnalytics()
- preservar config DEV
- preservar config PROD comentada

---

# HTML RULES

## index.html

É o núcleo principal.

NUNCA:
- reescrever inteiro
- reorganizar drasticamente
- remover seções antigas sem mapear dependências

SEMPRE:
- alterar incrementalmente
- preservar IDs existentes
- validar scripts vinculados

---

# CRM RULES

## O CRM depende de:

- Firestore
- leads
- eventos
- analytics
- login
- localStorage legado

NUNCA:
- quebrar leitura de leads
- alterar estrutura sem migração
- apagar fallback localStorage

---

# MOBILE RULES

Prioridade absoluta:
mobile-first.

Toda alteração deve:
- funcionar em celular
- funcionar em telas pequenas
- manter performance

---

# PERFORMANCE RULES

Evitar:
- bibliotecas pesadas
- frameworks desnecessários
- renderizações excessivas
- múltiplos listeners duplicados

Priorizar:
- JavaScript puro
- lazy loading
- modularização progressiva

---

# BACKUP RULES

Antes de alterações críticas:

Criar:
- .bak
- pasta BACKUP_DATA
- snapshots

Nunca alterar arquivos críticos sem rollback possível.

---

# COMMENT RULES

Toda alteração importante deve possuir:

```js
// [MF-AI-CHANGE]
// descrição
// data