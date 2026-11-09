"use client";

import { useActionState } from "react";
import { subscribeAction, type FormState } from "@/app/actions";
import { SetupResults } from "./setup-results";
import { SubscriptionFields, type ChannelConfig } from "./subscription-fields";

export function SignupForm({ config }: { config: ChannelConfig }) {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeAction, { ok: false });

  if (state.ok) {
    return (
      <div className="space-y-5" role="status">
        <p className="font-display text-3xl font-extrabold [font-variation-settings:'wdth'_110]">You&apos;re on the list.</p>
        <SetupResults reports={state.reports ?? []} telegramUrl={state.telegramUrl} />
        {state.manageUrl && (
          <div className="rounded-xl bg-wash p-4 text-sm">
            <p className="font-semibold">Bookmark your manage page</p>
            <p className="mt-1 text-ink-soft">
              Use it to add channels, change what you hear about, or unsubscribe. Every alert links to it too.
            </p>
            <a href={state.manageUrl} className="mt-2 inline-block break-all font-semibold underline underline-offset-2">
              {state.manageUrl}
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-8">
      <SubscriptionFields config={config} />
      {/* Honeypot for bots. Humans never see it. */}
      <input type="text" name="company_site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state.message && (
        <p role="alert" className="rounded-lg bg-bad-wash px-4 py-3 text-sm font-medium text-bad">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-ink px-6 py-3.5 text-base font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Setting up your alerts…" : "Start alerts"}
      </button>
    </form>
  );
}
