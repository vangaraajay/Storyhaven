import crypto from "crypto";

/**
 * Constant-time password verification resistant to timing attacks.
 */
export function isPasswordValid(input: string | null | undefined): boolean {
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass || typeof adminPass !== "string" || !adminPass.trim() || !input) {
    return false;
  }
  const inputHash = crypto.createHash("sha256").update(input.trim()).digest();
  const targetHash = crypto.createHash("sha256").update(adminPass.trim()).digest();
  return crypto.timingSafeEqual(inputHash, targetHash);
}
