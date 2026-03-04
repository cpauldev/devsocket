import { BRIDGE_PREFIX_DEFAULT } from "./constants.js";

function normalizeInputPath(path: string): string {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, "/");
  const withoutTrailingSlash = collapsed.replace(/\/+$/g, "");
  return withoutTrailingSlash || "/";
}

export function normalizeBridgePathPrefix(bridgePathPrefix?: string): string {
  const rawPrefix = bridgePathPrefix?.trim() ?? "";
  if (!rawPrefix) return BRIDGE_PREFIX_DEFAULT;

  const normalizedPrefix = normalizeInputPath(rawPrefix);
  if (normalizedPrefix === BRIDGE_PREFIX_DEFAULT) {
    return BRIDGE_PREFIX_DEFAULT;
  }
  if (normalizedPrefix.startsWith(`${BRIDGE_PREFIX_DEFAULT}/`)) {
    return normalizedPrefix;
  }

  const suffix = normalizedPrefix.replace(/^\/+/, "");
  if (!suffix) return BRIDGE_PREFIX_DEFAULT;
  return `${BRIDGE_PREFIX_DEFAULT}/${suffix}`;
}

export function buildBridgeRewriteSource(bridgePathPrefix?: string): string {
  return `${normalizeBridgePathPrefix(bridgePathPrefix)}/:path*`;
}
