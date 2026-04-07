#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const KNOWN_STYLES = [
  "sharp-fill",
  "duotone",
  "regular",
  "bold",
  "sharp",
  "fill",
];

const ICON_RULE_RE = /\.li-([a-z0-9-]+):before\s*\{\s*content:\s*"([^"]+)";\s*\}/g;
const CROSSED_BLOCK_RE = /\n\.li-slashed\s*\{[\s\S]*?\n\}\n(?:\.li-slashed::after\s*\{[\s\S]*?\n\}\n)?/g;

function resolveStyleAndName(fullName) {
  const stylesByLength = [...KNOWN_STYLES].sort((a, b) => b.length - a.length);

  for (const style of stylesByLength) {
    const suffix = `-${style}`;

    if (fullName.endsWith(suffix)) {
      return {
        style,
        name: fullName.slice(0, -suffix.length),
      };
    }
  }

  return {
    style: "regular",
    name: fullName,
  };
}

function renderCrossedBlock() {
  return `.li-slashed {
  position: relative;
  display: inline-block;
  --li-slash-size: 0.05em;
  --li-slash-offset: 48%;
  --li-slash-angle: 45deg;
  -webkit-mask-image: linear-gradient(
      var(--li-slash-angle),
      white calc(var(--li-slash-offset) + var(--li-slash-size) * 0.5),
      transparent calc(var(--li-slash-offset) - var(--li-slash-size) * 0.5),
      transparent calc(var(--li-slash-offset) + var(--li-slash-size) * 2),
      white calc(var(--li-slash-offset) + var(--li-slash-size) * 0.5));
  mask-image: linear-gradient(
      var(--li-slash-angle),
      white calc(var(--li-slash-offset) + var(--li-slash-size) * 0.5),
      transparent calc(var(--li-slash-offset) - var(--li-slash-size) * 0.5),
      transparent calc(var(--li-slash-offset) + var(--li-slash-size) * 2),
      white calc(var(--li-slash-offset) + var(--li-slash-size) * 0.5));
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}
.li-fill.li-slashed, .li-bold.li-slashed, .li-duotone.li-slashed, .li-sharp-fill.li-slashed {
  --li-slash-size: 0.08em;
  --li-slash-offset: 47%;
}
.li-slashed::after {
  content: "";
  position: absolute;
  left: -5px;
  right: -5px;
  top: 50%;
  height: var(--li-slash-size);
  transform: translateY(10%) rotate(var(--li-slash-angle));
  transform-origin: center;
  background: currentColor;
  border-radius: 999px;
  pointer-events: none;
}
.li-sharp.li-slashed::after, .li-sharp-fill.li-slashed::after {
  border-radius: 0;
}
.li-magnifying-glass, .li-cursor {
  --li-slash-angle: -45deg;
}
`
}

function rewriteCss(inputCss) {
  const entriesByStyle = new Map();
  let match;
  let firstMatchIndex = -1;
  let lastMatchEnd = -1;

  while ((match = ICON_RULE_RE.exec(inputCss)) !== null) {
    if (firstMatchIndex === -1) {
      firstMatchIndex = match.index;
    }

    lastMatchEnd = ICON_RULE_RE.lastIndex;

    const fullName = match[1];
    const codepoint = match[2];
    const { style, name } = resolveStyleAndName(fullName);

    if (!name) {
      continue;
    }

    if (!entriesByStyle.has(style)) {
      entriesByStyle.set(style, []);
    }

    entriesByStyle.get(style).push({ name, codepoint });
  }

  if (firstMatchIndex === -1) {
    throw new Error("No icon rules found. Expected selectors like .li-*-*:before { content: ... }.");
  }

  const preludeOriginal = inputCss.slice(0, firstMatchIndex);
  const tail = inputCss.slice(lastMatchEnd).trim();

  const prelude = preludeOriginal.replace(CROSSED_BLOCK_RE, "\n").trimEnd();
  const blocks = [];

  blocks.push(prelude);
  blocks.push("");
  blocks.push(renderCrossedBlock());
  blocks.push("");

  const styleOrder = ["regular", "duotone", "bold", "fill", "sharp", "sharp-fill"];

  for (const style of styleOrder) {
    const entries = entriesByStyle.get(style);

    if (!entries || entries.length === 0) {
      continue;
    }

    blocks.push(`/* ${style} */`);

    for (const entry of entries) {
      const selector =
        style === "regular"
          ? `.li-${entry.name}:before`
          : `.li-${style}.li-${entry.name}:before`;

      blocks.push(`${selector} {`);
      blocks.push(`    content: \"${entry.codepoint}\";`);
      blocks.push("}");
    }

    blocks.push("");
  }

  if (tail.length > 0) {
    blocks.push(tail);
    blocks.push("");
  }

  return `${blocks.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function main() {
  const input = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, "../iconfont/style.css");

  const output = process.argv[3] ? path.resolve(process.argv[3]) : input;

  const css = fs.readFileSync(input, "utf8");
  const next = rewriteCss(css);

  fs.writeFileSync(output, next, "utf8");
}

main();