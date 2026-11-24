import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/onboarding/app-shell";

// The home route ships no og:image, so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "LIFEOS — Your life. One workspace." },
    { name: "description", content: "Your personal spatial desktop. A calm workspace for your tasks, thoughts, habits and focus." },
    { property: "og:title", content: "LIFEOS — Your life. One workspace." },
    { property: "og:description", content: "A personal desktop for a more intentional life." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AppShell,
});
