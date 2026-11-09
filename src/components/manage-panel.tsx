"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { FormState } from "@/app/actions";
import { SetupResults } from "./setup-results";
import { SubscriptionFields, type ChannelConfig, type FieldDefaults } from "./subscription-fields";

type Bound = (prev: FormState, form: FormData) => Promise<FormState>;
type Simple = () => Promise<FormState>;

export function ManageForm({
  action,
  config,
  defaults,
  statuses,
}: {
  action: Bound;
  config: ChannelConfig;
  defaults: FieldDefaults;
  statuses: Partial<Record<"email" | "telegram" | "discord" | "whatsapp", boolean>>;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  return (
    <form action={formAction} className="space-y-8">
      <SubscriptionFields config={config} defaults={defaults} statuses={statuses} />
      {state.message && (
        <p role="status" className={`rounded-lg px-4 py-3 text-sm font-medium ${state.ok ? "bg-ok-wash text-ok" : "bg-bad-wash text-bad"}`}>
          {state.message}
        </p>
      )}
      {state.reports && <SetupResults reports={state.reports} telegramUrl={state.telegramUrl} />}
      <button type="submit" disabled={pending} className="rounded-xl bg-accent px-6 py-3 font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-60">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function ActionButton({
  action,
  children,
  confirm,
  tone = "default",
}: {
  action: Simple;
  children: ReactNode;
  confirm?: string;
  tone?: "default" | "danger";
}) {
  const [state, setState] = useState<FormState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            setState(await action());
            router.refresh();
          });
        }}
        className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm font-semibold transition-colors disabled:opacity-60 ${
          tone === "danger" ? "border-bad/40 text-bad hover:bg-bad-wash" : "border-rule-strong hover:border-ink-soft"
        }`}
      >
        {pending ? "Working…" : children}
      </button>
      {state?.message && (
        <p role="status" className={`text-sm ${state.ok ? "text-ok" : "text-bad"}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
