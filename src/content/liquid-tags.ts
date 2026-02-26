import type { LiquidTagMatch, LiquidTagReport } from '../types.js';

/**
 * Liquid tag definitions with their cross-post safety and conversion functions.
 */
const TAG_DEFS: Record<
  string,
  { crossPostSafe: boolean; convert: (arg: string, content?: string) => string }
> = {
  embed: {
    crossPostSafe: false,
    convert: (arg) => arg,
  },
  link: {
    crossPostSafe: false,
    convert: (arg) => `[${arg}](${arg})`,
  },
  user: {
    crossPostSafe: false,
    convert: (arg) => `@${arg}`,
  },
  tag: {
    crossPostSafe: false,
    convert: (arg) => `#${arg}`,
  },
  github: {
    crossPostSafe: false,
    convert: (arg) => `[${arg}](https://github.com/${arg})`,
  },
  youtube: {
    crossPostSafe: false,
    convert: (arg) => `https://www.youtube.com/watch?v=${arg}`,
  },
  twitter: {
    crossPostSafe: false,
    convert: (arg) => `https://twitter.com/i/status/${arg}`,
  },
  codepen: {
    crossPostSafe: false,
    convert: (arg) => arg,
  },
  codesandbox: {
    crossPostSafe: false,
    convert: (arg) => `https://codesandbox.io/s/${arg}`,
  },
  details: {
    crossPostSafe: false,
    convert: (summary, content) =>
      `<details>\n<summary>${summary}</summary>\n\n${content ?? ''}\n</details>`,
  },
  katex: {
    crossPostSafe: false,
    convert: (_arg, content) => `$$\n${content ?? ''}\n$$`,
  },
};

/**
 * Detect all liquid tags in markdown, skipping those inside code fences.
 */
export function detectLiquidTags(markdown: string): LiquidTagReport {
  if (!markdown) {
    return { tags: [], hasCrossPostUnsafe: false };
  }

  const lines = markdown.split('\n');
  const tags: LiquidTagMatch[] = [];
  let insideCodeFence = false;

  // First pass: find block tags ({% tag %}...{% endtag %})
  const blockTagPattern = /\{%\s*(\w+)\s*(.*?)\s*%\}([\s\S]*?)\{%\s*end\1\s*%\}/g;
  // Single-line tag pattern
  const inlineTagPattern = /\{%\s*(\w+)\s*(.*?)\s*%\}/g;

  // Track which regions are inside code fences
  const codeFenceRanges: Array<{ start: number; end: number }> = [];
  let charOffset = 0;
  let fenceStart = -1;

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      if (!insideCodeFence) {
        insideCodeFence = true;
        fenceStart = charOffset;
      } else {
        insideCodeFence = false;
        codeFenceRanges.push({ start: fenceStart, end: charOffset + line.length });
      }
    }
    charOffset += line.length + 1; // +1 for \n
  }

  // If we ended inside a fence, close it at end
  if (insideCodeFence) {
    codeFenceRanges.push({ start: fenceStart, end: markdown.length });
  }

  function isInsideCodeFence(offset: number): boolean {
    return codeFenceRanges.some((range) => offset >= range.start && offset < range.end);
  }

  function lineNumberForOffset(offset: number): number {
    let lineNumber = 1;
    for (let i = 0; i < offset && i < markdown.length; i++) {
      if (markdown[i] === '\n') lineNumber++;
    }
    return lineNumber;
  }

  // Find block tags first
  const blockTagPositions = new Set<string>();
  let blockMatch: RegExpExecArray | null;
  blockTagPattern.lastIndex = 0;
  while ((blockMatch = blockTagPattern.exec(markdown)) !== null) {
    if (isInsideCodeFence(blockMatch.index)) continue;

    const tagName = blockMatch[1]!.toLowerCase();
    const argument = blockMatch[2]!.trim();
    const tagDef = TAG_DEFS[tagName];

    blockTagPositions.add(`${blockMatch.index}:${blockMatch[0].length}`);

    tags.push({
      tag: tagName,
      argument,
      fullMatch: blockMatch[0],
      lineNumber: lineNumberForOffset(blockMatch.index),
      crossPostSafe: tagDef?.crossPostSafe ?? false,
      hasEndTag: true,
    });
  }

  // Find inline tags (skip those that are part of a block tag)
  inlineTagPattern.lastIndex = 0;
  let inlineMatch: RegExpExecArray | null;
  while ((inlineMatch = inlineTagPattern.exec(markdown)) !== null) {
    if (isInsideCodeFence(inlineMatch.index)) continue;

    const tagName = inlineMatch[1]!.toLowerCase();
    // Skip end tags
    if (tagName.startsWith('end')) continue;

    // Skip if this is part of a block tag we already found
    let isPartOfBlock = false;
    for (const pos of blockTagPositions) {
      const [startStr, lenStr] = pos.split(':');
      const start = Number(startStr);
      const end = start + Number(lenStr);
      if (inlineMatch.index >= start && inlineMatch.index < end) {
        isPartOfBlock = true;
        break;
      }
    }
    if (isPartOfBlock) continue;

    const argument = inlineMatch[2]!.trim();
    const tagDef = TAG_DEFS[tagName];

    tags.push({
      tag: tagName,
      argument,
      fullMatch: inlineMatch[0],
      lineNumber: lineNumberForOffset(inlineMatch.index),
      crossPostSafe: tagDef?.crossPostSafe ?? false,
      hasEndTag: false,
    });
  }

  // Sort by line number
  tags.sort((a, b) => a.lineNumber - b.lineNumber);

  return {
    tags,
    hasCrossPostUnsafe: tags.some((t) => !t.crossPostSafe),
  };
}

/**
 * Convert a single liquid tag match to its closest standard equivalent.
 */
export function convertLiquidTag(match: LiquidTagMatch, content?: string): string {
  const tagDef = TAG_DEFS[match.tag];
  if (!tagDef) {
    // Unknown tag — remove it
    return match.argument || '';
  }
  return tagDef.convert(match.argument, content);
}

/**
 * Strip all liquid tags from markdown, replacing with converted equivalents.
 * Skips liquid tags inside code fences.
 */
export function stripLiquidTags(markdown: string): string {
  if (!markdown) return '';

  let result = markdown;

  // Handle block tags first ({% tag %}...{% endtag %})
  const blockTagPattern = /\{%\s*(\w+)\s*(.*?)\s*%\}([\s\S]*?)\{%\s*end\1\s*%\}/g;

  // Track code fence regions in current result
  function getCodeFenceRanges(text: string): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];
    const textLines = text.split('\n');
    let insideFence = false;
    let fenceStartOffset = -1;
    let currentCharOffset = 0;

    for (const line of textLines) {
      if (/^```/.test(line.trim())) {
        if (!insideFence) {
          insideFence = true;
          fenceStartOffset = currentCharOffset;
        } else {
          insideFence = false;
          ranges.push({ start: fenceStartOffset, end: currentCharOffset + line.length });
        }
      }
      currentCharOffset += line.length + 1;
    }
    if (insideFence) {
      ranges.push({ start: fenceStartOffset, end: text.length });
    }
    return ranges;
  }

  // Replace block tags
  result = result.replace(blockTagPattern, (fullMatch, tagName, argument, content, offset) => {
    const ranges = getCodeFenceRanges(result);
    if (ranges.some((r) => offset >= r.start && offset < r.end)) {
      return fullMatch;
    }
    const tagDef = TAG_DEFS[tagName.toLowerCase()];
    if (!tagDef) return content.trim() || argument.trim();
    return tagDef.convert(argument.trim(), content.trim());
  });

  // Replace inline tags
  const inlineTagPattern = /\{%\s*(\w+)\s*(.*?)\s*%\}/g;
  result = result.replace(inlineTagPattern, (fullMatch, tagName, argument, offset) => {
    const lowerTag = tagName.toLowerCase();
    if (lowerTag.startsWith('end')) return fullMatch;

    const ranges = getCodeFenceRanges(result);
    if (ranges.some((r) => offset >= r.start && offset < r.end)) {
      return fullMatch;
    }
    const tagDef = TAG_DEFS[lowerTag];
    if (!tagDef) return argument.trim();
    return tagDef.convert(argument.trim());
  });

  return result;
}
