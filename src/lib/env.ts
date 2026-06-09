/**
 * Fail fast on missing configuration instead of producing silently broken
 * values (e.g. webhook URLs built as "undefined/api/...").
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
