# Firebase Setup - Kibo

## Passo a passo pra configurar:

### 1. Habilitar Authentication
1. Firebase Console > Authentication > "Começar"
2. Clicar em "Email/Password" 
3. Enable > Salvar

### 2. Criar Firestore Database
1. Firestore Database > "Criar banco de dados"
2. Escolher região (São Paulo - southamerica-east1)
3. Começar em modo teste >下一步
4. (Depois aplicar as regras do arquivo `firestore.rules`)

### 3. Deploy das regras do Firestore
```bash
npm install -g firebase-tools
firebase login
firebase init firestore
# Escolher projeto kibo-b298c
firebase deploy --only firestore:rules
```

## Collections do Firestore:

### `users` - Psicólogos
```json
{
  "name": "Dr. Maria Silva",
  "email": "maria@clinica.com",
  "role": "therapist",
  "createdAt": timestamp
}
```

### `patients` - Pacientes
```json
{
  "name": "Ana Silva",
  "email": "ana@email.com",
  "phone": "(11) 99999-1111",
  "status": "active",
  "riskLevel": "low",
  "condition": "depression",
  "therapistId": "uid_do_psicologo",
  "createdAt": timestamp,
  "lastActive": timestamp
}
```

### `dailyData` - Dados comportamentais
```json
{
  "patientId": "uid_do_paciente",
  "date": "2025-01-15",
  "features": {
    "sleepDuration": 7.5,
    "stepCount": 8000,
    "socialInteractionScore": 75,
    "moodScore": 7,
    ...
  },
  "updatedAt": timestamp
}
```

### `alerts` - Alertas clínicos
```json
{
  "patientId": "uid_do_paciente",
  "therapistId": "uid_do_psicologo",
  "type": "risk_increase",
  "severity": "high",
  "message": "Aumento significativo de risco detectado",
  "recommendation": "Verificar paciente imediatamente",
  "acknowledged": false,
  "createdAt": timestamp
}
```

### `messages` - Mensagens do chat
```json
{
  "sessionId": "chat_session_id",
  "patientId": "uid_do_paciente",
  "role": "user" | "assistant",
  "content": "Estou me sentindo triste",
  "type": "text" | "checkin" | "alert",
  "timestamp": timestamp
}
```

### `checkins` - Respostas de check-in
```json
{
  "patientId": "uid_do_paciente",
  "questions": [...],
  "responses": [...],
  "riskScore": 6,
  "completedAt": timestamp
}
```

## Integração com mindLAMP

O mindLAMP pode enviar dados via webhook pro Firestore:

1. mindLAMP Dashboard > "Export Data"
2. Configure Firebase como destination
3. Dados vão pra `dailyData` collection

## Cloud Functions (futuro)

Pra rodar o ML automaticamente quando chegar dado novo:

```javascript
// functions/index.js
exports.processNewData = functions.firestore
  .document('dailyData/{docId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    // Rodar ML e criar alerta se necessário
  });
```
