import { createContext } from "react-router";

export const cloudflareContext = createContext<{
  env: { DB: D1Database; AI?: Ai };
  ctx: ExecutionContext;
}>();
