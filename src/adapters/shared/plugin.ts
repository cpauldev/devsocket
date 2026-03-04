import {
  type UniversaAdapterOptions,
  type ViteAdapterServer,
  buildClientRuntimeContextRegistration,
  createBridgeLifecycle,
  resolveAdapterOptions,
} from "./adapter-utils.js";

function createClientVirtualIds(namespaceId: string): {
  virtualId: string;
  resolvedVirtualId: string;
} {
  const virtualId = `universa-kit:client-init:${namespaceId}`;
  return {
    virtualId,
    resolvedVirtualId: `\0${virtualId}`,
  };
}

export type UniversaVitePluginOptions = UniversaAdapterOptions;
export function createUniversaVitePlugin(
  options: UniversaVitePluginOptions = {},
) {
  const resolvedOptions = resolveAdapterOptions(options);
  const lifecycle = createBridgeLifecycle(resolvedOptions);
  const clientModule =
    resolvedOptions.clientEnabled === false
      ? undefined
      : resolvedOptions.clientModule;
  const virtualIds = createClientVirtualIds(
    resolvedOptions.namespaceId ?? resolvedOptions.adapterName,
  );

  return {
    name: resolvedOptions.adapterName,
    enforce: "pre" as const,

    resolveId(id: string) {
      if (clientModule && id === virtualIds.virtualId) {
        return virtualIds.resolvedVirtualId;
      }
    },

    load(id: string) {
      if (clientModule && id === virtualIds.resolvedVirtualId) {
        const clientContext = buildClientRuntimeContextRegistration(
          clientModule,
          resolvedOptions.clientRuntimeContext,
        );
        // import.meta.hot.accept prevents HMR from propagating up to a
        // full-page reload when RSC plugins invalidate the module graph.
        // The empty callback means: accept the update silently (no-op).
        return [
          ...clientContext,
          `import ${JSON.stringify(clientModule)};`,
          `if (import.meta.hot) { import.meta.hot.accept(() => {}); }`,
        ].join("\n");
      }
    },

    transformIndexHtml: {
      order: "pre" as const,
      handler(_html: string, ctx: { server?: unknown }) {
        if (!clientModule || !ctx.server) return [];
        return [
          {
            tag: "script",
            attrs: { type: "module", src: `/@id/${virtualIds.virtualId}` },
            injectTo: "head-prepend" as const,
          },
        ];
      },
    },

    async configureServer(server: ViteAdapterServer) {
      await lifecycle.setup(server);
    },
  };
}
