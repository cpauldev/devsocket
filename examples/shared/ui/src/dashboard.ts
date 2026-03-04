import {
  type DashboardActionId,
  type DashboardActionState,
  type DashboardControllerState,
  type DashboardRuntimeSection,
  type DashboardTableRow,
  type DashboardTableSection,
  buildRuntimeSections,
  resolveDashboardStatusBadge,
} from "example/dashboard";

import {
  type BadgeVariant,
  type TabsItem,
  createBadge,
  createFieldLabel,
  createFrame,
  createFrameFooter,
  createTable,
  createTableBody,
  createTableCell,
  createTableContainer,
  createTableRow,
} from "./ui";

export interface DashboardRuntimeView {
  summary: string;
  sections: DashboardRuntimeSection[];
  status: ReturnType<typeof resolveDashboardStatusBadge>;
}

export interface DashboardRuntimeUiState {
  controls: DashboardActionState[];
  runtimeSummary: string;
  runtimeSections: DashboardTableSection[];
  runtimeError: string | null;
  activeSectionId: string | null;
}

export const DASHBOARD_ACTION_CONTROLS = [
  { id: "start", fallbackLabel: "Start" },
  { id: "stop", fallbackLabel: "Stop" },
  { id: "restart", fallbackLabel: "Restart" },
] as const satisfies ReadonlyArray<{
  id: DashboardActionId;
  fallbackLabel: string;
}>;

export function resolveRuntimeView(
  state: DashboardControllerState,
  now = Date.now(),
): DashboardRuntimeView {
  const runtimeData = buildRuntimeSections({
    live: state.live,
    websocket: state.websocket,
    actionLoading: state.actionLoading,
    now,
  });

  return {
    summary: runtimeData.summary,
    sections: runtimeData.sections,
    status: resolveDashboardStatusBadge(state.live),
  };
}

export function isTableSection(
  section: DashboardRuntimeSection,
): section is DashboardTableSection {
  return section.id !== "controls";
}

export function buildRuntimeUiState(
  state: DashboardControllerState,
  activeSectionId: string | null,
  now = Date.now(),
): DashboardRuntimeUiState {
  const runtimeView = resolveRuntimeView(state, now);
  const controlsSection = runtimeView.sections.find(
    (section) => section.id === "controls",
  );
  const runtimeSections = runtimeView.sections.filter(isTableSection);
  const resolvedActiveSectionId =
    activeSectionId &&
    runtimeSections.some((section) => section.id === activeSectionId)
      ? activeSectionId
      : (runtimeSections[0]?.id ?? null);

  return {
    controls:
      controlsSection && controlsSection.id === "controls"
        ? controlsSection.actions
        : [],
    runtimeSummary: runtimeView.summary,
    runtimeSections,
    runtimeError: state.live.errorMessage,
    activeSectionId: resolvedActiveSectionId,
  };
}

export function createTabsContentSignature(
  runtimeSections: DashboardTableSection[],
): string {
  const sectionShape = runtimeSections.map((section) => ({
    id: section.id,
    title: section.title,
  }));
  return JSON.stringify(sectionShape);
}

export function createActionStateMap(
  actions: DashboardActionState[],
): ReadonlyMap<DashboardActionId, DashboardActionState> {
  return new Map(actions.map((action) => [action.id, action] as const));
}

export function resolveActionLabel(
  action: DashboardActionState | null,
  fallbackLabel: string,
): string {
  if (!action) {
    return fallbackLabel;
  }
  return action.loading ? action.loadingLabel : action.label;
}

type DashboardTableCell = DashboardTableRow["value"];
type DashboardTextCell = Extract<DashboardTableCell, { kind: "text" }>;
type DashboardLinkCell = Extract<DashboardTableCell, { kind: "link" }>;

function createTextNode(text: string, className: string): HTMLSpanElement {
  const node = document.createElement("span");
  node.className = className;
  node.textContent = text;
  return node;
}

function resolveBadgeVariant(variant: string): BadgeVariant {
  return (variant === "default" ? "secondary" : variant) as BadgeVariant;
}

function resolveTextClassName(tone: DashboardTextCell["tone"]): string {
  if (tone === "code") return "example-status-code";
  if (tone === "muted") return "example-status-muted";
  return "example-status-value";
}

function createLinkNode(value: DashboardLinkCell): HTMLAnchorElement {
  const node = document.createElement("a");
  node.className = `example-status-link ${resolveTextClassName(value.tone)}`;
  node.href = value.href;
  node.target = "_blank";
  node.rel = "noreferrer noopener";
  node.textContent = value.text;
  return node;
}

function createValueNode(value: DashboardTableCell): Node {
  if (value.kind === "badge") {
    return createBadge({
      text: value.text,
      variant: resolveBadgeVariant(value.variant),
    });
  }
  if (value.kind === "link") {
    return createLinkNode(value);
  }
  return createTextNode(value.text, resolveTextClassName(value.tone));
}

function createValueSignature(value: DashboardTableCell): string {
  if (value.kind === "badge") {
    return `badge:${value.variant}:${value.text}`;
  }
  if (value.kind === "link") {
    return `link:${value.tone ?? "default"}:${value.href}:${value.text}`;
  }
  return `text:${value.tone ?? "default"}:${value.text}`;
}

function syncRowLabel(tr: HTMLTableRowElement, label: string): void {
  const labelElement = tr.querySelector<HTMLElement>(
    "[data-runtime-cell='label']",
  );
  if (!labelElement || labelElement.textContent === label) return;
  labelElement.textContent = label;
}

function syncRowValue(
  tr: HTMLTableRowElement,
  value: DashboardTableCell,
): void {
  const valueCell = tr.querySelector<HTMLElement>(
    "[data-runtime-cell='value']",
  );
  if (!valueCell) return;

  const signature = createValueSignature(value);
  if (valueCell.dataset.valueSignature === signature) return;

  valueCell.dataset.valueSignature = signature;
  valueCell.replaceChildren(createValueNode(value));
}

function syncRow(tr: HTMLTableRowElement, row: DashboardTableRow): void {
  tr.dataset.rowKey = row.key;
  syncRowLabel(tr, row.label);
  syncRowValue(tr, row.value);
}

function createRow(row: DashboardTableRow): HTMLTableRowElement {
  const tr = createTableRow();
  tr.dataset.rowKey = row.key;

  const labelCell = createTableCell("example-status-label-cell");
  const label = createFieldLabel(row.label, undefined, "example-status-label");
  label.setAttribute("data-runtime-cell", "label");
  labelCell.appendChild(label);

  const valueCell = createTableCell("example-status-value-cell");
  valueCell.setAttribute("data-runtime-cell", "value");
  valueCell.dataset.valueSignature = createValueSignature(row.value);
  valueCell.appendChild(createValueNode(row.value));

  tr.append(labelCell, valueCell);
  return tr;
}

function createPanel(
  section: DashboardTableSection,
  runtimeError: string | null,
): HTMLElement {
  const panel = document.createElement("section");
  panel.className = "example-runtime-section";
  panel.setAttribute("data-runtime-panel", section.id);

  const frame = createFrame();
  frame.setAttribute("data-runtime-frame", "true");

  const tableContainer = createTableContainer("example-status-table-container");
  const table = createTable("example-status-table");
  const tbody = createTableBody();
  tbody.setAttribute("data-runtime-table-body", "true");
  section.rows.forEach((row) => {
    tbody.appendChild(createRow(row));
  });

  table.appendChild(tbody);
  tableContainer.appendChild(table);
  frame.appendChild(tableContainer);

  if (section.id === "runtime" && runtimeError) {
    const footer = createFrameFooter("example-frame-footer");
    footer.setAttribute("data-runtime-error-footer", "true");
    const errorText = createTextNode(runtimeError, "example-status-muted");
    errorText.setAttribute("data-runtime-error-text", "true");
    footer.appendChild(errorText);
    frame.appendChild(footer);
  }

  panel.appendChild(frame);
  return panel;
}

export function createRuntimeTabItems(
  sections: DashboardTableSection[],
  runtimeError: string | null,
): TabsItem[] {
  return sections.map((section) => ({
    id: section.id,
    label: section.title,
    panel: createPanel(section, runtimeError),
  }));
}

function syncRuntimeErrorFooter(
  panel: HTMLElement,
  sectionId: DashboardTableSection["id"],
  runtimeError: string | null,
): void {
  const frame = panel.querySelector<HTMLElement>("[data-runtime-frame='true']");
  if (!frame) return;

  const existingFooter = frame.querySelector<HTMLElement>(
    "[data-runtime-error-footer='true']",
  );
  const shouldShow = sectionId === "runtime" && Boolean(runtimeError);

  if (!shouldShow) {
    existingFooter?.remove();
    return;
  }

  if (existingFooter) {
    const textNode = existingFooter.querySelector<HTMLElement>(
      "[data-runtime-error-text='true']",
    );
    if (textNode && textNode.textContent !== runtimeError) {
      textNode.textContent = runtimeError ?? "";
    }
    return;
  }

  const footer = createFrameFooter("example-frame-footer");
  footer.setAttribute("data-runtime-error-footer", "true");
  const errorText = createTextNode(runtimeError ?? "", "example-status-muted");
  errorText.setAttribute("data-runtime-error-text", "true");
  footer.appendChild(errorText);
  frame.appendChild(footer);
}

function syncSectionRows(
  tableBody: HTMLTableSectionElement,
  rows: DashboardTableRow[],
): void {
  const existingRowsByKey = new Map<string, HTMLTableRowElement>();
  tableBody
    .querySelectorAll<HTMLTableRowElement>("tr[data-row-key]")
    .forEach((row) => {
      const key = row.dataset.rowKey;
      if (key) existingRowsByKey.set(key, row);
    });

  rows.forEach((row, index) => {
    const existing = existingRowsByKey.get(row.key);
    const nextRow = existing ?? createRow(row);
    syncRow(nextRow, row);

    const rowAtIndex = tableBody.children.item(index);
    if (rowAtIndex !== nextRow) {
      tableBody.insertBefore(nextRow, rowAtIndex ?? null);
    }

    existingRowsByKey.delete(row.key);
  });

  existingRowsByKey.forEach((row) => {
    row.remove();
  });
}

export function syncRuntimeTabItems(
  items: readonly TabsItem[],
  sections: DashboardTableSection[],
  runtimeError: string | null,
): void {
  const panelById = new Map<string, HTMLElement>();
  items.forEach((item) => {
    panelById.set(item.id, item.panel as HTMLElement);
  });

  sections.forEach((section) => {
    const panel = panelById.get(section.id);
    if (!panel) return;

    const tableBody = panel.querySelector<HTMLTableSectionElement>(
      "[data-runtime-table-body='true']",
    );
    if (!tableBody) return;

    syncSectionRows(tableBody, section.rows);
    syncRuntimeErrorFooter(panel, section.id, runtimeError);
  });
}
