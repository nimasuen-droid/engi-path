import { createFileRoute } from "@tanstack/react-router";
import { UserGuide } from "@/components/UserGuide";

export const Route = createFileRoute("/engineer/manual")({
  component: UserGuide,
});
