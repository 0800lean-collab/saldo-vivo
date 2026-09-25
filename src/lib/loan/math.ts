import { round2, todayInArgentina } from "./format";

export type LoanSettings = {
  principal: number;
  tnaDeclared: number;
  termMonths: number;
  startDate: string;
  dueDay: number;
  title: string;
};

export type ScheduleRow = {
  n: number;
  dueDate: string;
  year: number;
  month: number;
  cuota: number;
  interest: number;
  amortization: number;
  openingBalance: number;
  closingBalance: number;
};

export type PaymentRow = {
  id: number;
  installmentN: number;
  paidOn: string;
  amountArs: number | null;
  fxRate: number;
  amountUsd: number;
  note: string | null;
  createdAt: string;
};

export type InstallmentStatus =
  | "paid"
  | "overpaid"
  | "partial"
  | "due"
  | "overdue"
  | "upcoming";

export type EnrichedInstallment = ScheduleRow & {
  paidUsd: number;
  paidArs: number;
  difference: number;
  status: InstallmentStatus;
  capitalApplied: number;
  interestApplied: number;
  shortfall: number;
};

export function irrMonthly(cashflows: number[]): number | null {
  if (cashflows.length < 2) return null;
  let rate = 0.01;
  for (let i = 0; i < 60; i += 1) {
    let npv = 0;
    let deriv = 0;
    for (let t = 0; t < cashflows.length; t += 1) {
      const den = (1 + rate) ** t;
      npv += cashflows[t] / den;
      if (t > 0) deriv -= (t * cashflows[t]) / (1 + rate) ** (t + 1);
    }
    if (Math.abs(deriv) < 1e-12) break;
    const next = rate - npv / deriv;
    if (!Number.isFinite(next)) return null;
    if (Math.abs(next - rate) < 1e-12) return next;
    rate = next;
  }
  return Number.isFinite(rate) ? rate : null;
}

export function ratesFromMonthly(monthly: number | null): {
  tna: number | null;
  tea: number | null;
} {
  if (monthly == null) return { tna: null, tea: null };
  return {
    tna: monthly * 12 * 100,
    tea: ((1 + monthly) ** 12 - 1) * 100,
  };
}

export function scheduledCashflows(principal: number, cuotas: number[]): number[] {
  return [principal, ...cuotas.map((c) => -c)];
}

const SETTLED_USD = 15;

export function classifyStatus(input: {
  paidUsd: number;
  cuota: number;
  dueDate: string;
  today: string;
}): InstallmentStatus {
  const paid = input.paidUsd;
  const cuota = input.cuota;
  if (paid >= cuota - SETTLED_USD) return paid > cuota + SETTLED_USD ? "overpaid" : "paid";
  const due = new Date(`${input.dueDate}T12:00:00`);
  const now = new Date(`${input.today}T12:00:00`);
  const sameMonth =
    due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth();
  if (paid > 0.5) return "partial";
  if (now > due) return "overdue";
  if (sameMonth) return "due";
  return "upcoming";
}

export function enrichInstallments(input: {
  rows: ScheduleRow[];
  payments: PaymentRow[];
  today?: string;
}): EnrichedInstallment[] {
  const today = input.today ?? todayInArgentina();
  const paidByN = new Map<number, { usd: number; ars: number }>();
  for (const payment of input.payments) {
    const current = paidByN.get(payment.installmentN) ?? { usd: 0, ars: 0 };
    current.usd = round2(current.usd + payment.amountUsd);
    current.ars = round2(current.ars + (payment.amountArs ?? 0));
    paidByN.set(payment.installmentN, current);
  }

  return input.rows.map((row) => {
    const paid = paidByN.get(row.n) ?? { usd: 0, ars: 0 };
    const status = classifyStatus({
      paidUsd: paid.usd,
      cuota: row.cuota,
      dueDate: row.dueDate,
      today,
    });
    const interestApplied = round2(Math.min(row.interest, Math.max(0, paid.usd)));
    const leftover = round2(Math.max(0, paid.usd - row.interest));
    const capitalApplied = round2(
      Math.min(Math.max(0, row.amortization), leftover),
    );
    const shortfall = round2(Math.max(0, row.cuota - paid.usd));
    return {
      ...row,
      paidUsd: paid.usd,
      paidArs: paid.ars,
      difference: round2(paid.usd - row.cuota),
      status,
      capitalApplied,
      interestApplied,
      shortfall,
    };
  });
}

export function monthsLate(dueDate: string, today: string): number {
  const due = new Date(`${dueDate}T12:00:00`);
  const now = new Date(`${today}T12:00:00`);
  if (now <= due) return 0;
  const months =
    (now.getFullYear() - due.getFullYear()) * 12 +
    (now.getMonth() - due.getMonth());
  const extra = now.getDate() > due.getDate() ? 1 : 0;
  return Math.max(0, months + extra);
}

export function buildDashboard(input: {
  settings: LoanSettings;
  rows: ScheduleRow[];
  payments: PaymentRow[];
  today?: string;
}) {
  const today = input.today ?? todayInArgentina();
  const installments = enrichInstallments({
    rows: input.rows,
    payments: input.payments,
    today,
  });

  const capitalReturned = round2(
    installments.reduce((sum, row) => sum + row.capitalApplied, 0),
  );
  const capitalRemaining = round2(
    Math.max(0, input.settings.principal - capitalReturned),
  );
  const interestPaid = round2(
    installments.reduce((sum, row) => sum + row.interestApplied, 0),
  );
  const usdPaid = round2(
    input.payments.reduce((sum, row) => sum + row.amountUsd, 0),
  );
  const arsPaid = round2(
    input.payments.reduce((sum, row) => sum + (row.amountArs ?? 0), 0),
  );
  const scheduledPaid = round2(
    installments
      .filter((row) => ["paid", "overpaid"].includes(row.status))
      .reduce((sum, row) => sum + row.cuota, 0) +
      installments
        .filter((row) => row.status === "partial")
        .reduce((sum, row) => sum + row.paidUsd, 0),
  );

  const overdue = installments.filter(
    (row) =>
      (row.status === "overdue" || row.status === "partial") &&
      row.shortfall > SETTLED_USD &&
      new Date(`${row.dueDate}T12:00:00`) < new Date(`${today}T12:00:00`),
  );
  const overdueAmount = round2(
    overdue.reduce((sum, row) => sum + row.shortfall, 0),
  );
  const monthlyPunitorio = input.settings.tnaDeclared / 100 / 12;
  const punitorios = round2(
    overdue.reduce((sum, row) => {
      const late = monthsLate(row.dueDate, today);
      return sum + row.shortfall * monthlyPunitorio * late;
    }, 0),
  );

  const next = installments.find(
    (row) => !["paid", "overpaid"].includes(row.status),
  );
  const paidCount = installments.filter((row) =>
    ["paid", "overpaid"].includes(row.status),
  ).length;
  const progressPct = (capitalReturned / input.settings.principal) * 100;

  const scheduledRates = ratesFromMonthly(
    irrMonthly(
      scheduledCashflows(
        input.settings.principal,
        installments.map((row) => row.cuota),
      ),
    ),
  );

  const years = Array.from(new Set(installments.map((row) => row.year))).sort();
  const byYear = years.map((year) => {
    const slice = installments.filter((row) => row.year === year);
    return {
      year,
      cuota: round2(slice.reduce((s, r) => s + r.cuota, 0)),
      interest: round2(slice.reduce((s, r) => s + r.interest, 0)),
      amortization: round2(slice.reduce((s, r) => s + r.amortization, 0)),
      paid: round2(slice.reduce((s, r) => s + r.paidUsd, 0)),
    };
  });

  const capitalSeries = installments.map((row) => ({
    n: row.n,
    label: `${row.month}/${String(row.year).slice(2)}`,
    scheduled: row.closingBalance,
    actual:
      ["paid", "overpaid"].includes(row.status) || row.paidUsd > 0
        ? round2(input.settings.principal - capitalReturnedTo(installments, row.n))
        : null,
  }));

  return {
    today,
    installments,
    capitalReturned,
    capitalRemaining,
    interestPaid,
    usdPaid,
    arsPaid,
    scheduledPaid,
    overdueAmount,
    punitorios,
    overdueCount: overdue.length,
    next,
    paidCount,
    progressPct,
    scheduledRates,
    byYear,
    capitalSeries,
    totalCuotas: round2(installments.reduce((s, r) => s + r.cuota, 0)),
    totalInterest: round2(installments.reduce((s, r) => s + r.interest, 0)),
  };
}

function capitalReturnedTo(rows: EnrichedInstallment[], n: number): number {
  return round2(
    rows.filter((row) => row.n <= n).reduce((sum, row) => sum + row.capitalApplied, 0),
  );
}

export const STATUS_LABEL: Record<InstallmentStatus, string> = {
  paid: "Pagada",
  overpaid: "A favor",
  partial: "Parcial",
  due: "Este mes",
  overdue: "Atrasada",
  upcoming: "Pendiente",
};
