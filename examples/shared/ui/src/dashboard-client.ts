import {
  type DashboardActionId,
  type DashboardControllerState,
  type DashboardFrameworkId,
  createDashboardController,
} from "example/dashboard";
import {
  type IconNode,
  Moon,
  Play,
  Plus,
  RotateCcw,
  Square,
  Sun,
  createElement,
} from "lucide";

import {
  DASHBOARD_ACTION_CONTROLS,
  type DashboardRuntimeUiState,
  buildRuntimeUiState,
  createActionStateMap,
  createRuntimeTabItems,
  createTabsContentSignature,
  resolveActionLabel,
  syncRuntimeTabItems,
} from "./dashboard";
import { getFrameworkVisual, viteBadgeIconSvg } from "./frameworks";
import { applyTheme, getInitialTheme, toggleTheme } from "./theme";
import {
  Button,
  Tabs,
  createCard,
  createCardContent,
  createCardDescription,
  createCardHeader,
  createCardTitle,
} from "./ui";

const ACTION_ICONS: Record<DashboardActionId, IconNode> = {
  start: Play,
  stop: Square,
  restart: RotateCcw,
};

const THEME_ICONS: Record<"dark" | "light", IconNode> = {
  dark: Sun,
  light: Moon,
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createLucideIcon(
  icon: IconNode,
  size: number,
  className: string,
): SVGElement {
  return createElement(icon, {
    width: size,
    height: size,
    class: className,
    "aria-hidden": "true",
    focusable: "false",
  });
}

function setThemeIcon(button: HTMLElement, theme: "light" | "dark"): void {
  const icon = theme === "dark" ? THEME_ICONS.dark : THEME_ICONS.light;
  button.replaceChildren(createLucideIcon(icon, 20, "example-theme-icon"));
}

interface DashboardShellHosts {
  controlsHost: HTMLElement;
  runtimeCardHost: HTMLElement;
}

function renderDashboardShell(input: {
  root: HTMLElement;
  theme: "light" | "dark";
  frameworkId: DashboardFrameworkId;
}): DashboardShellHosts {
  const framework = getFrameworkVisual(input.frameworkId);
  const vitePlusIconHtml = createLucideIcon(
    Plus,
    14,
    "example-vite-tag-plus-icon",
  ).outerHTML;
  const viteTagHtml = framework.usesVite
    ? `<div class="example-vite-tag" aria-label="Powered by Vite">${vitePlusIconHtml}<span class="example-vite-tag-icon" aria-hidden="true">${viteBadgeIconSvg()}</span><span>Vite</span></div>`
    : "";

  input.root.className = "example-page";
  input.root.setAttribute("data-theme", input.theme);
  input.root.innerHTML = `
    <div class="example-container">
      <header class="example-header">
        <div class="example-header-left">
          <h1 class="example-title">Example</h1>
          <div class="example-pill-row">
            <div class="example-pill" style="background-color:${framework.pillBg};color:${framework.pillFg};">
              <span class="example-pill-icon" aria-hidden="true">${framework.iconSvg}</span>
              <span>${escapeHtml(framework.pillLabel)}</span>
            </div>
            ${viteTagHtml}
          </div>
        </div>
      </header>

      <div class="example-top-controls" data-runtime-controls="true"></div>

      <div class="example-dashboard-grid">
        <div class="example-column">
          <div data-runtime-card-host="true"></div>
        </div>
      </div>
    </div>
  `;

  const controlsHost = input.root.querySelector<HTMLElement>(
    "[data-runtime-controls='true']",
  );
  const runtimeCardHost = input.root.querySelector<HTMLElement>(
    "[data-runtime-card-host='true']",
  );
  if (!controlsHost || !runtimeCardHost) {
    throw new Error("Failed to initialize dashboard shell");
  }

  return {
    controlsHost,
    runtimeCardHost,
  };
}

interface ActionButtonRefs {
  button: HTMLButtonElement;
  label: HTMLSpanElement;
}

function createActionButton(input: {
  actionId: DashboardActionId;
  initialLabel: string;
  onClick: (actionId: DashboardActionId) => void;
}): ActionButtonRefs {
  const button = new Button({
    size: "default",
    variant: "outline",
    className: "example-action-btn",
    onClick: () => {
      input.onClick(input.actionId);
    },
  }).getElement();
  button.setAttribute("data-action", input.actionId);
  button.appendChild(
    createLucideIcon(ACTION_ICONS[input.actionId], 14, "example-action-icon"),
  );

  const label = document.createElement("span");
  label.textContent = input.initialLabel;
  button.appendChild(label);
  return { button, label };
}

function applyActionState(
  refs: ActionButtonRefs,
  input: { label: string; disabled: boolean; active: boolean },
): void {
  if (refs.label.textContent !== input.label) {
    refs.label.textContent = input.label;
  }
  if (refs.button.disabled !== input.disabled) {
    refs.button.disabled = input.disabled;
  }
  if (refs.button.hidden) {
    refs.button.hidden = false;
  }
  if (refs.button.getAttribute("aria-label") !== input.label) {
    refs.button.setAttribute("aria-label", input.label);
  }
  if (refs.button.getAttribute("title") !== input.label) {
    refs.button.setAttribute("title", input.label);
  }

  const nextVariant = input.disabled || input.active ? "secondary" : "outline";
  if (refs.button.getAttribute("data-variant") !== nextVariant) {
    refs.button.setAttribute("data-variant", nextVariant);
  }

  if (input.active) {
    refs.button.setAttribute("data-pressed", "true");
    refs.button.setAttribute("aria-busy", "true");
  } else {
    refs.button.removeAttribute("data-pressed");
    refs.button.removeAttribute("aria-busy");
  }
}

interface RuntimeCardRefs {
  summaryEl: HTMLElement;
  tabsHost: HTMLElement;
}

function createRuntimeCard(host: HTMLElement): RuntimeCardRefs {
  const runtimeCard = createCard("example-runtime-card");
  const runtimeCardHeader = createCardHeader();
  const runtimeCardHeaderRow = document.createElement("div");
  runtimeCardHeaderRow.className = "example-card-header-row";
  runtimeCardHeaderRow.appendChild(createCardTitle("Runtime"));
  runtimeCardHeader.appendChild(runtimeCardHeaderRow);

  const summaryEl = createCardDescription("", "example-runtime-summary");
  summaryEl.setAttribute("data-runtime-summary", "true");
  runtimeCardHeader.appendChild(summaryEl);

  const runtimeCardContent = createCardContent();
  const tabsHost = document.createElement("div");
  tabsHost.setAttribute("data-runtime-tabs-host", "true");
  runtimeCardContent.appendChild(tabsHost);

  runtimeCard.append(runtimeCardHeader, runtimeCardContent);
  host.appendChild(runtimeCard);
  return { summaryEl, tabsHost };
}

function createThemeToggleButton(host: HTMLElement): HTMLButtonElement {
  const button = new Button({
    size: "icon",
    variant: "outline",
    className: "example-theme-toggle",
    ariaLabel: "Toggle theme",
    title: "Toggle theme",
  }).getElement();
  button.setAttribute("data-toggle-theme", "true");
  host.appendChild(button);
  return button;
}

function createActionControlMap(
  host: HTMLElement,
  onAction: (actionId: DashboardActionId) => void,
): ReadonlyMap<DashboardActionId, ActionButtonRefs> {
  const actionControlMap = new Map<DashboardActionId, ActionButtonRefs>();
  for (const control of DASHBOARD_ACTION_CONTROLS) {
    const refs = createActionButton({
      actionId: control.id,
      initialLabel: control.fallbackLabel,
      onClick: onAction,
    });
    actionControlMap.set(control.id, refs);
    host.appendChild(refs.button);
  }
  return actionControlMap;
}

function syncControlButtons(
  actionControlMap: ReadonlyMap<DashboardActionId, ActionButtonRefs>,
  actions: DashboardRuntimeUiState["controls"],
): void {
  const actionsById = createActionStateMap(actions);
  for (const control of DASHBOARD_ACTION_CONTROLS) {
    const refs = actionControlMap.get(control.id);
    if (!refs) {
      continue;
    }
    const action = actionsById.get(control.id) ?? null;
    applyActionState(refs, {
      label: resolveActionLabel(action, control.fallbackLabel),
      disabled: action?.disabled ?? true,
      active: action?.loading ?? false,
    });
  }
}

export function mountExampleDashboard(options: {
  root: HTMLElement;
  frameworkId: DashboardFrameworkId;
}): () => void {
  const controller = createDashboardController();

  let theme = getInitialTheme();
  let activeSectionId: string | null = null;
  let runtimeSummaryText = "";
  let tabsSignature = "";
  let runtimeTabItems = createRuntimeTabItems([], null);
  const { controlsHost, runtimeCardHost } = renderDashboardShell({
    root: options.root,
    theme,
    frameworkId: options.frameworkId,
  });

  const { summaryEl, tabsHost } = createRuntimeCard(runtimeCardHost);
  const tabs = new Tabs({
    orientation: "horizontal",
    variant: "default",
    items: [],
    onChange: (value) => {
      activeSectionId = value;
    },
  });
  tabsHost.replaceChildren(tabs.getElement());

  const actionControlMap = createActionControlMap(controlsHost, (actionId) => {
    void controller.runAction(actionId);
  });
  const themeButton = createThemeToggleButton(controlsHost);

  let clockTimer: ReturnType<typeof setInterval> | null = null;

  const syncRuntime = (state: DashboardControllerState, now = Date.now()) => {
    const runtimeState = buildRuntimeUiState(state, activeSectionId, now);
    activeSectionId = runtimeState.activeSectionId;

    if (runtimeSummaryText !== runtimeState.runtimeSummary) {
      runtimeSummaryText = runtimeState.runtimeSummary;
      summaryEl.textContent = runtimeState.runtimeSummary;
    }

    syncControlButtons(actionControlMap, runtimeState.controls);

    const nextTabsSignature = createTabsContentSignature(
      runtimeState.runtimeSections,
    );
    if (tabsSignature !== nextTabsSignature) {
      tabsSignature = nextTabsSignature;
      runtimeTabItems = createRuntimeTabItems(
        runtimeState.runtimeSections,
        runtimeState.runtimeError,
      );
      tabs.setItems(runtimeTabItems);
    } else {
      syncRuntimeTabItems(
        runtimeTabItems,
        runtimeState.runtimeSections,
        runtimeState.runtimeError,
      );
    }

    if (
      activeSectionId &&
      runtimeState.runtimeSections.some(
        (section) => section.id === activeSectionId,
      ) &&
      tabs.getValue() !== activeSectionId
    ) {
      tabs.setValue(activeSectionId);
    }
    activeSectionId = tabs.getValue();
  };

  setThemeIcon(themeButton, theme);
  themeButton.addEventListener("click", () => {
    theme = toggleTheme(theme);
    applyTheme(theme);
    options.root.setAttribute("data-theme", theme);
    setThemeIcon(themeButton, theme);
  });

  const unsubscribe = controller.subscribe((nextState) => {
    syncRuntime(nextState);
  });

  applyTheme(theme);
  controller.start();
  clockTimer = setInterval(() => {
    syncRuntime(controller.getState());
  }, 1000);

  return () => {
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
    tabs.destroy();
    unsubscribe();
    controller.stop();
  };
}
