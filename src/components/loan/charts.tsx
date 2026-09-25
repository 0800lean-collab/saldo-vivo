import { useEffect, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/loan/format";
import type { DashboardData } from "./types";

function ChartFrame({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="h-56 rounded-md bg-surface-2" />;
  return <div className="h-56 w-full">{children}</div>;
}

function tooltipUsd(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return formatUsd(Number.isFinite(n) ? n : 0);
}

export function LoanCharts({ data }: { data: DashboardData }) {
  const remainingPoints = data.capitalSeries.filter(
    (point, index) => point.n === 1 || point.n % 6 === 0 || index === data.capitalSeries.length - 1,
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4 sm:p-5">
        <CardTitle className="text-base">Capital restante</CardTitle>
        <CardHint className="mt-1">Saldo teórico según el cronograma.</CardHint>
        <ChartFrame>
          <ResponsiveContainer>
            <AreaChart data={remainingPoints} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={2}
              />
              <YAxis
                domain={[0, 26000]}
                ticks={[0, 5000, 10000, 15000, 20000, 25000]}
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                width={36}
              />
              <Tooltip
                formatter={tooltipUsd}
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="scheduled"
                name="Saldo"
                stroke="var(--color-primary)"
                fill="var(--color-primary)"
                fillOpacity={0.18}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Card>
      <Card className="p-4 sm:p-5">
        <CardTitle className="text-base">Cuotas por año</CardTitle>
        <CardHint className="mt-1">Interés pactado frente a capital e importe cobrado.</CardHint>
        <ChartFrame>
          <ResponsiveContainer>
            <BarChart data={data.byYear} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="year"
                type="category"
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                width={36}
                allowDecimals={false}
              />
              <Tooltip
                formatter={tooltipUsd}
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="amortization" name="Capital" stackId="a" fill="var(--color-primary)" isAnimationActive={false} />
              <Bar dataKey="interest" name="Interés" stackId="a" fill="var(--color-warn)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Card>
    </div>
  );
}
