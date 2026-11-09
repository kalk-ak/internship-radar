import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { resendEmailAction, testAlertAction, togglePauseAction, unsubscribeAction, updateSubscriptionAction } from "@/app/actions";
import { ActionButton, ManageForm } from "@/components/manage-panel";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { TimeAgo } from "@/components/time-ago";
import { publicChannelConfig } from "@/lib/public-config";
import { getSettings } from "@/lib/settings";
import { getByManageToken, telegramStartUrl } from "@/lib/subscribers";

export const metadata: Metadata = { title: "Manage alerts", robots: { index: false } };

async function Manage({ params, searchParams }: PageProps<"/manage/[token]">) {
  await connection();
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const sub = await getByManageToken(token);
  if (!sub) {
    return (
      <div className="max-w-xl">
        <h1 className="font-head text-4xl font-bold">This link doesn&apos;t work anymore.</h1>
        <p className="mt-3 text-ink-soft">
          The subscription was removed or the link was mistyped. You can{" "}
          <Link href="/#alerts" className="font-semibold underline underline-offset-2">
            sign up again
          </Link>
          .
        </p>
      </div>
    );
  }

  const [config, settings] = await Promise.all([publicChannelConfig(), getSettings()]);
  const { email, telegram, discord, whatsapp } = sub.channels;
  const tgUrl = telegram && !telegram.verified ? telegramStartUrl(sub, settings.telegramBotUsername) : null;
  const statuses = {
    ...(email && { email: email.verified }),
    ...(telegram && { telegram: telegram.verified }),
    ...(discord && { discord: discord.verified }),
    ...(whatsapp && { whatsapp: whatsapp.verified }),
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
      <div>
        {sp.verified === "email" && (
          <p role="status" className="mb-6 rounded-xl bg-ok-wash px-4 py-3 text-sm font-semibold text-ok">
            Email confirmed. Alerts will arrive at {email?.address}.
          </p>
        )}
        <h1 className="font-head text-4xl font-bold sm:text-5xl">
          Your alerts, {sub.name}
        </h1>
        <p className="mt-3 text-ink-soft">
          {sub.paused
            ? "Alerts are paused. Nothing will be sent until you resume."
            : sub.alertsSent
              ? <>You&apos;ve had {sub.alertsSent} alert{sub.alertsSent === 1 ? "" : "s"}, the last one <TimeAgo at={sub.lastAlertAt ?? sub.createdAt} colored={false} className="font-semibold" />.</>
              : "No alerts yet. You'll get one as soon as a matching role is posted."}
        </p>
        {tgUrl && (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-accent/50 bg-wash p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className="font-semibold">Finish connecting Telegram.</span> Open the bot and press Start.
            </p>
            <a href={tgUrl} target="_blank" rel="noopener noreferrer" className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-hover">
              Open Telegram
            </a>
          </div>
        )}
        <div className="mt-10">
          <ManageForm
            action={updateSubscriptionAction.bind(null, token)}
            config={config}
            statuses={statuses}
            defaults={{
              name: sub.name,
              email: email?.address,
              telegram: Boolean(telegram),
              discordWebhook: discord?.webhookUrl,
              whatsappPhone: whatsapp?.phone,
              hasCallmebotKey: Boolean(whatsapp?.callmebotKey),
              prefs: sub.prefs,
            }}
          />
        </div>
      </div>
      <aside className="space-y-3 lg:sticky lg:top-8 lg:self-start">
        <h2 className="font-semibold">Quick actions</h2>
        <ActionButton action={testAlertAction.bind(null, token)}>Send me a test alert</ActionButton>
        {email && !email.verified && <ActionButton action={resendEmailAction.bind(null, token)}>Resend email confirmation</ActionButton>}
        <ActionButton action={togglePauseAction.bind(null, token)}>{sub.paused ? "Resume alerts" : "Pause alerts"}</ActionButton>
        <form action={unsubscribeAction.bind(null, token)}>
          <button type="submit" className="w-full rounded-lg border border-bad/40 px-4 py-2.5 text-left text-sm font-semibold text-bad hover:bg-bad-wash">
            Unsubscribe and delete my data
          </button>
        </form>
        <p className="pt-2 text-sm text-muted">Keep this page private. Anyone with the link can change your alerts.</p>
      </aside>
    </div>
  );
}

export default function ManagePage(props: PageProps<"/manage/[token]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-wash motion-reduce:animate-none" />}>
          <Manage {...props} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
