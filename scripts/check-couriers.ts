// Read-only check of the courier logins in .env.local (`npm run couriers`): logs in to each courier and counts its
// offices. Creates no shipments. Also says whether the waybill links and the sender are set up.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    for (const line of readFileSync(full, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  }
}

async function main() {
  loadEnv();
  // Imported after the environment is loaded; the adapters read it when they are called.
  const { getCarrier, courierErrorMessage, CARRIER_IDS } = await import("../src/lib/shipping");
  const { sender } = await import("../src/lib/shipping/common");
  const { CARRIERS } = await import("../src/lib/site");

  let failed = 0;
  for (const id of CARRIER_IDS) {
    const adapter = getCarrier(id);
    const name = CARRIERS[id].padEnd(15);
    if (!adapter.isConfigured()) {
      console.log(`– ${name} not connected (no login in .env.local): offices can still be listed, waybills are made on the courier's site`);
      continue;
    }
    const started = Date.now();
    try {
      const count = await adapter.test();
      console.log(`✓ ${name} login works, ${count} offices/lockers listed (${Date.now() - started} ms)`);
    } catch (e) {
      failed++;
      console.log(`✗ ${name} ${courierErrorMessage(e)}`);
    }
  }

  const s = sender();
  const missing = (["name", "phone", "email", "city", "address"] as const).filter((k) => !s[k]);
  console.log(missing.length ? `! Sender: missing SENDER_${missing.map((k) => k.toUpperCase()).join(", SENDER_")}` : `✓ Sender: ${s.name}, ${s.city}`);
  const secret = (process.env.WAYBILL_SECRET ?? "").trim();
  console.log(secret.length >= 16 ? "✓ Waybill links: on" : "! Waybill links: off (set WAYBILL_SECRET, at least 16 characters)");
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
