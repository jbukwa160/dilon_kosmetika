import "server-only";
import path from "node:path";

/** Runtime data (orders, waybills, courier lists) lives outside the project: `DATA_DIR`, default `../omaya-data`. */
export function dataDir(): string {
  // Not something the build should trace and bundle.
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.DATA_DIR || "../omaya-data");
}
