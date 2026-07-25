import { createFileRoute } from "@tanstack/react-router";

/**
 * Proxy para a API pública do Deezer.
 * Retorna faixas com preview de 30s (MP3) — grátis e sem OAuth.
 * Rota pública (leitura de metadata musical, sem PII).
 */
interface DeezerTrack {
  id: number | string;
  title: string;
  artist?: { name?: string };
  album?: { cover_medium?: string; cover?: string };
  preview?: string;
  duration?: number;
}

interface DeezerSearchResponse {
  data?: DeezerTrack[];
}

export const Route = createFileRoute("/api/public/deezer-search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
        if (!q) {
          return Response.json({ tracks: [] });
        }
        try {
          const res = await fetch(
            `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=25`,
            { headers: { Accept: "application/json" } },
          );
          if (!res.ok) {
            return Response.json({ tracks: [], error: `deezer_${res.status}` }, { status: 200 });
          }
          const data = (await res.json()) as DeezerSearchResponse;
          const tracks = (data?.data ?? [])
            .filter((t) => t?.preview)
            .map((t) => ({
              id: String(t.id),
              title: t.title,
              artist: t.artist?.name ?? "",
              cover: t.album?.cover_medium ?? t.album?.cover ?? null,
              preview: t.preview as string, // mp3 30s
              duration: t.duration ?? 30,
            }));
          return Response.json(
            { tracks },
            { headers: { "Cache-Control": "public, max-age=300" } },
          );
        } catch (e) {
          const message = e instanceof Error ? e.message : "fetch_failed";
          return Response.json({ tracks: [], error: message }, { status: 200 });
        }
      },
    },
  },
});
