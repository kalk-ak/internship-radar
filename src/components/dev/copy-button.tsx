"use client";

import { CheckIcon, CopyIcon } from "@primer/octicons-react";
import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {}
      }}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied!" : label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-gh-border bg-gh-btn hover:bg-gh-btn-hover ${
        copied ? "text-gh-success" : "text-gh-muted hover:text-gh-fg"
      }`}
    >
      {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
    </button>
  );
}

/** A GitHub-style code block with a copy button. */
export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-md bg-gh-subtle p-4 font-gh-mono text-[13.6px] leading-[1.45]" data-lang={lang}>
        <code>{code}</code>
      </pre>
      <div className="absolute right-2 top-2 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <CopyButton text={code} />
      </div>
    </div>
  );
}
