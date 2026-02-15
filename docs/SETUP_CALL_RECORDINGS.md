# 📋 INSTRUCCIONES: Crear Tabla call_recordings en Supabase

## ⚠️ IMPORTANTE: Ejecutar EN ORDEN (5 pasos)

El script se dividió en 5 partes para evitar errores. Ejecuta cada archivo en orden.

---

## Paso 1: Acceder al SQL Editor

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Menú lateral → **SQL Editor**
4. Click en **"New query"**

---

## Paso 2: Ejecutar STEP 1 - Crear Tabla

**Archivo:** `scripts/step1-create-table.sql`

1. Copia TODO el contenido del archivo
2. Pégalo en el SQL Editor
3. Click en **"Run"**
4. Deberías ver: ✅ **"Tabla creada correctamente"**

**Verifica:**
```sql
SELECT COUNT(*) FROM call_recordings;
```
Debe devolver: `0`

---

## Paso 3: Ejecutar STEP 2 - Crear Índices

**Archivo:** `scripts/step2-create-indexes.sql`

1. **New query** (botón verde)
2. Copia el contenido de step2
3. **Run**
4. Deberías ver: ✅ **"Índices creados correctamente"**

---

## Paso 4: Ejecutar STEP 3 - Habilitar RLS

**Archivo:** `scripts/step3-enable-rls.sql`

1. **New query**
2. Copia el contenido de step3
3. **Run**
4. Deberías ver: ✅ **"RLS configurado correctamente"**

---

## Paso 5: Ejecutar STEP 4 - Crear Vistas

**Archivo:** `scripts/step4-create-views.sql`

1. **New query**
2. Copia el contenido de step4
3. **Run**
4. Deberías ver: ✅ **"Vistas creadas correctamente"**

---

## Paso 6: Ejecutar STEP 5 - Crear Trigger

**Archivo:** `scripts/step5-create-trigger.sql`

1. **New query**
2. Copia el contenido de step5
3. **Run**
4. Deberías ver: ✅ **"Trigger creado correctamente"**

---

## ✅ Verificación Final

En el **Table Editor** de Supabase deberías ver:

### Tabla:
- ✅ `call_recordings` (28 columnas)

### Vistas:
- ✅ `best_training_calls`
- ✅ `agent_performance`
- ✅ `most_effective_techniques`

**Query de verificación:**
```sql
-- Debe funcionar sin errores
SELECT 
  COUNT(*) as total_recordings,
  COUNT(*) FILTER (WHERE transcription_status = 'completed') as transcribed,
  COUNT(*) FILTER (WHERE analysis_status = 'completed') as analyzed
FROM call_recordings;
```

Debe devolver: `total_recordings: 0, transcribed: 0, analyzed: 0`

---

## ⏱️ Tiempo total: 5 minutos

---

## 🚨 Si hay algún error en algún paso:

**"relation already exists"**
- ✅ Esto está bien, significa que ya se ejecutó antes
- Continúa con el siguiente paso

**"syntax error at or near..."**
- Asegúrate de copiar TODO el contenido del archivo
- No edites el código al pegarlo

**"permission denied"**
- Verifica que estés usando tu cuenta de admin
- Ve a Project Settings → API → service_role key

---

## 📊 Estructura Final

### call_recordings tiene:
- **Metadata básica**: user_id, agent_id, recording_url, duration, date
- **Transcripción**: status, text, segments (Whisper API)
- **Análisis**: techniques, power_phrases, quality_rating, category (GPT-4)
- **Training**: is_training_example, quality_rating

## Paso 4: Verificar

En el menú lateral, haz clic en **"Table Editor"** y deberías ver:

### Tablas nuevas:
- ✅ `call_recordings` (con todas las columnas)

### Vistas nuevas:
- ✅ `best_training_calls`
- ✅ `agent_performance`
- ✅ `most_effective_techniques`

## ✅ Confirmación

Una vez ejecutado, verifica que la tabla existe:

```sql
-- Ejecuta esta query para confirmar
SELECT COUNT(*) FROM call_recordings;
```

Debería devolver: `0` (tabla vacía pero creada correctamente)

---

## 🚨 Si hay algún error:

### Error: "relation ai_companions does not exist"
**No debería pasar** porque eliminamos la foreign key, pero si pasa:
- Ve a Table Editor
- Confirma que existe la tabla `ai_companions`
- Si no existe, ejecuta primero los scripts anteriores

### Error: "permission denied"
- Asegúrate de estar usando tu cuenta de admin en Supabase
- No uses la clave anon, usa la service_role key

### Error: "syntax error"
- Asegúrate de copiar TODO el contenido del archivo
- No copies solo partes

---

## 📊 Estructura de la tabla

La tabla `call_recordings` contiene:

### Metadata básica:
- `id` (UUID)
- `user_id` (teléfono del usuario)
- `agent_id` (ID del agente)
- `recording_url` (URL del audio)
- `duration_seconds`
- `recording_date`

### Transcripción (Whisper):
- `transcription_status` (pending/processing/completed/failed)
- `transcription_text` (texto completo)
- `transcription_segments` (con timestamps)

### Análisis (GPT-4):
- `analysis_techniques[]` (técnicas del agente)
- `analysis_power_phrases[]` (frases efectivas)
- `analysis_quality_rating` (1-5)
- `analysis_category` (crisis, retention, etc.)

### Training:
- `is_training_example` (boolean)
- `quality_rating` (manual)

---

## 🎯 Siguiente paso después de crear la tabla:

1. ✅ Tabla creada
2. ⏳ Configurar Vercel Blob Storage (para guardar audios)
3. ⏳ Testing del pipeline con primera grabación

---

**¿Algún error al ejecutar? Déjame saber y te ayudo a resolverlo.**
