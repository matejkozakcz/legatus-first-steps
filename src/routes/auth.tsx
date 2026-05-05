import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import legatusLogo from "@/assets/legatus-logo-light.png";

const loginBg = "/login-bg.svg";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // After login → route based on legatus_admins membership
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data } = await supabase
        .from("legatus_admins")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      navigate({ to: data ? "/admin" : "/dashboard", replace: true });
    })();
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError("Hesla se neshodují.");
        return;
      }
      if (password.length < 6) {
        setError("Heslo musí mít alespoň 6 znaků.");
        return;
      }
      setSubmitting(true);
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (err) {
        if (err.message.includes("already registered") || err.message.includes("already_exists")) {
          setError("Tento e-mail je již zaregistrován. Zkus se přihlásit.");
          setIsSignUp(false);
        } else {
          setError(err.message);
        }
      }
      setSubmitting(false);
    } else {
      setSubmitting(true);
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError("Nesprávný e-mail nebo heslo.");
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#e1e9eb" }}>
        <div className="font-heading text-xl" style={{ color: "#ffffff" }}>Načítání...</div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1.5px solid #e2eaec",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    color: "#0c2226",
    outline: "none",
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#00abbd";
    e.target.style.boxShadow = "0 0 0 3px rgba(0,171,189,0.12)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#e2eaec";
    e.target.style.boxShadow = "none";
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#00555F",
      }}
    >
      <div
        className="relative z-10 w-full max-w-[400px] mx-4 flex flex-col items-center"
        style={{
          background: "#ffffff",
          borderRadius: "28px",
          boxShadow: "0 8px 32px rgba(0,85,95,0.22)",
          padding: "32px",
        }}
      >
        <img src={legatusLogo} alt="Legatus" className="h-16 mb-2" />
        <h1 className="font-heading font-bold text-lg mb-8" style={{ letterSpacing: "0.15em", color: "#0c2226" }}>
          LEGATUS
        </h1>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block font-body mb-1.5" style={{ fontSize: 13, fontWeight: 600, color: "#0c2226" }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="vas@email.cz"
              className="w-full font-body"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block font-body mb-1.5" style={{ fontSize: 13, fontWeight: 600, color: "#0c2226" }}>
              Heslo
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full font-body"
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={onFocus}
                onBlur={onBlur}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "#8aadb3" }}
                aria-label={showPassword ? "Skrýt heslo" : "Zobrazit heslo"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block font-body mb-1.5" style={{ fontSize: 13, fontWeight: 600, color: "#0c2226" }}>
                Potvrzení hesla
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full font-body"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          )}

          {error && (
            <p className="font-body text-center" style={{ fontSize: 12, color: "#e05a50" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full disabled:opacity-50 font-heading font-semibold text-white"
            style={{
              background: "#00abbd",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 15,
            }}
          >
            {submitting
              ? isSignUp ? "Registrace..." : "Přihlašování..."
              : isSignUp ? "Vytvořit účet" : "Přihlásit se"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError("");
            setConfirmPassword("");
          }}
          className="mt-3 font-body text-sm transition-colors"
          style={{ color: "#00abbd" }}
        >
          {isSignUp ? "Už máte účet? Přihlásit se" : "Vytvořit účet"}
        </button>

        <p className="mt-8 font-body" style={{ fontSize: 11, color: "#8aadb3" }}>
          © 2026 Matěj Kozák
        </p>
      </div>
    </div>
  );
}
