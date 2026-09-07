import { CashMovement, KEYS, Sale, load, save } from "./storage";

const KEEP_HISTORICAL = new Set([1788634682012, 1788635035480]);
const REMOVE_HISTORICAL = new Set([
  1788635149049,
  1788635074834,
  1788634930167,
  1788634626578,
  1788634602493,
]);
const CASH_EXPENSES = new Set([
  1788635247785,
  1788634884226,
  1788634862629,
  1788634843632,
  1788631932268,
]);
const REMOVE_MOVEMENTS = new Set([
  ...REMOVE_HISTORICAL,
  1788563728221,
  1788635667270,
  1788635667269,
  1788630523839,
  1788630523838,
  1788630497155,
  1788630497154,
]);

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function repairSeptemberCashData() {
  if (typeof window === "undefined") return;

  const sales = load<Sale[]>(KEYS.sales, []);
  const cash = load<CashMovement[]>(KEYS.cash, []);

  const repairedSales = sales
    .filter(s => !REMOVE_HISTORICAL.has(s.id))
    .map(s => KEEP_HISTORICAL.has(s.id)
      ? { ...s, method: "Efectivo", cashAmount: s.total, otherAmount: 0, netTotal: s.total, commission: 0, deposited: true }
      : s);

  const repairedCash = cash
    .filter(m => !REMOVE_MOVEMENTS.has(m.id))
    .map(m => CASH_EXPENSES.has(m.id) ? { ...m, method: "Efectivo" } : m);

  for (const sale of repairedSales) {
    if (!KEEP_HISTORICAL.has(sale.id)) continue;
    if (repairedCash.some(m => m.source === "sale" && m.id === sale.id)) continue;
    repairedCash.unshift({
      id: sale.id,
      type: "Ingreso",
      concept: `Venta histórica · ${new Date(sale.createdAt).toLocaleDateString("es-AR")}`,
      amount: sale.total,
      method: "Efectivo",
      note: "Venta histórica en efectivo",
      createdAt: sale.createdAt,
      source: "sale",
    });
  }

  if (!same(repairedSales, sales)) save(KEYS.sales, repairedSales);
  if (!same(repairedCash, cash)) save(KEYS.cash, repairedCash);
}
