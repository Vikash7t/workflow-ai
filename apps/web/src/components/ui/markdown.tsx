"use client";

import React from "react";

interface MarkdownProps {
  content?: string | null;
  className?: string;
}

/**
 * XSS-Safe lightweight Markdown renderer.
 * Strictly prevents dangerous HTML injection, script tags, iframes, and javascript: links.
 */
export function SafeMarkdown({ content, className = "" }: MarkdownProps) {
  if (!content || !content.trim()) {
    return <span className="text-slate-500 italic text-xs">No description provided.</span>;
  }

  // Parse lines into markdown AST-like blocks
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="p-3 my-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto"
          >
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-slate-100 mt-3 mb-1">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-slate-100 mt-4 mb-1.5">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-lg font-extrabold text-white mt-4 mb-2">
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={i}
          className="border-l-2 border-blue-500 pl-3 my-1 text-slate-400 italic text-xs"
        >
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered List
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-4 list-disc text-slate-300 text-xs my-0.5">
          {renderInline(line.trim().slice(2))}
        </li>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={i} className="text-xs text-slate-300 leading-relaxed my-1">
        {renderInline(line)}
      </p>
    );
  }

  return <div className={`space-y-0.5 ${className}`}>{elements}</div>;
}

/**
 * Parses bold, italic, code, and safe links from inline text.
 * Escapes any raw HTML to prevent XSS.
 */
function renderInline(text: string): React.ReactNode {
  // Safe link regex: [text](url) where url begins strictly with http:// or https:// or mailto:
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(parseFormatting(text.substring(lastIndex, match.index)));
    }
    const linkText = match[1];
    const linkUrl = match[2];
    parts.push(
      <a
        key={match.index}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition"
      >
        {linkText}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(parseFormatting(text.substring(lastIndex)));
  }

  return parts.length > 0 ? parts : text;
}

function parseFormatting(text: string): React.ReactNode {
  // Inline code: `code`
  const codeRegex = /`([^`]+)`/g;
  const segments: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      segments.push(parseBoldItalic(text.substring(lastIdx, match.index)));
    }
    segments.push(
      <code
        key={match.index}
        className="px-1 py-0.5 rounded bg-slate-800 text-blue-300 font-mono text-[11px]"
      >
        {match[1]}
      </code>
    );
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    segments.push(parseBoldItalic(text.substring(lastIdx)));
  }

  return segments.length > 0 ? segments : text;
}

function parseBoldItalic(text: string): React.ReactNode {
  // Bold: **text**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const segments: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      segments.push(text.substring(lastIdx, match.index));
    }
    segments.push(
      <strong key={match.index} className="font-semibold text-slate-100">
        {match[1]}
      </strong>
    );
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    segments.push(text.substring(lastIdx));
  }

  return segments.length > 0 ? segments : text;
}
