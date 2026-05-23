# 🚀 Guia de Deploy - CRM MF Soluções

## 📋 Pré-requisitos

1. **Firebase CLI instalado**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login no Firebase**
   ```bash
   firebase login
   ```

3. **Conta Firebase com projeto configurado**
   - Projeto DEV: `mf-solucoes-dev`
   - Projeto PROD: `mf-solucoes-crm`

## 🔥 Deploy Firebase (Produção)

### 1. Deploy das Rules e Indexes

```bash
# Deploy das rules do Firestore
firebase deploy --only firestore:rules

# Deploy dos indexes do Firestore
firebase deploy --only firestore:indexes

# Deploy do Storage
firebase deploy --only storage:rules
```

### 2. Deploy do CRM (Hosting)

```bash
# Build e deploy completo
firebase deploy --only hosting

# Ou deploy completo (rules + indexes + hosting)
firebase deploy
```

### 3. URLs após deploy

- **DEV**: https://mf-solucoes-dev.web.app
- **PROD**: https://mf-solucoes-crm.web.app

## 🐙 GitHub Pages (Calculadora/Landing)

### 1. Configurar repositório

```bash
# Garantir que está no branch main
git checkout main

# Push das alterações
git push origin main
```

### 2. Ativar GitHub Pages

1. Ir em: `Settings > Pages`
2. Source: `Deploy from a branch`
3. Branch: `main` / `/ (root)`
4. Save

### 3. URL após deploy

- **Landing**: https://kronxz.github.io/mf-solucoes-eletricas/

## 🔄 Fluxo de Trabalho Recomendado

### Desenvolvimento
```bash
# 1. Trabalhar localmente
# 2. Testar no localhost:3000
npm run dev

# 3. Commitar alterações
git add .
git commit -m "Descrição das mudanças"
git push origin main
```

### Produção
```bash
# 1. Testar tudo localmente primeiro
# 2. Deploy no Firebase DEV
firebase deploy

# 3. Validar no DEV
# 4. Se tudo OK, deploy no PROD
firebase use production
firebase deploy
```

## ⚙️ Configuração Firebase

### Projetos

```bash
# Listar projetos
firebase projects:list

# Usar projeto DEV
firebase use mf-solucoes-dev

# Usar projeto PROD
firebase use mf-solucoes-crm
```

### Environment Variables

Criar arquivo `.env` na raiz:

```env
FIREBASE_PROJECT_ID=mf-solucoes-dev
FIREBASE_AUTH_DOMAIN=mf-solucoes-dev.firebaseapp.com
```

## 🛡️ Segurança

### Regras Firestore (Resumo)

- **Leads**: Apenas usuário autenticado pode criar/ler seus próprios leads
- **Eventos**: Usuários autenticados podem criar eventos, apenas leitura
- **Timeline**: Apenas criação e leitura para usuários auth
- **Admin**: Usuários com `admin: true` no token têm acesso total

### Storage

- **Backups**: Apenas admin
- **Propostas**: Usuários autenticados
- **Anexos**: Usuários autenticados (max 10MB)
- **Público**: Leitura liberada, escrita apenas admin

## 📊 Monitoramento

### Logs Firebase

```bash
# Ver logs em tempo real
firebase hosting:channel:logs

# Ver logs do Firestore
firebase firestore:logs
```

### Analytics

- Dashboard do Firebase Console
- Google Analytics integrado
- Eventos customizados no Firestore

## 🐛 Troubleshooting

### Erro: Permission denied

1. Verificar se usuário está autenticado
2. Verificar rules do Firestore
3. Verificar se lead pertence ao usuário (userId)

### Erro: Index not found

1. Rodar `firebase deploy --only firestore:indexes`
2. Aguardar criação dos indexes (pode levar alguns minutos)

### Erro: Hosting deploy failed

1. Verificar se pasta `crm-dev` existe
2. Verificar permissões do Firebase
3. Tentar `firebase login --reauth`

## 📝 Checklist Pré-Deploy

- [ ] Testar login/auth
- [ ] Testar criação de leads
- [ ] Testar kanban (mover cards)
- [ ] Testar modal de detalhes
- [ ] Testar proposta PDF
- [ ] Testar mobile
- [ ] Testar backup
- [ ] Validar rules de segurança
- [ ] Validar indexes do Firestore
- [ ] Testar em produção DEV
- [ ] Backup dos dados atuais

## 🎯 Próximos Passos

1. **Deploy inicial**: Seguir guia acima
2. **Testes**: Validar todas as funcionalidades
3. **Monitoramento**: Acompanhar logs e erros
4. **Otimização**: Ajustar performance conforme necessário
5. **Features**: Implementar novas funcionalidades apenas após estabilizar

---

**Importante**: Sempre testar no ambiente DEV antes de deploy em PROD!