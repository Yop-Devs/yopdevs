-- Indicador "Responde rápido" em oportunidades (perfil do dono do projeto)
-- Execute no SQL Editor do Supabase
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quick_responder boolean DEFAULT false;
