# 🤖 AI COMPANION via WhatsApp - Guía Completa de Implementación

## 📋 Resumen del Sistema

El AI Companion es un "amigo/amiga virtual" que conversa con tus usuarios a través de WhatsApp usando GPT-4.

**Características:**
- ✅ Conversaciones naturales en español mexicano
- ✅ Memoria a largo plazo (recuerda temas importantes)
- ✅ Recordatorios personalizados de medicinas
- ✅ Personalidades configurables (Lupita, Don Roberto)
- ✅ Detección emocional y seguimiento de temas
- ✅ 100% via WhatsApp (ya familiar para usuarios)

---

## 🏗️ Arquitectura

```
WhatsApp Usuario
    ↓
Meta WhatsApp Business API
    ↓
Webhook: /api/whatsapp-incoming-ai
    ↓
AI Companion Engine (/api/ai-companion-engine.js)
    ├── Obtiene perfil y memoria del usuario (Supabase)
    ├── Construye prompt con contexto
    ├── Llama a OpenAI GPT-4
    ├── Guarda conversación
    └── Actualiza memoria
    ↓
Respuesta vía WhatsApp
```

---

## 📦 Archivos Creados

### **1. Base de Datos:**
- `scripts/create-ai-companion-tables.sql` - Schema completo de las tablas

### **2. Backend:**
- `api/ai-companion-engine.js` - Motor del AI Companion
- `api/whatsapp-incoming-ai.js` - Webhook para mensajes de WhatsApp

### **3. Tablas en Supabase:**
- `ai_companions` - Perfiles de usuarios y configuración
- `companion_memory` - Memoria a largo plazo (temas importantes)
- `companion_conversations` - Historial completo de conversaciones
- `medication_reminders` - Recordatorios de medicamentos
- `medication_adherence` - Tracking de adherencia

---

## 🚀 Pasos de Implementación

### **PASO 1: Configurar Base de Datos (5 minutos)**

1. Ve a: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Abre el archivo `scripts/create-ai-companion-tables.sql`
3. Copia todo el contenido
4. Pégalo en el SQL Editor de Supabase
5. Click en **"Run"**
6. Verifica que las 5 tablas se crearon exitosamente

---

### **PASO 2: Obtener API Key de OpenAI (10 minutos)**

1. **Crear cuenta:**
   - Ve a: https://platform.openai.com/signup
   - Registrate con tu email

2. **Agregar método de pago:**
   - Ve a: https://platform.openai.com/account/billing
   - Agrega tarjeta de crédito
   - **Establece límite mensual:** $50 (recomendado para empezar)

3. **Crear API Key:**
   - Ve a: https://platform.openai.com/api-keys
   - Click en **"Create new secret key"**
   - Nombre: `SaludCompartida AI Companion`
   - Copia la key (empieza con `sk-proj-...`)
   - ⚠️ **GUÁRDALA**, no la volverás a ver

---

### **PASO 3: Configurar Variables de Entorno en Vercel (5 minutos)**

1. Ve a: https://vercel.com/fabiolafrancoc-lab/mvp-saludcompartida
2. **Settings** → **Environment Variables**
3. Agrega estas 2 nuevas variables:

```
Variable 1:
Key: OPENAI_API_KEY
Value: sk-proj-TU_KEY_AQUI
Environments: ✅ Production, ✅ Preview, ✅ Development

Variable 2:
Key: WHATSAPP_VERIFY_TOKEN
Value: salud_compartida_2026_secure (o cualquier string aleatorio)
Environments: ✅ Production, ✅ Preview, ✅ Development
```

4. Click **"Save"** en cada una

---

### **PASO 4: Configurar Webhook en Meta (10 minutos)**

1. **Ve a tu App en Meta:**
   - https://developers.facebook.com/apps/1899819963949818/whatsapp-business/wa-settings/

2. **Configurar Webhook:**
   - Sección: **"Webhook"**
   - Click en **"Edit"**
   
   **Callback URL:**
   ```
   https://saludcompartida.app/api/whatsapp-incoming-ai
   ```
   
   **Verify Token:**
   ```
   salud_compartida_2026_secure
   ```
   (El mismo que pusiste en Vercel)

3. **Suscribirse a eventos:**
   - Click en **"Manage"** junto a tu webhook
   - Suscríbete a:
     - ✅ `messages` - Mensajes entrantes
     - ✅ `message_status` - Estado de mensajes (opcional)
   
4. Click **"Save"**

5. Meta verificará el webhook (debe mostrar ✅ verificado)

---

### **PASO 5: Desplegar Código (2 minutos)**

Ya pusheamos los archivos en pasos anteriores, pero por si acaso:

```bash
cd /Users/fabiolafranco/Desktop/MVP-SaludCompartida

# Verificar cambios
git status

# Agregar archivos nuevos
git add api/ai-companion-engine.js
git add api/whatsapp-incoming-ai.js
git add scripts/create-ai-companion-tables.sql
git add AI_COMPANION_SETUP.md

# Commit
git commit -m "feat: Add AI Companion system via WhatsApp with GPT-4"

# Push
git push origin main
```

Vercel desplegará automáticamente en 1-2 minutos.

---

## ✅ Verificación del Sistema

### **Test 1: Verificar Webhook**

1. En Meta Developers → WhatsApp → API Setup
2. Debajo de "Webhook" debería decir: **"✅ Verified"**

Si no:
- Verifica que la URL sea correcta
- Verifica que `WHATSAPP_VERIFY_TOKEN` esté en Vercel
- Revisa logs en Vercel → Deployments → Functions

---

### **Test 2: Enviar Mensaje de Prueba**

1. Agrega tu número como usuario de prueba:
   - Meta Developers → WhatsApp → API Setup
   - **"Send and receive messages"**
   - **"To"** → Selecciona tu número de prueba

2. Envía un mensaje desde tu WhatsApp personal a tu número de negocio:
   ```
   Hola
   ```

3. Deberías recibir respuesta de Lupita:
   ```
   ¡Hola [Tu Nombre]! 👋 Soy Lupita, tu nueva amiga en SaludCompartida.

   Estoy aquí para conversar contigo cuando quieras, recordarte tus medicinas, y ser tu compañía.

   ¿Me cuentas un poco de ti? ¿Cómo te gusta que te llame?
   ```

---

### **Test 3: Verificar Logs**

1. Ve a Vercel → **Deployments** → Click en el último
2. Ve a **"Functions"**
3. Busca `whatsapp-incoming-ai`
4. Deberías ver logs como:
   ```
   📨 Mensaje de WhatsApp recibido: {...}
   🤖 Processing message from +1234567890: "Hola"
   ✅ AI Response generated
   ✅ Respuesta enviada al usuario
   ```

---

## 💰 Costos Estimados

### **Por Usuario Activo/Mes:**

```
OpenAI GPT-4:
- 10 conversaciones/día × 30 días = 300 conversaciones/mes
- ~200 palabras por conversación
- $0.01 por 750 palabras
- Total: $0.80/mes

WhatsApp (Meta):
- Incluido gratis hasta 1,000 conversaciones/mes
- Después: $0.005 por mensaje
- 600 mensajes/mes = $3.00/mes (después del free tier)

Supabase:
- Storage: ~50MB/usuario
- Incluido en tier gratis hasta 500MB

TOTAL: $0.80-$3.80/mes por usuario activo
```

### **Proyección con 100 Usuarios:**
- **Costo:** $80-380/mes
- **Precio sugerido:** $20/mes por usuario
- **Revenue:** $2,000/mes
- **Profit:** $1,620-1,920/mes
- **Margen:** 81-96%

---

## 🎯 Personalidades Disponibles

### **Lupita (Cariñosa)**
- Mujer de 60 años
- Maternal, empática, paciente
- Usa expresiones mexicanas: "mija", "corazón"
- Escucha más que habla (70/30)
- Ideal para: Mujeres, adultos mayores que necesitan compañía

### **Don Roberto (Sabio)**
- Hombre de 72 años
- Reflexivo, respetuoso, comparte sabiduría
- Habla con respeto: "joven", "usted"
- A veces comparte anécdotas
- Ideal para: Adultos mayores que valoran el respeto y la sabiduría

---

## 🔧 Personalización

### **Agregar Nueva Personalidad:**

Edita `api/ai-companion-engine.js`:

```javascript
COMPANION_PERSONALITIES.maria_energica = {
  name: 'María',
  age: 45,
  gender: 'female',
  systemPrompt: `Eres María, una mujer mexicana de 45 años, energética y positiva.

  PERSONALIDAD:
  - Optimista, motivadora, enérgica
  - Ayudas a las personas a ver el lado positivo
  - Usas emojis con moderación 😊
  - Hablas de forma entusiasta pero no exagerada
  
  ... (resto del prompt)`,
  
  greeting: (userName) => `¡Hola ${userName}! ¿Cómo estás hoy? 😊`,
};
```

---

## 📊 Dashboard de Monitoreo (Opcional - Futuro)

Puedes crear un dashboard para ver:
- Número de conversaciones/día
- Usuarios más activos
- Temas más mencionados
- Adherencia a medicamentos
- Sentiment analysis

**Herramienta sugerida:** Metabase conectado a Supabase

---

## 🆘 Solución de Problemas

### **Problema: No recibo mensajes del AI**

1. Verifica webhook en Meta (debe estar verificado)
2. Checa logs en Vercel → Functions
3. Verifica que `OPENAI_API_KEY` esté configurada
4. Asegúrate de que las tablas existan en Supabase

### **Problema: "OpenAI API request failed"**

1. Verifica que la API Key sea válida
2. Checa que tengas créditos en OpenAI
3. Revisa límites de rate limit (tier free: 3 requests/min)

### **Problema: "Template not found" en WhatsApp**

Este error solo aplica si usas templates para envío masivo.
Para conversaciones 1-1, los mensajes de texto son gratis.

### **Problema: AI responde cosas extrañas**

1. Ajusta el `temperature` en `callOpenAI()` (línea 285)
2. Revisa el sistema prompt - puede necesitar más restricciones
3. Checa la memoria - puede tener datos incorrectos

---

## 📈 Próximos Pasos (Roadmap)

### **Fase 1 - MVP (Actual):**
- ✅ Conversaciones básicas con GPT-4
- ✅ Memoria simple
- ✅ Recordatorios de medicina

### **Fase 2 - Mejoras (1 mes):**
- Detección de emergencias médicas
- Reportes semanales para familiares en USA
- Análisis de sentiment más sofisticado
- Dashboard de métricas

### **Fase 3 - Avanzado (3 meses):**
- Voz (llamadas con AI)
- Múltiples idiomas (inglés para migrantes)
- Integración con calendario de citas médicas
- Sugerencias proactivas basadas en patrones

---

## 🎉 ¡Listo!

Tu AI Companion ya debería estar funcionando.

**Para probar:**
1. Envía "Hola" desde tu WhatsApp al número de negocio
2. Conversa con Lupita
3. Prueba mencionar temas diferentes (familia, salud, hobbies)
4. Vuelve a hablar mañana - debería recordar lo que le contaste

**Feedback bienvenido:** El sistema aprende y mejora con feedback real de usuarios.

---

## 📞 Contacto y Soporte

Si tienes problemas con la implementación:
1. Revisa logs en Vercel
2. Checa la consola de Supabase
3. Verifica el Error Log de OpenAI

**Costo de soporte adicional:** Considera contratar un dev para monitoring en producción.
