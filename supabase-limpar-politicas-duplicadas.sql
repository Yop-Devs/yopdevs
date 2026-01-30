-- ============================================================
-- YOP DEVS - Limpar políticas RLS duplicadas em notifications
-- Execute no SQL Editor do Supabase
-- ============================================================
-- Você tem 6 políticas (2 INSERT, 2 SELECT, 2 UPDATE).
-- Este script remove as antigas em português e mantém as que
-- garantem: inserir (Tenho interesse), ler e atualizar (marcar lida).
-- ============================================================

-- Remover políticas duplicadas (mantém as que usamos no app)
DROP POLICY IF EXISTS "Sistema pode criar notificações" ON public.notifications;
DROP POLICY IF EXISTS "Usuários vêem suas próprias notificações" ON public.notifications;
DROP POLICY IF EXISTS "Usuários podem marcar como lidas" ON public.notifications;

-- ============================================================
-- Verificação rápida: listar políticas que sobraram (deve ser 3)
-- ============================================================
SELECT policyname AS politica, cmd AS comando
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'notifications'
ORDER BY cmd;

-- ============================================================
-- Opcional: conferir estrutura da tabela notifications
-- ============================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'notifications'
-- ORDER BY ordinal_position;
