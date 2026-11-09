"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/actions";
import { SetupResults } from "./setup-results";
import { SubscriptionFields, type ChannelConfig } from "./subscription-fields";

type Bound = (prev: FormState, form: FormData) => Promise<FormState>;

export const adminInput =
  "w-full rounded-lg border border-rule bg-panel px-3 py-2 text-sm placeholder:text-muted/80 focus:border-ink focus:outline-none";

function Message({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p role="status" className={`rounded-lg px-3 py-2 text-sm font-medium ${state.ok ? "bg-ok-wash text-ok" : "bg-bad-wash text-bad"}`}>
      {state.message}
    </p>
  );
}

export function LoginForm({ action }: { action: Bound }) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div>
        <label htmlFor="password" className="mb-1.5 block font-semibold">
          Admin password
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={adminInput} />
      </div>
      <Message state={state} />
      <button disabled={pending} className="rounded-lg bg-ink px-5 py-2.5 font-semibold text-paper disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function SettingsForm({
  action,
  children,
  submitLabel = "Save",
  removable = false,
}: {
  action: Bound;
  children: ReactNode;
  submitLabel?: string;
  removable?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  return (
    <form action={formAction} className="space-y-3">
      {children}
      <Message state={state} />
      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button disabled={pending} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-60">
          {pending ? "Saving…" : submitLabel}
        </button>
        {removable && (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="clear" className="accent-[var(--color-bad)]" /> Remove these settings
          </label>
        )}
      </div>
    </form>
  );
}

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  hint,
  locked,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  hint?: ReactNode;
  locked?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold" htmlFor={name}>
        {label}
        {locked && <span className="ml-2 font-normal text-muted">(set by environment variable)</span>}
      </label>
      <input id={name} name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} disabled={locked} autoComplete="off" className={`${adminInput} disabled:bg-wash`} />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function AddSubscriberForm({ action, config }: { action: Bound; config: ChannelConfig }) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  return (
    <form action={formAction} className="space-y-6">
      <SubscriptionFields config={config} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="trustEmail" defaultChecked className="accent-ink" />
        Skip email confirmation (I know this address is right)
      </label>
      <Message state={state} />
      {state.reports && <SetupResults reports={state.reports} telegramUrl={state.telegramUrl} />}
      <button disabled={pending} className="rounded-lg bg-ink px-5 py-2.5 font-semibold text-paper disabled:opacity-60">
        {pending ? "Adding…" : "Add subscriber"}
      </button>
    </form>
  );
}
