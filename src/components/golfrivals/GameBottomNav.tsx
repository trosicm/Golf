"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type GameBottomNavProps = {
  gameId: string;
};

export default function GameBottomNav({ gameId }: GameBottomNavProps) {
  const pathname = usePathname();
  const items = [
    { label: "Dashboard", href: `/app` },
    { label: "Match", href: `/game/${gameId}` },
    { label: "Scorecard", href: `/game/${gameId}/scorecard` },
    { label: "Leaderboard", href: `/game/${gameId}/leaderboard` },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--gr-border)] bg-[rgba(8,18,16,0.96)] px-2 py-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-2 py-2 text-center text-[11px] font-black uppercase tracking-tight ${
                active ? "bg-[var(--gr-gold)] text-[var(--gr-carbon)]" : "text-[var(--gr-text-muted)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
