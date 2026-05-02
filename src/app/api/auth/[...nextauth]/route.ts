/**
 * Route handler de Auth.js. Maneja todas las URLs de auth:
 *   GET  /api/auth/signin
 *   POST /api/auth/signin/:provider
 *   GET  /api/auth/callback/:provider
 *   GET  /api/auth/signout
 *   etc.
 *
 * En Auth.js v5, los handlers vienen agrupados en `handlers`. Los re-exportamos
 * como GET/POST para cumplir la convención de Next.js Route Handlers.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
