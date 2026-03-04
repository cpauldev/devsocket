import { normalizeBridgePathPrefix } from "../bridge/prefix.js";

export interface UniversaClientRuntimeContext {
  namespaceId: string;
  bridgePathPrefix: string;
  clientEnabled: boolean;
  autoMount: boolean;
  keyPrefix: string;
  rootId: string;
  instanceKey: string;
  stateStorageKey: string;
  enabledStorageKey: string;
}

const GLOBAL_CONTEXTS_KEY = "__UNIVERSA_CLIENT_RUNTIME_CONTEXTS__";
const ENV_CONTEXTS_KEY = "__UNIVERSA_CLIENT_RUNTIME_CONTEXTS__";
const NEXT_PUBLIC_ENV_CONTEXTS_KEY = "NEXT_PUBLIC_UNIVERSA_CLIENT_CONTEXTS";
const GLOBAL_QUERY_KEY = "universaClient";

type ClientRuntimeContextMap = Record<string, UniversaClientRuntimeContext>;

export interface UniversaClientRuntimeContextOptions {
  namespaceId: string;
  bridgePathPrefix?: string;
  clientEnabled?: boolean;
  autoMount?: boolean;
}

let cachedEnvContexts: ClientRuntimeContextMap | null | undefined;

function normalizeNamespaceId(namespaceId: string): string {
  const normalized = namespaceId
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[\\/]/g, "-")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new Error(
      "createClientRuntimeContext requires namespaceId (non-empty).",
    );
  }
  return normalized;
}

export function createClientRuntimeContext(
  options: UniversaClientRuntimeContextOptions,
): UniversaClientRuntimeContext {
  const namespaceId = normalizeNamespaceId(options.namespaceId);
  const bridgePathPrefix = normalizeBridgePathPrefix(
    options.bridgePathPrefix ?? namespaceId,
  );
  const keyPrefix = `universa:client:${namespaceId}`;

  return {
    namespaceId,
    bridgePathPrefix,
    clientEnabled: options.clientEnabled ?? true,
    autoMount: options.autoMount ?? true,
    keyPrefix,
    rootId: `universa-client-${namespaceId}`,
    instanceKey: `__UNIVERSA_CLIENT_INSTANCE__:${namespaceId}`,
    stateStorageKey: `${keyPrefix}:state`,
    enabledStorageKey: `${keyPrefix}:enabled`,
  };
}

function getGlobalContextStore(): ClientRuntimeContextMap {
  const runtimeGlobal = globalThis as typeof globalThis & {
    [GLOBAL_CONTEXTS_KEY]?: ClientRuntimeContextMap;
  };

  if (!runtimeGlobal[GLOBAL_CONTEXTS_KEY]) {
    runtimeGlobal[GLOBAL_CONTEXTS_KEY] = {};
  }

  return runtimeGlobal[GLOBAL_CONTEXTS_KEY] ?? {};
}

function parseContextsJson(
  payload: string,
): ClientRuntimeContextMap | undefined {
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!parsed || typeof parsed !== "object") return undefined;
    return parsed as ClientRuntimeContextMap;
  } catch {
    return undefined;
  }
}

function getEnvContextStore(): ClientRuntimeContextMap {
  if (cachedEnvContexts) return cachedEnvContexts;
  if (cachedEnvContexts === null) return {};

  if (typeof process === "undefined") {
    cachedEnvContexts = null;
    return {};
  }

  const envValue =
    process.env?.[ENV_CONTEXTS_KEY] ??
    process.env?.[NEXT_PUBLIC_ENV_CONTEXTS_KEY];
  if (!envValue) {
    cachedEnvContexts = null;
    return {};
  }

  if (typeof envValue === "string") {
    cachedEnvContexts = parseContextsJson(envValue) ?? null;
    return cachedEnvContexts ?? {};
  }

  cachedEnvContexts =
    envValue && typeof envValue === "object"
      ? (envValue as ClientRuntimeContextMap)
      : null;
  return cachedEnvContexts ?? {};
}

function parseBooleanToggle(rawValue: string | null): boolean | null {
  if (rawValue === null) return null;
  const normalized = rawValue.trim().toLowerCase();
  if (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  ) {
    return true;
  }
  if (
    normalized === "0" ||
    normalized === "false" ||
    normalized === "no" ||
    normalized === "off"
  ) {
    return false;
  }
  return null;
}

function readQueryToggle(search: string, key: string): boolean | null {
  try {
    const params = new URLSearchParams(search);
    return parseBooleanToggle(params.get(key));
  } catch {
    return null;
  }
}

function readLocalStorageToggle(storageKey: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    return parseBooleanToggle(window.localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

function getScopedQueryKey(namespaceId: string): string {
  return `${GLOBAL_QUERY_KEY}.${namespaceId}`;
}

export function registerClientRuntimeContext(
  moduleSpecifier: string,
  context: UniversaClientRuntimeContext,
): void {
  if (!moduleSpecifier.trim()) return;
  const store = getGlobalContextStore();
  store[moduleSpecifier] = context;
}

export function registerClientRuntimeContexts(
  contexts: ClientRuntimeContextMap,
): void {
  const store = getGlobalContextStore();
  for (const [moduleSpecifier, context] of Object.entries(contexts)) {
    if (!moduleSpecifier.trim()) continue;
    store[moduleSpecifier] = context;
  }
}

export function getClientRuntimeContexts(): ClientRuntimeContextMap {
  return {
    ...getEnvContextStore(),
    ...getGlobalContextStore(),
  };
}

export function resolveClientRuntimeContext(
  moduleSpecifier: string,
): UniversaClientRuntimeContext | null {
  if (!moduleSpecifier.trim()) return null;

  const globalContext = getGlobalContextStore()[moduleSpecifier];
  if (globalContext) return globalContext;

  const envContext = getEnvContextStore()[moduleSpecifier];
  if (envContext) return envContext;

  return null;
}

export function resolveClientAutoMount(
  moduleSpecifier: string,
  fallbackAutoMount = true,
): boolean {
  const context = resolveClientRuntimeContext(moduleSpecifier);
  if (!context) return fallbackAutoMount;
  if (!context.clientEnabled) return false;

  const querySearch =
    typeof window !== "undefined" ? window.location.search : undefined;
  if (querySearch) {
    const scopedQueryToggle = readQueryToggle(
      querySearch,
      getScopedQueryKey(context.namespaceId),
    );
    if (scopedQueryToggle !== null) {
      return scopedQueryToggle;
    }

    const globalQueryToggle = readQueryToggle(querySearch, GLOBAL_QUERY_KEY);
    if (globalQueryToggle !== null) {
      return globalQueryToggle;
    }
  }

  const storageToggle = readLocalStorageToggle(context.enabledStorageKey);
  if (storageToggle !== null) {
    return storageToggle;
  }

  return context.autoMount;
}
