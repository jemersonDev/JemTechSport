import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Camera,
  LogOut,
  Loader2,
  Shield,
  User as UserIcon,
  Wallet,
  ShieldCheck,
  ChevronRight,
  Trophy,
  Star,
  FileText,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  SKILL_LABEL,
  POSITION_LABEL,
  POSITION_EMOJI,
  type SkillLevel,
  type PositionExt,
} from "@/hooks/useRacha";
import { PlayerStats } from "@/components/PlayerStats";
import { TrofeusShelf } from "@/components/TrofeusShelf";
import { AthleteCard } from "@/components/AthleteCard";
import { processAvatar } from "@/utils/processAvatar";
import { FounderBadge } from "@/components/FounderBadge";

export const Route = createFileRoute("/perfil")({
  component: PerfilPage,
  head: () => ({
    meta: [
      { title: "Meu perfil — JemTech Sports" },
      { name: "description", content: "Edite sua foto, posição preferida e nível de habilidade." },
    ],
  }),
});

const POSITIONS: PositionExt[] = ["goleiro", "zagueiro", "meia", "atacante"];
const SKILLS: SkillLevel[] = ["iniciante", "casual", "bom_de_bola", "craque"];

function PerfilPage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [position, setPosition] = useState<PositionExt>("meia");
  const [skill, setSkill] = useState<SkillLevel>("casual");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cardStats, setCardStats] = useState({ partidas: 0, gols: 0, assistencias: 0, craque: 0, bagre: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [partidasRes, golsRes, craqueRes, bagreRes] = await Promise.all([
        supabase
          .from("racha_membros")
          .select("racha_id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase.from("gols_jogador").select("gols, assistencias").eq("user_id", user.id),
        supabase
          .from("partida_votos")
          .select("partida_id", { count: "exact", head: true })
          .eq("craque_target", user.id),
        supabase
          .from("partida_votos")
          .select("partida_id", { count: "exact", head: true })
          .eq("bagre_target", user.id),
      ]);
      const arr = (golsRes.data ?? []) as { gols: number; assistencias: number }[];
      setCardStats({
        partidas: partidasRes.count ?? 0,
        gols: arr.reduce((s, g) => s + (g.gols ?? 0), 0),
        assistencias: arr.reduce((s, g) => s + (g.assistencias ?? 0), 0),
        craque: craqueRes.count ?? 0,
        bagre: bagreRes.count ?? 0,
      });
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["super_admin", "moderador"])
        .limit(1);
      setIsAdmin((data ?? []).length > 0);
    })();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  // Carrega perfil completo (incluindo novos campos)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, preferred_position_ext, skill_level, bio")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setBio((data as { bio: string | null }).bio ?? "");
        setPosition((data.preferred_position_ext as PositionExt) ?? "meia");
        setSkill((data.skill_level as SkillLevel) ?? "casual");
      } else if (profile) {
        setDisplayName(profile.display_name);
      }
    })();
  }, [user, profile]);

  const handleSave = async () => {
    if (!user) return;
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast.error("Coloca um nome aí, craque");
      return;
    }
    if (trimmed.length > 40) {
      toast.error("Nome muito longo (máx 40)");
      return;
    }
    setSaving(true);
    // mantém preferred_position legado coerente: goleiro -> goleiro, resto -> linha
    const legacyPos = position === "goleiro" ? "goleiro" : "linha";
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: trimmed,
        preferred_position: legacyPos,
        preferred_position_ext: position,
        skill_level: skill,
        bio: bio.trim() || null,
      } as never)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    await refreshProfile();
    toast.success("Perfil atualizado!");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 10MB)");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo precisa ser uma imagem");
      return;
    }

    setUploading(true);
    try {
      // 1) Recorta quadrado e redimensiona
      const processed = await processAvatar(file, 768);

      // 2) Tenta remover fundo (modelo no browser)
      let finalBlob: Blob = processed;
      let ext = "jpg";
      let contentType = "image/jpeg";
      try {
        toast.info("Removendo fundo da foto…");
        const { removeBackgroundFromBlob } = await import("@/utils/removeBackground");
        finalBlob = await removeBackgroundFromBlob(processed);
        ext = "png";
        contentType = "image/png";
      } catch (bgErr) {
        console.warn("bg removal falhou, usando original", bgErr);
      }

      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, finalBlob, {
          upsert: true,
          cacheControl: "3600",
          contentType,
        });

      if (uploadError) {
        toast.error("Erro no upload: " + uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("user_id", user.id);

      if (updateError) {
        toast.error("Erro ao salvar foto: " + updateError.message);
        return;
      }
      await refreshProfile();
      toast.success("Foto atualizada!");
    } catch (err) {
      toast.error("Erro ao processar imagem");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="font-semibold">Meu perfil</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        <FounderBadge />
        <Card className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-primary/20">
                <AvatarImage
                  src={profile.avatar_url ?? undefined}
                  alt={displayName}
                  className="object-cover"
                />
                <AvatarFallback className="text-3xl">{initials || "??"}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition disabled:opacity-50"
                aria-label="Trocar foto"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Toque na câmera pra trocar a foto.
              <br />
              <span className="text-[10px] opacity-80">
                💡 Dica: pra um card profissional estilo FIFA, use uma foto com
                fundo claro/neutro ou já com fundo transparente (PNG).
              </span>
            </p>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <UserIcon className="w-4 h-4" /> Como te chamam?
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Seu apelido na bola"
              maxLength={40}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" /> Bio
            </label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ex: Meia-atacante | Destro | Foco no gol 🚀"
              maxLength={150}
              rows={3}
            />
            <p className="text-[10px] text-muted-foreground text-right">{bio.length}/150</p>
          </div>


          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" /> Posição preferida
            </label>
            <div className="grid grid-cols-2 gap-2">
              {POSITIONS.map((p) => {
                const active = position === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPosition(p)}
                    className={`h-12 rounded-xl border-2 font-bold text-sm transition flex items-center justify-center gap-1.5 ${
                      active
                        ? "border-neon bg-neon/15 text-neon shadow-neon"
                        : "border-border bg-background text-muted-foreground hover:border-neon/40"
                    }`}
                  >
                    <span>{POSITION_EMOJI[p]}</span>
                    {POSITION_LABEL[p]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nível de habilidade */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Nível de habilidade
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SKILLS.map((s, idx) => {
                const active = skill === s;
                const stars = idx + 1;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSkill(s)}
                    className={`h-14 rounded-xl border-2 font-bold text-sm transition flex flex-col items-center justify-center gap-0.5 ${
                      active
                        ? "border-neon bg-neon/15 text-neon shadow-neon"
                        : "border-border bg-background text-muted-foreground hover:border-neon/40"
                    }`}
                  >
                    <div className="flex gap-0.5">
                      {Array.from({ length: stars }).map((_, i) => (
                        <Star
                          key={i}
                          className="w-3 h-3"
                          fill={active ? "currentColor" : "none"}
                          strokeWidth={2.5}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] uppercase tracking-wider">{SKILL_LABEL[s]}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Usado pelo sorteio para equilibrar os times automaticamente.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-11">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar perfil"}
          </Button>
        </Card>

        {/* Estatísticas pessoais */}
        {user && (
          <div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">
              Minhas estatísticas
            </h2>
            <PlayerStats userId={user.id} />
          </div>
        )}

        {/* Card de Atleta estilo FIFA */}
        {user && (
          <Card className="p-4">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3 text-center">
              Meu card
            </h2>
            <AthleteCard
              displayName={displayName || profile.display_name}
              avatarUrl={profile.avatar_url}
              position={position}
              skillLevel={skill}
              partidas={cardStats.partidas}
              gols={cardStats.gols}
              assistencias={cardStats.assistencias}
              craqueWins={cardStats.craque}
              bagreWins={cardStats.bagre}
            />
          </Card>
        )}

        {/* Prateleira de troféus */}
        {user && (
          <Card className="overflow-hidden p-0">
            <TrofeusShelf userId={user.id} />
          </Card>
        )}

        <Card className="p-2 divide-y divide-border">
          <Link
            to="/organizador"
            className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-md transition"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Painel do organizador</div>
              <div className="text-[11px] text-muted-foreground">
                Pagamentos recebidos e saldo
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-md transition"
            >
              <div className="w-9 h-9 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Painel de moderação</div>
                <div className="text-[11px] text-muted-foreground">
                  Denúncias e administradores
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          )}
        </Card>

        <Card className="p-4">
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" /> Sair da conta
          </Button>
        </Card>
      </main>
    </div>
  );
}
