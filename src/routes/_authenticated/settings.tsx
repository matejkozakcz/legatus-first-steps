import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSettingsModal } from "@/components/SettingsModal";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsAlias,
});

function SettingsAlias() {
  const navigate = useNavigate();
  const { open } = useSettingsModal();
  useEffect(() => {
    open();
    navigate({ to: "/dashboard", replace: true });
  }, [open, navigate]);
  return null;
}
