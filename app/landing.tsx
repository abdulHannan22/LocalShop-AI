"use client";

import { FormEvent, useEffect, useState } from "react";
import { LocalShopWorkspace } from "./localshop-workspace";

type Store = { name: string; slug: string };
type Mode = "checking" | "choose" | "merchant-login" | "merchant-signup" | "merchant-reset-request" | "merchant-reset-confirm" | "workspace";

export function Landing() {
  const [mode, setMode] = useState<Mode>("checking");
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupStoreName, setSignupStoreName] = useState("");
  const [signupSlug, setSignupSlug] = useState("");
  const [signupOwnerName, setSignupOwnerName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [showStores, setShowStores] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("choose")) {
      setMode("choose");
      return;
    }
    fetch("/api/me")
      .then((response) => (response.ok ? "workspace" : "choose"))
      .then((next) => setMode(next as Mode))
      .catch(() => setMode("choose"));
  }, []);

  function loadStores() {
    setStoresLoading(true);
    fetch("/api/stores")
      .then(async (response) => (await response.json()) as { stores: Store[] })
      .then((data) => setStores(data.stores ?? []))
      .catch(() => setStores([]))
      .finally(() => setStoresLoading(false));
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: loginEmail, password: loginPassword }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not sign in");
      setMode("workspace");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  async function submitSignup(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: signupStoreName,
          slug: signupSlug,
          ownerName: signupOwnerName,
          email: signupEmail,
          password: signupPassword,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not create your store");
      setMode("workspace");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create your store");
    } finally {
      setLoading(false);
    }
  }

  async function submitResetRequest(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResetMessage("");
    try {
      const response = await fetch("/api/auth/reset/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: resetEmail }) });
      const data = (await response.json()) as { message?: string; devCode?: string | null; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not send reset code");
      setResetMessage(data.devCode ? `${data.message} Demo code: ${data.devCode}` : data.message ?? "Check your email for a code.");
      setMode("merchant-reset-confirm");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send reset code");
    } finally {
      setLoading(false);
    }
  }

  async function submitResetConfirm(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword: resetNewPassword }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not reset your password");
      setLoginEmail(resetEmail);
      setLoginPassword("");
      setResetCode("");
      setResetNewPassword("");
      setResetMessage("");
      setError("");
      setMode("merchant-login");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not reset your password");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "checking") {
    return <main className="landing-shell"><p className="landing-loading">Loading…</p></main>;
  }

  if (mode === "workspace") {
    return <LocalShopWorkspace />;
  }

  if (mode === "merchant-login") {
    return (
      <main className="landing-shell">
        <div className="landing-card">
          <button type="button" className="landing-back" onClick={() => setMode("choose")}>← Back</button>
          <h1>Merchant sign in</h1>
          <form onSubmit={submitLogin}>
            <label>Email<input required type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label>
            <label>Password<input required type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>
            {error && <div className="landing-error">{error}</div>}
            <button disabled={loading} type="submit">{loading ? "Signing in…" : "Sign in"}</button>
          </form>
          <p className="landing-switch">New store? <button type="button" onClick={() => { setError(""); setMode("merchant-signup"); }}>Create one</button></p>
          <p className="landing-switch">Forgot your password? <button type="button" onClick={() => { setError(""); setResetEmail(loginEmail); setMode("merchant-reset-request"); }}>Reset it</button></p>
        </div>
      </main>
    );
  }

  if (mode === "merchant-reset-request") {
    return (
      <main className="landing-shell">
        <div className="landing-card">
          <button type="button" className="landing-back" onClick={() => setMode("merchant-login")}>← Back to sign in</button>
          <h1>Reset your password</h1>
          <p>We&apos;ll send a 6-digit code to your email.</p>
          <form onSubmit={submitResetRequest}>
            <label>Email<input required type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} /></label>
            {error && <div className="landing-error">{error}</div>}
            <button disabled={loading} type="submit">{loading ? "Sending…" : "Send reset code"}</button>
          </form>
        </div>
      </main>
    );
  }

  if (mode === "merchant-reset-confirm") {
    return (
      <main className="landing-shell">
        <div className="landing-card">
          <button type="button" className="landing-back" onClick={() => setMode("merchant-reset-request")}>← Back</button>
          <h1>Enter your code</h1>
          {resetMessage && <p className="landing-reset-message">{resetMessage}</p>}
          <form onSubmit={submitResetConfirm}>
            <label>6-digit code<input required pattern="\d{6}" maxLength={6} value={resetCode} onChange={(event) => setResetCode(event.target.value)} /></label>
            <label>New password<input required type="password" minLength={8} value={resetNewPassword} onChange={(event) => setResetNewPassword(event.target.value)} /></label>
            {error && <div className="landing-error">{error}</div>}
            <button disabled={loading} type="submit">{loading ? "Resetting…" : "Reset password"}</button>
          </form>
        </div>
      </main>
    );
  }

  if (mode === "merchant-signup") {
    return (
      <main className="landing-shell">
        <div className="landing-card">
          <button type="button" className="landing-back" onClick={() => setMode("choose")}>← Back</button>
          <h1>Open your store</h1>
          <form onSubmit={submitSignup}>
            <label>Store name<input required value={signupStoreName} onChange={(event) => setSignupStoreName(event.target.value)} /></label>
            <label>Store URL<div className="landing-slug"><span>/store/</span><input required pattern="[a-z0-9-]+" placeholder="my-store" value={signupSlug} onChange={(event) => setSignupSlug(event.target.value)} /></div></label>
            <label>Your name<input required value={signupOwnerName} onChange={(event) => setSignupOwnerName(event.target.value)} /></label>
            <label>Email<input required type="email" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} /></label>
            <label>Password<input required type="password" minLength={8} value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} /></label>
            {error && <div className="landing-error">{error}</div>}
            <button disabled={loading} type="submit">{loading ? "Creating…" : "Create store"}</button>
          </form>
          <p className="landing-switch">Already have a store? <button type="button" onClick={() => { setError(""); setMode("merchant-login"); }}>Sign in</button></p>
        </div>
      </main>
    );
  }

  return (
    <main className="landing-shell">
      <div className="landing-card landing-choose">
        <h1>LocalShop AI</h1>
        <p>Conversational commerce for local retailers.</p>
        <div className="landing-paths">
          <button type="button" className="landing-path" onClick={() => setMode("merchant-login")}>
            <strong>I&apos;m a merchant</strong>
            <span>Sign in or open your store</span>
          </button>
          <button
            type="button"
            className={`landing-path ${showStores ? "landing-path-active" : ""}`}
            onClick={() => {
              const next = !showStores;
              setShowStores(next);
              if (next && !stores.length && !storesLoading) loadStores();
            }}
          >
            <strong>I&apos;m a shopper</strong>
            <span>Browse stores and shop with AI</span>
          </button>
        </div>
        {showStores && (
          <div className="landing-store-panel">
            {storesLoading ? (
              <p className="landing-loading">Loading stores…</p>
            ) : stores.length === 0 ? (
              <p className="landing-loading">No active stores yet — be the first to open one.</p>
            ) : (
              <ul className="landing-store-list">
                {stores.map((store) => (
                  <li key={store.slug}>
                    <a href={`/store/${store.slug}`}>
                      <strong>{store.name}</strong>
                      <span>Visit store →</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}