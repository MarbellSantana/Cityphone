"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function SalesDateTop(){
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [original,setOriginal]=useState<HTMLInputElement|null>(null);
  const [value,setValue]=useState("");

  useEffect(()=>{
    const input=document.querySelector('input[type="date"]') as HTMLInputElement|null;
    if(!input)return;
    const label=input.closest("label") as HTMLElement|null;
    const card=input.closest(".workspace-card") as HTMLElement|null;
    const heading=card?.querySelector(".card-heading") as HTMLElement|null;
    if(!label||!heading)return;

    const portalHost=document.createElement("div");
    portalHost.setAttribute("data-sales-date-top","true");
    portalHost.style.marginTop="14px";
    portalHost.style.display="flex";
    portalHost.style.alignItems="end";
    portalHost.style.flexWrap="wrap";
    portalHost.style.gap="10px";
    heading.insertAdjacentElement("afterend",portalHost);

    const previousDisplay=label.style.display;
    label.style.display="none";
    setOriginal(input);
    setValue(input.value);
    setHost(portalHost);

    const sync=()=>setValue(input.value);
    input.addEventListener("input",sync);
    input.addEventListener("change",sync);

    return()=>{
      input.removeEventListener("input",sync);
      input.removeEventListener("change",sync);
      label.style.display=previousDisplay;
      portalHost.remove();
    };
  },[]);

  function change(next:string){
    setValue(next);
    if(!original)return;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    setter?.call(original,next);
    original.dispatchEvent(new Event("input",{bubbles:true}));
    original.dispatchEvent(new Event("change",{bubbles:true}));
  }

  if(!host||!original)return null;
  return createPortal(
    <label className="field-label" style={{width:"min(220px,100%)",marginBottom:0}}>
      Fecha de la venta
      <input type="date" value={value} max={original.max} onChange={e=>change(e.target.value)} required/>
    </label>,
    host
  );
}
