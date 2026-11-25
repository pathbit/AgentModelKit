import { opencodeProvider } from "./opencode.mjs";
import { freellmapiProvider } from "./freellmapi.mjs";

export const PROVIDERS = {
  [opencodeProvider.id]: opencodeProvider,
  [freellmapiProvider.id]: freellmapiProvider,
};

export function getProvider(id) {
  const key = (id || "").trim().toLowerCase();
  const provider = Object.hasOwn(PROVIDERS, key) ? PROVIDERS[key] : null;
  if (!provider) {
    throw new Error(`Unknown provider: '${id}'. Available: ${Object.keys(PROVIDERS).join(", ")}`);
  }
  return provider;
}

export function listProviders() {
  return Object.values(PROVIDERS);
}
