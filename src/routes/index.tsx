import { createFileRoute } from "@tanstack/react-router";
import { Designer } from "@/components/process-designer/Designer";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <Designer />;
}
