import { Card, CardContent } from "@/components/ui/card";

interface ActivityCardProps {
  label: string;
  color: string;
  scheduled: number;
  completed: number;
}

export function ActivityCard({ label, color, scheduled, completed }: ActivityCardProps) {
  return (
    <Card style={{ borderTop: `3px solid ${color}` }}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color }}
          >
            {label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Domluvené
            </div>
            <div className="font-heading font-bold text-2xl text-foreground mt-1">
              {scheduled}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Proběhlé
            </div>
            <div className="font-heading font-bold text-2xl mt-1" style={{ color }}>
              {completed}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
