"use client";

import { useMemo, useState } from "react";
import { Building2, FileText, Plus, Printer, Trash2 } from "lucide-react";
import AppShell from "../components/AppShell";
import { money } from "../lib/storage";

type Item={id:number;producto:string;cantidad:number;precio:number};

export default function CotizacionesPage(){
 const[empresa,setEmpresa]=useState(""),[cuit,setCuit]=useState(""),[contacto,setContacto]=useState(""),[telefono,setTelefono]=useState(""),[email,setEmail]=useState(""),[validez,setValidez]=useState("15 días"),[observaciones,setObservaciones]=useState("");
 const[items,setItems]=useState<Item[]>([{id:Date.now(),producto:"",cantidad:1,precio:0}]);
 const total=useMemo(()=>items.reduce((s,i)=>s+(Number(i.cantidad)||0)*(Number(i.precio)||0),0),[items]);
 const numero="COT-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+String(Date.now()).slice(-4);
 function update(id:number,key:keyof Item,value:string){setItems(v=>v.map(i=>i.id===id?{...i,[key]:key==="producto"?value:Number(value)}:i))}
 function add(){setItems(v=>[...v,{id:Date.now(),producto:"",cantidad:1,precio:0}])}
 function remove(id:number){setItems(v=>v.length===1?v:v.filter(i=>i.id!==id))}
 return <AppShell title="Cotizaciones" subtitle="Cotizaciones de accesorios para empresas." active="Cotizaciones" action={<button className="primary-button" onClick={()=>window.print()}><Printer size={16}/> Imprimir / PDF</button>}>
  <section className="card" style={{padding:18}}>
   <div className="card-heading"><div><h2>Datos de la empresa</h2><p>Completa los datos del cliente para la cotización.</p></div><span className="icon-box"><Building2 size={18}/></span></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10,marginTop:15}}>
    <label className="field-label">Razón social<input value={empresa} onChange={e=>setEmpresa(e.target.value)}/></label>
    <label className="field-label">CUIT<input value={cuit} onChange={e=>setCuit(e.target.value)}/></label>
    <label className="field-label">Contacto<input value={contacto} onChange={e=>setContacto(e.target.value)}/></label>
    <label className="field-label">Teléfono<input value={telefono} onChange={e=>setTelefono(e.target.value)}/></label>
    <label className="field-label">Correo<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label className="field-label">Validez<input value={validez} onChange={e=>setValidez(e.target.value)}/></label>
   </div>
  </section>
  <section className="card section-gap" style={{padding:18}}>
   <div className="card-heading"><div><h2>Productos</h2><p>Escribe manualmente cada accesorio, cantidad y precio.</p></div><button className="primary-button" onClick={add}><Plus size={16}/> Agregar producto</button></div>
   <div style={{display:"grid",gap:9,marginTop:16}}>
    {items.map((i,n)=><div key={i.id} style={{display:"grid",gridTemplateColumns:"42px minmax(180px,2fr) minmax(90px,.6fr) minmax(120px,.8fr) minmax(120px,.8fr) 40px",gap:8,alignItems:"end"}}>
     <b style={{paddingBottom:11,textAlign:"center"}}>{n+1}</b>
     <label className="field-label">Producto / accesorio<input placeholder="Ej. Funda Samsung A16" value={i.producto} onChange={e=>update(i.id,"producto",e.target.value)}/></label>
     <label className="field-label">Cantidad<input type="number" min="1" value={i.cantidad} onChange={e=>update(i.id,"cantidad",e.target.value)}/></label>
     <label className="field-label">Precio unitario<input type="number" min="0" value={i.precio||""} onChange={e=>update(i.id,"precio",e.target.value)}/></label>
     <div style={{paddingBottom:10}}><small style={{display:"block",color:"var(--muted)",fontWeight:800}}>Subtotal</small><b>{money.format(i.cantidad*i.precio)}</b></div>
     <button className="ghost-button" onClick={()=>remove(i.id)} title="Eliminar"><Trash2 size={16}/></button>
    </div>)}
   </div>
   <div style={{display:"flex",justifyContent:"flex-end",marginTop:18,paddingTop:15,borderTop:"1px solid var(--border)"}}><div style={{textAlign:"right"}}><small style={{fontWeight:900,color:"var(--muted)"}}>TOTAL COTIZACIÓN</small><div style={{fontSize:28,fontWeight:950}}>{money.format(total)}</div></div></div>
  </section>
  <section className="card section-gap" style={{padding:18}}>
   <div className="card-heading"><div><h2>Observaciones</h2><p>Condiciones comerciales o información adicional.</p></div><FileText size={18}/></div>
   <textarea value={observaciones} onChange={e=>setObservaciones(e.target.value)} placeholder="Ej. Precios sujetos a disponibilidad. Entrega a coordinar." style={{width:"100%",minHeight:90,marginTop:12,border:"1px solid var(--border)",borderRadius:12,padding:12,font:"inherit"}}/>
   <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginTop:14,fontSize:10,color:"var(--muted)"}}><span><b>{numero}</b> · {new Date().toLocaleDateString("es-AR")}</span><span>City Phone · Av. Corrientes 640, Local 8 · Galería Central, CABA</span></div>
  </section>
  <style jsx global>{`@media print{.header,.page-title-row .primary-button,.menu-wrap,.status-pill{display:none!important}.main{padding:0!important}.card{box-shadow:none!important;break-inside:avoid}.primary-button,.ghost-button{display:none!important}input,textarea{border:0!important;padding-left:0!important}.section-gap{margin-top:12px!important}}`}</style>
 </AppShell>
}