"use client";

import { useParams } from "next/navigation";
import GameBottomNav from "../../../components/golfrivals/GameBottomNav";
import GameTopMenu from "../../../components/golfrivals/GameTopMenu";

export default function GameRouteLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  if (!gameId) return <>{children}</>;

  return (
    <div className="min-h-screen pb-24 pt-10">
      <GameTopMenu gameId={gameId} />
      {children}
      <GameBottomNav gameId={gameId} />
    </div>
  );
}
