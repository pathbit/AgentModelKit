import { opencodeProvider } from "./opencode.mjs";
import { freellmapiProvider } from "./freellmapi.mjs";

export const PROVIDERS = {
  [opencodeProvider.id]: opencodeProvider,
  [freellmapiProvider.id]: freellmapiProvider,
};

export function getProvider(id) {
  const key = (id || "").trim().toLowerCase();
  const provider = PROVIDERS[key];
  if (!provider) {
    throw new Error(`Provider desconhecido: '${id}'. Disponiveis: ${Object.keys(PROVIDERS).join(", ")}`);
  }
  return provider;
}

export function listProviders() {
  return Object.values(PROVIDERS);
}
