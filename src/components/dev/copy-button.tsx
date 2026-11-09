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
      title={copied ? "Copied" : label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-rule-strong bg-wash transition-colors hover:border-ink-soft ${
        copied ? "text-ok" : "text-muted hover:text-ink"
      }`}
    >
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
    </button>
  );
}

/** Code block with a copy button. */
export function CodeBlock({ code, lang, wrap = false }: { code: string; lang?: string; wrap?: boolean }) {
  return (
    <div className="group relative">
      <pre
        className={`font-data rounded-lg border border-rule bg-[#070a10] p-4 pr-12 text-[0.78rem] leading-relaxed text-ink-soft ${wrap ? "whitespace-pre-wrap break-all" : "overflow-x-auto"}`}
        data-lang={lang}
      >
        <code>{code}</code>
      </pre>
      <div className="absolute right-2 top-2">
        <CopyButton text={code} />
      </div>
    </div>
  );
}
