-- Notificar seguidores quando alguém posta um novo lance na resenha
CREATE OR REPLACE FUNCTION public.notify_followers_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _actor_name text;
  _follower record;
BEGIN
  SELECT display_name INTO _actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  FOR _follower IN
    SELECT follower_id FROM public.resenha_follows WHERE followed_id = NEW.user_id
  LOOP
    PERFORM public._notify(
      _follower.follower_id,
      NEW.user_id,
      'like',
      COALESCE(_actor_name,'Alguém') || ' postou um novo lance 🎬',
      '/resenha'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_on_post ON public.resenha_posts;
CREATE TRIGGER trg_notify_followers_on_post
AFTER INSERT ON public.resenha_posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_followers_on_post();

-- Notificar seguidores quando alguém entra em um racha (vira membro)
CREATE OR REPLACE FUNCTION public.notify_followers_on_racha_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _actor_name text;
  _racha_name text;
  _follower record;
BEGIN
  SELECT display_name INTO _actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  SELECT name INTO _racha_name FROM public.rachas WHERE id = NEW.racha_id;
  FOR _follower IN
    SELECT follower_id FROM public.resenha_follows WHERE followed_id = NEW.user_id
  LOOP
    PERFORM public._notify(
      _follower.follower_id,
      NEW.user_id,
      'racha_join',
      COALESCE(_actor_name,'Alguém') || ' entrou em um racha: ' || COALESCE(_racha_name,''),
      '/rachas'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_on_racha_join ON public.racha_membros;
CREATE TRIGGER trg_notify_followers_on_racha_join
AFTER INSERT ON public.racha_membros
FOR EACH ROW
EXECUTE FUNCTION public.notify_followers_on_racha_join();