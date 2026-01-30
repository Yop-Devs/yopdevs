-- ============================================================
-- YOP DEVS - Verificar triggers que criam notificações ao enviar mensagem
-- Se estão chegando 2 notificações por mensagem, pode ser trigger duplicado
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1) Listar todos os triggers na tabela messages
SELECT 
  tgname AS trigger_name,
  pg_get_triggerdef(t.oid, true) AS definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname = 'messages'
  AND NOT t.tgisinternal;

-- 2) Listar triggers na tabela notifications (se houver)
SELECT 
  tgname AS trigger_name,
  pg_get_triggerdef(t.oid, true) AS definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname = 'notifications'
  AND NOT t.tgisinternal;

-- 3) Se existir um trigger em messages que insere em notifications e estiver duplicando:
--    Remova o trigger duplicado (troque NOME_DO_TRIGGER pelo nome que aparecer acima).
--    Exemplo: DROP TRIGGER IF EXISTS nome_do_trigger ON public.messages;

-- 4) Criar UM ÚNICO trigger que insere notificação para o RECEPTOR da mensagem (não para o remetente):
--    Só descomente e execute se quiser notificar o receptor quando receber mensagem.
--    Se já tiver um trigger que faz isso, não crie outro (evita duplicata).

/*
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, content, is_read)
  VALUES (
    NEW.receiver_id,
    'CHAT',
    'Você recebeu uma nova mensagem.',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();
*/

-- 5) Se houver 2 triggers parecidos em messages, remova um deles:
--    DROP TRIGGER IF EXISTS nome_do_trigger_duplicado ON public.messages;
