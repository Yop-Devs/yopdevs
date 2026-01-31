-- RLS na tabela messages: permitir apagar mensagens da conversa (quem envia ou quem recebe pode apagar)
-- Necessário para: no chat, "Apagar selecionadas" e "Apagar todas".

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Permite apagar mensagem se o usuário é o remetente ou o destinatário
DROP POLICY IF EXISTS "Users can delete own conversation messages" ON messages;
CREATE POLICY "Users can delete own conversation messages"
  ON messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
