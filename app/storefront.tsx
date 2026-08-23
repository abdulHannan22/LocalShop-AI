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

  const visibleProducts = results.length ? results : products.slice(0, 6).map((product) => ({ ...product, score: 0, reasons: ["Available now"] }));

  return <main className="storefront-shell"><header className="storefront-header"><a className="store-logo" href={`/store/${slug}`}><span>L</span><strong>{storeName}</strong></a><nav><a href="#assistant">AI shopping assistant</a><a href="#products">Products</a><a href="/">Merchant login</a></nav></header><section className="store-hero" id="assistant"><div><p className="eyebrow">Conversational shopping</p><h1>Tell us what you need. We will find the right product.</h1><p>Describe your budget, use case and preferences. Recommendations come only from {storeName}&apos;s verified catalogue.</p><form onSubmit={recommend}><textarea required minLength={5} maxLength={500} value={query} onChange={(event) => setQuery(event.target.value)} /><div><input type="email" placeholder="Email for order reference (optional)" value={email} onChange={(event) => setEmail(event.target.value)} /><button disabled={loading} type="submit">{loading ? "Searching…" : "Get recommendations"}</button></div></form>{intent && <div className="store-intent"><strong>{engine === "gemini" ? "Gemini intent" : "Safe fallback"}</strong><p>{intent.explanation}</p></div>}{error && <div className="store-error">{error}</div>}</div><aside><span>Why LocalShop AI?</span><ul><li>Catalogue-grounded results</li><li>Live inventory validation</li><li>Explainable recommendations</li><li>Confirmation before payment</li></ul></aside></section><section className="store-products" id="products"><div className="store-section-heading"><div><p className="eyebrow">{results.length ? "Recommended for you" : "Available now"}</p><h2>{results.length ? `${results.length} best matches` : `${products.length} catalogue products`}</h2></div>{intent?.budget && <span>Budget up to {money(intent.budget)}</span>}</div><div className="store-product-grid">{visibleProducts.map((product) => <article className={selected?.id === product.id ? "chosen" : ""} key={product.id}><div className={`store-product-art ${product.accent}`}><span>{product.category}</span><b>{product.inventory} in stock</b></div><div className="store-product-copy"><div><h3>{product.name}</h3><strong>{money(product.price)}</strong></div><p>{product.description}</p><div className="store-reasons">{product.reasons.slice(0, 2).map((reason) => <span key={reason}>{reason}</span>)}</div><button type="button" onClick={() => { setSelected(product); setCheckout(null); }}>{selected?.id === product.id ? "Selected ✓" : "Select product"}</button></div></article>)}</div>{selected && <div className="store-checkout"><div><span>Selected product</span><strong>{selected.name}</strong><p>{money(selected.price)} · Stock verified</p></div><button type="button" disabled={loading} onClick={createCheckout}>{loading ? "Preparing…" : "Confirm and prepare checkout"}</button>{checkout && <div><strong>{checkout.orderNumber}</strong><p>{checkout.message}</p>{checkout.checkoutUrl && <a href={checkout.checkoutUrl} target="_blank" rel="noreferrer">Open Razorpay checkout →</a>}</div>}</div>}</section><footer className="store-footer"><strong>{storeName}</strong><span>AI assists discovery. Catalogue, stock and payment amounts are controlled by the retailer backend.</span></footer></main>;
}
