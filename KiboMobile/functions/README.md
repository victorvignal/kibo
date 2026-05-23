# Kibo Firebase Cloud Functions

## Para fazer deploy das Cloud Functions:

### 1. Instale o Firebase CLI (se ainda não tiver)
```bash
npm install -g firebase-tools
firebase login
```

### 2. No projeto KiboMobile/functions, instale as dependências
```bash
cd functions
npm install
```

### 3. Configure o projeto Firebase
```bash
firebase use kibo-b298c
```

### 4. Configure as variáveis de ambiente (MiniMax API)
```bash
firebase functions:config:set minimax.api_key="seu_api_key_aqui"
firebase functions:config:set minimax.base_url="https://api.minimax.chat/v1"
```

### 5. Faça o deploy
```bash
firebase deploy --only functions
```

## Funções disponíveis

### `kiboChat` (HTTPS Callable)
- **Quando:** Chamado pelo app mobile
- **O que faz:** Gera resposta do Kibo via MiniMax AI (ou fallback local)
- **Custo:** MinMax API (~$0.01/chamada com caching)

### `onCheckinCreate` (Firestore Trigger)
- **Quando:** Novo check-in é criado no Firestore
- **O que faz:** Calcula score de risco e cria alerta se necessário
- **Custo:** Gratuito (dentro do tier do Firebase)

### `weeklySummary` (Scheduled)
- **Quando:** A cada 7 dias
- **O que faz:** Gera resumo semanal e salva no Firestore
- **Custo:** Gratuito (dentro do tier do Firebase)

## Requisitos
- Firebase CLI (`firebase-tools`)
- Plano Firebase Blaze (pay-as-you-go) - necessário para Cloud Functions
- API key do MiniMax (para IA)

## Teste local
```bash
npm run build && firebase emulators:start --only functions
```
