import fs from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

const SCOPE_SELECTOR = '[data-overlay-root="true"]';
const inputPath = path.resolve("dist/overlay.unscoped.css");
const outputPath = path.resolve("dist/overlay.css");

function isKeyframesRule(rule) {
  let current = rule.parent;
  while (current) {
    if (current.type === "atrule" && /keyframes$/i.test(current.name)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function createScopeSelectorNode() {
  return selectorParser.attribute({
    attribute: "data-overlay-root",
    operator: "=",
    quoteMark: '"',
    value: "true",
  });
}

const normalizeSelector = selectorParser((selectors) => {
  selectors.each((selector) => {
    selector.walkPseudos((node) => {
      if (node.value === ":root" || node.value === ":host") {
        node.replaceWith(createScopeSelectorNode());
      }
    });

    selector.walkTags((node) => {
      if (node.value === "html" || node.value === "body") {
        node.replaceWith(createScopeSelectorNode());
      }
    });
  });
});

function hasScopeAttribute(selector) {
  let scoped = false;
  selectorParser((selectors) => {
    selectors.walkAttributes((node) => {
      if (node.attribute?.toLowerCase() === "data-overlay-root") {
        scoped = true;
      }
    });
  }).processSync(selector, { lossless: false });
  return scoped;
}

function scopeSelector(selector) {
  const normalized = normalizeSelector.processSync(selector, {
    lossless: false,
  });
  if (hasScopeAttribute(normalized)) {
    return normalized;
  }
  return `${SCOPE_SELECTOR} ${normalized}`;
}

const sourceCss = await fs.readFile(inputPath, "utf8");
const root = postcss.parse(sourceCss);

root.walkRules((rule) => {
  if (isKeyframesRule(rule)) return;
  if (!Array.isArray(rule.selectors) || rule.selectors.length === 0) return;

  rule.selectors = [...new Set(rule.selectors.map(scopeSelector))];
});

await fs.writeFile(outputPath, root.toResult().css);
await fs.rm(inputPath, { force: true });
