#!/usr/bin/env node
/**
 * RLS verification: proves users cannot read or write each other's data.
 *
 * RLS is enforced by Postgres, so this must run against a real Supabase
 * project (your free-tier dev project is fine — it creates two throwaway
 * users and deletes them afterwards):
 *
 *   node scripts/rls-check.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY from the environment or .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

// --- env ------------------------------------------------------------------
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SERVICE) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "  ✓" : "  ✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function makeUser(label) {
  const email = `rls-check-${label}-${Date.now()}@example.com`;
  const password = `Rls-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${label}: ${error.message}`);
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw new Error(`signIn ${label}: ${signInError.message}`);
  return { id: data.user.id, client };
}

const cleanup = [];
try {
  console.log("Creating two throwaway users…");
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  cleanup.push(alice.id, bob.id);

  // Alice creates a channel + contact
  const { data: channel, error: chError } = await alice.client
    .from("channels")
    .insert({ user_id: alice.id, type: "telegram", name: "Alice bot", external_id: `rls-${Date.now()}` })
    .select("id")
    .single();
  if (chError) throw new Error(`alice channel insert: ${chError.message}`);
  const { data: contact } = await alice.client
    .from("contacts")
    .insert({ user_id: alice.id, name: "Alice's customer" })
    .select("id")
    .single();

  console.log("\nCross-user READ:");
  for (const table of ["channels", "contacts", "conversations", "messages", "scheduled_posts", "subscriptions"]) {
    const { data } = await bob.client.from(table).select("id");
    check(`bob sees zero rows in ${table}`, (data ?? []).length === 0, `got ${(data ?? []).length}`);
  }

  console.log("\nCross-user WRITE:");
  const { data: updated } = await bob.client
    .from("channels")
    .update({ name: "hijacked" })
    .eq("id", channel.id)
    .select("id");
  check("bob cannot update alice's channel", (updated ?? []).length === 0);

  const { error: spoofError } = await bob.client
    .from("channels")
    .insert({ user_id: alice.id, type: "telegram", name: "spoof" });
  check("bob cannot insert rows owned by alice", spoofError !== null, spoofError?.code);

  const { data: stolen } = await bob.client
    .from("contacts")
    .delete()
    .eq("id", contact.id)
    .select("id");
  check("bob cannot delete alice's contact", (stolen ?? []).length === 0);

  // Sanity: alice CAN see her own data (so the zero-rows above isn't a fluke)
  console.log("\nOwn-data sanity:");
  const { data: own } = await alice.client.from("channels").select("id");
  check("alice sees her own channel", (own ?? []).some((r) => r.id === channel.id));
} catch (err) {
  console.error("\nrls-check crashed:", err.message);
  failures++;
} finally {
  for (const id of cleanup) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log(`\nCleaned up ${cleanup.length} test users.`);
}

if (failures > 0) {
  console.error(`\n${failures} RLS check(s) FAILED — do not ship.`);
  process.exit(1);
}
console.log("\nAll RLS checks passed.");
