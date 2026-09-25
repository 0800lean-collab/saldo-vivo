import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { getBnaQuote } from "@/lib/fx/bna.server";
import { num, round2, todayInArgentina } from "./format";
import {
  buildDashboard,
  type LoanSettings,
  type PaymentRow,
  type ScheduleRow,
} from "./math";

type SettingsRow = {
  principal: string | number;
  tna_declared: string | number;
  term_months: number;
  start_date: string;
  due_day: number;
  title: string;
};

type InstRow = {
  n: number;
  due_date: string;
  year: number;
  month: number;
  cuota: string | number;
  interest: string | number;
  amortization: string | number;
  opening_balance: string | number;
  closing_balance: string | number;
};

type PayRow = {
  id: number;
  installment_n: number;
  paid_on: string;
  amount_ars: string | number | null;
  fx_rate: string | number;
  amount_usd: string | number;
  note: string | null;
  created_at: string;
};

function mapSettings(row: SettingsRow): LoanSettings {
  return {
    principal: num(row.principal),
    tnaDeclared: num(row.tna_declared),
    termMonths: Number(row.term_months),
    startDate: row.start_date,
    dueDay: Number(row.due_day),
    title: row.title,
  };
}

function mapInstallment(row: InstRow): ScheduleRow {
  return {
    n: Number(row.n),
    dueDate: row.due_date,
    year: Number(row.year),
    month: Number(row.month),
    cuota: num(row.cuota),
    interest: num(row.interest),
    amortization: num(row.amortization),
    openingBalance: num(row.opening_balance),
    closingBalance: num(row.closing_balance),
  };
}

function mapPayment(row: PayRow): PaymentRow {
  return {
    id: Number(row.id),
    installmentN: Number(row.installment_n),
    paidOn: row.paid_on,
    amountArs: row.amount_ars == null ? null : num(row.amount_ars),
    fxRate: num(row.fx_rate),
    amountUsd: num(row.amount_usd),
    note: row.note,
    createdAt: row.created_at,
  };
}

export const getDashboard = createServerFn({ method: "GET" }).handler(
  async () => {
    const sql = await getSql();
    const [settingsRows, installmentRows, paymentRows, quote] =
      await Promise.all([
        sql<SettingsRow>`select principal, tna_declared, term_months, start_date, due_day, title from loan_settings where id = 1`,
        sql<InstRow>`select n, due_date, year, month, cuota, interest, amortization, opening_balance, closing_balance from installments order by n`,
        sql<PayRow>`select id, installment_n, paid_on, amount_ars, fx_rate, amount_usd, note, created_at from payments order by paid_on, id`,
        getBnaQuote(),
      ]);
    const settings = settingsRows[0];
    if (!settings) throw new Error("Falta la configuración del préstamo");
    const mappedSettings = mapSettings(settings);
    const rows = installmentRows.map(mapInstallment);
    const payments = paymentRows.map(mapPayment);
    const dashboard = buildDashboard({
      settings: mappedSettings,
      rows,
      payments,
    });
    return {
      settings: mappedSettings,
      quote,
      payments,
      ...dashboard,
    };
  },
);

const paymentInput = z.object({
  installmentN: z.number().int().min(1).max(100),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountArs: z.number().nonnegative().nullable(),
  fxRate: z.number().positive(),
  amountUsd: z.number().positive(),
  note: z.string().trim().max(280).nullable(),
});

export const addPayment = createServerFn({ method: "POST" })
  .validator((input: unknown) => paymentInput.parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const usd =
      data.amountArs != null && data.amountArs > 0
        ? round2(data.amountArs / data.fxRate)
        : round2(data.amountUsd);
    if (usd <= 0) throw new Error("El pago tiene que ser mayor a cero");
    await sql.query(
      `insert into payments (installment_n, paid_on, amount_ars, fx_rate, amount_usd, note)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        data.installmentN,
        data.paidOn,
        data.amountArs,
        round2(data.fxRate),
        usd,
        data.note,
      ],
    );
    return { ok: true as const, amountUsd: usd };
  });

export const deletePayment = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query("delete from payments where id = $1", [data.id]);
    return { ok: true as const };
  });

export const getQuote = createServerFn({ method: "GET" }).handler(async () => {
  return getBnaQuote();
});

export { todayInArgentina };
