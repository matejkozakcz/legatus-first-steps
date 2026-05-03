import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/join/$token")({
  component: JoinPage,
});

interface InvitedWorkspace {
  id: string;
  name: string;
  status: string;
  default_role_key: string | null;
}

function JoinPage() {
  const { token } = Route.useParams();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [ws, setWs] = useState<InvitedWorkspace | null>(null);
  const [loadingWs, setLoadingWs] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  // Look up workspace by token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingWs(true);
      const { data, error: err } = await supabase.rpc(
        "get_workspace_by_invite_token",
        { _token: token },
      );
      if (cancelled) return;
      if (err) {
        setTokenError(err.message);
      } else if (!data || (Array.isArray(data) && data.length === 0)) {
        setTokenError("Pozvánka neexistuje nebo byla zneplatněna.");
      } else {
        const row = (Array.isArray(data) ? data[0] : data) as InvitedWorkspace;
        setWs(row);
      }
      setLoadingWs(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // After auth, link to workspace and redirect
  useEffect(() => {
    if (authLoading || !user || !ws || accepting) return;
    let cancelled = false;
    (async () => {
      setAccepting(true);
      // Check if user already linked to a workspace
      const { data: profile } = await supabase
        .from("users")
        .select("workspace_id")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (!profile?.workspace_id) {
        const { error: rpcErr } = await supabase.rpc(
          "accept_workspace_invite",
          { _token: token },
        );
        if (cancelled) return;
        if (rpcErr) {
          toast.error("Nepodařilo se připojit k workspace", {
            description: rpcErr.message,
          });
          setAccepting(false);
          return;
        }
      }
      navigate({ to: "/dashboard", replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, ws, token, navigate, accepting]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/join/${token}`,
            data: { full_name: fullName },
          },
        });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loadingWs) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ověřuji pozvánku…
      </div>
    );
  }

  if (tokenError || !ws) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Neplatná pozvánka</CardTitle>
            <CardDescription>
              {tokenError ?? "Tato pozvánka není platná."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/auth">Přejít na přihlášení</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user || accepting) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Připojuji k {ws.name}…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{ws.name}</CardTitle>
          <CardDescription>
            Pozvánka do workspace
            {ws.status !== "active" && (
              <Badge variant="secondary" className="ml-2">
                {ws.status}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">Registrovat</TabsTrigger>
              <TabsTrigger value="login">Přihlásit</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <TabsContent value="signup" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Jméno a příjmení</Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={mode === "signup"}
                    maxLength={120}
                  />
                </div>
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Heslo</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "signup" ? "Registrovat a připojit" : "Přihlásit a připojit"}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
