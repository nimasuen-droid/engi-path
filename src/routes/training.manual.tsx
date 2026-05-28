import { createFileRoute } from "@tanstack/react-router";
import { UserGuide } from "@/components/UserGuide";

export const Route = createFileRoute("/training/manual")({
  component: UserGuide,
});
