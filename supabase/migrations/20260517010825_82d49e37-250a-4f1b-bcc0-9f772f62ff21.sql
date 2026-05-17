
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.rachas
  ADD COLUMN IF NOT EXISTS whatsapp_group_link text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Super admin reads backups" ON storage.objects;
CREATE POLICY "Super admin reads backups"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'backups' AND public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin manages backups" ON storage.objects;
CREATE POLICY "Super admin manages backups"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'backups' AND public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (bucket_id = 'backups' AND public.has_role(auth.uid(), 'super_admin'));
