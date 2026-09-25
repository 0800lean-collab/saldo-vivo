import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator,
  LayoutDashboard,
  Plus,
  Table2,
} from "lucide-react";
import { getDashboard } from "@/lib/loan/server";
import { formatArs } from "@/lib/loan/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentForm } from "./payment-form";
import { PaymentsList } from "./payments-list";
import { RatesPanel } from "./rates-panel";
import { Resumen } from "./resumen";
import { ScheduleTable } from "./schedule-table";
import type { TabId } from "./types";

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "planilla", label: "Planilla", icon: Table2 },
  { id: "cargar", label: "Cargar", icon: Plus },
  { id: "tasas", label: "Tasas", icon: Calculator },
];

export function LoanApp() {
  const [tab, setTab] = useState<TabId>("resumen");
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return (
      <Shell quote={null}>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="font-display text-2xl">No se pudo abrir el saldo</h1>
          <p className="mt-2 text-sm text-muted">
            {query.error instanceof Error ? query.error.message : "Reintentá en un momento."}
          </p>
        </div>
      </Shell>
    );
  }

  const data = query.data;

  return (
    <Shell
      quote={{
        sell: data.quote.sell,
        live: data.quote.live,
      }}
    >
      <main className="mx-auto w-full max-w-6xl px-4 pb-36 pt-6 sm:px-6">
        {tab === "resumen" ? <Resumen data={data} onOpenTab={setTab} /> : null}
        {tab === "planilla" ? <ScheduleTable data={data} /> : null}
        {tab === "cargar" ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <PaymentForm data={data} />
            <PaymentsList data={data} />
          </div>
        ) : null}
        {tab === "tasas" ? <RatesPanel data={data} /> : null}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
        <ul className="mx-auto grid max-w-6xl grid-cols-4">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </Shell>
  );
}

function Shell({
  children,
  quote,
}: {
  children: ReactNode;
  quote: { sell: number; live: boolean } | null;
}) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="bg-ink text-ink-fg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="font-display text-xl tracking-tight">Saldo Vivo</p>
            <p className="text-xs text-ink-fg/60">Amortización de vivienda</p>
          </div>
          {quote ? (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.16em] text-ink-fg/50">
                BNA {quote.live ? "vivo" : "ref."}
              </p>
              <p className="tabular-nums text-sm font-medium">{formatArs(quote.sell)}</p>
            </div>
          ) : null}
        </div>
      </header>
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <Shell quote={null}>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6">
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </Shell>
  );
}
