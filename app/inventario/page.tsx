"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Box, CalendarDays, Check, Minus, PackageX, Plus, RefreshCw, Search, ShoppingCart, Trash2, Undo2, X } from "lucide-react";
import AppShell from "../components/AppShell";
import { INITIAL_PRODUCTS } from "../lib/initial-products";
import { KEYS, LocalLoan, Product, ProductDefect, load, money, save } from "../lib/storage";

const categories = ["Fundas", "Vidrios", "Cargadores", "Auriculares", "Accesorios"];
type Tab = "productos" | "reposicion" | "fallados" | "prestamos";
type RestockView = "pendientes" | "compra" | "omitidos";

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loans, setLoans] = useState<LocalLoan[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateSearch, setUpdateSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [updateQty, setUpdateQty] = useState(1);
  const [tab, setTab] = useState<Tab>("productos");
  const [restockView, setRestockView] = useState<RestockView>("pendientes");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas las categorías");
  const today = new Date().toISOString().slice(0,10);

  useEffect(() => {
    const storedProducts = load<Product[]>(KEYS.products, []);
    setProducts(storedProducts.length > 0 ? storedProducts : INITIAL_PRODUCTS);
    setLoans(load<LocalLoan[]>(KEYS.localLoans, []));
    setDataLoaded(true);
  }, []);

  useEffect(() => { if (dataLoaded && products.length > 0) save(KEYS.products, products); }, [products, dataLoaded]);
  useEffect(() => { if (dataLoaded) save(KEYS.localLoans, loans); }, [loans, dataLoaded]);

  const filtered = useMemo(() => products.filter(p => {
    const q = search.toLowerCase().trim();
    return (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q)) && (category === "Todas las categorías" || p.category === category);
  }), [products, search, category]);

  const updateResults = useMemo(() => {
    const q = updateSearch.toLowerCase().trim();
    if (!q) return products.slice(0, 8);
    return products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q)).slice(0, 12);
  }, [products, updateSearch]);

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId) || null, [products, selectedProductId]);
  const lowStock = useMemo(() => products.filter(p => p.minStock > 0 && p.stock < p.minStock), [products]);
  const pendingRestock = useMemo(() => lowStock.filter(p => !p.restockOmitted && !p.restockSelected), [lowStock]);
  const purchaseList = useMemo(() => lowStock.filter(p => p.restockSelected && !p.restockOmitted), [lowStock]);
  const omittedRestock = useMemo(() => lowStock.filter(p => p.restockOmitted), [lowStock]);
  const visibleRestock = restockView === "pendientes" ? pendingRestock : restockView === "compra" ? purchaseList : omittedRestock;
  const purchaseUnits = useMemo(() => purchaseList.reduce((sum,p) => sum + (p.minStock - p.stock), 0), [purchaseList]);
  const defectEntries = useMemo(() => products.flatMap(p => (p.defects || []).map(d => ({ ...d, productId:p.id, productName:p.name, category:p.category, code:p.code }))).sort((a,b) => b.createdAt.localeCompare(a.createdAt)), [products]);
  const defectiveUnits = useMemo(() => defectEntries.reduce((sum,d) => sum + d.qty, 0), [defectEntries]);

  function addProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const product: Product = { id:Date.now(), name:String(f.get("name") || "").trim(), code:String(f.get("code") || "").trim(), category:String(f.get("category") || "Accesorios"), cost:Number(f.get("cost") || 0), price:Number(f.get("price") || 0), stock:Number(f.get("stock") || 0), minStock:Number(f.get("minStock") || 0) };
    if (!product.name || product.price < 0 || product.stock < 0) return;
    setProducts(v => [product, ...v]); e.currentTarget.reset(); setProductOpen(false);
  }

  function addLoan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const loan: LocalLoan = { id:Date.now(), product:String(f.get("product") || "").trim(), date:String(f.get("date") || ""), store:String(f.get("store") || "").trim(), createdAt:new Date().toISOString() };
    if (!loan.product || !loan.date || !loan.store) return;
    setLoans(v => [loan, ...v]); e.currentTarget.reset(); setLoanOpen(false);
  }

  function addDefect(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const productId = Number(f.get("productId") || 0);
    const qty = Number(f.get("qty") || 0);
    const reason = String(f.get("reason") || "").trim();
    const date = String(f.get("date") || "");
    const note = String(f.get("note") || "").trim();
    const product = products.find(p => p.id === productId);
    if (!product || qty <= 0 || qty > product.stock || !reason || !date) return;
    const defect: ProductDefect = { id:Date.now(), qty, reason, date, note, createdAt:new Date().toISOString() };
    setProducts(v => v.map(p => p.id === productId ? { ...p, stock:p.stock-qty, defects:[defect, ...(p.defects || [])] } : p));
    e.currentTarget.reset();
  }

  function removeDefect(productId:number, defectId:number) {
    setProducts(v => v.map(p => {
      if (p.id !== productId) return p;
      const defect = (p.defects || []).find(d => d.id === defectId);
      if (!defect) return p;
      return { ...p, stock:p.stock+defect.qty, defects:(p.defects || []).filter(d => d.id !== defectId) };
    }));
  }

  function adjustStock(id:number, delta:number) { setProducts(v => v.map(p => p.id === id ? { ...p, stock:Math.max(0,p.stock+delta) } : p)); }
  function setRestockChoice(id:number, choice:"compra"|"omitir"|"pendiente") {
    setProducts(v => v.map(p => p.id !== id ? p : { ...p, restockSelected:choice === "compra", restockOmitted:choice === "omitir" }));
  }
  function applyStockUpdate() { if (!selectedProduct || updateQty <= 0) return; setProducts(v => v.map(p => p.id === selectedProduct.id ? { ...p, stock:p.stock+updateQty } : p)); closeUpdateModal(); }
  function closeUpdateModal() { setUpdateOpen(false); setUpdateSearch(""); setSelectedProductId(null); setUpdateQty(1); }
  function removeProduct(id:number) { setProducts(v => v.filter(p => p.id !== id)); }
  function removeLoan(id:number) { setLoans(v => v.filter(l => l.id !== id)); }

  return <AppShell title="Inventario" subtitle="Administra productos, reposición, fallados y préstamos entre locales." active="Inventario" action={<div className="inventory-header-actions"><button className="primary-button inventory-main-action" onClick={() => setUpdateOpen(true)}><RefreshCw size={16}/> Actualización</button><button className="primary-button inventory-main-action" onClick={() => setProductOpen(true)}><Plus size={16}/> Cargar producto</button></div>}>
    <div className="subnav-tabs">
      <button className={tab === "productos" ? "active" : ""} onClick={() => setTab("productos")}><Box size={16}/> Productos</button>
      <button className={tab === "reposicion" ? "active" : ""} onClick={() => setTab("reposicion")}><AlertTriangle size={16}/> Reposición {pendingRestock.length > 0 && <span className="count-badge">{pendingRestock.length}</span>}</button>
      <button className={tab === "fallados" ? "active" : ""} onClick={() => setTab("fallados")}><PackageX size={16}/> Fallados {defectiveUnits > 0 && <span className="count-badge">{defectiveUnits}</span>}</button>
      <button className={tab === "prestamos" ? "active" : ""} onClick={() => setTab("prestamos")}><CalendarDays size={16}/> Préstamos locales</button>
    </div>

    {tab === "productos" && <section className="card workspace-card inventory-products-card">
      <div className="card-heading inventory-card-heading"><div><h2>Productos cargados</h2><p>Consulta y administra todo el inventario desde aquí.</p></div><span className="count-badge">{products.length} productos</span></div>
      <div className="toolbar-row inventory-toolbar" style={{marginTop:16}}><div className="search-field grow"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..." /></div><select className="filter-select" value={category} onChange={e => setCategory(e.target.value)}><option>Todas las categorías</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
      {filtered.length === 0 ? <div className="empty-state compact"><Box size={34}/><b>{products.length ? "Sin resultados" : "Inventario vacío"}</b><span>{products.length ? "Prueba con otra búsqueda o categoría." : "Los productos que cargues aparecerán aquí automáticamente."}</span></div> : <div className="inventory-product-list">{filtered.map(p => <article key={p.id} className="inventory-product-row"><div className="inventory-product-main"><h3>{p.name}</h3><small>{p.category}{p.code ? ` · ${p.code}` : ""}</small>{p.minStock > 0 && p.stock < p.minStock && <small className="inventory-reorder"><AlertTriangle size={11}/> {p.restockOmitted ? "Reposición omitida" : p.restockSelected ? "En lista de compra" : "Reponer"}</small>}</div><div className="inventory-metric"><small>Costo</small><strong>{money.format(p.cost)}</strong></div><div className="inventory-metric"><small>Precio</small><strong>{money.format(p.price)}</strong></div><div className="inventory-metric"><small>Stock</small><strong className={p.minStock > 0 && p.stock < p.minStock ? "low-stock" : ""}>{p.stock}</strong></div><div className="inventory-metric"><small>Mín.</small><strong>{p.minStock}</strong></div><div className="inventory-row-actions"><button className="outline-action" onClick={() => adjustStock(p.id,-1)} title="Restar stock"><Minus size={13}/></button><button className="outline-action" onClick={() => adjustStock(p.id,1)} title="Sumar stock"><Plus size={13}/></button><button className="ghost-button" onClick={() => removeProduct(p.id)} title="Eliminar"><Trash2 size={13}/></button></div></article>)}</div>}
    </section>}

    {tab === "reposicion" && <section className="card workspace-card">
      <div className="card-heading inventory-card-heading"><div><h2>Reposición</h2><p>Decide qué productos vas a comprar ahora y cuáles prefieres omitir.</p></div>{purchaseList.length > 0 && <div className="inventory-restock-summary"><strong>{purchaseList.length}</strong><small>en compra · {purchaseUnits} unidades</small></div>}</div>
      <div className="subnav-tabs inventory-restock-tabs" style={{marginTop:16}}>
        <button className={restockView === "pendientes" ? "active" : ""} onClick={() => setRestockView("pendientes")}>Pendientes <span className="count-badge">{pendingRestock.length}</span></button>
        <button className={restockView === "compra" ? "active" : ""} onClick={() => setRestockView("compra")}><ShoppingCart size={15}/> Lista de compra <span className="count-badge">{purchaseList.length}</span></button>
        <button className={restockView === "omitidos" ? "active" : ""} onClick={() => setRestockView("omitidos")}>Omitidos <span className="count-badge">{omittedRestock.length}</span></button>
      </div>
      {visibleRestock.length === 0 ? <div className="empty-state compact"><Check size={32}/><b>{restockView === "pendientes" ? "No tienes reposiciones pendientes" : restockView === "compra" ? "Tu lista de compra está vacía" : "No hay productos omitidos"}</b><span>{restockView === "pendientes" ? "Los productos con stock bajo aparecerán aquí para que decidas qué hacer." : restockView === "compra" ? "Agrega desde Pendientes los productos que quieras comprar." : "Los productos que decidas no reponer por ahora aparecerán aquí."}</span></div> : <div className="inventory-restock-list">{visibleRestock.map((p,index) => { const needed=p.minStock-p.stock; return <div key={p.id} className="inventory-restock-row"><div className="inventory-restock-index">{index+1}</div><div className="inventory-restock-product"><b>{p.name}</b><small>{p.category}{p.code ? ` · ${p.code}` : ""}</small></div><div className="inventory-metric"><small>Stock actual</small><strong className="low-stock">{p.stock}</strong></div><div className="inventory-metric"><small>Mínimo</small><strong>{p.minStock}</strong></div><div className="inventory-needed"><small>Sugerencia</small><strong>{needed} {needed===1?"unidad":"unidades"}</strong></div><div className="inventory-row-actions">{restockView === "pendientes" ? <><button className="primary-button" onClick={() => setRestockChoice(p.id,"compra")}><ShoppingCart size={14}/> Agregar a compra</button><button className="outline-action" onClick={() => setRestockChoice(p.id,"omitir")}>Omitir</button></> : <button className="outline-action" onClick={() => setRestockChoice(p.id,"pendiente")}><Undo2 size={14}/> Volver a pendientes</button>}</div></div>; })}</div>}
    </section>}

    {tab === "fallados" && <section className="card workspace-card">
      <div className="card-heading inventory-card-heading"><div><h2>Fallados y garantías</h2><p>Registra productos defectuosos o cambios de garantía. Las unidades se descuentan automáticamente del stock disponible.</p></div><div className="inventory-restock-summary"><strong>{defectiveUnits}</strong><small>{defectiveUnits===1?"unidad fallada":"unidades falladas"}</small></div></div>
      <div className="inventory-update-hero" style={{marginTop:16}}><div className="inventory-update-icon"><PackageX size={20}/></div><div><b>Registrar producto fallado</b><span>Úsalo para vidrios que vienen malos, fundas o accesorios defectuosos y cambios dentro de la garantía de hasta 3 meses.</span></div></div>
      <form onSubmit={addDefect} className="section-gap">
        <div className="inventory-product-form-grid">
          <label className="field-label modal-wide">Producto<select name="productId" required defaultValue=""><option value="" disabled>Selecciona un producto</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} · Stock {p.stock}</option>)}</select></label>
          <label className="field-label">Cantidad<input name="qty" type="number" min="1" step="1" required defaultValue="1" /></label>
          <label className="field-label">Motivo<select name="reason" required defaultValue="Cambio por garantía (hasta 3 meses)"><option>Cambio por garantía (hasta 3 meses)</option><option>Fallado de fábrica / proveedor</option><option>Otro</option></select></label>
          <label className="field-label">Fecha<input name="date" type="date" required defaultValue={today} /></label>
          <label className="field-label modal-wide">Nota <small>Opcional</small><input name="note" placeholder="Ej. vidrio vino rayado, funda con botón defectuoso..." /></label>
        </div>
        <div className="inventory-form-actions"><button className="primary-button" type="submit"><PackageX size={15}/> Registrar fallado</button></div>
      </form>
      <div className="inventory-table" style={{marginTop:20}}>
        <div className="inventory-head" style={{gridTemplateColumns:"1.5fr .55fr 1.4fr .8fr .65fr"}}><span>Producto</span><span>Cant.</span><span>Motivo</span><span>Fecha</span><span>Acción</span></div>
        {defectEntries.length===0 ? <div className="empty-state compact"><PackageX size={32}/><b>Sin productos fallados</b><span>Los cambios de garantía y productos defectuosos aparecerán aquí.</span></div> : defectEntries.map(d => <div className="inventory-loan-row" style={{gridTemplateColumns:"1.5fr .55fr 1.4fr .8fr .65fr"}} key={`${d.productId}-${d.id}`}><span><b>{d.productName}</b><small>{d.category}{d.code ? ` · ${d.code}` : ""}{d.note ? ` · ${d.note}` : ""}</small></span><span><small>Unidades</small><b>{d.qty}</b></span><span><small>Motivo</small>{d.reason}</span><span><small>Fecha</small>{new Date(`${d.date}T00:00:00`).toLocaleDateString("es-AR")}</span><span><button className="outline-action" onClick={() => removeDefect(d.productId,d.id)} title="Anular y devolver al stock"><Undo2 size={14}/> Anular</button></span></div>)}
      </div>
    </section>}

    {tab === "prestamos" && <section className="card workspace-card">
      <div className="card-heading inventory-card-heading"><div><h2>Préstamos locales</h2><p>Registra productos prestados por otros locales.</p></div><button className="outline-action" onClick={() => setLoanOpen(v => !v)}><Plus size={16}/> Nuevo préstamo</button></div>
      {loanOpen && <form onSubmit={addLoan} className="section-gap"><div className="form-grid"><label className="field-label">Producto<input name="product" required placeholder="Ej. Vidrio Samsung A15" /></label><label className="field-label">Fecha<input name="date" type="date" required /></label><label className="field-label">Local que lo prestó<input name="store" required placeholder="Nombre o número del local" /></label></div><div className="inventory-form-actions"><button className="primary-button" type="submit">Guardar préstamo</button><button className="outline-action" type="button" onClick={()=>setLoanOpen(false)}>Cancelar</button></div></form>}
      <div className="inventory-table"><div className="inventory-head" style={{gridTemplateColumns:"1.5fr 1fr 1.3fr .6fr"}}><span>Producto</span><span>Fecha</span><span>Local</span><span>Acción</span></div>{loans.length===0?<div className="empty-state compact"><CalendarDays size={32}/><b>Sin préstamos registrados</b><span>Los préstamos que cargues aparecerán en esta lista.</span></div>:loans.map(l=><div className="inventory-loan-row" key={l.id}><span><b>{l.product}</b></span><span><small>Fecha</small>{new Date(`${l.date}T00:00:00`).toLocaleDateString("es-AR")}</span><span><small>Local</small>{l.store}</span><span><button className="outline-action" onClick={()=>removeLoan(l.id)} title="Eliminar"><Trash2 size={14}/></button></span></div>)}</div>
    </section>}

    {productOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setProductOpen(false)}><section className="inventory-product-modal" role="dialog" aria-modal="true" aria-labelledby="new-product-title" onMouseDown={e => e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">INVENTARIO</span><h2 id="new-product-title">Cargar producto</h2><p>Completa los datos del nuevo artículo.</p></div><button className="modal-close" onClick={() => setProductOpen(false)} aria-label="Cerrar"><X size={19}/></button></div><form onSubmit={addProduct}><div className="inventory-product-form-grid"><label className="field-label modal-wide">Producto<input name="name" required autoFocus placeholder="Ej. Funda silicona iPhone 13" /></label><label className="field-label">Código <small>Opcional</small><input name="code" placeholder="SKU o código interno" /></label><label className="field-label">Categoría<select name="category" defaultValue="Fundas">{categories.map(c => <option key={c}>{c}</option>)}</select></label><label className="field-label">Costo<input name="cost" type="number" min="0" step="1" defaultValue="0" /></label><label className="field-label">Precio de venta<input name="price" type="number" min="0" step="1" required defaultValue="0" /></label><label className="field-label">Stock inicial<input name="stock" type="number" min="0" step="1" required defaultValue="0" /></label><label className="field-label">Stock mínimo<input name="minStock" type="number" min="0" step="1" defaultValue="0" /></label></div><div className="modal-actions"><button className="outline-action" type="button" onClick={() => setProductOpen(false)}>Cancelar</button><button className="primary-button" type="submit"><Plus size={16}/> Guardar producto</button></div></form></section></div>}

    {updateOpen && <div className="modal-backdrop" role="presentation" onMouseDown={closeUpdateModal}><section className="inventory-product-modal inventory-update-modal" role="dialog" aria-modal="true" aria-labelledby="update-product-title" onMouseDown={e => e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">INVENTARIO</span><h2 id="update-product-title">Actualización de stock</h2><p>Busca el producto y suma lo que acaba de ingresar.</p></div><button className="modal-close" onClick={closeUpdateModal} aria-label="Cerrar"><X size={19}/></button></div><div className="inventory-update-hero"><div className="inventory-update-icon"><RefreshCw size={20}/></div><div><b>Actualizar inventario</b><span>Elige un producto existente y agrega nuevas unidades sin buscarlo en toda la lista.</span></div></div><div className="search-field inventory-update-search"><Search size={18}/><input value={updateSearch} onChange={e => { setUpdateSearch(e.target.value); setSelectedProductId(null); }} autoFocus placeholder="Buscar producto o código..." /></div>{!selectedProduct && <div className="inventory-update-results">{updateResults.length === 0 ? <div className="empty-state compact"><Search size={30}/><b>No encontramos ese producto</b><span>Prueba escribiendo parte del nombre o el código.</span></div> : updateResults.map(p => <button key={p.id} type="button" className="inventory-update-result" onClick={() => setSelectedProductId(p.id)}><span className="inventory-update-result-name"><b>{p.name}</b><small>{p.category}{p.code ? ` · ${p.code}` : ""}</small></span><span className="inventory-stock-pill"><small>Stock</small><strong>{p.stock}</strong></span></button>)}</div>}{selectedProduct && <div className="inventory-update-selected"><button type="button" className="text-button" onClick={() => setSelectedProductId(null)}>← Cambiar producto</button><div className="inventory-update-product-card"><div><small>Producto seleccionado</small><h3>{selectedProduct.name}</h3><span>{selectedProduct.category}{selectedProduct.code ? ` · ${selectedProduct.code}` : ""}</span></div><div className="inventory-stock-pill large"><small>Stock actual</small><strong>{selectedProduct.stock}</strong></div></div><label className="field-label inventory-update-qty">Unidades que ingresaron<input type="number" min="1" step="1" value={updateQty} onChange={e => setUpdateQty(Math.max(1, Number(e.target.value) || 1))} /></label><div className="inventory-update-preview"><span>Stock después de actualizar</span><strong>{selectedProduct.stock + updateQty}</strong></div></div>}<div className="modal-actions"><button className="outline-action" type="button" onClick={closeUpdateModal}>Cancelar</button><button className="primary-button" type="button" disabled={!selectedProduct || updateQty <= 0} onClick={applyStockUpdate}><RefreshCw size={16}/> Actualizar stock</button></div></section></div>}
  </AppShell>;
}