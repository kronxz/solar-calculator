# ✅ Checklist de Validação - CRM MF Soluções

## 🎯 Objetivo

Validar todas as funcionalidades do CRM antes do deploy em produção.

---

## 📋 Checklist Completo

### 1. Autenticação e Login

- [ ] **Login funciona**
  - Acessar `crm-dev/login.html`
  - Inserir email e senha válidos
  - Verificar redirecionamento para dashboard
  - Verificar sessão persistente (recarregar página)

- [ ] **Logout funciona**
  - Clicar em "Sair" no user bar
  - Verificar redirecionamento para login
  - Verificar limpeza de sessão

- [ ] **Proteção de rotas**
  - Tentar acessar CRM sem login
  - Verificar redirecionamento automático para login

---

### 2. Dashboard

- [ ] **Métricas carregam**
  - Verificar cards: Em Negociação, Fechado, Leads, Conversão
  - Verificar valores corretos
  - Verificar formatação BRL

- [ ] **Estatísticas de tráfego**
  - Verificar visitas (Hoje, Semana, Mês, Ano)
  - Verificar leads por período
  - Verificar atualização em tempo real

- [ ] **Analytics mini grid**
  - Verificar eventos: Visitas, Scroll, Simulações, Telefones, Propostas, WhatsApp
  - Verificar contadores corretos

- [ ] **Central Rápida**
  - Verificar links externos (Site, Calculadora, Instagram, NFS-e, WhatsApp)
  - Verificar abertura em nova aba

- [ ] **Dados da empresa**
  - Verificar informações: Empresa, Endereço, PIX, Contato
  - Verificar formatação correta

- [ ] **Notepad interno**
  - Escrever texto no campo de anotações
  - Verificar salvamento automático
  - Verificar persistência (recarregar página)
  - Verificar sincronização Firestore

---

### 3. Kanban (Leads)

- [ ] **Cards carregam**
  - Verificar 4 colunas: Novos, Contato, Proposta, Fechado
  - Verificar cards em cada coluna
  - Verificar informações do card (nome, telefone, UTM, kit, valor)

- [ ] **Drag and Drop**
  - Arrastar card entre colunas
  - Verificar atualização de status
  - Verificar toast de confirmação
  - Verificar persistência no Firestore

- [ ] **Botões de ação**
  - **Avançar**: Move para próxima coluna
  - **Voltar**: Move para coluna anterior
  - **Excluir**: Move para lixeira (confirmar)
  - **Detalhes**: Abre modal de detalhes
  - **Proposta**: Abre proposta PDF
  - **Fechar Venda**: Marca como fechada
  - **WhatsApp**: Abre conversa com mensagem pronta

- [ ] **Filtros e busca**
  - **Busca por nome/telefone**: Digitar e verificar filtro
  - **Filtro por status**: Selecionar e verificar filtro
  - **Ordenação**: Testar todas as opções (recente, antigo, valor, score, nome)

- [ ] **Mobile tabs**
  - Verificar tabs mobile (Novos, Contato, Proposta, Fechado, Todos)
  - Clicar em cada tab e verificar exibição

- [ ] **Novo lead manual**
  - Clicar em "➕ Novo Lead"
  - Preencher formulário
  - Verificar criação no Firestore
  - Verificar aparecimento no kanban

---

### 4. Modal de Detalhes

- [ ] **Aba Lead**
  - Verificar informações do cliente (nome, telefone, endereço, etc.)
  - Verificar dados do sistema (potência, placas, inversor, etc.)
  - Verificar kit selecionado e kits disponíveis
  - Verificar timeline de eventos
  - Verificar campo de observações
  - Testar salvamento de observações

- [ ] **Aba Inteligência**
  - Verificar score do lead
  - Verificar nível (Quente/Morno/Frio)
  - Verificar eventos de sessão
  - Verificar sugestão de abordagem

- [ ] **Aba Financiamento**
  - Verificar opções de financiamento
  - Verificar comparação com conta de luz
  - Verificar recomendação

- [ ] **Botão Proposta**
  - Clicar em "📄 Abrir Proposta PDF"
  - Verificar abertura em nova aba
  - Verificar dados preenchidos

---

### 5. Lixeira

- [ ] **Acesso**
  - Clicar em "🗑️ Lixeira"
  - Verificar modal aberto

- [ ] **Listagem**
  - Verificar leads excluídos
  - Verificar informações básicas

- [ ] **Ações**
  - **Restaurar**: Verificar retorno ao kanban
  - **Excluir permanentemente**: Verificar exclusão total (cuidado!)

---

### 6. Visitas

- [ ] **Listagem**
  - Acessar página "👁️ Visitas"
  - Verificar lista de sessões
  - Verificar informações: data, duração, eventos

- [ ] **Detalhes**
  - Verificar eventos de cada sessão
  - Verificar páginas visitadas

---

### 7. Estatísticas

- [ ] **Performance dos Kits**
  - Verificar gráfico de kits mais vendidos
  - Verificar contadores por tipo

- [ ] **Leads por Dia**
  - Verificar gráfico de linha (14 dias)
  - Verificar dados corretos

---

### 8. Analytics

- [ ] **Resumo**
  - Verificar métricas principais
  - Verificar origens de leads
  - Verificar campanhas

- [ ] **Eventos completos**
  - Clicar em "🧠 Ver eventos completos IA"
  - Verificar textarea com eventos brutos
  - Testar botão "📋 Copiar para IA"

---

### 9. Proposta PDF

- [ ] **Geração**
  - Abrir proposta a partir do kanban
  - Verificar carregamento dos dados
  - Verificar layout profissional

- [ ] **Conteúdo**
  - Verificar dados do cliente
  - Verificar kits e valores
  - Verificar financiamentos
  - Verificar gráficos (se houver)

- [ ] **Exportação**
  - Testar impressão (Ctrl+P)
  - Testar salvar como PDF
  - Verificar qualidade

---

### 10. Mobile

- [ ] **Sidebar**
  - Verificar botão hambúrguer
  - Abrir/fechar sidebar
  - Verificar navegação

- [ ] **Kanban**
  - Verificar tabs mobile
  - Verificar navegação entre colunas
  - Verificar cards (legibilidade)

- [ ] **Modal**
  - Verificar abertura de modais
  - Verificar fechamento (botão e backdrop)
  - Verificar scroll

- [ ] **Formulários**
  - Verificar inputs (tamanho, teclado)
  - Verificar botões (tamanho, toque)

---

### 11. Backup

- [ ] **Exportar**
  - Clicar em "⬇ Backup"
  - Verificar download do JSON
  - Verificar conteúdo do arquivo

---

### 12. Status e Conexão

- [ ] **Sync status**
  - Verificar indicador de conexão
  - Testar offline (desconectar internet)
  - Verificar indicador offline
  - Reconectar e verificar retorno

- [ ] **Loading**
  - Verificar tela de carregamento inicial
  - Verificar skeletons durante carregamento
  - Verificar remoção após sync

- [ ] **Toasts**
  - Verificar notificações de sucesso
  - Verificar notificações de erro
  - Verificar notificações de aviso
  - Verificar auto-fechamento

---

### 13. Firebase

- [ ] **Firestore Rules**
  - Verificar permissões de leitura/escrita
  - Testar com usuário não autenticado (deve negar)
  - Testar com usuário autenticado (deve permitir)

- [ ] **Indexes**
  - Verificar se todos os indexes foram criados
  - Testar queries com múltiplos campos
  - Verificar performance

- [ ] **Realtime**
  - Abrir CRM em duas abas
  - Criar/modificar lead em uma aba
  - Verificar atualização automática na outra

---

### 14. Performance

- [ ] **Carregamento inicial**
  - Medir tempo de carregamento
  - Verificar se está aceitável (< 3s)

- [ ] **Navegação**
  - Testar troca de páginas
  - Verificar se está suave

- [ ] **Kanban com muitos leads**
  - Testar com 100+ leads
  - Verificar performance

---

### 15. Erros e Edge Cases

- [ ] **Dados inválidos**
  - Tentar criar lead sem nome
  - Verificar tratamento de erro

- [ ] **Conexão instável**
  - Simular conexão lenta
  - Verificar retry e fallback

- [ ] **Sessão expirada**
  - Esperar sessão expirar
  - Verificar redirecionamento para login

---

## 🚀 Critérios de Aprovação

- [ ] **Todos os itens acima funcionam**
- [ ] **Nenhum erro crítico no console**
- [ ] **Performance aceitável**
- [ ] **Mobile responsivo**
- [ ] **Firebase configurado corretamente**
- [ ] **Backup funcionando**
- [ ] **Dados persistindo no Firestore**

---

## 📝 Notas

- Testar em diferentes navegadores (Chrome, Firefox, Edge)
- Testar em diferentes dispositivos (desktop, tablet, mobile)
- Testar com diferentes velocidades de conexão
- Documentar quaisquer bugs encontrados

---

**Status**: Em validação  
**Última atualização**: 22/05/2026  
**Responsável**: MF Soluções Team