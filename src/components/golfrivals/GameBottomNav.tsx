"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type GameBottomNavProps = {
  gameId: string;
};

type IconProps = {
  className?: string;
};

function Svg({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function DashboardIcon({ className }: IconProps) {
  return <Svg className={className}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Svg>;
}
function MatchIcon({ className }: IconProps) {
  return <Svg className={className}><path d="M6 21V4" /><path d="M6 4h10l-2 4 2 4H6" /><path d="M18 21H4" /></Svg>;
}
function BetsIcon({ className }: IconProps) {
  return <Svg className={className}><path d="M4 8h11a4 4 0 0 1 0 8H4z" /><path d="M7 12h6" /><path d="M18 9.5l2 -2" /><path d="M18 14.5l2 2" /></Svg>;
}
function ScorecardIcon({ className }: IconProps) {
  return <Svg className={className}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6" /><path d="M9 11h6" /><path d="M9 15h4" /></Svg>;
}
function TrophyIcon({ className }: IconProps) {
  return <Svg className={className}><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a2 2 0 0 0 2 4h1" /><path d="M16 6h3a2 2 0 0 1-2 4h-1" /><path d="M12 13v4" /><path d="M9 21h6" /><path d="M10 17h4" /></Svg>;
}

export default function GameBottomNav({ gameId }: GameBottomNavProps) {
  const pathname = usePathname();
  const items = [
    { label: "Dashboard", short: "Home", href: `/app`, icon: DashboardIcon },
    { label: "Match", short: "Match", href: `/game/${gameId}`, icon: MatchIcon },
    { label: "Bets", short: "Bets", href: `/game/${gameId}/bets`, icon: BetsIcon },
    { label: "Scorecard", short: "Card", href: `/game/${gameId}/scorecard`, icon: ScorecardIcon },
    { label: "Leaderboard", short: "Top", href: `/game/${gameId}/leaderboard`, icon: TrophyIcon },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--gr-border)] bg-[rgba(8,18,16,0.96)] px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={`flex min-h-[54px] flex-col items-center justify-center rounded-2xl px-1 py-2 text-center transition ${
                active
                  ? "bg-[var(--gr-gold)] text-[var(--gr-carbon)] shadow-[0_10px_24px_rgba(198,161,91,0.22)]"
                  : "text-[var(--gr-text-muted)] hover:bg-[rgba(239,232,218,0.06)] hover:text-[var(--gr-sand)]"
              }`}
            >
              <Icon className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="mt-1 hidden text-[10px] font-black uppercase tracking-tight sm:block">{item.short}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
