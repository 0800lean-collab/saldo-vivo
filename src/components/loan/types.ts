import type { getDashboard } from "@/lib/loan/server";

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
export type TabId = "resumen" | "planilla" | "cargar" | "tasas";
