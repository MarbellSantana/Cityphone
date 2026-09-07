import { CashMovement, KEYS, Sale, load, save } from "./storage";

// Fuente: planillas del local del 1 al 5 de septiembre de 2026.
// Caja física esperada al cierre del 5/9: $79.000.
const HISTORICAL_SALE_IDS = new Set([
  1788635149049,
  1788635074834,
  1788635035480,
  1788634930167,
  1788634682012,
  1788634626578,
  1788634602493,
]);

// Movimientos de caja que quedaron mal clasificados/duplicados durante la carga anterior.
const LEGACY_MOVEMENT_IDS = new Set([
  ...HISTORICAL_SALE_IDS,
  1788635667270,
  1788635667269,
  1788630523839,
  1788630523838,
  1788630497155,
  1788630497154,
  1788635247785,
  1788634884226,
  1788634862629,
  1788634843632,
  1788631932268,
  1788563728221,
]);

const SOURCE_SALES: Sale[] = [
  {
    id: 1788634682012,
    items: [{ productId: 0, name: "Venta histórica · monto total sin detalle", qty: 1, price: 42000 }],
    customer: "", total: 42000, method: "Efectivo", cashAmount: 42000, otherAmount: 0,
    createdAt: "2026-09-01T15:00:00.000Z", commission: 0, netTotal: 42000,
    deposited: true, invoiceRequested: false, invoiceStatus: "No facturada",
  },
  {
    id: 1788635035480,
    items: [{ productId: 0, name: "Venta histórica · monto total sin detalle", qty: 1, price: 92000 }],
    customer: "", total: 92000, method: "Efectivo", cashAmount: 92000, otherAmount: 0,
    createdAt: "2026-09-02T15:00:00.000Z", commission: 0, netTotal: 92000,
    deposited: true, invoiceRequested: false, invoiceStatus: "No facturada",
  },
];

const SOURCE_CASH: CashMovement[] = [
  { id: 1788634682012, type: "Ingreso", concept: "Venta histórica · 1/9/2026", amount: 42000, method: "Efectivo", note: "Venta histórica en efectivo", createdAt: "2026-09-01T15:00:00.000Z", source: "sale" },
  { id: 1788635035480, type: "Ingreso", concept: "Venta histórica · 2/9/2026", amount: 92000, method: "Efectivo", note: "Venta histórica en efectivo", createdAt: "2026-09-02T15:00:00.000Z", source: "sale" },

  // La planilla arranca con $3.000 físicos en caja.
  { id: 1788634000001, type: "Ingreso", concept: "Caja inicial · 1/9/2026", amount: 3000, method: "Efectivo", note: "Saldo inicial según planilla", createdAt: "2026-09-01T12:00:00.000Z", source: "manual" },

  // Gastos que realmente salieron de la caja física.
  { id: 1788634000002, type: "Egreso", concept: "Comida", amount: 10000, method: "Efectivo", note: "Gasto personal · 2/9", createdAt: "2026-09-02T16:00:00.000Z", source: "manual" },
  { id: 1788634000003, type: "Egreso", concept: "Comida", amount: 6000, method: "Efectivo", note: "Gasto personal · 3/9", createdAt: "2026-09-03T16:00:00.000Z", source: "manual" },
  { id: 1788634000004, type: "Egreso", concept: "Marbell", amount: 3000, method: "Efectivo", note: "Gasto personal · 4/9", createdAt: "2026-09-04T16:00:00.000Z", source: "manual" },
  { id: 1788634000005, type: "Egreso", concept: "Cambio x cuenta", amount: 50000, method: "Efectivo", note: "Salida de caja física · 4/9", createdAt: "2026-09-04T16:05:00.000Z", source: "exchange" },
  { id: 1788634000006, type: "Ingreso", concept: "Diferencia efectivo caja", amount: 5000, method: "Efectivo", note: "Ajuste según planilla · 5/9", createdAt: "2026-09-05T16:00:00.000Z", source: "manual" },
  { id: 1788634000007, type: "Egreso", concept: "Completar alquiler", amount: 60000, method: "Efectivo", note: "Gasto local · 5/9", createdAt: "2026-09-05T16:05:00.000Z", source: "manual" },

  // Gastos pagados desde la cuenta: no reducen el efectivo físico.
  { id: 1788634000010, type: "Egreso", concept: "Limpieza", amount: 4000, method: "Cuenta bancaria", note: "Gasto con cuenta · 1/9", createdAt: "2026-09-01T16:00:00.000Z", source: "manual" },
  { id: 1788634000011, type: "Egreso", concept: "Deivis", amount: 3000, method: "Cuenta bancaria", note: "Gasto con cuenta · 1/9", createdAt: "2026-09-01T16:05:00.000Z", source: "manual" },
  { id: 1788634000012, type: "Egreso", concept: "Internet", amount: 48000, method: "Cuenta bancaria", note: "Gasto con cuenta · 1/9", createdAt: "2026-09-01T16:10:00.000Z", source: "manual" },
  { id: 1788634000013, type: "Egreso", concept: "Marbell", amount: 10700, method: "Cuenta bancaria", note: "Gasto con cuenta · 4/9", createdAt: "2026-09-04T16:10:00.000Z", source: "manual" },
  { id: 1788634000014, type: "Egreso", concept: "Mercadería", amount: 98000, method: "Cuenta bancaria", note: "Gasto con cuenta · 5/9", createdAt: "2026-09-05T16:10:00.000Z", source: "manual" },
];

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function repairSeptemberCashData() {
  if (typeof window === "undefined") return;

  const sales = load<Sale[]>(KEYS.sales, []);
  const cash = load<CashMovement[]>(KEYS.cash, []);

  // Sustituye solo las cargas históricas defectuosas. Las ventas reales del 4/9 y 5/9 se conservan.
  const otherSales = sales.filter(s => !HISTORICAL_SALE_IDS.has(s.id));
  const repairedSales = [...SOURCE_SALES, ...otherSales];

  // Conserva ventas reales y otros movimientos ajenos a la corrección; reemplaza los registros conflictivos.
  const otherCash = cash.filter(m => !LEGACY_MOVEMENT_IDS.has(m.id) && !SOURCE_CASH.some(x => x.id === m.id));
  const repairedCash = [...SOURCE_CASH, ...otherCash];

  if (!same(repairedSales, sales)) save(KEYS.sales, repairedSales);
  if (!same(repairedCash, cash)) save(KEYS.cash, repairedCash);
}
