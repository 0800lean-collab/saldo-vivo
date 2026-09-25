import { getSql } from "@/lib/db";
import { num, round2 } from "@/lib/loan/format";

export type BnaQuote = {
  buy: number;
  sell: number;
  source: string;
  capturedAt: string;
  live: boolean;
};

type ApiQuote = { buy: number; sell: number; source: string };

const FALLBACK: BnaQuote = {
  buy: 1490,
  sell: 1540,
  source: "referencia",
  capturedAt: new Date().toISOString(),
  live: false,
};

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(1800),
  });
  if (!response.ok) throw new Error(`fx ${response.status}`);
  return response.json();
}

function fromDolarApi(payload: unknown, source: string): ApiQuote | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as { compra?: unknown; venta?: unknown };
  const buy = Number(row.compra);
  const sell = Number(row.venta);
  if (!Number.isFinite(buy) || !Number.isFinite(sell) || sell <= 0) return null;
  return { buy, sell, source };
}

async function fetchLiveQuote(): Promise<ApiQuote> {
  const attempts: Array<{ url: string; source: string }> = [
    { url: "https://dolarapi.com/v1/dolares/oficial", source: "oficial" },
    { url: "https://dolarapi.com/v1/ambito/dolares/bna", source: "bna" },
  ];
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const quote = fromDolarApi(await readJson(attempt.url), attempt.source);
      if (quote) return quote;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Sin cotización");
}

async function cachedQuote(): Promise<BnaQuote | null> {
  const sql = await getSql();
  const cached = await sql<{
    buy: string | number;
    sell: string | number;
    source: string;
    captured_at: string;
  }>`select buy, sell, source, captured_at from fx_quotes order by captured_at desc limit 1`;
  const row = cached[0];
  if (!row) return null;
  return {
    buy: num(row.buy),
    sell: num(row.sell),
    source: row.source,
    capturedAt: row.captured_at,
    live: false,
  };
}

export async function getBnaQuote(): Promise<BnaQuote> {
  const sql = await getSql();
  const existing = await cachedQuote();
  try {
    const live = await fetchLiveQuote();
    await sql.query("insert into fx_quotes (buy, sell, source) values ($1, $2, $3)", [
      round2(live.buy),
      round2(live.sell),
      live.source,
    ]);
    return {
      buy: round2(live.buy),
      sell: round2(live.sell),
      source: live.source,
      capturedAt: new Date().toISOString(),
      live: true,
    };
  } catch {
    return existing ?? { ...FALLBACK, capturedAt: new Date().toISOString() };
  }
}
