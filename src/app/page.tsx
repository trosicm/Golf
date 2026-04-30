"use client";
import Link from "next/link";
import dynamic from "next/dynamic";

import { Button } from "./components/Button";
import { Card } from "./components/Card";
import { Badge } from "./components/Badge";
import { Logo } from "./components/Logo";

const UserMenu = dynamic(() => import("./components/UserMenu"), { ssr: false });

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 py-10 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(198,161,91,0.18),transparent_24rem),radial-gradient(circle_at_bottom_right,rgba(95,163,106,0.16),transparent_28rem)]" />
      <div className="pointer-events-none absolute left-1/2 top-8 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgba(198,161,91,0.08)] blur-3xl" />

      <section className="flex w-full max-w-6xl flex-1 flex-col items-center justify-center">
        <img
          src="/brand/golf-rivals-bill-large.png"
          alt="Golf Rivals Bill Logo"
          className="mb-10 w-full max-w-5xl h-auto object-contain"
          style={{ display: 'block' }}
        />

        <Badge variant="gold" className="mb-4">Every Hole Has a Price.</Badge>
        <h1 className="mb-4 max-w-3xl text-4xl font-black tracking-tight text-[var(--gr-sand)] sm:text-6xl">
          Premium golf bets for friends with too much pride.
        </h1>
        <p className="mb-8 max-w-xl text-base leading-7 text-[var(--gr-text-muted)] sm:text-lg">
          Skins, pots, mulligans, reverse mulligans, side bets, live balances and a scoreboard that makes every hole matter.
        </p>

        <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
          <Link href="/app" className="flex-1">
            <Button size="lg" variant="primary" className="w-full">Open Match Dashboard</Button>
          </Link>
          <div className="flex-1">
            <UserMenu />
          </div>
        </div>
      </section>

      <section className="grid w-full max-w-5xl grid-cols-1 gap-4 pb-4 md:grid-cols-3">
        <Card variant="gold">
          <div className="flex items-center gap-3">
            <Badge variant="gold">Live</Badge>
            <span className="font-black text-[var(--gr-sand)]">Match tracking</span>
          </div>
          <p className="mt-2 text-sm text-[var(--gr-text-muted)]">Scores, pots and balances update as the round moves hole by hole.</p>
        </Card>
        <Card variant="turf">
          <div className="flex items-center gap-3">
            <Badge variant="turf">Mulligans</Badge>
            <Badge variant="danger">Reverse</Badge>
          </div>
          <p className="mt-2 text-sm text-[var(--gr-text-muted)]">Add tactical chaos without losing control of the real money logic.</p>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Badge variant="gold">Pot</Badge>
            <Badge variant="neutral">Rivalry</Badge>
          </div>
          <p className="mt-2 text-sm text-[var(--gr-text-muted)]">Every carry, side bet and mistake stays visible. No excuses after the 18th.</p>
        </Card>
      </section>
    </div>
  );
}
