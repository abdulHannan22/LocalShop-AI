/**
 * Seeds 5 demo stores (each a different brand/category) with ~24 products
 * each, using the app's own live /api/auth/signup and /api/catalog
 * endpoints. Run this against a running dev server:
 *
 *   npm run dev:portable          (in one terminal)
 *   npx tsx scripts/seed-demo-stores.ts   (in another terminal)
 *
 * Optional: BASE_URL=http://localhost:5173 npx tsx scripts/seed-demo-stores.ts
 */
import { buildSeedStores } from "./demo-store-data";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

function extractSessionCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/lsa_merchant_session=[^;]+/);
  if (!match) throw new Error(`No session cookie in signup response (status ${response.status}): ${setCookie || "<empty>"}`);
  return match[0];
}

async function main() {
  const stores = buildSeedStores();
  let totalProducts = 0;
  let totalFailures = 0;

  for (const store of stores) {
    console.log(`\n=== ${store.storeName} (/store/${store.slug}) ===`);

    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName: store.storeName,
        slug: store.slug,
        ownerName: store.ownerName,
        email: store.email,
        password: store.password,
      }),
    });

    let cookie: string;
    if (signupResponse.ok) {
      cookie = extractSessionCookie(signupResponse);
      console.log(`Created merchant account for ${store.email}`);
    } else {
      const body = await signupResponse.json().catch(() => ({}));
      const message = (body as { error?: string }).error ?? "";
      if (!message.toLowerCase().includes("already")) {
        console.error(`Signup failed for ${store.storeName}: ${message || signupResponse.status}`);
        totalFailures += 1;
        continue;
      }
      console.log(`Account already exists for ${store.email}, signing in instead`);
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: store.email, password: store.password }),
      });
      if (!loginResponse.ok) {
        console.error(`Login also failed for ${store.storeName} — skipping. Check the password matches what was used originally.`);
        totalFailures += 1;
        continue;
      }
      cookie = extractSessionCookie(loginResponse);
    }

    for (const product of store.products) {
      const response = await fetch(`${BASE_URL}/api/catalog`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify(product),
      });
      if (response.ok) {
        totalProducts += 1;
        process.stdout.write(".");
      } else {
        totalFailures += 1;
        const body = await response.json().catch(() => ({}));
        console.error(`\nFailed to add "${product.name}": ${(body as { error?: string }).error ?? response.status}`);
      }
    }
    console.log(`\n${store.products.length} products submitted for ${store.storeName}.`);
  }

  console.log(`\n=== Done: ${totalProducts} products created, ${totalFailures} failures across ${stores.length} stores ===`);
  if (totalFailures > 0) {
    console.log("Failures are often just 'store URL already taken' from a previous run — safe to ignore if you're re-seeding.");
  }
}

main().catch((error) => {
  console.error("Seed script crashed:", error);
  process.exitCode = 1;
});