"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, BarChart3, Box, ChevronDown, CreditCard, DollarSign, Gift, LayoutDashboard, Receipt, Wrench } from "lucide-react";
import { CashMovement, KEYS, Product, Repair, Sale, load, money } from "./lib/storage";

const nav = [
  [LayoutDashboard, "Dashboard", "/"], [Receipt, "Ventas", "/ventas"], [CreditCard, "Caja", "/caja"], [Box, "Inventario", "/inventario"],
  [Gift, "Club City Phone", "/beneficios"], [Wrench, "Servicio técnico", "/servicio-tecnico"], [BarChart3, "Meses y reportes", "/reportes"],
] as const;

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cash, setCash] = useState<CashMovement[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);

  useEffect(() => {
    setSales(load<Sale[]>(KEYS.sales, []));
    setProducts(load<Product[]>(KEYS.products, []));
    setCash(load<CashMovement[]>(KEYS.cash, []));
    setRepairs(load<Repair[]>(KEYS.repairs, []));
  }, []);

  const today = new Date();
  const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === today.toDateString());
  const todayTotal = todaySales.reduce((a,s)=>a+s.total,0);
  const todayNet = todaySales.reduce((a,s)=>a+(s.netTotal ?? s.total),0);
  const cashBalance = cash.filter(m=>m.method==="Efectivo").reduce((a,m)=>a+(m.type==="Ingreso"?m.amount:-m.amount),0);
  const pending = repairs.filter(r=>r.estado!=="Entregado");
  const lowStock = products.filter(p=>p.stock<=p.minStock);

  const days = useMemo(() => Array.from({length:7},(_,i)=>{ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-(6-i)); const total=sales.filter(s=>new Date(s.createdAt).toDateString()===d.toDateString()).reduce((a,s)=>a+s.total,0); return { label:i===6?"Hoy":d.toLocaleDateString("es-AR",{weekday:"short"}).slice(0,3), total }; }), [sales]);
  const weekTotal = days.reduce((a,d)=>a+d.total,0);
  const max = Math.max(...days.map(d=>d.total),1);
  const recentSales = sales.slice(0,5);

  return <div className="city-shell" data-ui-version="club-dashboard-v1"><main className="main">
    <header className="header"><div className="brand-block"><div className="brand"><span className="brand-city">City</span> <span>Phone</span></div><p>Gestión del local · Av. Corrientes 640</p></div><div className="header-actions"><div className="status-pill"><span className="status-dot"/> Sistema activo</div><div className="menu-wrap"><button className={`menu-button ${menuOpen?"open":""}`} onClick={()=>setMenuOpen(!menuOpen)} aria-expanded={menuOpen}><span>Menú</span><ChevronDown size={18}/></button>{menuOpen&&<><button className="menu-backdrop" onClick={()=>setMenuOpen(false)} aria-label="Cerrar menú"/><nav className="dropdown-menu">{nav.map(([Icon,label,href],index)=><Link className={`nav-item ${index===0?"active":""}`} href={href} key={label} onClick={()=>setMenuOpen(false)}><Icon size={18}/><span>{label}</span></Link>)}</nav></>}</div></div></header>

    <section className="welcome dashboard-intro"><div><span className="eyebrow">HOY · RESUMEN DEL LOCAL</span><h1>¡Hola, City Phone! 👋</h1><p>Todo lo importante de tu negocio, en un solo lugar.</p></div></section>

    <section className="kpis"><div className="card kpi-card accent-card"><div className="kpi-top"><span className="icon-box"><DollarSign size={19}/></span><span className="trend positive"><ArrowUpRight size={14}/> Hoy</span></div><div className="kpi-label">Ventas de hoy</div><div className="kpi-value">{money.format(todayTotal)}</div><div className="kpi-foot">{todaySales.length?`${todaySales.length} venta(s) registradas`:"Sin ventas registradas hoy"}</div></div><div className="card kpi-card"><div className="kpi-top"><span className="icon-box"><CreditCard size={19}/></span><span className="neutral-label">Caja</span></div><div className="kpi-label">Dinero en caja</div><div className="kpi-value">{money.format(cashBalance)}</div><div className="kpi-foot">{cash.length?`${cash.length} movimientos registrados`:"Sin movimientos registrados"}</div></div><div className="card kpi-card"><div className="kpi-top"><span className="icon-box"><Wrench size={19}/></span><span className="count-badge">{pending.length} pendientes</span></div><div className="kpi-label">Servicio técnico</div><div className="kpi-value">{repairs.length}</div><div className="kpi-foot">{pending.length?"Equipos por atender":"Sin equipos pendientes"}</div></div><div className="card kpi-card"><div className="kpi-top"><span className="icon-box"><DollarSign size={19}/></span><span className="neutral-label">Hoy</span></div><div className="kpi-label">Venta neta</div><div className="kpi-value">{money.format(todayNet)}</div><div className="kpi-foot">Después de comisiones e IVA</div></div></section>

    <section className="dashboard-grid"><div className="card sales-chart-card"><div className="card-heading"><div><h2>Ventas</h2><p>Rendimiento de los últimos 7 días</p></div><Link href="/reportes" className="text-button">Ver reportes <ArrowUpRight size={15}/></Link></div><div className="chart-summary"><div><span>Total</span><strong>{money.format(weekTotal)}</strong></div></div><div className="fake-chart"><div className="chart-lines"><span/><span/><span/><span/></div><div className="bars">{days.map((d,i)=><i key={i} className={i===6?"today-bar":""} style={{height:`${Math.max(2,(d.total/max)*100)}%`}}/>)}</div><div className="chart-labels">{days.map((d,i)=><span key={i}>{d.label}</span>)}</div></div></div><div className="card quick-card"><div className="card-heading"><div><h2>Accesos rápidos</h2><p>Lo que más usas en el local</p></div></div><div className="quick-grid"><Link href="/inventario"><span><Box size={19}/></span><b>Inventario</b><small>Ver productos</small></Link><Link href="/servicio-tecnico"><span><Wrench size={19}/></span><b>Servicio</b><small>Nuevo equipo</small></Link><Link href="/caja"><span><Receipt size={19}/></span><b>Caja</b><small>Ver movimientos</small></Link></div></div></section>

    <section className="bottom-grid"><div className="card table-card"><div className="card-heading"><div><h2>Ventas recientes</h2><p>Últimas operaciones registradas</p></div><Link href="/ventas" className="text-button">Ver todas <ArrowUpRight size={15}/></Link></div><div className="sales-table">{recentSales.length===0?<div className="empty-state compact">Todavía no hay ventas registradas.</div>:<><div className="table-head"><span>Venta</span><span>Productos</span><span>Pago</span><span>Total</span><span>Hora</span></div>{recentSales.map(s=><div className="table-row" key={s.id}><div><b>#{s.id.toString().slice(-6)}</b><small>{s.customer||"Sin cliente"}</small></div><span>{s.items.map(i=>`${i.qty}x ${i.name}`).join(", ")}</span><span className="method">{s.method}</span><strong>{money.format(s.total)}</strong><small>{new Date(s.createdAt).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</small></div>)}</>}</div></div><div className="card stock-card"><div className="card-heading"><div><h2>Stock bajo</h2><p>Requiere reposición</p></div><span className="warning-circle"><Activity size={17}/></span></div>{lowStock.length===0?<div className="empty-state compact">No hay productos con stock bajo.</div>:<div className="stock-list">{lowStock.slice(0,5).map(item=><div className="stock-item" key={item.id}><span className="product-mini"><Box size={17}/></span><div><b>{item.name}</b><small>Stock mínimo: {item.minStock}</small></div><strong className="stock-number">{item.stock}</strong></div>)}</div>}<Link href="/inventario" className="outline-button button-link">Revisar inventario</Link></div></section>
  </main></div>;
}
