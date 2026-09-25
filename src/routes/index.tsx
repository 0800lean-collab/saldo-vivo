import { createFileRoute } from "@tanstack/react-router";
import { LoanApp } from "@/components/loan/app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <LoanApp />;
}
