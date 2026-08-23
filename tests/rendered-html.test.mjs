import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const fromRoot = (path) => new URL(`../${path}`, import.meta.url);

test("production build contains all application surfaces", async () => {
  const manifest = JSON.parse(await readFile(fromRoot("dist/client/.vite/manifest.json"), "utf8"));
  assert.ok(manifest["app/localshop-workspace.tsx"], "merchant workspace chunk is missing");
  assert.ok(manifest["app/storefront.tsx"], "customer storefront chunk is missing");
  assert.ok(manifest["app/admin-console.tsx"], "platform admin chunk is missing");
});

test("production build contains Worker entrypoint, D1 binding and migrations", async () => {
  const worker = await readFile(fromRoot("dist/server/index.js"), "utf8");
  const hosting = JSON.parse(await readFile(fromRoot("dist/.openai/hosting.json"), "utf8"));
  const tenantMigration = await readFile(fromRoot("dist/.openai/drizzle/0002_nebulous_saracen.sql"), "utf8");
  const tenantIndexes = await readFile(fromRoot("dist/.openai/drizzle/0003_icy_toro.sql"), "utf8");
  assert.ok((await stat(fromRoot("dist/server/index.js"))).size > 1000, "Worker bundle is unexpectedly empty");
  assert.match(worker, /X-Frame-Options/);
  assert.equal(hosting.d1, "DB");
  assert.match(tenantMigration, /CREATE TABLE `merchants`/);
  assert.match(tenantMigration, /CREATE TABLE `memberships`/);
  assert.match(tenantMigration, /ADD `merchant_id`/);
  assert.match(tenantIndexes, /product_merchant_idx/);
  assert.match(tenantIndexes, /checkout_merchant_idx/);
});
