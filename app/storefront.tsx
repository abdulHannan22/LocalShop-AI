"use client";

import { FormEvent, useEffect, useState } from "react";
import type { CatalogProduct, RankedProduct, ShoppingIntent } from "../lib/catalog";

type Recommendation = {
  sessionId: string;
  intent: ShoppingIntent;
  engine: "gemini" | "rules";
  products: RankedProduct[];
  error?: string;
};

type CustomerIdentity = { id: string; email: string; name: string | null };

type CustomerOrder = {
  checkoutId: string;
  orderNumber: string | null;
  productName: string | null;
  storeName: string | null;
  amountPaise: number;
  status: string;
  cancellable: boolean;
  createdAt: string;
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export function Storefront({ slug }: { slug: string }) {
  const [storeName, setStoreName] = useState("LocalShop");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [results, setResults] = useState<RankedProduct[]>([]);
  const [query, setQuery] = useState("I need wireless headphones under ₹2,000 for online classes");
  const [email, setEmail] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [intent, setIntent] = useState<ShoppingIntent | null>(null);
  const [engine, setEngine] = useState<"gemini" | "rules">("rules");
  const [selected, setSelected] = useState<RankedProduct | null>(null);
  const [checkout, setCheckout] = useState<{ message?: string; checkoutUrl?: string | null; orderNumber?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [customer, setCustomer] = useState<CustomerIdentity | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [authStage, setAuthStage] = useState<"email" | "code">("email");
  const [authEmail, setAuthEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    fetch("/api/customer/me")
      .then(async (response) => (response.ok ? ((await response.json()) as { customer: CustomerIdentity }).customer : null))
      .then((identity) => { if (identity) { setCustomer(identity); setEmail(identity.email); } })
      .catch(() => null);
  }, []);

  function loadOrders() {
    setOrdersLoading(true);
    fetch("/api/customer/orders")
      .then(async (response) => {
        const data = await response.json() as { orders?: CustomerOrder[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load orders");
        setOrders(data.orders ?? []);
      })
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }

  async function sendAuthCode(event: FormEvent) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");
    try {
      const response = await fetch("/api/customer/auth/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authEmail }) });
      const data = await response.json() as { message?: string; devCode?: string | null; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not send code");
      setAuthMessage(data.devCode ? `${data.message} Demo code: ${data.devCode}` : data.message ?? "Code sent.");
      setAuthStage("code");
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : "Could not send code");
    } finally {
      setAuthLoading(false);
    }
  }

  async function verifyAuthCode(event: FormEvent) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const response = await fetch("/api/customer/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authEmail, code: authCode }) });
      const data = await response.json() as { customer?: CustomerIdentity; error?: string };
      if (!response.ok || !data.customer) throw new Error(data.error ?? "Invalid code");
      setCustomer(data.customer);
      setEmail(data.customer.email);
      setAuthStage("email");
      setAuthCode("");
      setAuthMessage("");
      loadOrders();
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : "Invalid code");
    } finally {
      setAuthLoading(false);
    }
  }

  async function cancelOrder(checkoutId: string) {
    setAuthError("");
    try {
      const response = await fetch(`/api/customer/orders/${encodeURIComponent(checkoutId)}/cancel`, { method: "POST" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not cancel this order");
      setOrders((items) => items.map((order) => order.checkoutId === checkoutId ? { ...order, status: "cancellation_requested", cancellable: false } : order));
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : "Could not cancel this order");
    }
  }

  async function signOut() {
    await fetch("/api/customer/logout", { method: "POST" }).catch(() => null);
    setCustomer(null);
    setOrders([]);
    setShowAccount(false);
  }

  useEffect(() => {
    fetch(`/api/catalog?store=${encodeURIComponent(slug)}`)
      .then(async (response) => {
        const data = await response.json() as { merchant?: { name: string }; products?: CatalogProduct[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Store unavailable");
        setStoreName(data.merchant?.name ?? "LocalShop");
        setProducts(data.products ?? []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Store unavailable"));
  }, [slug]);

  async function recommend(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSelected(null);
    setCheckout(null);
    try {
      const response = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, storeSlug: slug, customerEmail: email }) });
      const data = await response.json() as Recommendation;
      if (!response.ok) throw new Error(data.error ?? "Recommendation failed");
      setResults(data.products);
      setSessionId(data.sessionId);
      setIntent(data.intent);
      setEngine(data.engine);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Recommendation failed");
    } finally {
      setLoading(false);
    }
  }

  async function createCheckout() {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, productId: selected.id, confirmed: true, storeSlug: slug, customerEmail: email }) });
      const data = await response.json() as { message?: string; checkoutUrl?: string | null; orderNumber?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Checkout failed");
      setCheckout(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  const [browseQuery, setBrowseQuery] = useState("");
  const [browseCategory, setBrowseCategory] = useState("all");

  const visibleProducts = results.length ? results : products.slice(0, 6).map((product) => ({ ...product, score: 0, reasons: ["Available now"] }));

  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  const browseProducts = products
    .filter((product) => browseCategory === "all" || product.category === browseCategory)
    .filter((product) => {
      if (!browseQuery.trim()) return true;
      const haystack = `${product.name} ${product.description} ${product.tags.join(" ")}`.toLowerCase();
      return haystack.includes(browseQuery.trim().toLowerCase());
    })
    .map((product) => ({ ...product, score: 0, reasons: ["Available now"] }));

  return <main className="storefront-shell"><header className="storefront-header"><a className="store-logo" href={`/store/${slug}`}><span>L</span><strong>{storeName}</strong></a><nav><a href="#assistant">AI shopping assistant</a><a href="#products">Products</a><button type="button" className="store-account-toggle" onClick={() => { setShowAccount((value) => !value); if (customer && !orders.length) loadOrders(); }}>{customer ? (customer.name ?? customer.email) : "Sign in"}</button>{customer && <button type="button" className="store-account-toggle store-signout-inline" onClick={signOut}>Sign out</button>}<a href="/">Merchant login</a></nav></header>{showAccount && <section className="store-account-panel">{!customer ? <div><p className="eyebrow">Sign in to track your orders</p>{authStage === "email" ? <form onSubmit={sendAuthCode}><input required type="email" placeholder="you@example.com" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} /><button disabled={authLoading} type="submit">{authLoading ? "Sending…" : "Send code"}</button></form> : <form onSubmit={verifyAuthCode}><input required pattern="\d{6}" maxLength={6} placeholder="6-digit code" value={authCode} onChange={(event) => setAuthCode(event.target.value)} /><button disabled={authLoading} type="submit">{authLoading ? "Verifying…" : "Verify"}</button><button type="button" onClick={() => { setAuthStage("email"); setAuthCode(""); }}>Use a different email</button></form>}{authMessage && <p className="store-account-message">{authMessage}</p>}{authError && <div className="store-error">{authError}</div>}</div> : <div><div className="store-account-header"><span>Signed in as {customer.email}</span><button type="button" onClick={signOut}>Sign out</button></div><p className="eyebrow">Your orders</p>{ordersLoading ? <p>Loading…</p> : orders.length === 0 ? <p>No orders yet. Recommendations you confirm will show up here.</p> : <ul className="store-order-list">{orders.map((order) => <li key={order.checkoutId}><div><strong>{order.productName ?? "Product"}</strong><span>{order.storeName ?? "Store"}</span></div><div><span>{money(order.amountPaise / 100)}</span><em>{order.status.replace("_", " ")}</em>{order.cancellable && <button type="button" className="store-order-cancel" onClick={() => cancelOrder(order.checkoutId)}>Cancel order</button>}</div></li>)}</ul>}</div>}</section>}<section className="store-hero" id="assistant"><div><p className="eyebrow">Conversational shopping</p><h1>Tell us what you need. We will find the right product.</h1><p>Describe your budget, use case and preferences — in English, Hindi, or Hinglish. Recommendations come only from {storeName}&apos;s verified catalogue.</p><form onSubmit={recommend}><textarea required minLength={5} maxLength={500} placeholder="e.g. 2000 ke andar wireless headphones chahiye online class ke liye" value={query} onChange={(event) => setQuery(event.target.value)} /><div><input type="email" placeholder="Email for order reference (optional)" value={email} onChange={(event) => setEmail(event.target.value)} /><button disabled={loading} type="submit">{loading ? "Searching…" : "Get recommendations"}</button></div></form>{intent && <div className="store-intent"><strong>{engine === "gemini" ? "Gemini intent" : "Safe fallback"}{intent.language && intent.language !== "en" && <span className="store-language-badge">{intent.language === "hi" ? "Hindi" : "Hinglish"}</span>}</strong><p>{intent.explanation}</p></div>}{error && <div className="store-error">{error}</div>}</div><aside><span>Why LocalShop AI?</span><ul><li>Catalogue-grounded results</li><li>Live inventory validation</li><li>Explainable recommendations</li><li>Confirmation before payment</li></ul></aside></section><section className="store-products" id="products">{results.length > 0 && <><div className="store-section-heading"><div><p className="eyebrow">Recommended for you</p><h2>{results.length} best matches</h2></div>{intent?.budget && <span>Budget up to {money(intent.budget)}</span>}</div><div className="store-product-grid">{visibleProducts.map((product) => <article className={selected?.id === product.id ? "chosen" : ""} key={product.id}><div className={`store-product-art ${product.accent}`}>{product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" /> : null}<span>{product.category}</span><b>{product.inventory} in stock</b></div><div className="store-product-copy"><div><h3>{product.name}</h3><strong>{money(product.price)}</strong></div><p>{product.description}</p><div className="store-reasons">{product.reasons.slice(0, 2).map((reason) => <span key={reason}>{reason}</span>)}</div><button type="button" onClick={() => { setSelected(product); setCheckout(null); }}>{selected?.id === product.id ? "Selected ✓" : "Select product"}</button></div></article>)}</div></>}<div className="store-browse"><div className="store-section-heading"><div><p className="eyebrow">Browse</p><h2>{browseProducts.length} of {products.length} catalogue products</h2></div></div><div className="store-browse-controls"><input type="search" placeholder="Search products…" value={browseQuery} onChange={(event) => setBrowseQuery(event.target.value)} /><div className="store-category-chips"><button type="button" className={browseCategory === "all" ? "active" : ""} onClick={() => setBrowseCategory("all")}>All</button>{categories.map((category) => <button type="button" key={category} className={browseCategory === category ? "active" : ""} onClick={() => setBrowseCategory(category)}>{category}</button>)}</div></div>{browseProducts.length === 0 ? <p className="store-browse-empty">No products match that search or category.</p> : <div className="store-product-grid">{browseProducts.map((product) => <article className={selected?.id === product.id ? "chosen" : ""} key={product.id}><div className={`store-product-art ${product.accent}`}>{product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" /> : null}<span>{product.category}</span><b>{product.inventory} in stock</b></div><div className="store-product-copy"><div><h3>{product.name}</h3><strong>{money(product.price)}</strong></div><p>{product.description}</p><button type="button" onClick={() => { setSelected(product); setCheckout(null); }}>{selected?.id === product.id ? "Selected ✓" : "Select product"}</button></div></article>)}</div>}</div>{selected && <div className="store-checkout"><div><span>Selected product</span><strong>{selected.name}</strong><p>{money(selected.price)} · Stock verified</p></div><button type="button" disabled={loading} onClick={createCheckout}>{loading ? "Preparing…" : "Confirm and prepare checkout"}</button>{checkout && <div><strong>{checkout.orderNumber}</strong><p>{checkout.message}</p>{checkout.checkoutUrl && <a href={checkout.checkoutUrl} target="_blank" rel="noreferrer">Open Razorpay checkout →</a>}</div>}</div>}</section><footer className="store-footer"><strong>{storeName}</strong><span>AI assists discovery. Catalogue, stock and payment amounts are controlled by the retailer backend.</span></footer></main>;
}
