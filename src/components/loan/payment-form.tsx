import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addPayment } from "@/lib/loan/server";
import { formatArs, formatMonthYear, formatUsd, round2, todayInArgentina } from "@/lib/loan/format";
import type { DashboardData } from "./types";

export function PaymentForm({ data }: { data: DashboardData }) {
  const queryClient = useQueryClient();
  const defaultN = data.next?.n ?? 1;
  const [installmentN, setInstallmentN] = useState(defaultN);
  const [paidOn, setPaidOn] = useState(todayInArgentina());
  const [ars, setArs] = useState("");
  const [fx, setFx] = useState(String(data.quote.sell));
  const [usdDirect, setUsdDirect] = useState("");
  const [mode, setMode] = useState<"ars" | "usd">("ars");
  const [note, setNote] = useState("");

  const installment = data.installments.find((row) => row.n === installmentN) ?? data.installments[0];
  const fxNum = Number(fx.replace(",", "."));
  const arsNum = Number(ars.replace(/\./g, "").replace(",", "."));
  const usdNum = Number(usdDirect.replace(",", "."));
  const converted = useMemo(() => {
    if (mode === "usd") return Number.isFinite(usdNum) && usdNum > 0 ? round2(usdNum) : 0;
    if (!Number.isFinite(arsNum) || !Number.isFinite(fxNum) || fxNum <= 0 || arsNum <= 0) return 0;
    return round2(arsNum / fxNum);
  }, [mode, arsNum, fxNum, usdNum]);

  const mutation = useMutation({
    mutationFn: () =>
      addPayment({
        data: {
          installmentN,
          paidOn,
          amountArs: mode === "ars" && Number.isFinite(arsNum) ? arsNum : null,
          fxRate: fxNum,
          amountUsd: converted,
          note: note.trim() ? note.trim() : null,
        },
      }),
    onSuccess: (result) => {
      toast.success(`Pago cargado: ${formatUsd(result.amountUsd)}`);
      setArs("");
      setUsdDirect("");
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => toast.error(error.message || "No se pudo guardar"),
  });

  const remaining = installment ? round2(Math.max(0, installment.cuota - installment.paidUsd)) : 0;
  const arsNeeded = Number.isFinite(fxNum) && fxNum > 0 ? round2(remaining * fxNum) : 0;

  return (
    <Card className="p-4 sm:p-6">
      <CardTitle>Cargar un pago</CardTitle>
      <CardHint className="mt-1">
        Ingresá el importe en pesos. Se convierte a dólares con la venta del Banco Nación del día.
      </CardHint>

      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (converted <= 0) {
            toast.error("Completá el monto");
            return;
          }
          mutation.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cuota">Cuota</Label>
            <select
              id="cuota"
              value={installmentN}
              onChange={(event) => setInstallmentN(Number(event.target.value))}
              className="h-11 rounded-md border border-border bg-surface px-3 text-base"
            >
              {data.installments.map((row) => (
                <option key={row.n} value={row.n}>
                  {row.n} · {formatMonthYear(row.year, row.month)} · {formatUsd(row.cuota)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="fecha">Fecha del pago</Label>
            <Input id="fecha" type="date" value={paidOn} onChange={(event) => setPaidOn(event.target.value)} required />
          </div>
        </div>

        <div className="flex rounded-md bg-surface-2 p-1">
          <button
            type="button"
            className={`h-10 flex-1 rounded-sm text-sm font-medium ${mode === "ars" ? "bg-surface text-fg" : "text-muted"}`}
            onClick={() => setMode("ars")}
          >
            Pesos
          </button>
          <button
            type="button"
            className={`h-10 flex-1 rounded-sm text-sm font-medium ${mode === "usd" ? "bg-surface text-fg" : "text-muted"}`}
            onClick={() => setMode("usd")}
          >
            Dólares
          </button>
        </div>

        {mode === "ars" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ars">Monto en pesos</Label>
              <Input
                id="ars"
                inputMode="decimal"
                placeholder="350000"
                value={ars}
                onChange={(event) => setArs(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fx">Dólar BNA venta</Label>
              <Input
                id="fx"
                inputMode="decimal"
                value={fx}
                onChange={(event) => setFx(event.target.value)}
                required
              />
              <p className="text-xs text-muted">
                {data.quote.live ? "Cotización en vivo" : "Última cotización guardada"} · compra {formatArs(data.quote.buy)}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-1.5">
            <Label htmlFor="usd">Monto en dólares</Label>
            <Input
              id="usd"
              inputMode="decimal"
              placeholder="384"
              value={usdDirect}
              onChange={(event) => setUsdDirect(event.target.value)}
              required
            />
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="note">Nota (opcional)</Label>
          <Input id="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Transferencia, recargo, etc." />
        </div>

        <div className="rounded-lg bg-ink px-4 py-4 text-ink-fg">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-fg/60">Se acredita</p>
          <p className="mt-1 font-display text-3xl tabular-nums">{formatUsd(converted)}</p>
          {installment ? (
            <p className="mt-2 text-sm text-ink-fg/75">
              Cuota {installment.n}: faltan {formatUsd(remaining)}
              {mode === "ars" ? ` (${formatArs(arsNeeded)} al tipo de hoy)` : null}
              {converted > 0 ? ` · diferencia ${formatUsd(converted - remaining)}` : null}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : "Registrar pago"}
        </Button>
      </form>
    </Card>
  );
}
