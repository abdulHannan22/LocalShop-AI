import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const fromRoot = (path) => new URL(`../${path}`, import.meta.url);

test("production build contains all application surfaces", async () => {
  const server = await readFile(fromRoot("dist/server/index.js"), "utf8");
  assert.match(server, /Catalogue/, "merchant workspace is missing");
  assert.match(server, /Storefront/, "customer storefront is missing");
  assert.match(server, /Platform admin/, "platform admin is missing");
  assert.match(server, /checkout\/verify/, "payment verification route is missing");
});

test("production build contains the Postgres checkout runtime", async () => {
  const worker = await readFile(fromRoot("dist/server/index.js"), "utf8");
  assert.ok((await stat(fromRoot("dist/server/index.js"))).size > 1000, "Worker bundle is unexpectedly empty");
  assert.match(worker, /Razorpay/);
  assert.match(worker, /Registration failed/);
  assert.ok((await stat(fromRoot("prisma/schema.prisma"))).size > 1000, "Prisma schema is missing");
  assert.ok((await stat(fromRoot("prisma/migrations/0_init/migration.sql"))).size > 1000, "Prisma migration is missing");
});
