
-- ENUM dos tipos
DO $$ BEGIN
  CREATE TYPE public.notif_tipo AS ENUM ('like','comment','follow','message','payment','racha_join');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                -- destinatário
  actor_id uuid,                        -- quem causou
  tipo public.notif_tipo NOT NULL,
  message text NOT NULL,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_user_unread
  ON public.notificacoes (user_id, read, created_at DESC);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário vê próprias notificações" ON public.notificacoes;
CREATE POLICY "Usuário vê próprias notificações"
  ON public.notificacoes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuário marca como lida" ON public.notificacoes;
CREATE POLICY "Usuário marca como lida"
  ON public.notificacoes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuário deleta próprias notificações" ON public.notificacoes;
CREATE POLICY "Usuário deleta próprias notificações"
  ON public.notificacoes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Helper para inserir notif sem colidir com auto-notify
CREATE OR REPLACE FUNCTION public._notify(
  _user uuid, _actor uuid, _tipo public.notif_tipo, _msg text, _link text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user IS NULL OR _user = _actor THEN RETURN; END IF;
  INSERT INTO public.notificacoes (user_id, actor_id, tipo, message, link)
  VALUES (_user, _actor, _tipo, _msg, _link);
END $$;

-- Trigger: like em post
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid; _actor_name text;
BEGIN
  SELECT user_id INTO _owner FROM public.resenha_posts WHERE id = NEW.post_id;
  SELECT display_name INTO _actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  PERFORM public._notify(_owner, NEW.user_id, 'like',
    COALESCE(_actor_name,'Alguém') || ' curtiu sua resenha 🔥',
    '/resenha');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_like ON public.resenha_likes;
CREATE TRIGGER trg_notify_like AFTER INSERT ON public.resenha_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Trigger: comentário
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid; _actor_name text;
BEGIN
  SELECT user_id INTO _owner FROM public.resenha_posts WHERE id = NEW.post_id;
  SELECT display_name INTO _actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  PERFORM public._notify(_owner, NEW.user_id, 'comment',
    COALESCE(_actor_name,'Alguém') || ' comentou: "' || left(NEW.content, 40) || '"',
    '/resenha');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_comment ON public.resenha_comentarios;
CREATE TRIGGER trg_notify_comment AFTER INSERT ON public.resenha_comentarios
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Trigger: seguir
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor_name text;
BEGIN
  SELECT display_name INTO _actor_name FROM public.profiles WHERE user_id = NEW.follower_id;
  PERFORM public._notify(NEW.followed_id, NEW.follower_id, 'follow',
    COALESCE(_actor_name,'Alguém') || ' começou a te seguir',
    '/atleta/' || NEW.follower_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_follow ON public.resenha_follows;
CREATE TRIGGER trg_notify_follow AFTER INSERT ON public.resenha_follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Trigger: mensagem privada
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ua uuid; _ub uuid; _recipient uuid; _actor_name text;
BEGIN
  SELECT user_a, user_b INTO _ua, _ub FROM public.resenha_conversas WHERE id = NEW.conversa_id;
  _recipient := CASE WHEN NEW.sender_id = _ua THEN _ub ELSE _ua END;
  SELECT display_name INTO _actor_name FROM public.profiles WHERE user_id = NEW.sender_id;
  PERFORM public._notify(_recipient, NEW.sender_id, 'message',
    COALESCE(_actor_name,'Alguém') || ': ' || left(NEW.content, 50),
    '/chat/' || NEW.conversa_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_message ON public.resenha_mensagens;
CREATE TRIGGER trg_notify_message AFTER INSERT ON public.resenha_mensagens
FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- Trigger: pagamento aprovado (avisa organizador)
CREATE OR REPLACE FUNCTION public.notify_on_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor_name text;
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS DISTINCT FROM 'aprovado') THEN
    SELECT display_name INTO _actor_name FROM public.profiles WHERE user_id = NEW.payer_user_id;
    PERFORM public._notify(NEW.organizador_id, NEW.payer_user_id, 'payment',
      COALESCE(_actor_name,'Jogador') || ' pagou R$ ' || to_char(NEW.valor_organizador, 'FM999990D00') || ' ✅',
      '/organizador');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_payment ON public.pagamentos;
CREATE TRIGGER trg_notify_payment AFTER UPDATE ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.notify_on_payment();

-- Trigger: alguém entra no racha (avisa admin)
CREATE OR REPLACE FUNCTION public.notify_on_racha_join()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _admin uuid; _name text; _actor_name text;
BEGIN
  SELECT admin_id, name INTO _admin, _name FROM public.rachas WHERE id = NEW.racha_id;
  IF _admin = NEW.user_id THEN RETURN NEW; END IF;
  SELECT display_name INTO _actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  PERFORM public._notify(_admin, NEW.user_id, 'racha_join',
    COALESCE(_actor_name,'Jogador') || ' entrou no racha ' || COALESCE(_name,''),
    '/rachas');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_racha_join ON public.racha_membros;
CREATE TRIGGER trg_notify_racha_join AFTER INSERT ON public.racha_membros
FOR EACH ROW EXECUTE FUNCTION public.notify_on_racha_join();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
