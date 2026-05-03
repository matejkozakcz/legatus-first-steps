import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";

export function ImpersonationBanner() {
  const { state, isImpersonating, stop } = useImpersonation();
  if (!isImpersonating || !state) return null;
  return (
    <div className="sticky top-0 z-50 w-full border-b bg-amber-500/15 backdrop-blur supports-[backdrop-filter]:bg-amber-500/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4 text-amber-600" />
          <span className="font-medium">
            Prohlížíš jako <span className="font-semibold">{state.targetName}</span>
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            (pouze náhled — žádné akce)
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => void stop()}>
          <X className="mr-1 h-4 w-4" /> Ukončit
        </Button>
      </div>
    </div>
  );
}
