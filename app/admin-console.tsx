"use client";

import { FormEvent, useEffect, useState } from "react";

type Merchant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  memberCount: number;
  createdAt: string;
};

export function AdminConsole() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [form, setForm] = useState({ name: "", slug: "", ownerEmail: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/merchants");
    const data = await response.json() as { merchants?: Merchant[]; error?: string };
    setLoading(false);
    if (!response.ok) return setError(data.error ?? "Admin access failed");
    setError("");
    setMerchants(data.merchants ?? []);
  }

  useEffect(() => { load().catch(() => setError("Admin access failed")); }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    const response = await fetch("/api/admin/merchants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json() as { merchant?: Merchant; error?: string };
    setCreating(false);
    if (!response.ok) return setError(data.error ?? "Merchant creation failed");
    setForm({ name: "", slug: "", ownerEmail: "" });
    setNotice(`${data.merchant?.name ?? "Merchant"} created. The owner activates access by signing in with the invited email.`);
    await load();
  }

  async function toggle(merchant: Merchant) {
    const status = merchant.status === "active" ? "suspended" : "active";
    const response = await fetch("/api/admin/merchants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantId: merchant.id, status }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) return setError(data.error ?? "Update failed");
    setMerchants((items) => items.map((item) => item.id === merchant.id ? { ...item, status } : item));
  }

  return (
    <main className="platform-shell">
      <aside>
        <a href="/" className="store-logo"><span>L</span><strong>LocalShop AI</strong></a>
        <p>Platform operations</p>
        <nav><a className="active" href="/admin">Merchants</a><a href="/">Merchant workspace</a><a href="/store/nova-store">Customer storefront</a></nav>
      </aside>
      <section>
        <header><div><p className="eyebrow">Platform administration</p><h1>Merchant governance and system access</h1></div><button type="button" onClick={load}>Refresh</button></header>
        <div className="platform-metrics"><article><span>Merchants</span><strong>{merchants.length}</strong></article><article><span>Active</span><strong>{merchants.filter((item) => item.status === "active").length}</strong></article><article><span>Staff memberships</span><strong>{merchants.reduce((sum, item) => sum + item.memberCount, 0)}</strong></article></div>
        <form className="merchant-create-form" onSubmit={create}>
          <div><strong>Onboard a merchant</strong><span>Create an isolated store and invite its first owner.</span></div>
          <label>Store name<input required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Acme Electronics" /></label>
          <label>Store slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="acme-electronics" /></label>
          <label>Owner email<input required type="email" value={form.ownerEmail} onChange={(event) => setForm({ ...form, ownerEmail: event.target.value })} placeholder="owner@example.com" /></label>
          <button className="primary-action" disabled={creating} type="submit">{creating ? "Creating…" : "Create merchant"}</button>
        </form>
        {error && <div className="admin-error">{error}</div>}
        {notice && <div className="admin-notice">{notice}</div>}
        {loading ? <div className="view-loading">Loading platform data…</div> : (
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Merchant</th><th>Store URL</th><th>Members</th><th>Status</th><th>Created</th><th>Control</th></tr></thead><tbody>{merchants.map((merchant) => <tr key={merchant.id}><td><strong>{merchant.name}</strong><span>{merchant.id}</span></td><td><a href={`/store/${merchant.slug}`}>/store/{merchant.slug}</a></td><td>{merchant.memberCount}</td><td><span className={`status-pill ${merchant.status}`}>{merchant.status}</span></td><td>{merchant.createdAt || "Bootstrap tenant"}</td><td><button className="secondary-action" type="button" onClick={() => toggle(merchant)}>{merchant.status === "active" ? "Suspend" : "Activate"}</button></td></tr>)}</tbody></table></div>
        )}
        <div className="platform-warning"><strong>Production boundary</strong><p>Only verified platform administrators can access this API. Suspending a merchant removes its storefront from catalogue and recommendation resolution.</p></div>
      </section>
    </main>
  );
}
