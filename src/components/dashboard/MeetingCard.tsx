import { format } from "date-fns";
import { MapPin, User as UserIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MeetingCardProps {
  id: string;
  typeLabel: string;
  typeColor: string;
  scheduledAt: string | Date;
  status: "scheduled" | "done" | "cancelled" | string;
  personName?: string | null;
  ownerName?: string | null;
  location?: string | null;
  showOwner?: boolean;
  onClick?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Naplánováno",
  done: "Hotovo",
  cancelled: "Zrušeno",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  scheduled: "default",
  done: "secondary",
  cancelled: "destructive",
};

export function MeetingCard({
  typeLabel,
  typeColor,
  scheduledAt,
  status,
  personName,
  ownerName,
  location,
  showOwner,
  onClick,
}: MeetingCardProps) {
  const date = typeof scheduledAt === "string" ? new Date(scheduledAt) : scheduledAt;
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      <Card
        className="overflow-hidden border-l-4 transition-colors hover:bg-accent/40"
        style={{ borderLeftColor: typeColor }}
      >
        <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: typeColor }}
              />
              <span className="font-medium">{typeLabel}</span>
              {showOwner && ownerName && (
                <span className="text-xs text-muted-foreground">· {ownerName}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                {personName ?? "—"}
              </span>
              <span>{format(date, "dd.MM.yyyy HH:mm")}</span>
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {location}
                </span>
              )}
            </div>
          </div>
          <Badge variant={STATUS_VARIANT[status] ?? "default"}>
            {STATUS_LABEL[status] ?? status}
          </Badge>
        </CardContent>
      </Card>
    </button>
  );
}
