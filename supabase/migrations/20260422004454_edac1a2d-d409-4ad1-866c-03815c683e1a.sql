-- Drop the broad public SELECT policy and replace with one that
-- still allows public reads (objects are accessed via direct CDN URLs)
-- but does not allow listing arbitrary folders.
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;

-- Public read of individual objects via getPublicUrl works because the
-- bucket is public. We add a SELECT policy that only allows authenticated
-- users to LIST their own folder.
CREATE POLICY "Users can list their own avatar folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );