-- Perfil como cartão social: título, badge de disponibilidade, "o que está buscando"
-- Execute no SQL Editor do Supabase
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability_badge text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS looking_for text;

-- availability_badge: AVAILABLE | SEEKING_PARTNER | OPEN_OPPORTUNITIES
-- looking_for: ENTRAR_PROJETO | CRIANDO_PRECISO_TIME | NETWORKING | EXPLORANDO
