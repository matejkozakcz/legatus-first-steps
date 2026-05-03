import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck } from "lucide-react";

const CONSENT_VERSION = "1.0";

export function GdprConsentModal() {
  const { user: authUser } = useAuth();
  const { user, refresh } = useWorkspace();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsConsent = !!user && !user.gdpr_consent_accepted_at;
  if (!needsConsent || !authUser) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await supabase
        .from("users")
        .update({
          gdpr_consent_accepted_at: new Date().toISOString(),
          gdpr_consent_version: CONSENT_VERSION,
        })
        .eq("id", authUser.id);
      if (e) throw e;
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gdpr-title"
    >
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 id="gdpr-title" className="text-lg font-semibold">
            Souhlas se zpracováním osobních údajů
          </h2>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          Před přidáváním kontaktů potvrzuji, že mám souhlas dotčených osob se
          zpracováním jejich osobních údajů v souladu s GDPR.
        </p>

        <label className="mb-6 flex items-start gap-3 rounded-md border p-3">
          <Checkbox
            id="gdpr-agree"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm leading-relaxed">
            Beru na vědomí a souhlasím s výše uvedeným prohlášením.
          </span>
        </label>

        {error && (
          <p className="mb-3 text-sm text-destructive">{error}</p>
        )}

        <Button
          className="w-full"
          disabled={!agreed || busy}
          onClick={() => void submit()}
        >
          {busy ? "Ukládám…" : "Souhlasím"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook to check whether the current user has accepted GDPR.
 * Use to disable buttons that create personal data records.
 */
export function useGdprConsent() {
  const { user } = useWorkspace();
  return {
    hasConsent: !!user?.gdpr_consent_accepted_at,
  };
}
