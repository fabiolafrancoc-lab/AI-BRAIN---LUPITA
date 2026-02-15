# 🎙️ SISTEMA DE LLAMADAS DE VOZ CON AI

## 🤖 ¿QUÉ ES ESTO?

Tu sistema ahora puede **llamar automáticamente** a los usuarios con AI que suena 100% humano.

Cada uno de tus 10 agentes tiene:
- ✅ Voz única y realista
- ✅ Personalidad propia
- ✅ Conversaciones naturales
- ✅ Puede interrumpir y ser interrumpido (como humano)

---

## 📋 SETUP (15 minutos):

### 1️⃣ Crear Cuenta en Vapi.ai

1. Ve a: https://vapi.ai
2. Sign up (gratis para probar)
3. Ve a Dashboard → API Keys
4. Copia tu **API Key**

### 2️⃣ Agregar en Vercel

1. Ve a: https://vercel.com/fabiolafrancoc-lab/saludcompartida/settings/environment-variables
2. Agrega:

```
Name: VAPI_API_KEY
Value: (tu key de vapi.ai)
Apply to: Production, Preview, Development
```

### 3️⃣ Redeploy

1. Redeploy en Vercel
2. Espera 1-2 minutos
3. ¡Listo!

---

## 🎯 CÓMO FUNCIONA:

### Flujo Automático:

```
Usuario se registra
    ↓
Sistema asigna AI Agent (ej: María, 32 años)
    ↓
Sistema programa llamada para 10 minutos después
    ↓
Vapi.ai llama al usuario con voz de María
    ↓
Conversación natural:
  María: "¡Hola Juan! Soy María de Salud Compartida. 
          ¿Cómo estás? Te llamo para darte la bienvenida..."
  
  Usuario: "Hola, sí, gracias"
  
  María: "Perfecto. ¿Recibiste tu código de acceso?"
  
  Usuario: "Sí, lo tengo"
  
  María: "¡Excelente! Recuerda que puedes llamar 24/7
          cuando necesites un doctor. ¿Tienes alguna duda?"
          
  Usuario: "¿Cuánto cuesta?"
  
  María: "Son $500 pesos al mes para toda tu familia.
          ¿Te parece bien?"
    ↓
Llamada se graba automáticamente
    ↓
Sistema guarda resumen y siguiente acción
```

---

## 🎭 TIPOS DE LLAMADAS:

### 1. **Bienvenida (Welcome Call)**
- Se activa: 10 minutos después del registro
- Duración: 3-5 minutos
- Objetivo: Confirmar registro, explicar servicio

```javascript
await fetch('/api/make-voice-call', {
  method: 'POST',
  body: JSON.stringify({
    phone: '+525512345678',
    agentId: 'agent_005', // María
    callReason: 'welcome',
    userName: 'Juan'
  })
});
```

### 2. **Seguimiento (Follow-up)**
- Se activa: 3 días después del registro
- Duración: 2-3 minutos
- Objetivo: Preguntar si tiene dudas, recordar servicio

### 3. **Retención (Retention)**
- Se activa: Si no usa el servicio en 7 días
- Duración: 5-7 minutos
- Objetivo: Entender por qué no lo usa, ofrecer ayuda

### 4. **Confirmación de Cita**
- Se activa: 24 horas antes de cita
- Duración: 1-2 minutos
- Objetivo: Confirmar asistencia

---

## 💰 COSTOS:

**Vapi.ai Pricing:**
- **Plan Gratis:** 10 minutos de prueba
- **Pay-as-you-go:** $0.05 - $0.10 por minuto
- **Pro Plan:** $200/mes - 2,000 minutos incluidos

**Ejemplo con 100 usuarios/mes:**
- 100 llamadas × 4 minutos = 400 minutos
- 400 minutos × $0.08 = **$32 USD/mes**

---

## 🎙️ VOCES DISPONIBLES:

Cada agente usa voces de **ElevenLabs** (las más realistas):

### Mujeres Mayores:
- **Lupita (65):** Voz maternal, cálida
- **Carmen (62):** Voz firme pero afectuosa
- **Rosa (68):** Voz suave, empática
- **Teresa (64):** Voz clara, organizada

### Mujeres Jóvenes:
- **María (32):** Voz energética, moderna
- **Ana (35):** Voz paciente, educativa
- **Sofía (29):** Voz dinámica, alegre
- **Daniela (38):** Voz profesional, clara

### Hombres Mayores:
- **Don Roberto (67):** Voz grave, autoritativa
- **Don Miguel (63):** Voz amigable, cercana

---

## 🔧 PROGRAMAR LLAMADAS AUTOMÁTICAS:

### Crear tabla en Supabase:

```sql
CREATE TABLE scheduled_voice_calls (
  id BIGSERIAL PRIMARY KEY,
  user_phone VARCHAR(20) NOT NULL,
  agent_id VARCHAR(20) NOT NULL,
  call_reason VARCHAR(50) NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  vapi_call_id VARCHAR(100),
  duration_seconds INTEGER,
  transcript TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_scheduled_calls_pending 
ON scheduled_voice_calls(scheduled_for, status)
WHERE status = 'pending';
```

### Programar llamada después del registro:

```javascript
// En tu código de registro exitoso:
await supabase
  .from('scheduled_voice_calls')
  .insert({
    user_phone: familyPhone,
    agent_id: assignedAgent.id,
    call_reason: 'welcome',
    scheduled_for: new Date(Date.now() + 10 * 60 * 1000) // 10 minutos
  });
```

### Cron job que ejecuta llamadas (Vercel Cron):

```javascript
// api/cron/make-scheduled-calls.js
export default async function handler(req, res) {
  // Obtener llamadas pendientes
  const { data: calls } = await supabase
    .from('scheduled_voice_calls')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(10);

  // Hacer cada llamada
  for (const call of calls) {
    await fetch('/api/make-voice-call', {
      method: 'POST',
      body: JSON.stringify({
        phone: call.user_phone,
        agentId: call.agent_id,
        callReason: call.call_reason
      })
    });
    
    // Marcar como "calling"
    await supabase
      .from('scheduled_voice_calls')
      .update({ status: 'calling' })
      .eq('id', call.id);
  }
  
  res.json({ success: true, calls_made: calls.length });
}
```

---

## 📊 TRACKING Y ANÁLISIS:

### Dashboard de Vapi.ai muestra:
- ✅ Duración de cada llamada
- ✅ Transcripción completa
- ✅ Sentimiento del usuario
- ✅ Si contestó o no
- ✅ Costos por llamada

### Webhooks de Vapi (recibir resultados):

```javascript
// api/webhooks/vapi-status.js
export default async function handler(req, res) {
  const { callId, status, transcript, duration } = req.body;
  
  // Guardar en Supabase
  await supabase
    .from('scheduled_voice_calls')
    .update({
      status: status,
      vapi_call_id: callId,
      transcript: transcript,
      duration_seconds: duration,
      completed_at: new Date().toISOString()
    })
    .eq('vapi_call_id', callId);
    
  res.json({ success: true });
}
```

---

## 🎯 ROADMAP:

### Fase 1: Setup Inicial (HOY)
- [ ] Crear cuenta Vapi.ai
- [ ] Agregar API key en Vercel
- [ ] Probar llamada manual

### Fase 2: Automatización (Esta semana)
- [ ] Crear tabla scheduled_voice_calls
- [ ] Programar llamadas post-registro
- [ ] Setup cron job

### Fase 3: Optimización (Próxima semana)
- [ ] Análisis de transcripciones
- [ ] A/B testing de scripts
- [ ] Optimizar timing de llamadas

---

## 🚀 PRÓXIMOS PASOS:

1. **Ve a https://vapi.ai** y crea tu cuenta
2. **Dame tu API key** y lo configuro en Vercel
3. **Hacemos una llamada de prueba** para que escuches cómo suena
4. **Si te gusta**, automatizamos todo el flujo

¿Listo para empezar? 🎙️
