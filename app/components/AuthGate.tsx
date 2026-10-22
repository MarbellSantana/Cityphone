"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, ALLOWED_CITYPHONE_EMAIL } from "../lib/supabase-browser";
import CloudSync from "./CloudSync";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage("No se pudo comprobar la sesión. Recarga la página e inténtalo de nuevo.");
      setSession(data.session);
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signIn() {
    if (!supabase) return;
    if (!ALLOWED_CITYPHONE_EMAIL) {
      setMessage("Falta configurar el correo autorizado en GitHub antes de habilitar el acceso.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + (window.location.pathname.startsWith("/Cityphone") ? "/Cityphone/" : "/"),
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setMessage("No se pudo iniciar sesión con Google. Revisa la configuración e inténtalo de nuevo.");
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) setMessage("No se pudo cerrar la sesión. Inténtalo de nuevo.");
  }

  if (!ready) return <main style={pageStyle}><p>Comprobando acceso a City Phone…</p></main>;

  if (!supabase) {
    return <main style={pageStyle}><section style={panelStyle}>
      <h1 style={{ margin: "0 0 8px" }}>City Phone</h1>
      <p>Falta configurar la clave pública de Supabase en las variables de GitHub Actions. El acceso todavía no está habilitado.</p>
    </section></main>;
  }

  if (!session) {
    return <main style={pageStyle}><section style={panelStyle}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "#39834b" }}>CITY PHONE</div>
      <h1 style={{ margin: "10px 0 8px", fontSize: 28 }}>Tu local, bajo control.</h1>
      <p style={{ color: "#5d665f", lineHeight: 1.55, margin: "0 0 24px" }}>Inicia sesión con tu cuenta de Google para acceder al sistema de gestión.</p>
      <button type="button" onClick={signIn} disabled={busy || !ALLOWED_CITYPHONE_EMAIL} style={buttonStyle}>
        {busy ? "Conectando…" : "Continuar con Google"}
      </button>
      {!ALLOWED_CITYPHONE_EMAIL && <p style={warningStyle}>Falta configurar el correo autorizado en las variables de GitHub antes de habilitar el acceso.</p>}
      {message && <p role="alert" style={warningStyle}>{message}</p>}
    </section></main>;
  }

  const email = session.user.email?.trim().toLowerCase() || "";
  if (!ALLOWED_CITYPHONE_EMAIL || email !== ALLOWED_CITYPHONE_EMAIL) {
    return <main style={pageStyle}><section style={panelStyle}>
      <h1 style={{ marginTop: 0 }}>Acceso no autorizado</h1>
      <p>Esta cuenta de Google no está autorizada para usar City Phone.</p>
      <button type="button" onClick={signOut} disabled={busy} style={buttonStyle}>Cerrar sesión</button>
    </section></main>;
  }

  return <><CloudSync />{children}<button type="button" onClick={signOut} disabled={busy} aria-label="Cerrar sesión" style={logoutStyle}>Cerrar sesión</button></>;
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh", display: "grid", placeItems: "center", padding: 24,
  background: "#f5f8f5", color: "#18251b", fontFamily: "Arial, sans-serif",
};
const panelStyle: React.CSSProperties = {
  width: "min(100%, 420px)", boxSizing: "border-box", padding: 32,
  background: "#fff", border: "1px solid #dce8de", borderRadius: 18,
  boxShadow: "0 12px 40px rgba(20, 55, 28, .08)",
};
const buttonStyle: React.CSSProperties = {
  width: "100%", padding: "13px 16px", border: 0, borderRadius: 10,
  background: "#39834b", color: "#fff", fontWeight: 700, fontSize: 15,
  cursor: "pointer",
};
const warningStyle: React.CSSProperties = { color: "#9b332a", fontSize: 13, lineHeight: 1.5, marginTop: 16 };
const logoutStyle: React.CSSProperties = {
  position: "fixed", right: 16, bottom: 16, zIndex: 1000,
  border: "1px solid #cbd8cd", borderRadius: 9, padding: "9px 12px",
  background: "#fff", color: "#263b2a", cursor: "pointer",
};
