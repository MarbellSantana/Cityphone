"use client";

import { useEffect } from "react";
import { INITIAL_PRODUCTS } from "../lib/initial-products";
import {
  CLOUD_LAST_SYNC_KEY,
  CashMovement,
  KEYS,
  clearDirtyKeys,
  cloudBootstrap,
  cloudPull,
  getDirtyKeys,
} from "../lib/storage";

const SESSION_HYDRATED = "cityphone_cloud_hydrated_v4";
const ALL_KEYS = Object.values(KEYS);

function readLocalState() {
  const state:Record<string,unknown> = {};
  for (const key of ALL_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try { state[key] = JSON.parse(raw); } catch { /* ignore malformed local value */ }
  }
  return state;
}

function isNonEmptyArray(value:unknown):value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

function ensureLocalInventory(localState:Record<string,unknown>) {
  const localProducts = localState[KEYS.products];
  if (isNonEmptyArray(localProducts)) return localProducts;
  localStorage.setItem(KEYS.products, JSON.stringify(INITIAL_PRODUCTS));
  return INITIAL_PRODUCTS;
}

function applyRemote(state:Record<string,unknown>, skipKeys:Set<string> = new Set()) {
  let changed = false;
  for (const key of ALL_KEYS) {
    if (!(key in state) || skipKeys.has(key)) continue;

    const remoteValue = state[key];
    if (key === KEYS.products && Array.isArray(remoteValue) && remoteValue.length === 0) {
      const localProducts = (() => {
        try { return JSON.parse(localStorage.getItem(KEYS.products) || "[]"); } catch { return []; }
      })();
      if (Array.isArray(localProducts) && localProducts.length > 0) continue;
    }

    const next = JSON.stringify(remoteValue);
    if (localStorage.getItem(key) !== next) {
      localStorage.setItem(key, next);
      changed = true;
    }
  }
  localStorage.setItem(CLOUD_LAST_SYNC_KEY, new Date().toISOString());
  return changed;
}

function reconcileSeptemberCash(value:unknown):CashMovement[]|null {
  if (!Array.isArray(value)) return null;
  const movements=value as CashMovement[];

  // Only run against the exact erroneous historical shape that was in the cloud.
  // Once corrected, these three signatures disappear and the repair can never run again.
  const wrongInternet=movements.some(m=>m.concept==="Internet"&&m.amount===48000&&m.method==="Efectivo");
  const wrongMerch=movements.some(m=>m.concept.toLowerCase().includes("mercader")&&m.amount===98000&&m.method==="Efectivo");
  const wrongFood=movements.some(m=>m.concept==="Comida"&&m.amount===16000&&m.method==="Efectivo");
  if (!(wrongInternet&&wrongMerch&&wrongFood)) return null;

  const afterHistory=movements.filter(m=>new Date(m.createdAt).getTime()>=new Date("2026-09-06T03:00:00.000Z").getTime());
  const historical:CashMovement[]=[
    {id:1788635700001,note:"Diferencia efectivo caja",type:"Ingreso",amount:5000,method:"Efectivo",source:"manual",concept:"Diferencia efectivo caja",createdAt:"2026-09-05T15:00:00.000Z"},
    {id:1788635700002,note:"Completar alquiler",type:"Egreso",amount:60000,method:"Efectivo",source:"manual",concept:"Completar alquiler",category:"Alquiler",createdAt:"2026-09-05T15:05:00.000Z"},
    {id:1788631932268,note:"Mercadería pagada con cuenta",type:"Egreso",amount:98000,method:"Cuenta bancaria",source:"manual",concept:"Mercaderia",category:"Mercadería",createdAt:"2026-09-05T18:12:12.268Z"},
    {id:1788555503626,note:"Venta",type:"Ingreso",amount:22000,method:"Efectivo",source:"sale",concept:"Venta #503626",createdAt:"2026-09-04T20:58:23.626Z"},
    {id:1788555381900,note:"Venta",type:"Ingreso",amount:22000,method:"Efectivo",source:"sale",concept:"Venta #381900",createdAt:"2026-09-04T20:56:21.900Z"},
    {id:1788550145657,note:"Venta",type:"Ingreso",amount:22000,method:"Efectivo",source:"sale",concept:"Venta #145657",createdAt:"2026-09-04T19:29:05.657Z"},
    {id:1788556000001,note:"Marbell",type:"Egreso",amount:3000,method:"Efectivo",source:"manual",concept:"Marbell",category:"Otros",createdAt:"2026-09-04T16:00:00.000Z"},
    {id:1788556000002,note:"Cambio x cuenta",type:"Egreso",amount:50000,method:"Efectivo",source:"exchange",concept:"Cambio de dinero · Efectivo → Cuenta bancaria",createdAt:"2026-09-04T16:05:00.000Z"},
    {id:1788556000003,note:"Cambio x cuenta",type:"Ingreso",amount:50000,method:"Cuenta bancaria",source:"exchange",concept:"Cambio de dinero · Efectivo → Cuenta bancaria",createdAt:"2026-09-04T16:05:00.000Z"},
    {id:1788556000004,note:"Marbell",type:"Egreso",amount:10700,method:"Cuenta bancaria",source:"manual",concept:"Marbell",category:"Otros",createdAt:"2026-09-04T16:10:00.000Z"},
    {id:1788469200001,note:"Comida",type:"Egreso",amount:6000,method:"Efectivo",source:"manual",concept:"Comida",category:"Otros",createdAt:"2026-09-03T15:00:00.000Z"},
    {id:1788635035480,note:"Venta histórica en efectivo",type:"Ingreso",amount:92000,method:"Efectivo",source:"sale",concept:"Venta histórica · 2/9/2026",createdAt:"2026-09-02T15:00:00.000Z"},
    {id:1788635247785,note:"Comida",type:"Egreso",amount:10000,method:"Efectivo",source:"manual",concept:"Comida",category:"Otros",createdAt:"2026-09-02T15:10:00.000Z"},
    {id:1788634682012,note:"Venta histórica en efectivo",type:"Ingreso",amount:42000,method:"Efectivo",source:"sale",concept:"Venta histórica · 1/9/2026",createdAt:"2026-09-01T15:00:00.000Z"},
    {id:1788379200001,note:"Caja inicial",type:"Ingreso",amount:3000,method:"Efectivo",source:"manual",concept:"Caja inicial",createdAt:"2026-09-01T14:00:00.000Z"},
    {id:1788634843632,note:"Gasto con cuenta",type:"Egreso",amount:4000,method:"Cuenta bancaria",source:"manual",concept:"Articulos de limpieza",category:"Insumos",createdAt:"2026-09-01T16:00:00.000Z"},
    {id:1788634862629,note:"Gasto con cuenta",type:"Egreso",amount:3000,method:"Cuenta bancaria",source:"manual",concept:"Deivis",category:"Otros",createdAt:"2026-09-01T16:05:00.000Z"},
    {id:1788634884226,note:"Gasto con cuenta",type:"Egreso",amount:48000,method:"Cuenta bancaria",source:"manual",concept:"Internet",category:"Servicios",createdAt:"2026-09-01T16:10:00.000Z"},
  ];

  return [...afterHistory,...historical].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
}

export default function CloudSync() {
  useEffect(() => {
    let disposed = false;
    let syncing = false;

    async function bootstrap() {
      if (syncing || disposed) return;
      syncing = true;
      try {
        const localState = readLocalState();
        const protectedProducts = ensureLocalInventory(localState);
        localState[KEYS.products] = protectedProducts;

        const dirtyKeys = getDirtyKeys();
        const remote = await cloudBootstrap(localState, dirtyKeys);
        if (disposed) return;

        const remoteProducts = remote.state?.[KEYS.products];
        if (Array.isArray(remoteProducts) && remoteProducts.length === 0 && isNonEmptyArray(protectedProducts)) {
          const repaired = await cloudBootstrap({ [KEYS.products]: protectedProducts }, [KEYS.products]);
          if (disposed) return;
          remote.state = { ...(remote.state || {}), ...(repaired.state || {}) };
        }

        const correctedCash=reconcileSeptemberCash(remote.state?.[KEYS.cash]);
        if (correctedCash) {
          const repaired = await cloudBootstrap({ [KEYS.cash]: correctedCash }, [KEYS.cash]);
          if (disposed) return;
          remote.state = { ...(remote.state || {}), ...(repaired.state || {}) };
        }

        clearDirtyKeys(dirtyKeys);
        const changed = applyRemote(remote.state || {});
        if (changed && !sessionStorage.getItem(SESSION_HYDRATED)) {
          sessionStorage.setItem(SESSION_HYDRATED, "1");
          window.location.reload();
          return;
        }
        sessionStorage.setItem(SESSION_HYDRATED, "1");
      } catch (error) {
        console.error("CityPhone cloud bootstrap failed", error);
      } finally {
        syncing = false;
      }
    }

    async function pullLatest() {
      if (syncing || disposed) return;
      syncing = true;
      try {
        const dirtyKeys = new Set(getDirtyKeys());
        if (dirtyKeys.size) {
          syncing = false;
          await bootstrap();
          return;
        }
        const remote = await cloudPull();
        if (disposed) return;

        const remoteProducts = remote.state?.[KEYS.products];
        if (Array.isArray(remoteProducts) && remoteProducts.length === 0) {
          syncing = false;
          await bootstrap();
          return;
        }

        const changed = applyRemote(remote.state || {});
        if (changed) window.location.reload();
      } catch (error) {
        console.error("CityPhone cloud pull failed", error);
      } finally {
        syncing = false;
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") void pullLatest();
    };
    const onOnline = () => void bootstrap();

    void bootstrap();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
