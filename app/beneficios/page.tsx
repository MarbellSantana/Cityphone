"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift, MessageCircle, Search, UserPlus, Users, WalletCards } from "lucide-react";
import AppShell from "../components/AppShell";
import { KEYS, LoyaltyCustomer, Sale, load, money, save } from "../lib/storage";

const normalizePhone=(v:string)=>v.replace(/\D/g,"");
const benefitFor=(purchases:number)=>{
  if(purchases>=5)return "Premio City Phone";
  if(purchases===4)return "15% OFF";
  if(purchases===3)return "Colocación de vidrio con descuento";
  if(purchases===2)return "10% OFF en accesorio";
  return "Primera compra registrada";
};
const nextBenefitFor=(purchases:number)=>{
  if(purchases>=5)return "Premio alcanzado · próximo ciclo por definir";
  if(purchases===4)return "5.ª compra: Premio City Phone";
  if(purchases===3)return "4.ª compra: 15% OFF";
  if(purchases===2)return "3.ª compra: colocación de vidrio con descuento";
  return "2.ª compra: 10% OFF en accesorio";
};
const makeCode=(name:string,phone:string)=>{
  const base=name.trim().toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9]/g,"").slice(0,4)||"CITY";
  const tail=normalizePhone(phone).slice(-4)||String(Date.now()).slice(-4);
  return `${base}${tail}`;
};
const whatsappPhone=(phone:string)=>{
  const clean=normalizePhone(phone);
  if(!clean)return "";
  if(clean.startsWith("54"))return clean;
  if(clean.startsWith("0"))return `54${clean.slice(1).replace(/^15/,"")}`;
  return `54${clean}`;
};
const welcomeText=(customer:{name:string;referralCode:string})=>`💚 ¡Hola ${customer.name}! Bienvenido/a al Club City Phone.

Desde hoy, cada compra que hagas con nosotros te acerca a nuevos beneficios exclusivos. 🎁

Además, tenés tu propio código de referido:

✨ ${customer.referralCode}

Compartilo con tus amigos. Si alguien realiza su primera compra usando tu código, vos recibís $3.000 de crédito City Phone para tu próxima compra. 💸

Y esto recién empieza: mientras más nos visites, más beneficios vas desbloqueando. 💚

📍 City Phone
Av. Corrientes 640, Local 8 · Galería Central`;

export default function BeneficiosPage(){
  const[customers,setCustomers]=useState<LoyaltyCustomer[]>([]);
  const[sales,setSales]=useState<Sale[]>([]);
  const[search,setSearch]=useState("");
  const[name,setName]=useState("");
  const[phone,setPhone]=useState("");
  const[email,setEmail]=useState("");
  const[referredByCode,setReferredByCode]=useState("");
  const[notice,setNotice]=useState("");

  useEffect(()=>{setCustomers(load<LoyaltyCustomer[]>(KEYS.loyaltyCustomers,[]));setSales(load<Sale[]>(KEYS.sales,[]))},[]);

  const saleCounts=useMemo(()=>{
    const map=new Map<string,number>();
    for(const sale of sales){const p=normalizePhone(sale.customerPhone||"");if(p)map.set(p,(map.get(p)||0)+1)}
    return map;
  },[sales]);

  const enriched=useMemo(()=>customers.map(c=>{
    const automatic=saleCounts.get(normalizePhone(c.phone))||0;
    const purchases=automatic+c.manualPurchases;
    return {...c,automaticPurchases:automatic,purchases,benefit:benefitFor(purchases),nextBenefit:nextBenefitFor(purchases)};
  }),[customers,saleCounts]);

  const filtered=useMemo(()=>{const q=search.toLowerCase().trim();return enriched.filter(c=>!q||c.name.toLowerCase().includes(q)||c.phone.includes(q)||c.referralCode.toLowerCase().includes(q))},[enriched,search]);
  const totalCredit=enriched.reduce((s,c)=>s+c.credit,0);
  const totalReferrals=enriched.reduce((s,c)=>s+c.referralCount,0);

  function persist(next:LoyaltyCustomer[]){setCustomers(next);save(KEYS.loyaltyCustomers,next)}

  function sendWelcome(customer:{name:string;phone:string;referralCode:string}){
    const target=whatsappPhone(customer.phone);
    if(!target){setNotice("El cliente no tiene un teléfono válido para WhatsApp.");return}
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(welcomeText(customer))}`,"_blank","noopener,noreferrer");
  }

  function addCustomer(andSendWelcome=false){
    const cleanPhone=normalizePhone(phone);
    if(!name.trim()||cleanPhone.length<6){setNotice("Completa nombre y teléfono del cliente.");return}
    if(customers.some(c=>normalizePhone(c.phone)===cleanPhone)){setNotice("Ese teléfono ya está registrado en Club City Phone.");return}
    const code=makeCode(name,cleanPhone);
    let next=[...customers];
    const ref=referredByCode.trim().toUpperCase();
    if(ref){
      const idx=next.findIndex(c=>c.referralCode.toUpperCase()===ref);
      if(idx>=0)next[idx]={...next[idx],credit:next[idx].credit+3000,referralCount:next[idx].referralCount+1};
    }
    const customer:LoyaltyCustomer={id:Date.now(),name:name.trim(),phone:cleanPhone,email:email.trim()||undefined,referralCode:code,referredByCode:ref||undefined,manualPurchases:0,credit:0,referralCount:0,createdAt:new Date().toISOString()};
    persist([customer,...next]);
    if(andSendWelcome)sendWelcome(customer);
    setName("");setPhone("");setEmail("");setReferredByCode("");setNotice(ref?"Cliente agregado. Se acreditaron $3.000 al cliente que lo recomendó.":"Cliente agregado a Club City Phone.")
  }

  function addManualPurchase(id:number){persist(customers.map(c=>c.id===id?{...c,manualPurchases:c.manualPurchases+1}:c));setNotice("Compra sumada al beneficio del cliente.")}
  function addCredit(id:number){persist(customers.map(c=>c.id===id?{...c,credit:c.credit+3000}:c));setNotice("Se agregaron $3.000 de crédito City Phone.")}
  function useCredit(id:number){const c=customers.find(x=>x.id===id);if(!c||c.credit<=0)return;const amount=Math.min(3000,c.credit);persist(customers.map(x=>x.id===id?{...x,credit:Math.max(0,x.credit-amount)}:x));setNotice(`Se descontaron ${money.format(amount)} de crédito.`)}

  return <AppShell title="Club City Phone" subtitle="Fidelización, beneficios por compras y programa de referidos." active="Club City Phone">
    {notice&&<div className="card" style={{padding:14,marginBottom:16}}>{notice}</div>}

    <section className="kpis page-kpis" style={{marginBottom:16}}>
      <div className="card kpi-card"><div className="kpi-top"><span className="icon-box"><Users size={19}/></span></div><div className="kpi-label">Clientes</div><div className="kpi-value">{customers.length}</div><div className="kpi-foot">Registrados en el club</div></div>
      <div className="card kpi-card"><div className="kpi-top"><span className="icon-box"><Gift size={19}/></span></div><div className="kpi-label">Referidos</div><div className="kpi-value">{totalReferrals}</div><div className="kpi-foot">Recomendaciones registradas</div></div>
      <div className="card kpi-card"><div className="kpi-top"><span className="icon-box"><WalletCards size={19}/></span></div><div className="kpi-label">Crédito pendiente</div><div className="kpi-value">{money.format(totalCredit)}</div><div className="kpi-foot">Crédito City Phone disponible</div></div>
    </section>

    <section className="card" style={{padding:18,marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><UserPlus size={20}/><h2 style={{margin:0}}>Agregar cliente</h2></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
        <input className="input" placeholder="Nombre y apellido" value={name} onChange={e=>setName(e.target.value)}/>
        <input className="input" placeholder="Teléfono" value={phone} onChange={e=>setPhone(e.target.value)}/>
        <input className="input" placeholder="Email (opcional)" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input className="input" placeholder="Código de quien lo refirió" value={referredByCode} onChange={e=>setReferredByCode(e.target.value.toUpperCase())}/>
        <button className="btn" onClick={()=>addCustomer(false)}>Agregar al Club</button>
        <button className="btn primary" onClick={()=>addCustomer(true)}><MessageCircle size={17}/> Agregar y enviar bienvenida</button>
      </div>
      <p style={{margin:"12px 0 0",opacity:.7,fontSize:13}}>Referidos: el nuevo cliente recibe 10% OFF en su primera compra y quien lo recomendó suma $3.000 de crédito City Phone. El crédito se usa desde compras de $20.000 y no se acumula con otras promociones.</p>
    </section>

    <section className="card" style={{padding:18}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}><Search size={18}/><input className="input" style={{maxWidth:380}} placeholder="Buscar por nombre, teléfono o código" value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <div style={{display:"grid",gap:12}}>
        {filtered.map(c=><div key={c.id} style={{border:"1px solid rgba(128,128,128,.2)",borderRadius:14,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div><strong style={{fontSize:17}}>{c.name}</strong><div style={{opacity:.7,fontSize:13}}>{c.phone}{c.email?` · ${c.email}`:""}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:12,opacity:.65}}>Código de referido</div><strong>{c.referralCode}</strong></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginTop:14}}>
            <div><div style={{fontSize:12,opacity:.65}}>Compras</div><strong>{c.purchases}</strong><div style={{fontSize:11,opacity:.55}}>{c.automaticPurchases} desde ventas + {c.manualPurchases} manuales</div></div>
            <div><div style={{fontSize:12,opacity:.65}}>Beneficio actual</div><strong>{c.benefit}</strong></div>
            <div><div style={{fontSize:12,opacity:.65}}>Próximo</div><strong>{c.nextBenefit}</strong></div>
            <div><div style={{fontSize:12,opacity:.65}}>Crédito</div><strong>{money.format(c.credit)}</strong></div>
            <div><div style={{fontSize:12,opacity:.65}}>Referidos</div><strong>{c.referralCount}</strong></div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
            <button className="btn primary" onClick={()=>sendWelcome(c)}><MessageCircle size={16}/> Enviar bienvenida</button>
            <button className="btn" onClick={()=>addManualPurchase(c.id)}>+ Compra</button>
            <button className="btn" onClick={()=>addCredit(c.id)}>+ $3.000 crédito</button>
            <button className="btn" disabled={c.credit<=0} onClick={()=>useCredit(c.id)}>Usar crédito</button>
          </div>
        </div>)}
        {filtered.length===0&&<div style={{padding:20,textAlign:"center",opacity:.65}}>Todavía no hay clientes para mostrar.</div>}
      </div>
    </section>
  </AppShell>
}
