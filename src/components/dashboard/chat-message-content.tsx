"use client";

import React from "react";

/**
 * Renders Claude response with basic markdown: **bold**, ## headings, - bullets, newlines.
 */
export function ChatMessageContent({ content }: { content: string }) {
  const parts = parseFormattedContent(content);
  return (
    <div className="space-y-2 whitespace-pre-wrap break-words">
      {parts.map((part, i) => (
        <React.Fragment key={i}>{part}</React.Fragment>
      ))}
    </div>
  );
}

type Part = React.ReactNode;

function parseFormattedContent(text: string): Part[] {
  const out: Part[] = [];
  const lines = text.split(/\n/);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (/^##\s+/.test(line)) {
      const heading = line.replace(/^##\s+/, "").trim();
      out.push(
        <h2 key={`h-${i}`} className="mt-3 text-base font-semibold text-neutral-100 first:mt-0">
          {renderInlineBold(heading)}
        </h2>
      );
      i++;
      continue;
    }

    if (/^[\s]*[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const bulletItems: string[] = [];
      while (i < lines.length && (/^[\s]*[-*•]\s+/.test(lines[i]) || /^\d+\.\s+/.test(lines[i]))) {
        bulletItems.push(lines[i].replace(/^[\s]*[-*•]\s+/, "").replace(/^\d+\.\s+/, "").trim());
        i++;
      }
      out.push(
        <ul key={`ul-${i}`} className="list-inside list-disc space-y-0.5 pl-1 text-neutral-200">
          {bulletItems.map((item, j) => (
            <li key={j}>{renderInlineBold(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    const trimmed = line.trim();
    if (trimmed) {
      out.push(
        <p key={`p-${i}`} className="text-neutral-200">
          {renderInlineBold(trimmed)}
        </p>
      );
    } else {
      out.push(<br key={`br-${i}`} />);
    }
    i++;
  }

  return out;
}

function renderInlineBold(str: string): React.ReactNode {
  const segments: React.ReactNode[] = [];
  let key = 0;
  let rest = str;
  const re = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    if (m.index > lastIndex) {
      segments.push(str.slice(lastIndex, m.index));
    }
    segments.push(
      <strong key={key++} className="font-semibold text-neutral-100">
        {m[1]}
      </strong>
    );
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < str.length) segments.push(str.slice(lastIndex));
  return segments.length === 1 ? segments[0] : <>{segments}</>;
}
