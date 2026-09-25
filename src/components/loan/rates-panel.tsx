import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { formatPct, formatUsd } from "@/lib/loan/format";
import type { DashboardData } from "./types";

export function RatesPanel({ data }: { data: DashboardData }) {
  const tna = data.scheduledRates.tna;
  const tea = data.scheduledRates.tea;
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RateCard label="TNA de referencia" value={formatPct(data.settings.tnaDeclared)} hint="La planilla original. Se usa para punitorios." />
        <RateCard label="TNA implícita" value={tna == null ? "—" : formatPct(tna)} hint="Tasa nominal real del cronograma de 100 cuotas." />
        <RateCard label="TEA" value={tea == null ? "—" : formatPct(tea)} hint="Tasa efectiva anual. (1 + TNA/12)^12 − 1." />
        <RateCard label="CFT" value={tea == null ? "—" : formatPct(tea)} hint="Costo financiero total. No hay comisiones, IVA ni seguro en la planilla, así que el CFT coincide con la TEA." />
      </div>

      <Card>
        <CardTitle className="text-base">Cómo se lee</CardTitle>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
          <p>
            El préstamo es de {formatUsd(data.settings.principal)} en 100 cuotas, de mayo 2024 a agosto 2032. Si se paga el cronograma completo se devuelven {formatUsd(data.totalCuotas)}: {formatUsd(data.settings.principal)} de capital y {formatUsd(data.totalInterest)} de interés.
          </p>
          <p>
            La TNA del 26,28% que figura en la planilla no es la tasa con la que se armaron las cuotas: es la tasa de referencia para atraso. La tasa que realmente está embebida en las cuotas (TNA implícita / TEA / CFT) se calcula con el flujo de caja: se entrega el capital hoy y se cobran las 100 cuotas pactadas.
          </p>
          <p>
            Los pagos se registran en pesos y se convierten al dólar vendedor del Banco Nación del día. Eso es lo que baja el saldo en dólares, no el tipo MEP.
          </p>
        </div>
      </Card>

      {data.overdueAmount > 0.5 ? (
        <Card className="border-danger/30 bg-danger-bg">
          <CardTitle className="text-base text-danger">Punitorios estimados</CardTitle>
          <CardHint className="mt-1 text-danger/80">
            Sobre cuotas vencidas, a la TNA de referencia {formatPct(data.settings.tnaDeclared)} / 12.
          </CardHint>
          <p className="mt-3 font-display text-3xl tabular-nums text-danger">{formatUsd(data.punitorios)}</p>
          <p className="mt-1 text-sm text-danger/80">
            Saldo atrasado {formatUsd(data.overdueAmount)} en {data.overdueCount} cuota{data.overdueCount === 1 ? "" : "s"}.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function RateCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted">{hint}</p>
    </Card>
  );
}
