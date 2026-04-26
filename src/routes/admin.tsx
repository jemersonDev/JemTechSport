import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  UserPlus,
  X,
  DollarSign,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin — JemTech Sports" },
      { name: "description", content: "Painel de moderação." },
    ],
  }),
});

type Denuncia = {
  id: string;
  post_id: string;
  user_id: string;
  reason: string;
  created_at: string;
  reporter_name?: string;
  post_caption?: string | null;
  post_user_id?: string;
  post_video_url?: string;
  post_is_hidden?: boolean;
};

type AdminUser = {
  id: string;
  user_id: string;
  role: "super_admin" | "moderador";
  display_name?: string;
};

type SaldoOrganizador = {
  id: string;
  organizador_id: string;
  total_devido_plataforma: number;
  total_recebido_plataforma: number;
  display_name?: string;
};

function AdminPage() {
  // Painel de moderação JemTech Sports
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [saldos, setSaldos] = useState<SaldoOrganizador[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  // Verificar se é admin
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (data ?? []).map((r) => r.role);
      const adminFlag = roles.includes("super_admin") || roles.includes("moderador");
      setIsAdmin(adminFlag);
      setIsSuper(roles.includes("super_admin"));
    })();
  }, [user]);

  const loadAll = useCallback(async () => {
    setLoading(true);

    // Denúncias com info dos posts
    const { data: deps } = await supabase
      .from("resenha_denuncias")
      .select("id,post_id,user_id,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    const list = deps ?? [];
    if (list.length > 0) {
      const reporterIds = Array.from(new Set(list.map((d) => d.user_id)));
      const postIds = Array.from(new Set(list.map((d) => d.post_id)));

      const [{ data: profs }, { data: posts }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id,display_name")
          .in("user_id", reporterIds),
        supabase
          .from("resenha_posts")
          .select("id,caption,user_id,video_url,is_hidden")
          .in("id", postIds),
      ]);

      const profMap = new Map((profs ?? []).map((p) => [p.user_id, p.display_name]));
      const postMap = new Map((posts ?? []).map((p) => [p.id, p]));

      setDenuncias(
        list.map((d) => ({
          ...d,
          reporter_name: profMap.get(d.user_id) ?? "Usuário",
          post_caption: postMap.get(d.post_id)?.caption ?? null,
          post_user_id: postMap.get(d.post_id)?.user_id,
          post_video_url: postMap.get(d.post_id)?.video_url,
          post_is_hidden: postMap.get(d.post_id)?.is_hidden ?? false,
        })),
      );
    } else {
      setDenuncias([]);
    }

    // Lista de admins
    const { data: adms } = await supabase
      .from("user_roles")
      .select("id,user_id,role")
      .in("role", ["super_admin", "moderador"]);
    if (adms && adms.length > 0) {
      const ids = adms.map((a) => a.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,display_name")
        .in("user_id", ids);
      const nm = new Map((profs ?? []).map((p) => [p.user_id, p.display_name]));
      setAdmins(
        adms.map((a) => ({
          id: a.id,
          user_id: a.user_id,
          role: a.role as "super_admin" | "moderador",
          display_name: nm.get(a.user_id) ?? "Usuário",
        })),
      );
    } else {
      setAdmins([]);
    }

    // Saldos de organizadores (quanto devem à plataforma)
    const { data: sds } = await supabase
      .from("organizador_saldo")
      .select("id,organizador_id,total_devido_plataforma,total_recebido_plataforma")
      .order("total_devido_plataforma", { ascending: false });
    if (sds && sds.length > 0) {
      const orgIds = sds.map((s) => s.organizador_id);
      const { data: orgProfs } = await supabase
        .from("profiles")
        .select("user_id,display_name")
        .in("user_id", orgIds);
      const orgMap = new Map((orgProfs ?? []).map((p) => [p.user_id, p.display_name]));
      setSaldos(
        sds.map((s) => ({
          ...s,
          total_devido_plataforma: Number(s.total_devido_plataforma ?? 0),
          total_recebido_plataforma: Number(s.total_recebido_plataforma ?? 0),
          display_name: orgMap.get(s.organizador_id) ?? "Organizador",
        })),
      );
    } else {
      setSaldos([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin, loadAll]);

  const togglePostHidden = async (postId: string, currentHidden: boolean) => {
    const { error } = await supabase
      .from("resenha_posts")
      .update({ is_hidden: !currentHidden })
      .eq("id", postId);
    if (error) toast.error(error.message);
    else {
      toast.success(currentHidden ? "Post liberado" : "Post oculto");
      loadAll();
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Apagar post permanentemente?")) return;
    const { error } = await supabase.from("resenha_posts").delete().eq("id", postId);
    if (error) toast.error(error.message);
    else {
      toast.success("Post apagado");
      loadAll();
    }
  };

  const dismissDenuncia = async (denunciaId: string) => {
    // Apenas remove a denúncia (não dá pra fazer com user_roles porque DELETE não está habilitado).
    // Workaround: marcar como vista é via deletar — mas RLS não tem DELETE. Vamos só recarregar.
    toast.info("Denúncia mantida no histórico (RLS impede apagar).");
    void denunciaId;
    loadAll();
  };

  const marcarRecebido = async (saldo: SaldoOrganizador) => {
    if (!isSuper) return;
    if (!confirm(`Confirmar recebimento de R$ ${saldo.total_devido_plataforma.toFixed(2)} de ${saldo.display_name}?`)) return;
    const { error } = await supabase
      .from("organizador_saldo")
      .update({
        total_recebido_plataforma: saldo.total_recebido_plataforma + saldo.total_devido_plataforma,
        total_devido_plataforma: 0,
      })
      .eq("id", saldo.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Recebimento registrado ✅");
      loadAll();
    }
  };

  const addAdmin = async () => {
    if (!isSuper) return;
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) return;
    // Procurar profile por email é complicado (não temos campo email no profile).
    // Como solução simples: pedir o user_id directamente.
    toast.error(
      "Para adicionar admin, vai à tabela user_roles e insere user_id + role manualmente, ou implementa lookup por email.",
    );
    setNewAdminEmail("");
  };

  const removeAdmin = async (roleId: string) => {
    if (!isSuper) return;
    if (!confirm("Remover admin?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) toast.error(error.message);
    else {
      toast.success("Admin removido");
      loadAll();
    }
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <Shield className="w-10 h-10 text-muted-foreground" />
        <p className="font-bold">Sem permissão</p>
        <p className="text-sm text-muted-foreground text-center">
          Esta página é apenas para administradores da plataforma.
        </p>
        <Link to="/" className="text-sm text-primary underline">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-4 py-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold flex items-center gap-2">
            <Shield className="w-5 h-5" /> Painel admin
          </h1>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {isSuper ? "Super admin" : "Moderador"}
          </Badge>
        </div>
      </header>

      <main className="px-4 py-5 max-w-2xl mx-auto">
        <Tabs defaultValue="denuncias">
          <TabsList className={`grid w-full ${isSuper ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabsTrigger value="denuncias" className="gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Denúncias ({denuncias.length})
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Admins ({admins.length})
            </TabsTrigger>
            {isSuper && (
              <TabsTrigger value="cobranca" className="gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Cobrança ({saldos.filter(s => s.total_devido_plataforma > 0).length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="denuncias" className="space-y-2 mt-4">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto mt-8 text-muted-foreground" />
            ) : denuncias.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Sem denúncias pendentes 🎉
              </Card>
            ) : (
              denuncias.map((d) => (
                <Card key={d.id} className="p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    {d.post_video_url && (
                      <video
                        src={d.post_video_url}
                        className="w-20 h-28 rounded-md object-cover bg-black flex-shrink-0"
                        muted
                        playsInline
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="destructive" className="text-[9px]">
                          {d.reason}
                        </Badge>
                        {d.post_is_hidden && (
                          <Badge variant="outline" className="text-[9px]">
                            Oculto
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Reportado por <strong>{d.reporter_name}</strong>
                      </p>
                      {d.post_caption && (
                        <p className="text-xs line-clamp-2 italic">"{d.post_caption}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => togglePostHidden(d.post_id, d.post_is_hidden ?? false)}
                    >
                      {d.post_is_hidden ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" /> Liberar
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" /> Ocultar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 text-xs"
                      onClick={() => deletePost(d.post_id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Apagar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => dismissDenuncia(d.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="admins" className="space-y-3 mt-4">
            {isSuper && (
              <Card className="p-3 space-y-2">
                <label className="text-xs font-medium flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Adicionar moderador
                </label>
                <div className="flex gap-1.5">
                  <Input
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="text-xs"
                  />
                  <Button size="sm" onClick={addAdmin}>
                    Adicionar
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Para adicionar admins, edita a tabela <code>user_roles</code> diretamente no
                  backend.
                </p>
              </Card>
            )}

            <div className="space-y-1.5">
              {admins.map((a) => (
                <Card key={a.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.display_name}</div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] mt-0.5 ${
                        a.role === "super_admin"
                          ? "border-primary text-primary"
                          : "border-border"
                      }`}
                    >
                      {a.role === "super_admin" ? "Super admin" : "Moderador"}
                    </Badge>
                  </div>
                  {isSuper && a.user_id !== user?.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeAdmin(a.id)}
                      className="text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {isSuper && (
            <TabsContent value="cobranca" className="space-y-2 mt-4">
              {(() => {
                const totalDevido = saldos.reduce((s, x) => s + x.total_devido_plataforma, 0);
                const totalRecebido = saldos.reduce((s, x) => s + x.total_recebido_plataforma, 0);
                return (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <Card className="p-3 text-center bg-amber-500/10 border-amber-500/30">
                      <p className="text-[10px] uppercase tracking-widest text-amber-400 mb-1">A receber</p>
                      <p className="text-xl font-black text-amber-400 tabular-nums">
                        R$ {totalDevido.toFixed(2)}
                      </p>
                    </Card>
                    <Card className="p-3 text-center bg-green-500/10 border-green-500/30">
                      <p className="text-[10px] uppercase tracking-widest text-green-400 mb-1">Já recebido</p>
                      <p className="text-xl font-black text-green-400 tabular-nums">
                        R$ {totalRecebido.toFixed(2)}
                      </p>
                    </Card>
                  </div>
                );
              })()}

              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto mt-8 text-muted-foreground" />
              ) : saldos.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum organizador com saldo ainda.
                </Card>
              ) : (
                saldos.map((s) => (
                  <Card key={s.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.display_name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {s.total_devido_plataforma > 0 ? (
                          <Badge variant="destructive" className="text-[9px]">
                            Deve R$ {s.total_devido_plataforma.toFixed(2)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] border-green-500/40 text-green-400">
                            Em dia
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          Pago: R$ {s.total_recebido_plataforma.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {s.total_devido_plataforma > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => marcarRecebido(s)}
                        className="text-xs gap-1"
                      >
                        <Check className="w-3 h-3" /> Recebi
                      </Button>
                    )}
                  </Card>
                ))
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
