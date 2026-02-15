-- ============================================
-- LUPITA AI - TABLAS SUPABASE
-- SaludCompartida AI Companion System
-- ============================================

-- ============================================
-- TABLA: lupita_calls
-- Registro de todas las llamadas
-- ============================================

CREATE TABLE IF NOT EXISTS lupita_calls (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  vapi_call_id VARCHAR(255),
  telnyx_call_id VARCHAR(255),
  
  -- Estado
  status VARCHAR(50) DEFAULT 'scheduled',
  -- scheduled, in_progress, completed, failed, cancelled
  
  -- Tiempos
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Contenido
  transcript TEXT,
  summary TEXT,
  recording_url TEXT,
  
  -- Análisis
  sentiment VARCHAR(50),
  -- muy_positivo, positivo, neutral, negativo, muy_negativo
  topics_discussed TEXT[],
  behavioral_codes TEXT[],
  
  -- Seguimiento
  follow_up_needed BOOLEAN DEFAULT FALSE,
  follow_up_reason TEXT,
  follow_up_completed BOOLEAN DEFAULT FALSE,
  next_call_scheduled TIMESTAMPTZ,
  
  -- Errores
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  
  -- Metadata
  companion VARCHAR(50) DEFAULT 'Lupita',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_lupita_calls_user_id ON lupita_calls(user_id);
CREATE INDEX idx_lupita_calls_status ON lupita_calls(status);
CREATE INDEX idx_lupita_calls_scheduled ON lupita_calls(scheduled_for);
CREATE INDEX idx_lupita_calls_vapi ON lupita_calls(vapi_call_id);

-- ============================================
-- TABLA: lupita_insights
-- Insights extraídos de las conversaciones
-- ============================================

CREATE TABLE IF NOT EXISTS lupita_insights (
  id BIGSERIAL PRIMARY KEY,
  call_id BIGINT REFERENCES lupita_calls(id),
  user_id BIGINT NOT NULL,
  
  -- Códigos de comportamiento (los 16 códigos)
  behavioral_codes TEXT[],
  
  -- Estado emocional
  emotional_state VARCHAR(50),
  emotional_intensity INTEGER, -- 1-10
  
  -- Menciones específicas
  health_mentions TEXT[],
  family_mentions TEXT[],
  
  -- Necesidades y acciones
  needs_identified TEXT[],
  action_items TEXT[],
  
  -- Flags importantes
  crisis_detected BOOLEAN DEFAULT FALSE,
  escalation_needed BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_lupita_insights_user ON lupita_insights(user_id);
CREATE INDEX idx_lupita_insights_call ON lupita_insights(call_id);
CREATE INDEX idx_lupita_insights_crisis ON lupita_insights(crisis_detected) WHERE crisis_detected = TRUE;

-- ============================================
-- TABLA: lupita_user_profiles
-- Perfil acumulativo del usuario para Lupita
-- ============================================

CREATE TABLE IF NOT EXISTS lupita_user_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  
  -- Preferencias de comunicación
  preferred_call_time TIME,
  preferred_call_day VARCHAR(20),
  call_frequency_days INTEGER DEFAULT 7,
  
  -- Temas favoritos
  favorite_topics TEXT[],
  topics_to_avoid TEXT[],
  
  -- Personas importantes
  family_members JSONB,
  -- [{ "name": "María", "relation": "hija", "mentioned_count": 5 }]
  
  -- Salud
  health_conditions TEXT[],
  medications TEXT[],
  
  -- Estado general
  overall_sentiment_trend VARCHAR(50),
  loneliness_score INTEGER, -- 1-10
  engagement_score INTEGER, -- 1-10
  
  -- Estadísticas
  total_calls INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  average_call_duration INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX idx_lupita_profiles_user ON lupita_user_profiles(user_id);

-- ============================================
-- TABLA: lupita_call_events
-- Log detallado de eventos (para debugging)
-- ============================================

CREATE TABLE IF NOT EXISTS lupita_call_events (
  id BIGSERIAL PRIMARY KEY,
  call_id BIGINT REFERENCES lupita_calls(id),
  
  -- Evento
  event_type VARCHAR(100) NOT NULL,
  event_source VARCHAR(50), -- vapi, telnyx, system
  event_data JSONB,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_lupita_events_call ON lupita_call_events(call_id);
CREATE INDEX idx_lupita_events_type ON lupita_call_events(event_type);
CREATE INDEX idx_lupita_events_time ON lupita_call_events(created_at);

-- ============================================
-- TABLA: lupita_behavioral_codes
-- Catálogo de los 16 códigos de comportamiento
-- ============================================

CREATE TABLE IF NOT EXISTS lupita_behavioral_codes (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  severity_weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar los 16 códigos
INSERT INTO lupita_behavioral_codes (code, name, description, category) VALUES
  ('SOL', 'Soledad', 'Menciona sentirse solo/a o extrañar a alguien', 'emocional'),
  ('FAM', 'Familia', 'Habla de familiares (hijos, nietos, etc.)', 'social'),
  ('SAL', 'Salud', 'Menciona síntomas o problemas de salud', 'salud'),
  ('EMO', 'Emoción', 'Expresa emociones fuertes (llanto, risa, etc.)', 'emocional'),
  ('REC', 'Recuerdos', 'Comparte memorias del pasado', 'cognitivo'),
  ('PRE', 'Preocupación', 'Expresa preocupación por algo/alguien', 'emocional'),
  ('GRA', 'Gratitud', 'Expresa agradecimiento', 'emocional'),
  ('RUT', 'Rutina', 'Describe actividades diarias', 'conductual'),
  ('COM', 'Comida', 'Habla de comida, cocina, recetas', 'conductual'),
  ('FE', 'Fe', 'Menciona religión, Dios, iglesia', 'espiritual'),
  ('DIN', 'Dinero', 'Preocupaciones económicas', 'económico'),
  ('MIG', 'Migración', 'Habla del familiar en USA', 'social'),
  ('TEC', 'Tecnología', 'Dificultades con celular/internet', 'conductual'),
  ('VEC', 'Vecinos', 'Menciona vecinos o comunidad', 'social'),
  ('MED', 'Medicamentos', 'Habla de medicinas que toma', 'salud'),
  ('SUE', 'Sueño', 'Problemas para dormir o descansar', 'salud')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_lupita_calls_updated_at
  BEFORE UPDATE ON lupita_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lupita_profiles_updated_at
  BEFORE UPDATE ON lupita_user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCIÓN: Actualizar perfil después de llamada
-- ============================================

CREATE OR REPLACE FUNCTION update_user_profile_after_call()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear perfil si no existe
  INSERT INTO lupita_user_profiles (user_id, total_calls, total_minutes)
  VALUES (NEW.user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Actualizar estadísticas
  UPDATE lupita_user_profiles
  SET 
    total_calls = total_calls + 1,
    total_minutes = total_minutes + COALESCE(NEW.duration_seconds / 60, 0),
    average_call_duration = (
      SELECT AVG(duration_seconds)
      FROM lupita_calls
      WHERE user_id = NEW.user_id AND status = 'completed'
    ),
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar perfil
CREATE TRIGGER after_call_completed
  AFTER UPDATE ON lupita_calls
  FOR EACH ROW
  WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
  EXECUTE FUNCTION update_user_profile_after_call();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE lupita_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE lupita_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE lupita_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lupita_call_events ENABLE ROW LEVEL SECURITY;

-- Política: Service role puede todo
CREATE POLICY "Service role full access on lupita_calls"
  ON lupita_calls FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on lupita_insights"
  ON lupita_insights FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on lupita_user_profiles"
  ON lupita_user_profiles FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on lupita_call_events"
  ON lupita_call_events FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE lupita_calls IS 'Registro de todas las llamadas de Lupita';
COMMENT ON TABLE lupita_insights IS 'Insights y análisis extraídos de conversaciones';
COMMENT ON TABLE lupita_user_profiles IS 'Perfil acumulativo de cada usuario';
COMMENT ON TABLE lupita_call_events IS 'Log detallado de eventos para debugging';
COMMENT ON TABLE lupita_behavioral_codes IS 'Catálogo de los 16 códigos de comportamiento';