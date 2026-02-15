# 🤖 LUPITA AI

## SaludCompartida AI Companion System

Sistema de acompañamiento por voz para familias en México cuyos seres queridos están en Estados Unidos.

---

## 📋 Descripción

Lupita es una compañera de salud que llama proactivamente a los usuarios en México para:
- Hacerles compañía y reducir la soledad
- Monitorear su bienestar emocional
- Recordarles sobre servicios de salud disponibles
- Crear conexión humana a través de conversaciones naturales

---

## 🏗️ Arquitectura
```
┌─────────────────────────────────────────────────────────────┐
│                    MVP-SaludCompartida                      │
│              (Registro, Pago, Dashboard)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ Trigger: nuevo usuario
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      LUPITA-AI                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐               │
│   │ VAPI    │    │ Eleven  │    │ TELNYX  │               │
│   │ (AI)    │◄──►│ Labs    │◄──►│ (Tel)   │               │
│   └────┬────┘    └─────────┘    └────┬────┘               │
│        │                              │                     │
│        ▼                              ▼                     │
│   ┌─────────┐                   ┌─────────┐               │
│   │ AWS S3  │                   │ Usuario │               │
│   │ (Audio) │                   │ México  │               │
│   └────┬────┘                   └─────────┘               │
│        │                                                    │
│        ▼                                                    │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐               │
│   │Supabase │◄──►│Weaviate │◄──►│ Insights│               │
│   │ (Data)  │    │(Vectors)│    │(Análisis│               │
│   └─────────┘    └─────────┘    └─────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Instalación

### 1. Clonar repositorio
```bash
git clone https://github.com/fabiolafrancoc-lab/AI-BRAIN---LUPITA.git
cd AI-BRAIN---LUPITA
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

### 4. Crear tablas en Supabase

- Ve a Supabase Dashboard → SQL Editor
- Copia y ejecuta el contenido de `sql/lupita-tables.sql`

### 5. Iniciar servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

---

## ⚙️ Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL de tu proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key (no anon) |
| `VAPI_API_KEY` | API key de VAPI |
| `VAPI_ASSISTANT_ID` | ID del assistant Lupita |
| `ELEVENLABS_API_KEY` | API key de ElevenLabs |
| `ELEVENLABS_VOICE_ID` | ID de la voz de Lupita |
| `TELNYX_API_KEY` | API key de Telnyx |
| `TELNYX_PHONE_NUMBER` | Número MX (+52...) |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `S3_BUCKET_LEGAL` | Bucket para grabaciones legales |
| `S3_BUCKET_ACTIVE` | Bucket para procesamiento |
| `WEAVIATE_URL` | URL del cluster Weaviate |
| `WEAVIATE_API_KEY` | API key de Weaviate |

---

## 📡 Webhooks

### Supabase (nuevo usuario)
```
POST /webhooks/supabase/new-user
```

### VAPI (eventos de llamada)
```
POST /webhooks/vapi
```

### Telnyx (eventos de telefonía)
```
POST /webhooks/telnyx
```

---

## 🔌 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Info del servidor |
| GET | `/health` | Health check de servicios |
| GET | `/api/stats` | Estadísticas de llamadas |
| GET | `/api/calls` | Lista llamadas programadas |
| GET | `/api/context/:userId` | Contexto de un usuario |
| POST | `/api/test-call` | Llamada de prueba (dev only) |

---

## 📁 Estructura del Proyecto
```
AI-BRAIN---LUPITA/
├── src/
│   ├── index.js              # Servidor principal
│   ├── config/
│   │   ├── supabase.js       # Cliente Supabase
│   │   ├── vapi.js           # Cliente VAPI
│   │   ├── elevenlabs.js     # Cliente ElevenLabs
│   │   ├── telnyx.js         # Cliente Telnyx
│   │   ├── aws.js            # Cliente AWS S3
│   │   └── weaviate.js       # Cliente Weaviate
│   ├── assistants/
│   │   └── lupita.js         # Personalidad + prompts
│   ├── services/
│   │   ├── call-scheduler.js # Programador de llamadas
│   │   ├── outbound-call.js  # Gestión de llamadas
│   │   └── context-builder.js# Constructor de contexto
│   └── webhooks/
│       ├── supabase-trigger.js
│       ├── vapi-events.js
│       └── telnyx-events.js
├── sql/
│   └── lupita-tables.sql     # Tablas para Supabase
├── .env.example
├── package.json
└── README.md
```

---

## 🧠 Los 16 Códigos de Comportamiento

| Código | Nombre | Descripción |
|--------|--------|-------------|
| SOL | Soledad | Menciona sentirse solo/a |
| FAM | Familia | Habla de familiares |
| SAL | Salud | Menciona problemas de salud |
| EMO | Emoción | Expresa emociones fuertes |
| REC | Recuerdos | Comparte memorias |
| PRE | Preocupación | Expresa preocupación |
| GRA | Gratitud | Expresa agradecimiento |
| RUT | Rutina | Describe actividades diarias |
| COM | Comida | Habla de cocina/recetas |
| FE | Fe | Menciona religión |
| DIN | Dinero | Preocupaciones económicas |
| MIG | Migración | Habla del familiar en USA |
| TEC | Tecnología | Dificultades tecnológicas |
| VEC | Vecinos | Menciona comunidad |
| MED | Medicamentos | Habla de medicinas |
| SUE | Sueño | Problemas de sueño |

---

## 🔒 Privacidad y Datos

### Tres capas de almacenamiento:

1. **AWS S3 Legal** — Grabaciones originales (1 año, cumplimiento LFPDPPP)
2. **Supabase** — Datos estructurados del usuario
3. **Weaviate** — Embeddings anonimizados para ML

---

## 🧪 Testing
```bash
# Ejecutar tests
npm test

# Test de llamada (solo desarrollo)
curl -X POST http://localhost:3000/api/test-call \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "phone": "+521234567890"}'
```

---

## 📊 Monitoreo

- **Health check:** `GET /health`
- **Estadísticas:** `GET /api/stats`
- **Logs:** Console output + Sentry (opcional)

---

## 🚢 Deploy

Recomendado: **Railway** o **AWS Lambda**
```bash
# Railway
railway login
railway init
railway up
```

---

## 👩‍💻 Autora

**Fabiola Franco** — CEO & Founder, SaludCompartida

---

## 📄 Licencia

Privado — SaludCompartida © 2026
```

3. **Guarda** (`Cmd + S`)

---

## ✅ ¡PROYECTO COMPLETO!

### Resumen de archivos creados:
```
AI-BRAIN---LUPITA/
├── .env.example ✅
├── README.md ✅
├── package.json (ya existía)
├── src/
│   ├── index.js ✅
│   ├── config/
│   │   ├── supabase.js ✅
│   │   ├── vapi.js ✅
│   │   ├── elevenlabs.js ✅
│   │   ├── telnyx.js ✅
│   │   ├── aws.js ✅
│   │   └── weaviate.js ✅
│   ├── assistants/
│   │   └── lupita.js ✅
│   ├── services/
│   │   ├── call-scheduler.js ✅
│   │   ├── outbound-call.js ✅
│   │   └── context-builder.js ✅
│   └── webhooks/
│       ├── supabase-trigger.js ✅
│       ├── vapi-events.js ✅
│       └── telnyx-events.js ✅
└── sql/
    └── lupita-tables.sql ✅