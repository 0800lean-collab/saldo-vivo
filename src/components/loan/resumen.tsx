import {
  AlertTriangle,
  ArrowDownRight,
  Calendar,
  Landmark,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatArs, formatMonthYear, formatPct, formatUsd } from "@/lib/loan/format";
import { LoanCharts } from "./charts";
import type { DashboardData, TabId } from "./types";

export function Resumen({
  data,
  onOpenTab,
}: {
  data: DashboardData;
  onOpenTab: (tab: TabId) => void;
}) {
  const next = data.next;
  const dueLabel = next ? formatMonthYear(next.year, next.month) : "Cancelado";
  const nextShort = next ? Math.max(0, next.cuota - next.paidUsd) : 0;

  return (
    <div className="grid gap-5">
      <Card className="overflow-hidden p-0">
        <div className="bg-ink px-5 py-6 text-ink-fg sm:px-7 sm:py-8">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-fg/55">Capital pendiente</p>
          <p className="mt-2 font-display text-4xl tabular-nums tracking-tight sm:text-5xl">
            {formatUsd(data.capitalRemaining)}
          </p>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-ink-fg/20">
            <div
              className="h-full rounded-full bg-ink-fg"
              style={{ width: `${Math.min(100, Math.max(6, data.progressPct))}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-fg/75">
            <span>
              Devuelto {formatUsd(data.capitalReturned)} · {formatPct(data.progressPct)}
            </span>
            <span>
              {data.paidCount}/{data.settings.termMonths} cuotas
            </span>
          </div>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-3">
          <Stat label="Pagado en USD" value={formatUsd(data.usdPaid)} />
          <Stat label="Interés cobrado" value={formatUsd(data.interestPaid)} />
          <Stat label="Pagado en pesos" value={data.arsPaid ? formatArs(data.arsPaid) : "—"} />
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Mini
          icon={Calendar}
          label="Próxima cuota"
          value={next ? formatUsd(nextShort) : "—"}
          hint={next ? `${dueLabel} · n° ${next.n}` : "El capital está cubierto"}
          onClick={() => onOpenTab("cargar")}
        />
        <Mini
          icon={data.overdueAmount > 0.5 ? AlertTriangle : Wallet}
          label="Atraso"
          value={formatUsd(data.overdueAmount)}
          hint={
            data.overdueCount
              ? `${data.overdueCount} cuota${data.overdueCount === 1 ? "" : "s"} vencida${data.overdueCount === 1 ? "" : "s"}`
              : "Al día"
          }
          warn={data.overdueAmount > 0.5}
        />
        <Mini
          icon={Landmark}
          label="Dólar BNA"
          value={formatArs(data.quote.sell)}
          hint={`${data.quote.live ? "En vivo" : "Guardado"} · compra ${formatArs(data.quote.buy)}`}
        />
        <Mini
          icon={ArrowDownRight}
          label="CFT / TEA"
          value={data.scheduledRates.tea == null ? "—" : formatPct(data.scheduledRates.tea)}
          hint={`TNA implícita ${data.scheduledRates.tna == null ? "—" : formatPct(data.scheduledRates.tna)}`}
          onClick={() => onOpenTab("tasas")}
        />
      </div>

      {next ? (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-sm text-muted">Acreditá el cobro del mes</p>
            <p className="font-medium">
              Cuota {next.n} · {dueLabel} · pactada {formatUsd(next.cuota)}
            </p>
            {next.paidUsd > 0 ? (
              <p className="text-sm text-warn">Ya hay {formatUsd(next.paidUsd)} cargados. Faltan {formatUsd(nextShort)}.</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onOpenTab("cargar")}
            className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-fg"
          >
            Cargar pesos
          </button>
        </Card>
      ) : null}

      <LoanCharts data={data} />

      <Card className="p-4 sm:p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Condiciones</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Montos en dólares. Las cuotas se abonan del 1 al 5 de cada mes, en pesos al dólar oficial Banco Nación.
          El atraso se liquida con la TNA de referencia {formatPct(data.settings.tnaDeclared)}.
        </p>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-medium tabular-nums">{value}</p>
    </div>
  );
}

function Mini({
  icon: Icon,
  label,
  value,
  hint,
  warn,
  onClick,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
        <Icon className="size-4 text-subtle" />
      </div>
      <p className="mt-2 font-display text-2xl tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      {warn ? (
        <Badge tone="danger" className="mt-2">
          Vencida
        </Badge>
      ) : null}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="rounded-xl border border-border bg-surface p-4 text-left">
        {inner}
      </button>
    );
  }
  return <Card className="p-4">{inner}</Card>;
}

