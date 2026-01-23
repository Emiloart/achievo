"use client";

type MarkdownChunk = { type: "text" | "strong" | "em" | "code" | "link"; value: string; href?: string };

function sanitizeLink(href: string) {
  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:") return href;
    return null;
  } catch {
    return null;
  }
}

function parseInlineMarkdown(input: string): MarkdownChunk[] {
  const chunks: MarkdownChunk[] = [];
  let remaining = input;
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/;

  while (remaining) {
    const match = remaining.match(pattern);
    if (!match || match.index === undefined) {
      chunks.push({ type: "text", value: remaining });
      break;
    }
    if (match.index > 0) {
      chunks.push({ type: "text", value: remaining.slice(0, match.index) });
    }
    const token = match[0];
    if (token.startsWith("**")) {
      chunks.push({ type: "strong", value: token.slice(2, -2) });
    } else if (token.startsWith("*")) {
      chunks.push({ type: "em", value: token.slice(1, -1) });
    } else if (token.startsWith("`")) {
      chunks.push({ type: "code", value: token.slice(1, -1) });
    } else if (token.startsWith("[")) {
      const label = token.slice(1, token.indexOf("]"));
      const href = token.slice(token.indexOf("(") + 1, -1);
      const safe = sanitizeLink(href);
      if (safe) {
        chunks.push({ type: "link", value: label, href: safe });
      } else {
        chunks.push({ type: "text", value: label });
      }
    }
    remaining = remaining.slice(match.index + token.length);
  }
  return chunks;
}

export function PolicyMarkdown({ markdown }: { markdown: string }) {
  return (
    <div>
      {markdown
        .split(/\n+/)
        .filter(Boolean)
        .map((line, index) => {
          const chunks = parseInlineMarkdown(line);
          return (
            <p key={`${line}-${index}`} className={index > 0 ? "mt-2" : undefined}>
              {chunks.map((chunk, idx) => {
                if (chunk.type === "strong") return <strong key={idx}>{chunk.value}</strong>;
                if (chunk.type === "em") return <em key={idx}>{chunk.value}</em>;
                if (chunk.type === "code")
                  return (
                    <code key={idx} className="px-1">
                      {chunk.value}
                    </code>
                  );
                if (chunk.type === "link" && chunk.href)
                  return (
                    <a key={idx} href={chunk.href} className="underline" target="_blank" rel="noreferrer">
                      {chunk.value}
                    </a>
                  );
                return <span key={idx}>{chunk.value}</span>;
              })}
            </p>
          );
        })}
    </div>
  );
}
