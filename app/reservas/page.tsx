"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDownToLine, Banknote, CalendarClock, CheckCircle2, Clock3, CreditCard, Package, PiggyBank, Plus, ReceiptText, Wallet, X } from "lucide-react";
import AppShell from "../components/AppShell";
import { FundCategory, FundDistribution, FundReceivable, FundsState, KEYS, load, money, save } from "../lib/storage";

const TARGETS:Record<FundCategory,number>={local:1262000,merchandise:400000,personal:850000,food:150000,capital:138000};
const CATEGORY_LABELS:Record<FundCategory,string>={local:"Gastos fijos del local",merchandise:"Reposición de mercancía",personal:"Gastos personales, servicios y plataformas",food:"Comida del hogar",capital:"Margen e imprevistos"};
const CATEGORY_ICONS:Record<FundCategory,typeof Wallet>={local:ReceiptText,merchandise:Package,personal:Wallet,food:Banknote,capital:PiggyBank};
const CATEGORY_ORDER:FundCategory[]=["local","merchandise","personal","food","capital"];
const METHOD_DAYS:Record<FundReceivable["method"],number>={"Efectivo":0,"Débito":2,"Crédito":10,"Crédito internacional":21};
const TODAY=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
function addDays(date:string,days:number){const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function monthKey(date:string){return date.slice(0,7);}
function prettyDate(date:string){if(!date)return "—";const [y,m,d]=date.split("-").map(Number);return new Date(y,m-1,d,12).toLocaleDateString("es-AR",{day:"2-digit",month:"short",year:"numeric"});}
function emptyState():FundsState{return{receivables:[],distributions:[]};}
function allocate(amount:number,remaining:Record<FundCategory,number>):Record<FundCategory,number>{
  const result:Record<FundCategory,number>={local:0,merchandise:0,personal:0,food:0,capital:0};
  const totalRemaining=CATEGORY_ORDER.reduce((sum,key)=>sum+Math.max(0,remaining[key]),0);
  const amountToUse=Math.min(Math.max(0,Math.floor(amount)),totalRemaining);
  if(!totalRemaining||!amountToUse)return result;
  for(const key of CATEGORY_ORDER) result[key]=Math.min(Math.max(0,remaining[key]),Math.floor(amountToUse*Math.max(0,remaining[key])/totalRemaining));
  let leftover=amountToUse-CATEGORY_ORDER.reduce((sum,key)=>sum+result[key],0);
  for(const key of CATEGORY_ORDER){if(leftover<=0)break;const room=Math.max(0,remaining[key]-result[key]);const add=Math.min(room,leftover);result[key]+=add;leftover-=add;}
  return result;
}

export default function ReservasPage(){
  const [state,setState]=useState<FundsState>(emptyState());
  const [loaded,setLoaded]=useState(false);
  const [saleDate,setSaleDate]=useState(TODAY());
  const [cash,setCash]=useState("");
  const [debit,setDebit]=useState("");
  const [credit,setCredit]=useState("");
  const [international,setInternational]=useState("");
  const [notice,setNotice]=useState("");
  const [settlementInputs,setSettlementInputs]=useState<Record<number,string>>({});
  const [distributionAmount,setDistributionAmount]=useState("");
  const [confirmingId,setConfirmingId]=useState<number|null>(null);

  useEffect(()=>{setState(load<FundsState>(KEYS.funds,emptyState()));setLoaded(true);},[]);
  function persist(next:FundsState){setState(next);save(KEYS.funds,next);}

  const today=TODAY();
  const currentMonth=monthKey(today);
  const monthDistributions=useMemo(()=>state.distributions.filter(d=>monthKey(d.date)===currentMonth),[state.distributions,currentMonth]);
  const separated=useMemo(()=>{const result:Record<FundCategory,number>={local:0,merchandise:0,personal:0,food:0,capital:0};for(const d of monthDistributions)for(const key of CATEGORY_ORDER)result[key]+=d.allocations[key]||0;return result;},[monthDistributions]);
  const remaining=useMemo(()=>{const result={} as Record<FundCategory,number>;for(const key of CATEGORY_ORDER)result[key]=Math.max(0,TARGETS[key]-separated[key]);return result;},[separated]);
  const targetRemaining=CATEGORY_ORDER.reduce((sum,key)=>sum+remaining[key],0);
  const creditedTotal=state.receivables.filter(r=>r.status==="Acreditado").reduce((sum,r)=>sum+(r.receivedAmount??r.amount),0);
  const distributedTotal=state.distributions.reduce((sum,d)=>sum+d.amount,0);
  const monthDistributedTotal=monthDistributions.reduce((sum,d)=>sum+d.amount,0);
  const available=Math.max(0,creditedTotal-distributedTotal);
  const pending=useMemo(()=>state.receivables.filter(r=>r.status==="Pendiente").sort((a,b)=>a.dueDate.localeCompare(b.dueDate)),[state.receivables]);
  const pendingTotal=pending.reduce((sum,r)=>sum+r.amount,0);
  const suggestedAmount=Math.min(available,targetRemaining,107692);
  const parsedDistribution=Number(distributionAmount);
  const amountToDistribute=Math.min(available,targetRemaining,Number.isFinite(parsedDistribution)&&distributionAmount.trim()!==""?Math.max(0,parsedDistribution):suggestedAmount);
  const preview=useMemo(()=>allocate(amountToDistribute,remaining),[amountToDistribute,remaining]);
  const recent=useMemo(()=>[...state.receivables].sort((a,b)=>b.saleDate.localeCompare(a.saleDate)||b.id-a.id).slice(0,18),[state.receivables]);

  function registerDay(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const values:[FundReceivable["method"],number][]=[["Efectivo",Number(cash||0)],["Débito",Number(debit||0)],["Crédito",Number(credit||0)],["Crédito internacional",Number(international||0)]];
    if(values.some(([,amount])=>!Number.isFinite(amount)||amount<0)){setNotice("Revisa los importes: no pueden ser negativos.");return;}
    const records=values.filter(([,amount])=>amount>0).map(([method,amount],index)=>{const days=METHOD_DAYS[method];const isCash=method==="Efectivo";return{id:Date.now()+index,saleDate,method,amount:Math.round(amount),dueDate:addDays(saleDate,days),status:isCash?"Acreditado" as const:"Pendiente" as const,receivedAmount:isCash?Math.round(amount):undefined,receivedAt:isCash?saleDate:undefined};});
    if(!records.length){setNotice("Ingresa al menos un importe para registrar la venta del día.");return;}
    persist({...state,receivables:[...records,...state.receivables]});
    setNotice(`Registro guardado. ${records.filter(r=>r.status==="Pendiente").length} acreditación(es) quedaron pendientes.`);
    setCash("");setDebit("");setCredit("");setInternational("");
  }

  function confirmSettlement(record:FundReceivable){
    const amount=Number(settlementInputs[record.id]??record.amount);
    if(!Number.isFinite(amount)||amount<=0){setNotice("Ingresa un importe acreditado válido.");return;}
    const next:FundsState={...state,receivables:state.receivables.map(r=>r.id===record.id?{...r,status:"Acreditado" as const,receivedAmount:Math.round(amount),receivedAt:TODAY()}:r)};
    persist(next);setConfirmingId(null);setNotice(`Acreditación registrada por ${money.format(Math.round(amount))}. Ya puedes incluirla en tu próxima separación.`);
  }

  function distribute(){
    if(amountToDistribute<=0){setNotice("No hay dinero acreditado disponible para separar.");return;}
    const allocations=allocate(amountToDistribute,remaining);
    const amount=CATEGORY_ORDER.reduce((sum,key)=>sum+allocations[key],0);
    if(amount<=0){setNotice("Las metas de este mes ya están cubiertas. El dinero disponible queda sin asignar para que decidas si lo destinas al capital.");return;}
    const distribution:FundDistribution={id:Date.now(),date:TODAY(),amount,allocations};
    persist({...state,distributions:[distribution,...state.distributions]});
    setDistributionAmount("");setNotice(`Separación registrada por ${money.format(amount)}. Recuerda mover esos importes a los frascos correspondientes de Mercado Pago.`);
  }

  return <AppShell title="Reservas y acreditaciones" subtitle="Registra lo vendido, sigue el dinero pendiente y organiza tus frascos." active="Reservas y acreditaciones">
    <section className="kpis page-kpis" style={{marginBottom:16}}>
      <div className="card kpi-card"><div className="kpi-top"><span className="icon-box"><Wallet size={19}/></span></div><div className="kpi-label">Acreditado sin separar</div><div className="kpi-value">{money.format(available)}</div><div className="kpi-foot">Dinero marcado como recibido menos separaciones registradas</div></div>
      <div className="card kpi-card"><div className="kpi-top"><span className="icon-box"><Clock3 size={19}/></span></div><div className="kpi-label">Pendiente de caer</div><div className="kpi-value">{money.format(pendingTotal)}</div><div className="kpi-foot">{pending.length} acreditación(es) pendientes</div></div>
      <div className="card kpi-card"><div className="kpi-top"><span className="icon-box"><PiggyBank size={19}/></span></div><div className="kpi-label">Separado este mes</div><div className="kpi-value">{money.format(monthDistributedTotal)}</div><div className="kpi-foot">Total marcado como separado en frascos</div></div>
      <div className="card kpi-card"><div className="kpi-top"><span className="icon-box"><CalendarClock size={19}/></span></div><div className="kpi-label">Meta mensual restante</div><div className="kpi-value">{money.format(targetRemaining)}</div><div className="kpi-foot">Meta mensual: $2.800.000 (incluye $138.000 de margen)</div></div>
    </section>

    <section className="card" style={{padding:20,marginBottom:16}}>
      <div className="card-heading"><div><h2>Registrar ventas del día</h2><p>Las fechas de acreditación se calculan automáticamente desde la fecha de venta.</p></div><ReceiptText size={20}/></div>
      <form onSubmit={registerDay} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,190px),1fr))",gap:12,marginTop:16}}>
        <label className="field-label">Fecha de venta<input type="date" value={saleDate} max={today} onChange={e=>setSaleDate(e.target.value)} required/></label>
        <label className="field-label">Efectivo · disponible hoy<input type="number" min="0" step="1" value={cash} onChange={e=>setCash(e.target.value)} placeholder="$ 0"/></label>
        <label className="field-label">Débito · 2 días<input type="number" min="0" step="1" value={debit} onChange={e=>setDebit(e.target.value)} placeholder="$ 0"/></label>
        <label className="field-label">Crédito · 10 días<input type="number" min="0" step="1" value={credit} onChange={e=>setCredit(e.target.value)} placeholder="$ 0"/></label>
        <label className="field-label">Crédito internacional · 21 días<input type="number" min="0" step="1" value={international} onChange={e=>setInternational(e.target.value)} placeholder="$ 0"/></label>
        <div style={{display:"flex",alignItems:"end"}}><button className="primary-button" type="submit" style={{width:"100%",justifyContent:"center"}}><Plus size={16}/> Registrar venta</button></div>
      </form>
      <p style={{fontSize:12,color:"var(--muted)",margin:"12px 0 0"}}><AlertCircle size={14} style={{display:"inline",verticalAlign:"-2px",marginRight:5}}/>Ingresa el total por medio de pago. En tarjetas, el importe que finalmente se acredita puede ser menor por comisiones; al confirmar la llegada podrás registrar el importe real.</p>
      {notice&&<div role="status" style={{marginTop:12,padding:12,borderRadius:10,background:"var(--green-soft)",fontSize:13,fontWeight:700}}>{notice}</div>}
    </section>

    <section className="card" style={{padding:20,marginBottom:16}}>
      <div className="card-heading"><div><h2>¿Cuánto separar ahora?</h2><p>La distribución respeta lo que falta para cada meta y no supera el dinero acreditado.</p></div><ArrowDownToLine size={20}/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,230px),1fr))",gap:18,marginTop:16,alignItems:"start"}}>
        <div>
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:5}}>Disponible para separar</div><div style={{fontSize:26,fontWeight:900}}>{money.format(available)}</div>
          <label className="field-label" style={{marginTop:12}}>Importe a separar ahora<input type="number" min="0" max={available} value={distributionAmount} onChange={e=>setDistributionAmount(e.target.value)} placeholder={String(suggestedAmount)}/></label>
          <button className="primary-button" style={{marginTop:10,width:"100%",justifyContent:"center"}} onClick={distribute} disabled={!loaded||amountToDistribute<=0}><CheckCircle2 size={16}/> Confirmar separación</button>
          <p style={{fontSize:11,color:"var(--muted)",marginTop:8}}>Después de confirmar, mueve manualmente cada importe al frasco de Mercado Pago. El sistema registra la separación, no mueve dinero dentro de Mercado Pago.</p>
        </div>
        <div style={{border:"1px solid var(--border)",borderRadius:12,padding:14}}>
          <b style={{fontSize:13}}>Distribución sugerida</b>
          {CATEGORY_ORDER.map(key=><div key={key} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"10px 0",borderBottom:"1px solid var(--border)",fontSize:12}}><span>{CATEGORY_LABELS[key]}</span><b>{money.format(preview[key])}</b></div>)}
          <div style={{display:"flex",justifyContent:"space-between",gap:10,paddingTop:12,fontWeight:900}}><span>Total</span><span>{money.format(CATEGORY_ORDER.reduce((sum,key)=>sum+preview[key],0))}</span></div>
        </div>
      </div>
    </section>

    <section className="card" style={{padding:20,marginBottom:16}}>
      <div className="card-heading"><div><h2>Estado de los frascos</h2><p>Acumulado separado en el mes actual. La meta de $2.800.000 contempla $1.262.000 del local, hasta $400.000 de mercancía, $1.000.000 personales y del hogar, y $138.000 de margen.</p></div><PiggyBank size={20}/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:12,marginTop:16}}>
        {CATEGORY_ORDER.map(key=>{const Icon=CATEGORY_ICONS[key];const progress=Math.min(100,(separated[key]/TARGETS[key])*100);return <div key={key} style={{border:"1px solid var(--border)",borderRadius:12,padding:14}}><div style={{display:"flex",alignItems:"center",gap:8}}><span className="icon-box"><Icon size={17}/></span><b style={{fontSize:12}}>{CATEGORY_LABELS[key]}</b></div><div style={{fontSize:19,fontWeight:900,marginTop:12}}>{money.format(separated[key])}</div><div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>Meta: {money.format(TARGETS[key])}</div><div style={{height:7,background:"var(--green-soft)",borderRadius:99,overflow:"hidden",marginTop:10}}><div style={{width:`${progress}%`,height:"100%",background:"var(--green)",borderRadius:99}}/></div><div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:10,color:"var(--muted)",marginTop:6}}><span>{progress.toFixed(0)}% cubierto</span><span>Falta {money.format(remaining[key])}</span></div></div>})}
      </div>
    </section>

    <section className="card" style={{padding:20,marginBottom:16}}>
      <div className="card-heading"><div><h2>Acreditaciones pendientes</h2><p>Confirma cada ingreso cuando aparezca en la cuenta. La fecha es una estimación por plazo en días corridos.</p></div><Clock3 size={20}/></div>
      {pending.length===0?<div className="empty-state compact" style={{marginTop:14}}>No hay acreditaciones pendientes.</div>:<div style={{display:"grid",gap:10,marginTop:14}}>{pending.map(r=><div key={r.id} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(120px,170px) auto",gap:12,alignItems:"center",border:"1px solid var(--border)",borderRadius:12,padding:12}}><div><b style={{fontSize:13}}>{r.method} · {money.format(r.amount)}</b><div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>Venta: {prettyDate(r.saleDate)} · Estimada: {prettyDate(r.dueDate)}</div>{r.dueDate<today&&<div style={{fontSize:11,color:"#a16207",fontWeight:800,marginTop:4}}>Fecha estimada vencida: revisa si ya se acreditó.</div>}</div><label className="field-label" style={{margin:0}}>Importe recibido<input type="number" min="1" value={settlementInputs[r.id]??String(r.amount)} onChange={e=>setSettlementInputs(v=>({...v,[r.id]:e.target.value}))}/></label><button className="outline-action" onClick={()=>confirmSettlement(r)} style={{justifyContent:"center"}}><CheckCircle2 size={15}/> Confirmar</button></div>)}</div>}
    </section>

    <section className="card" style={{padding:20}}>
      <div className="card-heading"><div><h2>Últimos registros</h2><p>Historial de ventas ingresadas y estado de sus cobros.</p></div><CreditCard size={20}/></div>
      {recent.length===0?<div className="empty-state compact" style={{marginTop:14}}>Todavía no registraste ventas en esta sección.</div>:<div style={{overflowX:"auto",marginTop:12}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:650}}><thead><tr>{["Fecha venta","Medio","Importe venta","Estado","Fecha estimada/real"].map(label=><th key={label} style={{textAlign:"left",padding:"10px 8px",borderBottom:"1px solid var(--border)",color:"var(--muted)"}}>{label}</th>)}</tr></thead><tbody>{recent.map(r=><tr key={r.id}><td style={{padding:"10px 8px",borderBottom:"1px solid var(--border)"}}>{prettyDate(r.saleDate)}</td><td style={{padding:"10px 8px",borderBottom:"1px solid var(--border)"}}>{r.method}</td><td style={{padding:"10px 8px",borderBottom:"1px solid var(--border)",fontWeight:800}}>{money.format(r.amount)}</td><td style={{padding:"10px 8px",borderBottom:"1px solid var(--border)"}}><span style={{color:r.status==="Acreditado"?"var(--green)":"var(--muted)",fontWeight:800}}>{r.status}{r.status==="Acreditado"&&r.receivedAmount!==r.amount?" · neto ajustado":""}</span></td><td style={{padding:"10px 8px",borderBottom:"1px solid var(--border)"}}>{r.status==="Acreditado"?prettyDate(r.receivedAt||r.dueDate):prettyDate(r.dueDate)}</td></tr>)}</tbody></table></div>}
    </section>
  </AppShell>;
}
