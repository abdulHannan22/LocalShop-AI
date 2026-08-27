"use client";

import { FormEvent, useEffect, useState } from "react";
import { catalog, type CatalogProduct, type RankedProduct, type ShoppingIntent } from "../lib/catalog";

type Tab = "sales" | "catalogue" | "orders" | "insights" | "audit" | "staff";

type Actor = {
  email: string;
  name: string;
  platformRole: "platform_admin" | "user";
  merchantId: string | null;
  merchantName: string | null;
  merchantSlug: string | null;
  role: "owner" | "admin" | "manager" | "sales_agent" | null;
};

type StaffRow = {
  id: string;
  email: string;
  role: "owner" | "admin" | "manager" | "sales_agent";
  status: string;
  createdAt: string;
};

type RecommendResponse = {
  sessionId: string;
  query: string;
  intent: ShoppingIntent;
  engine: "gemini" | "rules";
  products: RankedProduct[];
  audit: Array<{ event: string; detail: string; engine: string }>;
  error?: string;
};

type CheckoutResponse = {
  checkoutId?: string;
  mode?: "simulation" | "razorpay-test";
  status?: string;
  checkoutUrl?: string | null;
  message?: string;
  error?: string;
};

type Order = {
  id: number;
  checkoutId: string;
  sessionId: string;
  productId: number;
  productName: string;
  amountPaise: number;
  provider: string;
  providerReference?: string | null;
  status: string;
  createdAt: string;
};

type AuditRow = {
  id: number;
  eventId: string;
  sessionId: string;
  eventType: string;
  detail: string;
  engine: string;
  createdAt: string;
};

type InsightData = {
  metrics: {
    products: number;
    inventoryUnits: number;
    lowStock: number;
    orders: number;
    potentialRevenue: number;
    aiSessions: number;
    recommendationHitRate: number | null;
    recommendationOutcomes: number;
    geminiCallsToday: number;
    geminiDailyLimit: number;
  };
  lowStock: CatalogProduct[];
  recentOrders: Order[];
};

type IntegrationStatus = {
  actor: Actor | null;
  integrations: { gemini: boolean; razorpay: boolean; webhook: boolean };
  storage: string;
};

const prompts = [
  "Wireless headphones under ₹2,000 for online classes",
  "A useful tech gift under ₹1,500",
  "Comfortable headphones for daily travel",
];

const initialIntent: ShoppingIntent = {
  budget: 2000,
  category: "headphones",
  useCase: "online classes",
  features: ["wireless", "microphone"],
  explanation: "Prioritised headphones, online classes, wireless audio, a clear microphone, and a ₹2,000 budget.",
};

const initialProducts: RankedProduct[] = catalog.slice(0, 3).map((product, index) => ({
  ...product,
  score: 94 - index * 7,
  reasons: index === 0 ? ["Within budget", "Clear microphone"] : ["Strong rating", "Available now"],
}));

const viewCopy: Record<Tab, { eyebrow: string; title: string }> = {
  sales: { eyebrow: "AI sales agent", title: "Turn product questions into confident checkouts." },
  catalogue: { eyebrow: "Product operations", title: "Manage the catalogue and live inventory." },
  orders: { eyebrow: "Order operations", title: "Track every test checkout from creation to fulfilment." },
  insights: { eyebrow: "Merchant intelligence", title: "Understand demand, stock risk and checkout activity." },
  audit: { eyebrow: "Trust and safety", title: "Review every AI and payment decision." },
  staff: { eyebrow: "Identity and access", title: "Invite staff and control merchant permissions." },
};

const navItems: Array<{ id: Tab; icon: string; label: string }> = [
  { id: "sales", icon: "⌁", label: "Sales agent" },
  { id: "catalogue", icon: "▦", label: "Catalogue" },
  { id: "orders", icon: "◇", label: "Orders" },
  { id: "insights", icon: "↗", label: "Insights" },
  { id: "audit", icon: "≡", label: "Audit trail" },
  { id: "staff", icon: "◎", label: "Staff" },
];

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function labelEvent(event: string) {
  return event.split(".").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload;
}

export function LocalShopWorkspace() {
  const [tab, setTab] = useState<Tab>("sales");
  const [query, setQuery] = useState(prompts[0]);
  const [submittedQuery, setSubmittedQuery] = useState(prompts[0]);
  const [intent, setIntent] = useState<ShoppingIntent>(initialIntent);
  const [results, setResults] = useState<RankedProduct[]>(initialProducts);
  const [engine, setEngine] = useState<"gemini" | "rules">("rules");
  const [sessionId, setSessionId] = useState("seed-demo-session");
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [auditEvents, setAuditEvents] = useState(["intent.extracted", "catalogue.queried", "inventory.verified"]);
  const [notice, setNotice] = useState("3 products matched your request");
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [error, setError] = useState("");
  const [catalogueProducts, setCatalogueProducts] = useState<CatalogProduct[]>(catalog);
  const [orders, setOrders] = useState<Order[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [staffInvite, setStaffInvite] = useState({ email: "", role: "sales_agent" as StaffRow["role"] });
  const [newProduct, setNewProduct] = useState({ name: "", category: "", price: "", inventory: "", description: "", imageUrl: "" });

  const selectedProduct = results.find((item) => item.id === selectedId) ?? null;

  async function loadCatalogue() {
    const payload = await api<{ products: CatalogProduct[] }>("/api/catalog");
    setCatalogueProducts(payload.products);
  }

  async function loadOrders() {
    const payload = await api<{ orders: Order[] }>("/api/orders");
    setOrders(payload.orders);
  }

  async function loadAudit() {
    const payload = await api<{ events: AuditRow[] }>("/api/audit");
    setAuditRows(payload.events);
  }

  async function loadInsights() {
    setInsights(await api<InsightData>("/api/insights"));
  }

  async function loadStaff() {
    const payload = await api<{ staff: StaffRow[] }>("/api/staff");
    setStaff(payload.staff);
  }

  useEffect(() => {
    api<IntegrationStatus>("/api/status").then(setStatus).catch(() => undefined);
    loadCatalogue().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (tab === "sales") return;
    setViewLoading(true);
    setError("");
    const loader = tab === "catalogue" ? loadCatalogue : tab === "orders" ? loadOrders : tab === "insights" ? loadInsights : tab === "staff" ? loadStaff : loadAudit;
    loader().catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load this view.")).finally(() => setViewLoading(false));
  }, [tab]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery || loading) return;
    setLoading(true);
    setError("");
    setCheckout(null);
    setSelectedId(null);
    setNotice("Understanding the request and searching the live catalogue…");
    try {
      const payload = await api<RecommendResponse>("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanQuery }),
      });
      setSubmittedQuery(payload.query);
      setIntent(payload.intent);
      setResults(payload.products);
      setEngine(payload.engine);
      setSessionId(payload.sessionId);
      setAuditEvents(payload.audit.map((item) => item.event));
      setNotice(`${payload.products.length} products ranked · ${payload.engine === "gemini" ? "Gemini intent" : "local fallback"}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The recommendation service is unavailable.");
      setNotice("Request failed safely · no checkout action taken");
    } finally {
      setLoading(false);
    }
  }

  function selectProduct(product: RankedProduct) {
    setSelectedId(product.id);
    setCheckout(null);
    setNotice(`${product.name} selected · confirmation required`);
  }

  async function prepareCheckout() {
    if (!selectedProduct || checkoutLoading) return;
    setCheckoutLoading(true);
    setError("");
    setNotice("Confirmation received · preparing safe test checkout…");
    try {
      const payload = await api<CheckoutResponse>("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, productId: selectedProduct.id, confirmed: true }),
      });
      setCheckout(payload);
      setAuditEvents((events) => [...events, payload.mode === "razorpay-test" ? "checkout.created" : "checkout.simulated"]);
      setNotice(payload.message ?? "Checkout prepared");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Checkout could not be prepared.");
      setNotice("Checkout failed safely · no payment was taken");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function adjustStock(productId: number, delta: number) {
    setError("");
    try {
      const payload = await api<{ product: CatalogProduct }>(`/api/catalog/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryDelta: delta }),
      });
      setCatalogueProducts((items) => items.map((item) => item.id === productId ? payload.product : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Stock could not be updated.");
    }
  }

  async function addProduct(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const payload = await api<{ product: CatalogProduct }>("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProduct,
          price: Number(newProduct.price),
          inventory: Number(newProduct.inventory),
          tags: `${newProduct.category} ${newProduct.description}`.toLowerCase().split(/\s+/).filter(Boolean),
        }),
      });
      setCatalogueProducts((items) => [...items, payload.product]);
      setNewProduct({ name: "", category: "", price: "", inventory: "", description: "", imageUrl: "" });
      setShowProductForm(false);
      setNotice(`${payload.product.name} added to the live catalogue`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Product could not be added.");
    }
  }

  const ORDER_STATUS_LABELS: Record<string, string> = { ready: "Ready", created: "Created", paid: "Paid", packed: "Packed", shipped: "Shipped", delivered: "Delivered", cancellation_requested: "Return requested", cancelled: "Cancelled" };

  function orderActions(status: string): Array<{ label: string; next: string }> {
    if (status === "cancellation_requested") return [{ label: "Approve return", next: "cancelled" }, { label: "Dismiss request", next: "paid" }];
    if (status === "cancelled" || status === "delivered") return [];
    const forward: Record<string, { label: string; next: string }> = {
      ready: { label: "Pack", next: "packed" },
      created: { label: "Pack", next: "packed" },
      paid: { label: "Pack", next: "packed" },
      packed: { label: "Ship", next: "shipped" },
      shipped: { label: "Mark delivered", next: "delivered" },
    };
    const actions = [] as Array<{ label: string; next: string }>;
    if (forward[status]) actions.push(forward[status]);
    actions.push({ label: "Cancel", next: "cancelled" });
    return actions;
  }

  async function changeOrderStatus(checkoutId: string, nextStatus: string) {
    setError("");
    try {
      await api<{ order: Order }>("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId, status: nextStatus }),
      });
      setOrders((items) => items.map((order) => order.checkoutId === checkoutId ? { ...order, status: nextStatus } : order));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Order could not be updated.");
    }
  }

  async function inviteStaffMember(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const payload = await api<{ membership: StaffRow }>("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffInvite),
      });
      setStaff((items) => [...items.filter((item) => item.email !== payload.membership.email), payload.membership]);
      setStaffInvite({ email: "", role: "sales_agent" });
      setNotice(`${payload.membership.email} invited as ${payload.membership.role}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Staff invitation failed.");
    }
  }

  async function updateStaffMember(member: StaffRow, status: "active" | "suspended") {
    setError("");
    try {
      const payload = await api<{ membership: StaffRow }>("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId: member.id, role: member.role, status }),
      });
      setStaff((items) => items.map((item) => item.id === member.id ? payload.membership : item));
      setNotice(`${member.email} ${status === "suspended" ? "suspended" : "activated"}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Staff membership could not be updated.");
    }
  }

  const intentChips = [
    intent.budget ? `Budget ≤ ₹${intent.budget.toLocaleString("en-IN")}` : null,
    intent.category,
    intent.useCase,
    ...intent.features.slice(0, 2),
  ].filter(Boolean) as string[];
  const actorRole = status?.actor?.role;
  const visibleNavItems = navItems.filter((item) => {
    if (actorRole === "sales_agent") return item.id === "sales" || item.id === "orders";
    if (item.id === "staff") return actorRole === "owner" || actorRole === "admin";
    return true;
  });

  function renderSales() {
    return (
      <div className="workspace-grid">
        <section className="conversation-panel">
          <div className="panel-heading"><div><span className="live-dot" /><strong>Customer conversation</strong></div><span>Session {sessionId.slice(0, 8)}</span></div>
          <div className="conversation-body">
            <div className="assistant-intro"><div className="agent-avatar">AI</div><div className="message assistant-message"><p>Hi! Tell me what you are looking for, your budget, and how you plan to use it.</p></div></div>
            <div className="user-message-wrap"><div className="message user-message">{submittedQuery}</div></div>
            <div className="assistant-intro"><div className="agent-avatar">AI</div><div className="message assistant-message result-message"><div className="engine-row"><span>{engine === "gemini" ? "Gemini structured intent" : "Deterministic fallback"}</span></div><p>{intent.explanation}</p><div className="intent-row">{intentChips.map((chip) => <span key={chip}>{chip}</span>)}</div></div></div>
            {error && <div className="error-box" role="alert">{error}</div>}
            <div className="prompt-area"><p>Try an example</p><div className="prompt-list">{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => setQuery(prompt)}>{prompt}</button>)}</div></div>
          </div>
          <form className="composer" onSubmit={handleSubmit}><label htmlFor="shopping-request" className="sr-only">Describe what you need</label><input id="shopping-request" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Describe what you need…" disabled={loading} /><button type="submit" disabled={loading}>{loading ? "Finding matches…" : <>Find products <span>→</span></>}</button></form>
        </section>
        <aside className="recommendation-panel">
          <div className="recommendation-heading"><div><p className="eyebrow">Live catalogue</p><h2>Recommended for this customer</h2></div><span className="match-badge">{results.length} matches</span></div>
          {loading ? <div className="loading-products" aria-live="polite"><span /><span /><span /></div> : <div className="product-list">{results.map((product, index) => <article className={`product-card ${selectedId === product.id ? "selected" : ""}`} key={product.id}><div className={`product-visual ${product.accent}`}><span>{index === 0 ? "Best match" : `${product.score}% match`}</span><div className="headphone-shape" aria-hidden="true"><i /><b /></div></div><div className="product-copy"><div className="product-title-row"><div><p>{product.category}</p><h3>{product.name}</h3></div><strong>{formatPrice(product.price)}</strong></div><p className="product-description">{product.description}</p><div className="reason-tags">{product.reasons.slice(0, 2).map((reason) => <span key={reason}>{reason}</span>)}</div><div className="product-meta"><span>★ {product.rating}</span><span>{product.inventory} in stock</span></div><button type="button" onClick={() => selectProduct(product)}>{selectedId === product.id ? "Selected" : "Choose this product"}</button></div></article>)}</div>}
          <div className="checkout-card"><div><p>Selected order</p><strong>{selectedProduct ? selectedProduct.name : "Choose a product"}</strong>{selectedProduct && <span>{formatPrice(selectedProduct.price)} · Free delivery</span>}</div><button type="button" disabled={!selectedProduct || checkoutLoading} onClick={prepareCheckout}>{checkoutLoading ? "Preparing…" : checkout ? "Checkout ready ✓" : "Confirm & prepare checkout"}</button>{checkout && <div className="checkout-result"><p>{checkout.message}</p>{checkout.checkoutUrl && <a href={checkout.checkoutUrl} target="_blank" rel="noreferrer">Open Razorpay test checkout →</a>}</div>}</div>
        </aside>
      </div>
    );
  }

  function renderCatalogue() {
    return <section className="admin-view"><div className="view-toolbar"><div><h2>Product catalogue</h2><p>Stock changes immediately affect recommendations and checkout validation.</p></div><button className="primary-action" type="button" onClick={() => setShowProductForm((value) => !value)}>{showProductForm ? "Close form" : "+ Add product"}</button></div>{showProductForm && <form className="product-form" onSubmit={addProduct}><label>Product name<input required value={newProduct.name} onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })} /></label><label>Category<input required value={newProduct.category} onChange={(event) => setNewProduct({ ...newProduct, category: event.target.value })} /></label><label>Price (₹)<input required min="1" type="number" value={newProduct.price} onChange={(event) => setNewProduct({ ...newProduct, price: event.target.value })} /></label><label>Opening stock<input required min="0" type="number" value={newProduct.inventory} onChange={(event) => setNewProduct({ ...newProduct, inventory: event.target.value })} /></label><label className="wide-field">Description<input required value={newProduct.description} onChange={(event) => setNewProduct({ ...newProduct, description: event.target.value })} /></label><label className="wide-field">Image URL (optional)<input type="url" placeholder="https://…" value={newProduct.imageUrl} onChange={(event) => setNewProduct({ ...newProduct, imageUrl: event.target.value })} /></label><button type="submit">Save product</button></form>}{error && <div className="admin-error" role="alert">{error}</div>}{viewLoading ? <div className="view-loading">Loading catalogue…</div> : <div className="catalogue-grid">{catalogueProducts.map((product) => <article className="catalogue-card" key={product.id}><div className={`catalogue-swatch ${product.accent}`}>{product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" /> : null}<span>{product.category}</span><b>#{product.id}</b></div><div className="catalogue-copy"><div><h3>{product.name}</h3><strong>{formatPrice(product.price)}</strong></div><p>{product.description}</p><div className="catalogue-meta"><span>★ {product.rating}</span><span className={product.inventory < 10 ? "low-stock" : ""}>{product.inventory} units</span></div><div className="stock-control"><button type="button" onClick={() => adjustStock(product.id, -1)} disabled={product.inventory === 0}>−</button><strong>{product.inventory}</strong><button type="button" onClick={() => adjustStock(product.id, 1)}>+</button><span>Adjust stock</span></div></div></article>)}</div>}</section>;
  }

  function renderOrders() {
    return <section className="admin-view"><div className="view-toolbar"><div><h2>Checkout orders</h2><p>Simulation and Razorpay test checkouts appear in one operational queue.</p></div><button className="secondary-action" type="button" onClick={loadOrders}>Refresh</button></div>{error && <div className="admin-error" role="alert">{error}</div>}{viewLoading ? <div className="view-loading">Loading orders…</div> : orders.length === 0 ? <div className="empty-state"><strong>No orders yet</strong><p>Create a checkout from the Sales agent, then return here.</p><button type="button" onClick={() => setTab("sales")}>Open sales agent</button></div> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Order</th><th>Product</th><th>Amount</th><th>Provider</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{orders.map((order) => <tr key={order.checkoutId}><td><strong>{order.checkoutId.slice(0, 8)}</strong><span>{order.sessionId.slice(0, 8)}</span></td><td>{order.productName}</td><td>{formatPrice(order.amountPaise / 100)}</td><td><span className="provider-pill">{order.provider}</span></td><td><span className={`status-pill ${order.status}`}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</span></td><td>{shortDate(order.createdAt)}</td><td><div className="row-actions">{orderActions(order.status).map((action) => <button type="button" key={action.label} onClick={() => changeOrderStatus(order.checkoutId, action.next)}>{action.label}</button>)}</div></td></tr>)}</tbody></table></div>}</section>;
  }

  function renderInsights() {
    const metrics = insights?.metrics;
    return <section className="admin-view"><div className="view-toolbar"><div><h2>Merchant insights</h2><p>Live operational metrics calculated from catalogue, audit and checkout data.</p></div><button className="secondary-action" type="button" onClick={loadInsights}>Refresh</button></div>{error && <div className="admin-error" role="alert">{error}</div>}{viewLoading || !metrics ? <div className="view-loading">Calculating insights…</div> : <><div className="metric-grid"><article><span>Live products</span><strong>{metrics.products}</strong><small>available to the agent</small></article><article><span>Inventory units</span><strong>{metrics.inventoryUnits}</strong><small>across all products</small></article><article><span>Low-stock items</span><strong>{metrics.lowStock}</strong><small>below 10 units</small></article><article><span>Checkouts</span><strong>{metrics.orders}</strong><small>test and simulated</small></article><article><span>Potential revenue</span><strong>{formatPrice(metrics.potentialRevenue)}</strong><small>excluding cancelled</small></article><article><span>AI sessions</span><strong>{metrics.aiSessions}</strong><small>audited conversations</small></article></div><div className="insight-panels"><article><div className="section-title"><h3>Inventory attention</h3><span>{insights.lowStock.length} items</span></div>{insights.lowStock.length ? insights.lowStock.map((product) => <div className="inventory-row" key={product.id}><div><strong>{product.name}</strong><span>{product.category}</span></div><b>{product.inventory} left</b></div>) : <p className="all-clear">All products have healthy stock.</p>}</article><article><div className="section-title"><h3>Recent checkout activity</h3><span>{insights.recentOrders.length} events</span></div>{insights.recentOrders.length ? insights.recentOrders.map((order) => <div className="inventory-row" key={order.checkoutId}><div><strong>{formatPrice(order.amountPaise / 100)}</strong><span>{order.provider}</span></div><b>{order.status}</b></div>) : <p className="all-clear">Checkout activity will appear here.</p>}</article></div></>}</section>;
  }

  function renderAudit() {
    return <section className="admin-view"><div className="view-toolbar"><div><h2>Decision audit trail</h2><p>Evidence for intent extraction, catalogue ranking, confirmation and checkout actions.</p></div><button className="secondary-action" type="button" onClick={loadAudit}>Refresh</button></div>{error && <div className="admin-error" role="alert">{error}</div>}{viewLoading ? <div className="view-loading">Loading audit events…</div> : auditRows.length === 0 ? <div className="empty-state"><strong>No persisted events yet</strong><p>Use the Sales agent to create auditable activity.</p><button type="button" onClick={() => setTab("sales")}>Start a session</button></div> : <div className="audit-timeline">{auditRows.map((row) => <article key={row.eventId}><span className="timeline-dot" /><div className="audit-card"><div><strong>{labelEvent(row.eventType)}</strong><span className="engine-pill">{row.engine}</span></div><p>{row.detail}</p><footer><span>Session {row.sessionId.slice(0, 8)}</span><time>{shortDate(row.createdAt)}</time></footer></div></article>)}</div>}</section>;
  }

  function renderStaff() {
    return <section className="admin-view"><div className="view-toolbar"><div><h2>Staff and roles</h2><p>Invited users receive access only after signing in with the matching verified email.</p></div></div><form className="staff-form" onSubmit={inviteStaffMember}><label>Staff email<input required type="email" value={staffInvite.email} onChange={(event) => setStaffInvite({ ...staffInvite, email: event.target.value })} placeholder="employee@example.com" /></label><label>Role<select value={staffInvite.role} onChange={(event) => setStaffInvite({ ...staffInvite, role: event.target.value as StaffRow["role"] })}><option value="sales_agent">Sales agent</option><option value="manager">Manager</option><option value="admin">Merchant admin</option></select></label><button className="primary-action" type="submit">Invite staff</button></form>{error && <div className="admin-error" role="alert">{error}</div>}{viewLoading ? <div className="view-loading">Loading staff…</div> : <div className="staff-grid">{staff.map((member) => <article key={member.id}><div className="staff-avatar">{member.email.slice(0, 2).toUpperCase()}</div><div><strong>{member.email}</strong><span>{member.role.replace("_", " ")} · {member.status}</span></div>{member.role === "owner" ? <time>Protected owner</time> : <div className="staff-actions"><time>{shortDate(member.createdAt)}</time><button type="button" onClick={() => updateStaffMember(member, member.status === "suspended" ? "active" : "suspended")}>{member.status === "suspended" ? "Activate" : "Suspend"}</button></div>}</article>)}</div>}</section>;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar"><div className="brand-row"><div className="brand-mark" aria-hidden="true">L</div><div><p className="brand-name">LocalShop AI</p><p className="brand-caption">Merchant workspace</p></div></div><nav className="side-nav" aria-label="Primary navigation">{visibleNavItems.map((item) => <button className={`nav-item ${tab === item.id ? "active" : ""}`} type="button" key={item.id} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav><div className="merchant-card"><div className="merchant-avatar">{(status?.actor?.merchantName ?? "Nova Store").slice(0, 2).toUpperCase()}</div><div><p>{status?.actor?.merchantName ?? "Nova Store"}</p><span>{status?.actor?.role ?? "merchant"} · {catalogueProducts.length} products</span></div><button type="button" aria-label="Open settings" onClick={() => setShowSettings(true)}>•••</button></div></aside>
      <section className="workspace"><header className="topbar"><div><p className="eyebrow">{viewCopy[tab].eyebrow}</p><h1>{viewCopy[tab].title}</h1></div><div className="status-cluster"><a className="workspace-link" href={`/store/${status?.actor?.merchantSlug ?? "nova-store"}`}>Customer store</a>{status?.actor?.platformRole === "platform_admin" && <a className="workspace-link" href="/admin">Platform admin</a>}<span className="mode-pill"><i /> {status?.integrations.razorpay ? "Razorpay connected" : "Safe simulation mode"}</span><button className="settings-button" type="button" aria-label="Settings" onClick={() => setShowSettings(true)}>⚙</button></div></header>{tab === "sales" ? renderSales() : tab === "catalogue" ? renderCatalogue() : tab === "orders" ? renderOrders() : tab === "insights" ? renderInsights() : tab === "staff" ? renderStaff() : renderAudit()}<footer className="audit-strip"><div><span className="pulse" /><strong>{notice}</strong></div><div className="audit-events">{auditEvents.slice(-3).map((event, index) => <span key={`${event}-${index}`}>{labelEvent(event)}</span>)}<button type="button" onClick={() => setTab("audit")}>Open audit trail →</button></div></footer></section>
      {showSettings && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowSettings(false)}><section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">Runtime status</p><h2 id="settings-title">Account and integrations</h2></div><button type="button" aria-label="Close settings" onClick={() => setShowSettings(false)}>×</button></div>{status?.actor && <p className="identity-note"><strong>{status.actor.name}</strong><span>{status.actor.email} · {status.actor.role ?? status.actor.platformRole}</span></p>}<div className="integration-list"><article><span className={status?.integrations.gemini ? "connected" : "fallback"} /><div><strong>Gemini intent extraction</strong><p>{status?.integrations.gemini ? "API key configured" : "Using deterministic fallback"}</p></div></article><article><span className={status?.integrations.razorpay ? "connected" : "fallback"} /><div><strong>Razorpay checkout</strong><p>{status?.integrations.razorpay ? "Test credentials configured" : "Using checkout simulation"}</p></div></article><article><span className={status?.integrations.webhook ? "connected" : "fallback"} /><div><strong>Webhook verification</strong><p>{status?.integrations.webhook ? "Signing secret configured" : "Add a webhook secret when needed"}</p></div></article></div><p className="storage-note"><strong>Storage:</strong> {status?.storage ?? "Checking…"}</p><button className="primary-action" type="button" onClick={() => setShowSettings(false)}>Done</button></section></div>}
    </main>
  );
}
