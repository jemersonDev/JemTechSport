import { createFileRoute } from "@tanstack/react-router";

/**
 * Proxy para a API pública do Deezer.
 * Retorna faixas com preview de 30s (MP3) — grátis e sem OAuth.
 * Rota pública (leitura de metadata musical, sem PII).
 */
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
          const data: any = await res.json();
          const tracks = (data?.data ?? [])
            .filter((t: any) => t?.preview)
            .map((t: any) => ({
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
        } catch (e: any) {
          return Response.json({ tracks: [], error: e?.message ?? "fetch_failed" }, { status: 200 });
        }
      },
    },
  },
});
