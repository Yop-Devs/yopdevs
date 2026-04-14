-- Permite apagar utilizador em auth.users mesmo com notificações que referenciam from_user_id.
-- Executar no Supabase → SQL Editor se a exclusão de conta falhar por FK.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_from_user_id_fkey;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_from_user_id_fkey
  FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
