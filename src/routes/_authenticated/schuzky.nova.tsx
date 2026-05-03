import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useNewMeetingModal } from "@/components/NewMeetingModal";

export const Route = createFileRoute("/_authenticated/schuzky/nova")({
  component: NewMeetingAlias,
});

function NewMeetingAlias() {
  const navigate = useNavigate();
  const { open } = useNewMeetingModal();
  useEffect(() => {
    open();
    navigate({ to: "/schuzky", replace: true });
  }, [open, navigate]);
  return null;
}
