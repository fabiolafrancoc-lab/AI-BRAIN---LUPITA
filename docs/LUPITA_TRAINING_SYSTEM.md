# Sistema de Entrenamiento para Lupita

## Metodología: Role-playing + Few-shot Learning

### Paso 1: Grabar conversaciones ejemplo

Tú actúas como Lupita, alguien más (o tú misma) actúa como usuario.

**Ejemplo de conversación ideal:**

```
[Usuario] *contesta teléfono* ¿Bueno?

[Lupita] Hola, ¿hablo con María? Le habla Lupita de Salud Compartida.

[Usuario] Sí, soy yo.

[Lupita] Qué bueno. ¿Cómo le ha ido con el servicio de salud?

[Usuario] Pues mire, es que mi mamá en México...

[Lupita] *PAUSA - deja hablar*

[Usuario] ...está enferma y no sé cómo ayudarla desde aquí.

[Lupita] Ay, te entiendo. ¿Cómo se llama tu mamá?

[Usuario] Se llama Rosa.

[Lupita] Rosa. ¿Y qué es lo que más te preocupa de su situación?

[Usuario] Que está sola y ya no puede...

[Lupita] *PAUSA - escucha*

[Usuario] ...ir al doctor sola.

[Lupita] Entiendo. ¿Tiene alguien cerca que pueda acompañarla?
```

### Paso 2: Transcribir y analizar

Después de cada conversación de prueba:
1. Escucha la grabación en VAPI Dashboard
2. Identifica qué funcionó y qué no
3. Anota frases que suenan naturales
4. Anota momentos donde interrumpió mal

### Paso 3: Agregar al System Prompt

En VAPI, agrega una sección "EJEMPLOS" al final del System Prompt:

```
EJEMPLOS DE CONVERSACIONES REALES:

Ejemplo 1 - Llamada de bienvenida:
Usuario: "¿Bueno?"
Lupita: "Hola, ¿hablo con María? Le habla Lupita de Salud Compartida."
Usuario: "Sí, soy yo."
Lupita: "Qué bueno. ¿Cómo le ha ido?"
[NOTA: Frases cortas, deja hablar]

Ejemplo 2 - Usuario comparte problema:
Usuario: "Mi mamá está enferma en México"
Lupita: "Ay, te entiendo. ¿Cómo se llama tu mamá?"
[NOTA: Valida emoción + pregunta específica, NO asume]

Ejemplo 3 - Usuario interrumpe:
Lupita: "Le explico que nuestro servicio inclu—"
Usuario: "Disculpe, es que tengo prisa"
Lupita: "Claro, cuéntame rápido cómo te puedo ayudar."
[NOTA: Para de hablar INMEDIATAMENTE cuando interrumpen]
```

### Paso 4: Iterar

1. **Sesión 1:** Haz 5 llamadas de prueba actuando como Lupita
2. **Analiza:** ¿Qué frases funcionaron mejor?
3. **Actualiza:** Modifica el System Prompt con esos aprendizajes
4. **Sesión 2:** Prueba de nuevo, repite el ciclo

### Herramienta de training (código):

Podemos crear un endpoint especial para "modo entrenamiento":

```javascript
// api/train-lupita.js
// Llamada especial que:
// 1. Graba la conversación
// 2. Te da feedback después
// 3. Sugiere mejoras al prompt
```

---

## Proceso recomendado (próximos 7 días):

**Día 1-2:** 
- Actualizar prompt con las correcciones de arriba
- Hacer 10 llamadas de prueba con diferentes escenarios

**Día 3-4:**
- Analizar grabaciones en VAPI
- Identificar patrones que funcionan
- Anotar frases mexicanas naturales que usaste

**Día 5-6:**
- Actualizar System Prompt con ejemplos reales
- Probar de nuevo con tu mamá u otros adultos mayores
- Ajustar interruptionThreshold si todavía habla mucho

**Día 7:**
- Versión final del prompt
- Grabar 3 conversaciones modelo perfectas
- Esas se convierten en el "gold standard"

---

## ¿Quieres que cree el sistema de training automático?

Puedo crear:
1. Un endpoint que graba y analiza automáticamente
2. Un dashboard donde ves todas las conversaciones
3. Sugerencias automáticas de mejoras al prompt
4. Sistema de "scoring" de qué tan bien habló Lupita

¿Te interesa?
