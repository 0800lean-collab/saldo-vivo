import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatMonthYear,
  formatUsd,
  monthName,
} from "@/lib/loan/format";
import { STATUS_LABEL, type InstallmentStatus } from "@/lib/loan/math";
import { cn } from "@/lib/utils";
import type { DashboardData } from "./types";

const TONE: Record<InstallmentStatus, "ok" | "warn" | "danger" | "neutral" | "ink"> = {
  paid: "ok",
  overpaid: "ok",
  partial: "warn",
  due: "ink",
  overdue: "danger",
  upcoming: "neutral",
};

export function ScheduleTable({ data }: { data: DashboardData }) {
  const years = data.byYear.map((row) => row.year);
  const [year, setYear] = useState<number | "all">("all");
  const rows = useMemo(
    () => (year === "all" ? data.installments : data.installments.filter((row) => row.year === year)),
    [data.installments, year],
  );

  return (
    <div className="grid gap-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <FilterChip active={year === "all"} onClick={() => setYear("all")}>
          Todas
        </FilterChip>
        {years.map((value) => (
          <FilterChip key={value} active={year === value} onClick={() => setYear(value)}>
            {value}
          </FilterChip>
        ))}
      </div>

      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <Card key={row.n} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted">Cuota {row.n}</p>
                <p className="font-medium">{formatMonthYear(row.year, row.month)}</p>
              </div>
              <Badge tone={TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted">Cuota</dt>
                <dd className="tabular-nums">{formatUsd(row.cuota)}</dd>
              </div>
              <div>
                <dt className="text-muted">Pagado</dt>
                <dd className="tabular-nums">{row.paidUsd ? formatUsd(row.paidUsd) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Interés</dt>
                <dd className="tabular-nums">{formatUsd(row.interest)}</dd>
              </div>
              <div>
                <dt className="text-muted">Capital</dt>
                <dd className="tabular-nums">{formatUsd(row.amortization)}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>

      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="sticky top-0 bg-ink text-ink-fg">
              <tr className="text-left">
                {["N°", "Período", "Cuota", "Interés", "Amort.", "Pagado", "Dif.", "Estado"].map((label) => (
                  <th key={label} className="px-3 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.n} className="border-t border-border even:bg-surface-2/40">
                  <td className="px-3 py-2.5 tabular-nums font-medium">{row.n}</td>
                  <td className="px-3 py-2.5 capitalize">
                    {monthName(row.month)} {row.year}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{formatUsd(row.cuota)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-muted">{formatUsd(row.interest)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{formatUsd(row.amortization)}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {row.paidUsd ? formatUsd(row.paidUsd) : "—"}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 tabular-nums",
                      row.paidUsd === 0
                        ? "text-muted"
                        : row.difference >= 0
                          ? "text-ok"
                          : "text-danger",
                    )}
                  >
                    {row.paidUsd ? formatUsd(row.difference) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 shrink-0 rounded-full px-4 text-sm font-medium",
        active ? "bg-ink text-ink-fg" : "bg-surface text-muted border border-border",
      )}
    >
      {children}
    </button>
  );
}
