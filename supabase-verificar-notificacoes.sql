-- ============================================================
-- YOP DEVS - Verificação e ajustes para Notificações no Supabase
-- Execute no SQL Editor do Supabase (Database > SQL Editor)
-- ============================================================

-- 1) ESTRUTURA: Verificar se a tabela notifications existe e tem as colunas necessárias
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'notifications'
ORDER BY ordinal_position;

-- 2) CRIAR TABELA (só se ainda não existir) - pode ignorar se já tiver a tabela
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'NEWS',
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2b) Adicionar colunas que possam faltar (não dá erro se já existirem)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'NEWS',
  ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 3) HABILITAR RLS na tabela notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4) POLÍTICAS RLS para notifications
-- Usuário pode ver apenas as notificações destinadas a ele (user_id = seu id)
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Qualquer usuário autenticado pode inserir uma notificação (ex.: "Tenho interesse" para o dono do projeto)
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Usuário pode atualizar apenas as suas notificações (ex.: marcar como lida)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5) ÍNDICES para performance (opcional)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

-- 6) VERIFICAR: listar políticas atuais da tabela notifications
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'notifications';

-- 7) TESTE RÁPIDO (opcional): inserir uma notificação de teste e depois apagar
-- INSERT INTO public.notifications (user_id, type, content)
-- VALUES (auth.uid(), 'INTEREST', 'Teste de notificação INTEREST');
-- SELECT * FROM public.notifications WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1;
-- DELETE FROM public.notifications WHERE content = 'Teste de notificação INTEREST';
