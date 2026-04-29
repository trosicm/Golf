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
    <div className="flex flex-col items-center justify-center min-h-screen py-10 px-2 bg-gradient-to-br from-[var(--gr-carbon)] to-[var(--gr-midnight)]">
      {/* Hero */}
      <div className="flex flex-col items-center mb-8 w-full">
        <Logo variant="primary" size="xl" priority className="mx-auto mb-4 drop-shadow-lg" />
        <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-[var(--gr-sand)] text-center">Golf Rivals</h1>
        <Badge variant="gold" className="mb-3">Every Hole Has a Price.</Badge>
        <p className="text-base text-[var(--gr-text-muted)] mb-6 text-center max-w-xs">Play smart. Win the hole.<br />Premium live golf competition for friends. Skins, pots, mulligans, reverse, and real rivalry.</p>
        <Link href="/app" className="w-full max-w-xs mb-3">
          <Button size="lg" variant="primary" className="w-full">Open Match Dashboard</Button>
        </Link>
        <UserMenu />
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 gap-4 w-full max-w-md mb-4">
        <Card variant="gold">
          <div className="flex items-center gap-3">
            <Badge variant="gold">Live</Badge>
            <span className="font-semibold text-[var(--gr-sand)]">Live match tracking</span>
          </div>
          <p className="text-sm text-[var(--gr-text-muted)] mt-1">Score every hole, see pots and balances update in real time.</p>
        </Card>
        <Card variant="turf">
          <div className="flex items-center gap-3">
            <Badge variant="turf">Mulligans</Badge>
            <Badge variant="danger">Reverse</Badge>
          </div>
          <p className="text-sm text-[var(--gr-text-muted)] mt-1">Strategic use of mulligans and reverse mulligans for extra tension.</p>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Badge variant="gold">Pot</Badge>
            <Badge variant="neutral">Balances</Badge>
          </div>
          <p className="text-sm text-[var(--gr-text-muted)] mt-1">Track the money at stake and team balances hole by hole.</p>
        </Card>
      </div>
    </div>
  );
}
