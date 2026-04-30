"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type GameTopMenuProps = {
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

function MoreIcon({ className }: IconProps) {
  return <Svg className={className}><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></Svg>;
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
function AdminIcon({ className }: IconProps) {
  return <Svg className={className}><path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z" /><path d="M9 12l2 2 4-5" /></Svg>;
}
function RefreshIcon({ className }: IconProps) {
  return <Svg className={className}><path d="M20 11a8 8 0 0 0-14.5-4" /><path d="M5 3v5h5" /><path d="M4 13a8 8 0 0 0 14.5 4" /><path d="M19 21v-5h-5" /></Svg>;
}
function ExitIcon({ className }: IconProps) {
  return <Svg className={className}><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 3v18" /></Svg>;
}

export default function GameTopMenu({ gameId }: GameTopMenuProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: "Dashboard", href: "/app", icon: DashboardIcon },
    { label: "Match", href: `/game/${gameId}`, icon: MatchIcon },
    { label: "Bets", href: `/game/${gameId}/bets`, icon: BetsIcon },
    { label: "Scorecard", href: `/game/${gameId}/scorecard`, icon: ScorecardIcon },
    { label: "Leaderboard", href: `/game/${gameId}/leaderboard`, icon: TrophyIcon },
    { label: "Admin", href: `/game/${gameId}/admin`, icon: AdminIcon },
  ];

  const refresh = () => {
    setOpen(false);
    if (typeof window !== "undefined") window.location.reload();
  };

  const signOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/auth/login");
  };

  return (
    <div className="fixed right-3 top-3 z-50">
      <button
        type="button"
        aria-label="Open game menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--gr-border)] bg-[rgba(8,18,16,0.94)] text-[var(--gr-sand)] shadow-xl backdrop-blur-xl transition hover:border-[var(--gr-gold)]"
      >
        <MoreIcon className="h-5 w-5" />
      </button>

      {open && (
        <>
          <button aria-label="Close game menu" className="fixed inset-0 -z-10 cursor-default bg-transparent" onClick={() => setOpen(false)} />
          <div className="mt-2 w-64 overflow-hidden rounded-3xl border border-[var(--gr-border)] bg-[rgba(8,18,16,0.98)] p-2 shadow-2xl backdrop-blur-xl">
            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--gr-gold)]">Golf Rivals</div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`mb-1 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black transition ${active ? "bg-[var(--gr-gold)] text-[var(--gr-carbon)]" : "text-[var(--gr-sand)] hover:bg-[rgba(239,232,218,0.08)]"}`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="my-2 h-px bg-[var(--gr-border)]" />
            <button type="button" onClick={refresh} className="mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black text-[var(--gr-sand)] transition hover:bg-[rgba(239,232,218,0.08)]">
              <RefreshIcon className="h-5 w-5 shrink-0" />
              <span>Refresh</span>
            </button>
            <button type="button" onClick={signOut} disabled={signingOut} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black text-[var(--gr-danger)] transition hover:bg-[rgba(201,92,74,0.12)] disabled:opacity-50">
              <ExitIcon className="h-5 w-5 shrink-0" />
              <span>{signingOut ? "Signing out..." : "Sign out"}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
