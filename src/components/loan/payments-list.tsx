import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { deletePayment } from "@/lib/loan/server";
import { formatArs, formatDateEs, formatUsd } from "@/lib/loan/format";
import type { DashboardData } from "./types";

export function PaymentsList({ data }: { data: DashboardData }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: number) => deletePayment({ data: { id } }),
    onSuccess: () => {
      toast.success("Pago eliminado");
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const recent = [...data.payments].reverse();

  return (
    <Card className="p-4 sm:p-6">
      <CardTitle className="text-base">Pagos cargados</CardTitle>
      <CardHint className="mt-1">El más reciente primero. Se puede borrar un cobro si quedó mal.</CardHint>
      {recent.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Todavía no hay pagos.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {recent.map((payment) => (
            <li key={payment.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium tabular-nums">
                  Cuota {payment.installmentN} · {formatUsd(payment.amountUsd)}
                </p>
                <p className="text-sm text-muted">
                  {formatDateEs(payment.paidOn)}
                  {payment.amountArs != null ? ` · ${formatArs(payment.amountArs)} / ${formatArs(payment.fxRate)}` : " · en USD"}
                </p>
                {payment.note ? <p className="text-sm text-muted">{payment.note}</p> : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-danger"
                disabled={mutation.isPending}
                onClick={() => {
                  if (window.confirm("¿Eliminar este pago?")) mutation.mutate(payment.id);
                }}
              >
                Borrar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
