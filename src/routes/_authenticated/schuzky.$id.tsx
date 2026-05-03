import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMeetingDetailModal } from "@/components/MeetingDetailModal";

export const Route = createFileRoute("/_authenticated/schuzky/$id")({
  component: MeetingDetailAlias,
});

function MeetingDetailAlias() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { open } = useMeetingDetailModal();
  useEffect(() => {
    open(id);
    navigate({ to: "/schuzky", replace: true });
  }, [id, open, navigate]);
  return null;
}
