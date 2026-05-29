import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/training")({
  component: () => (
    <AppShell mode="training">
      <Outlet />
    </AppShell>
  ),
});
