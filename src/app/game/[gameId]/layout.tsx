"use client";

import { useParams } from "next/navigation";
import GameBottomNav from "../../../components/golfrivals/GameBottomNav";

export default function GameRouteLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  if (!gameId) return <>{children}</>;

  return (
    <div className="min-h-screen pb-24">
      {children}
      <GameBottomNav gameId={gameId} />
    </div>
  );
}
