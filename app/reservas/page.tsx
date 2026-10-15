"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, Banknote, CalendarClock, CheckCircle2, Package, PiggyBank, ReceiptText, Wallet } from "lucide-react";
import AppShell from "../components/AppShell";
import { FundCategory, FundDistribution, FundsState, KEYS, load, money, save } from "../lib/storage";

const TARGETS:Record<FundCategory,number>={local:1262000,merchandise:400000,personal:850000,food:150000,capital:138000};
const CATEGORY_LABELS:Record<FundCategory,string>={local:"Gastos fijos del local",merchandise:"Reposición de mercancía",personal:"Gastos personales, servicios y plataformas",food:"Comida del hogar",capital:"Margen e imprevistos"};
const CATEGORY_ICONS:Record<FundCategory,typeof Wallet>={local:ReceiptText,merchandise:Package,personal:Wallet,food:Banknote,capital:PiggyBank};
const CATEGORY_ORDER:FundCategory[]=["local","merchandise","personal","food","capital"];
const TODAY=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
function monthKey(date:string){return date.slice(0,7);}
function prettyDate(date:string){if(!date)return "—";const [y,m,d]=date.split("-").map(Number);return new Date(y,m-1,d,12).toLocaleDateString("es-AR",{day:"2-digit",month:"short",year:"numeric"});}
function emptyState():FundsState{return{receivables:[],distributions:[]};}
function allocate(amount:number,remaining:Record<FundCategory,number>):Record<FundCategory,number>{
  const result:Record<FundCategory,number>={local:0,merchandise:0,personal:0,food:0,capital:0};
  const totalRemaining=CATEGORY_ORDER.reduce((sum,key)=>sum+Math.max(0,remaining[key]),0);
  const amountToUse=Math.min(Math.max(0,Math.floor(amount)),totalRemaining);
  if(!totalRemaining||!amountToUse)return result;
  for(const key of CATEGORY_ORDER)result[key]=Math.min(Math.max(0,remaining[key]),Math.floor(amountToUse*Math.max(0,remaining[key])/totalRemaining));
  let leftover=amountToUse-CATEGORY_ORDER.reduce((sum,key)=>sum+result[key],0);
  for(const key of CATEGORY_ORDER){if(leftover<=0)break;const room=Math.max(0,remaining[key]-result[key]);const add=Math.min(room,leftover);result[key]+=add;leftover-=add;}
  return result;
}

export default function ReservasPage(){
  const [state,setState]=useState<FundsState>(emptyState());
  const [loaded,setLoaded]=useState(false);
  const [availableInput,setAvailableInput]=useState("");
  const [distributionAmount,setDistributionAmount]=useState("");
  const [notice,setNotice]=useState("");

  useEffect(()=>{
    const existing=load<FundsState>(KEYS.funds,emptyState());
    setState({...existing,receivables:[]});
    setLoaded(true);
  },[]);
  function persist(next:FundsState){setState(next);save(KEYS.funds,next);}

  const today=TODAY();
  const currentMonth=monthKey(today);
  const monthDistributions=useMemo(()=>state.distributions.filter(d=>monthKey(d.date)===currentMonth),[state.distributions,currentMonth]);
  const separated=useMemo(()=>{const result:Record<FundCategory,number>={local:0,merchandise:0,personal:0,food:0,capital:0};for(const d of monthDistributions)for(const key of CATEGORY_ORDER)result[key]+=d.allocations[key]||0;return result;},[monthDistributions]);
  const remaining=useMemo(()=>{const result={} as Record<FundCategory,number>;for(const key of CATEGORY_ORDER)result[key]=Math.max(0,TARGETS[key]-separated[key]);return result;},[separated]);
  const targetRemaining=CATEGORY_ORDER.reduce((sum,key)=>sum+remaining[key],0);
  const available=Number(availableInput);
  const validAvailable=availableInput.trim()!==""&&Number.isFinite(available)&&available>0;
  const parsedDistribution=Number(distributionAmount);
  const amountToDistribute=Math.min(validAvailable?available:0,targetRemaining,distributionAmount.trim()!==""&&Number.isFinite(parsedDistribution)?Math.max(0,parsedDistribution):(validAvailable?Math.min(available,targetRemaining):0));
  const preview=useMemo(()=>allocate(amountToDistribute,remaining),[amountToDistribute,remaining]);

  function distribute(){
    if(!validAvailable){setNotice("Ingresa cuánto dinero tienes realmente disponible para reservar.");return;}
    if(!Number.isFinite(parsedDistribution)||distributionAmount.trim()===""||parsedDistribution<=0){setNotice("Ingresa el importe que quieres reservar.");return;}
    if(parsedDistribution>available){setNotice("El importe a reservar no puede superar el dinero disponible que ingresaste.");return;}
    if(amountToDistribute<=0){setNotice("No hay importe disponible para reservar o las metas de este mes ya están cubiertas.");return;}
    const allocations=allocate(amountToDistribute,remaining);
    const amount=CATEGORY_ORDER.reduce((sum,key)=>sum+allocations[key],0);
    if(amount<=0){setNotice("Las metas de este mes ya están cubiertas. Revisa si quieres ajustar las metas.");return;}
    const distribution:FundDistribution={id:Date.now(),date:today,amount,allocations};
    persist({...state,receivables:[],distributions:[distribution,...state.distributions]});
    setAvailableInput(String(Math.max(0,available-amount)));
    setDistributionAmount("");
    setNotice(`Reserva registrada por ${money.format(amount)}. Recuerda mover los importes a los frascos correspondientes.`);
  }

  return <AppShell title="Reservas" subtitle="Organiza el dinero que decides apartar para los gastos y metas del local." active="Reservas">
    <section className="kpis page-kpis" style={{marginBottom:16}}>
      <div className="card kpi-card"><div className="kpi-top"><span className="icon-box"><Wallet size={19}/></span></div><div className="kpi-label">Disponible para reservar</div><div className="kpi-value">{money.format(validAvailable?available:0)}</div><div className="kpi-foot">Importe que ingresas manualmente según el dinero que tienes realmente disponible</div></div>
      <div className="card kpi-card"><div className="kpi-top"><span className="icon-box"><PiggyBank size={19}/></span></div><div className="kpi-label">Reservado este mes</div><div className="kpi-value">{money.format(monthDistributions.reduce((sum,d)=>sum+d.amount,0))}</div><div className="kpi-foot">Total registrado en reservas durante el mes actual</div></div>
      <div className="card kpi-card"><div className="kpi-top"><span className="icon-box"><CalendarClock size={19}/></span></div><div className="kpi-label">Meta mensual restante</div><div className="kpi-value">{money.format(targetRemaining)}</div><div className="kpi-foot">Meta mensual total: $2.800.000, incluido el margen de $138.000</div></div>
    </section>

    <section className="card" style={{padding:20,marginBottom:16}}>
      <div className="card-heading"><div><h2>Registrar una reserva</h2><p>Esta sección ya no calcula acreditaciones ni suma automáticamente ventas. Tú indicas el dinero que realmente tienes disponible y cuánto quieres reservar.</p></div><ArrowDownToLine size={20}/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,250px),1fr))",gap:14,marginTop:16,alignItems:"end"}}>
        <label className="field-label">Dinero disponible para reservar<input type="number" min="0" step="1" value={availableInput} onChange={e=>setAvailableInput(e.target.value)} placeholder="$ 0"/></label>
        <label className="field-label">Importe que quieres reservar<input type="number" min="0" step="1" max={validAvailable?available:undefined} value={distributionAmount} onChange={e=>setDistributionAmount(e.target.value)} placeholder="Escribe un importe"/></label>
      </div>
      <div style={{border:"1px solid var(--border)",borderRadius:12,padding:14,marginTop:14}}>
        <b style={{fontSize:13}}>Distribución sugerida</b>
        {CATEGORY_ORDER.map(key=><div key={key} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"10px 0",borderBottom:"1px solid var(--border)",fontSize:12}}><span>{CATEGORY_LABELS[key]}</span><b>{money.format(preview[key])}</b></div>)}
        <div style={{display:"flex",justifyContent:"space-between",gap:10,paddingTop:12,fontWeight:900}}><span>Total de la reserva</span><span>{money.format(CATEGORY_ORDER.reduce((sum,key)=>sum+preview[key],0))}</span></div>
      </div>
      <button className="primary-button" style={{marginTop:14,width:"100%",justifyContent:"center"}} onClick={distribute} disabled={!loaded||!validAvailable||!distributionAmount.trim()||parsedDistribution<=0||parsedDistribution>available||amountToDistribute<=0}><CheckCircle2 size={16}/> Confirmar reserva</button>
      <p style={{fontSize:11,color:"var(--muted)",marginTop:8}}>El sistema solo registra la reserva; no mueve dinero dentro de Mercado Pago ni consulta tu saldo bancario. Antes de confirmar, verifica el importe disponible.</p>
      {notice&&<div role="status" style={{marginTop:12,padding:12,borderRadius:10,background:"var(--green-soft)",fontSize:13,fontWeight:700}}>{notice}</div>}
    </section>

    <section className="card" style={{padding:20,marginBottom:16}}>
      <div className="card-heading"><div><h2>Estado de las reservas</h2><p>Acumulado reservado en el mes actual frente a cada meta.</p></div><PiggyBank size={20}/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:12,marginTop:16}}>
        {CATEGORY_ORDER.map(key=>{const Icon=CATEGORY_ICONS[key];const progress=Math.min(100,(separated[key]/TARGETS[key])*100);return <div key={key} style={{border:"1px solid var(--border)",borderRadius:12,padding:14}}><div style={{display:"flex",alignItems:"center",gap:8}}><span className="icon-box"><Icon size={17}/></span><b style={{fontSize:12}}>{CATEGORY_LABELS[key]}</b></div><div style={{fontSize:19,fontWeight:900,marginTop:12}}>{money.format(separated[key])}</div><div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>Meta: {money.format(TARGETS[key])}</div><div style={{height:7,background:"var(--green-soft)",borderRadius:99,overflow:"hidden",marginTop:10}}><div style={{width:`${progress}%`,height:"100%",background:"var(--green)",borderRadius:99}}/></div><div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:10,color:"var(--muted)",marginTop:6}}><span>{progress.toFixed(0)}% cubierto</span><span>Falta {money.format(remaining[key])}</span></div></div>})}
      </div>
    </section>

    <section className="card" style={{padding:20}}>
      <div className="card-heading"><div><h2>Historial de reservas</h2><p>Reservas registradas en los distintos meses.</p></div><ReceiptText size={20}/></div>
      {state.distributions.length===0?<div className="empty-state compact" style={{marginTop:14}}>Todavía no registraste reservas.</div>:<div style={{overflowX:"auto",marginTop:12}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:650}}><thead><tr>{["Fecha","Importe reservado","Gastos fijos","Mercancía","Personal y plataformas","Comida","Margen"].map(label=><th key={label} style={{textAlign:"left",padding:"10px 8px",borderBottom:"1px solid var(--border)",color:"var(--muted)"}}>{label}</th>)}</tr></thead><tbody>{[...state.distributions].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id).map(d=><tr key={d.id}><td style={{padding:"10px 8px",borderBottom:"1px solid var(--border)"}}>{prettyDate(d.date)}</td><td style={{padding:"10px 8px",borderBottom:"1px solid var(--border)",fontWeight:800}}>{money.format(d.amount)}</td>{CATEGORY_ORDER.map(key=><td key={key} style={{padding:"10px 8px",borderBottom:"1px solid var(--border)"}}>{money.format(d.allocations[key]||0)}</td>)}</tr>)}</tbody></table></div>}
    </section>
  </AppShell>;
}
