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

type CartItem = { product: RankedProduct; quantity: number };

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export function Storefront({ slug }: { slug: string }) {
  const [storeName, setStoreName] = useState("LocalShop");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [results, setResults] = useState<RankedProduct[]>([]);
  const [query, setQuery] = useState("I need wireless headphones under ₹2,000 for online classes");
  const [sessionId, setSessionId] = useState("");
  const [intent, setIntent] = useState<ShoppingIntent | null>(null);
  const [engine, setEngine] = useState<"gemini" | "rules">("rules");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [checkout, setCheckout] = useState<{ message?: string; checkoutUrl?: string | null; orderNumber?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [customer, setCustomer] = useState<CustomerIdentity | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  // auth mode: "login" | "register"
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "track">("orders");

  useEffect(() => {
    fetch("/api/customer/me")
      .then(async (r) => (r.ok ? ((await r.json()) as { customer: CustomerIdentity }).customer : null))
      .then((id) => { if (id) { setCustomer(id); } })
      .catch(() => null);
  }, []);

  function loadOrders() {
    setOrdersLoading(true);
    fetch("/api/customer/orders")
      .then(async (r) => {
        const data = await r.json() as { orders?: CustomerOrder[]; error?: string };
        if (!r.ok) throw new Error(data.error ?? "Could not load orders");
        setOrders(data.orders ?? []);
      })
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const url = authMode === "register" ? "/api/customer/auth/register" : "/api/customer/auth/login";
      const body = authMode === "register"
        ? { email: authEmail, password: authPassword, name: authName }
        : { email: authEmail, password: authPassword };
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json() as { customer?: CustomerIdentity; error?: string };
      if (!r.ok || !data.customer) throw new Error(data.error ?? "Authentication failed");
      setCustomer(data.customer);
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
      loadOrders();
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  }

  async function cancelOrder(checkoutId: string) {
    setAuthError("");
    try {
      const r = await fetch(`/api/customer/orders/${encodeURIComponent(checkoutId)}/cancel`, { method: "POST" });
      const data = await r.json() as { error?: string };
      if (!r.ok) throw new Error(data.error ?? "Could not cancel this order");
      setOrders((items) => items.map((o) => o.checkoutId === checkoutId ? { ...o, status: "cancellation_requested", cancellable: false } : o));
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
      .then(async (r) => {
        const data = await r.json() as { merchant?: { name: string }; products?: CatalogProduct[]; error?: string };
        if (!r.ok) throw new Error(data.error ?? "Store unavailable");
        setStoreName(data.merchant?.name ?? "LocalShop");
        setProducts(data.products ?? []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Store unavailable"));
  }, [slug]);

  async function recommend(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResults([]);
    setCheckout(null);
    try {
      const r = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, storeSlug: slug }) });
      const data = await r.json() as Recommendation;
      if (!r.ok) throw new Error(data.error ?? "Recommendation failed");
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

  function addToCart(product: RankedProduct, qty = 1) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { product, quantity: qty }];
    });
    setShowCart(true);
  }

  function updateCartQty(productId: number, quantity: number) {
    if (quantity < 1) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity } : i));
    }
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  async function createCheckout() {
    if (!cart.length || !sessionId) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          cart: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
          confirmed: true,
          storeSlug: slug,
          customerEmail: customer?.email,
        }),
      });
      const data = await r.json() as { message?: string; checkoutUrl?: string | null; orderNumber?: string; error?: string };
      if (!r.ok) throw new Error(data.error ?? "Checkout failed");
      setCheckout(data);
      setCart([]);
      setShowCart(false);
      if (customer) loadOrders();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  const [browseQuery, setBrowseQuery] = useState("");
  const [browseCategory, setBrowseCategory] = useState("all");
  const categories = Array.from(new Set(products.map((p) => p.category))).sort();
  const browseProducts = products
    .filter((p) => browseCategory === "all" || p.category === browseCategory)
    .filter((p) => {
      if (!browseQuery.trim()) return true;
      return `${p.name} ${p.description} ${p.tags.join(" ")}`.toLowerCase().includes(browseQuery.trim().toLowerCase());
    })
    .map((p) => ({ ...p, score: 0, reasons: ["Available now"] }));

  return (
    <main className="storefront-shell">
      <header className="storefront-header">
        <a className="store-logo" href={`/store/${slug}`}><span>L</span><strong>{storeName}</strong></a>
        <nav>
          <a href="#assistant">AI assistant</a>
          <a href="#products">Products</a>
          <button type="button" className="store-cart-btn" onClick={() => setShowCart((v) => !v)}>
            Cart {cartCount > 0 && <span className="store-cart-badge">{cartCount}</span>}
          </button>
          <button type="button" className="store-account-toggle" onClick={() => { setShowAccount((v) => !v); if (customer && !orders.length) loadOrders(); }}>
            {customer ? (customer.name ?? customer.email) : "Sign in"}
          </button>
          {customer && <button type="button" className="store-account-toggle store-signout-inline" onClick={signOut}>Sign out</button>}
        </nav>
      </header>

      {/* Cart panel */}
      {showCart && (
        <section className="store-cart-panel">
          <div className="store-cart-header">
            <strong>Your cart</strong>
            <button type="button" onClick={() => setShowCart(false)}>✕</button>
          </div>
          {cart.length === 0 ? (
            <p className="store-cart-empty">Your cart is empty. Add products from the recommendations or browse below.</p>
          ) : (
            <>
              <ul className="store-cart-list">
                {cart.map((item) => (
                  <li key={item.product.id}>
                    <div>
                      <strong>{item.product.name}</strong>
                      <span>{money(item.product.price)} each</span>
                    </div>
                    <div className="store-cart-qty">
                      <button type="button" onClick={() => updateCartQty(item.product.id, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateCartQty(item.product.id, item.quantity + 1)}>+</button>
                      <span className="store-cart-item-total">{money(item.product.price * item.quantity)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="store-cart-footer">
                <strong>Total: {money(cartTotal)}</strong>
                {!sessionId && <p className="store-cart-note">Run a recommendation search first to enable checkout.</p>}
                <button type="button" disabled={loading || !sessionId} onClick={createCheckout}>
                  {loading ? "Preparing…" : "Confirm and checkout"}
                </button>
                {checkout && (
                  <div className="store-checkout-result">
                    <strong>{checkout.orderNumber}</strong>
                    <p>{checkout.message}</p>
                    {checkout.checkoutUrl && <a href={checkout.checkoutUrl} target="_blank" rel="noreferrer">Open Razorpay checkout →</a>}
                  </div>
                )}
                {error && <div className="store-error">{error}</div>}
              </div>
            </>
          )}
        </section>
      )}

      {/* Account / auth panel */}
      {showAccount && (
        <section className="store-account-panel">
          {!customer ? (
            <div>
              <p className="eyebrow">{authMode === "login" ? "Sign in to your account" : "Create an account"}</p>
              <form onSubmit={submitAuth}>
                {authMode === "register" && (
                  <input type="text" placeholder="Your name (optional)" value={authName} onChange={(e) => setAuthName(e.target.value)} />
                )}
                <input required type="email" placeholder="Email address" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
                <input required type="password" placeholder="Password (min 8 characters)" minLength={8} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
                <button disabled={authLoading} type="submit">{authLoading ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}</button>
              </form>
              <button type="button" className="store-auth-switch" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>
                {authMode === "login" ? "No account? Register" : "Already have an account? Sign in"}
              </button>
              {authError && <div className="store-error">{authError}</div>}
            </div>
          ) : (
            <div>
              <div className="store-account-header">
                <span>Signed in as {customer.email}</span>
                <button type="button" onClick={signOut}>Sign out</button>
              </div>
              <div className="store-account-tabs">
                <button type="button" className={activeTab === "orders" ? "active" : ""} onClick={() => { setActiveTab("orders"); loadOrders(); }}>Orders</button>
                <button type="button" className={activeTab === "track" ? "active" : ""} onClick={() => setActiveTab("track")}>Track order</button>
              </div>
              {activeTab === "orders" && (
                <>
                  <p className="eyebrow">Your orders</p>
                  {ordersLoading ? <p>Loading…</p> : orders.length === 0 ? (
                    <p>No orders yet.</p>
                  ) : (
                    <ul className="store-order-list">
                      {orders.map((order) => (
                        <li key={order.checkoutId}>
                          <div>
                            <strong>{order.productName ?? "Product"}</strong>
                            <span>{order.storeName ?? "Store"}</span>
                            {order.orderNumber && <code>{order.orderNumber}</code>}
                          </div>
                          <div>
                            <span>{money(order.amountPaise / 100)}</span>
                            <em className={`store-status store-status-${order.status.replace(/_/g, "-")}`}>{order.status.replace(/_/g, " ")}</em>
                            {order.cancellable && (
                              <button type="button" className="store-order-cancel" onClick={() => cancelOrder(order.checkoutId)}>Cancel</button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {authError && <div className="store-error">{authError}</div>}
                </>
              )}
              {activeTab === "track" && (
                <div className="store-track-panel">
                  <p className="eyebrow">Order status guide</p>
                  <ul className="store-track-legend">
                    <li><em className="store-status store-status-ready">ready</em> — Order confirmed, awaiting payment</li>
                    <li><em className="store-status store-status-created">created</em> — Payment link created</li>
                    <li><em className="store-status store-status-paid">paid</em> — Payment received</li>
                    <li><em className="store-status store-status-packed">packed</em> — Packed and ready to ship</li>
                    <li><em className="store-status store-status-shipped">shipped</em> — Out for delivery</li>
                    <li><em className="store-status store-status-delivered">delivered</em> — Delivered</li>
                    <li><em className="store-status store-status-cancellation-requested">cancellation requested</em> — Awaiting merchant confirmation</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section className="store-hero" id="assistant">
        <div>
          <p className="eyebrow">Conversational shopping</p>
          <h1>Tell us what you need. We will find the right product.</h1>
          <p>Describe your budget, use case and preferences — in English, Hindi, or Hinglish. Recommendations come only from {storeName}&apos;s verified catalogue.</p>
          <form onSubmit={recommend}>
            <textarea required minLength={5} maxLength={500} placeholder="e.g. 2000 ke andar wireless headphones chahiye online class ke liye" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button disabled={loading} type="submit">{loading ? "Searching…" : "Get recommendations"}</button>
          </form>
          {intent && (
            <div className="store-intent">
              <strong>{engine === "gemini" ? "Gemini intent" : "Safe fallback"}{intent.language && intent.language !== "en" && <span className="store-language-badge">{intent.language === "hi" ? "Hindi" : "Hinglish"}</span>}</strong>
              <p>{intent.explanation}</p>
            </div>
          )}
          {error && <div className="store-error">{error}</div>}
        </div>
        <aside>
          <span>Why LocalShop AI?</span>
          <ul>
            <li>Catalogue-grounded results</li>
            <li>Live inventory validation</li>
            <li>Explainable recommendations</li>
            <li>Confirmation before payment</li>
          </ul>
        </aside>
      </section>

      <section className="store-products" id="products">
        {results.length > 0 && (
          <>
            <div className="store-section-heading">
              <div>
                <p className="eyebrow">Recommended for you</p>
                <h2>{results.length} match{results.length !== 1 ? "es" : ""}</h2>
              </div>
              {intent?.budget && <span>Budget up to {money(intent.budget)}</span>}
            </div>
            <div className="store-product-grid">
              {results.map((product) => {
                const inCart = cart.find((i) => i.product.id === product.id);
                return (
                  <article key={product.id}>
                    <div className={`store-product-art ${product.accent}`}>
                      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" /> : null}
                      <span>{product.category}</span>
                      <b>{product.inventory} in stock</b>
                    </div>
                    <div className="store-product-copy">
                      <div><h3>{product.name}</h3><strong>{money(product.price)}</strong></div>
                      <p>{product.description}</p>
                      <div className="store-reasons">{product.reasons.slice(0, 2).map((r) => <span key={r}>{r}</span>)}</div>
                      <div className="store-product-actions">
                        <button type="button" onClick={() => addToCart(product)}>
                          {inCart ? `In cart (${inCart.quantity}) — Add more` : "Add to cart"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        <div className="store-browse">
          <div className="store-section-heading">
            <div>
              <p className="eyebrow">Browse</p>
              <h2>{browseProducts.length} of {products.length} catalogue products</h2>
            </div>
          </div>
          <div className="store-browse-controls">
            <input type="search" placeholder="Search products…" value={browseQuery} onChange={(e) => setBrowseQuery(e.target.value)} />
            <div className="store-category-chips">
              <button type="button" className={browseCategory === "all" ? "active" : ""} onClick={() => setBrowseCategory("all")}>All</button>
              {categories.map((cat) => (
                <button type="button" key={cat} className={browseCategory === cat ? "active" : ""} onClick={() => setBrowseCategory(cat)}>{cat}</button>
              ))}
            </div>
          </div>
          {browseProducts.length === 0 ? (
            <p className="store-browse-empty">No products match that search or category.</p>
          ) : (
            <div className="store-product-grid">
              {browseProducts.map((product) => {
                const inCart = cart.find((i) => i.product.id === product.id);
                return (
                  <article key={product.id}>
                    <div className={`store-product-art ${product.accent}`}>
                      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" /> : null}
                      <span>{product.category}</span>
                      <b>{product.inventory} in stock</b>
                    </div>
                    <div className="store-product-copy">
                      <div><h3>{product.name}</h3><strong>{money(product.price)}</strong></div>
                      <p>{product.description}</p>
                      <div className="store-product-actions">
                        <button type="button" onClick={() => addToCart(product)}>
                          {inCart ? `In cart (${inCart.quantity}) — Add more` : "Add to cart"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <footer className="store-footer">
        <strong>{storeName}</strong>
        <span>AI assists discovery. Catalogue, stock and payment amounts are controlled by the retailer backend.</span>
      </footer>
    </main>
  );
}
