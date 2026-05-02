"use client";

import { useEffect } from "react";
import { usePathname, useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

const n = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resultType = (row: any) => String(row?.result_type ?? row?.type ?? "draft").toLowerCase();
const resultHoleNumber = (row: any) => n(row?.hole_number ?? row?.holeNumber ?? row?.number);

function currentHoleStorageKey(gameId: string) {
  return `golf-rivals:${gameId}:current-hole`;
}

function getNextOpenHole(results: any[]) {
  const closed = new Set(
    results
      .filter((row) => resultType(row) !== "draft")
      .map(resultHoleNumber)
      .filter((holeNumber) => holeNumber > 0)
  );

  for (let holeNumber = 1; holeNumber <= 18; holeNumber += 1) {
    if (!closed.has(holeNumber)) return holeNumber;
  }

  return 18;
}

export default function CurrentHoleSync() {
  const pathname = usePathname();
  const params = useParams();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  useEffect(() => {
    if (!gameId || pathname !== `/game/${gameId}`) return;

    let cancelled = false;

    const syncCurrentHole = async () => {
      const { data: results, error } = await supabase
        .from("hole_results")
        .select("*")
        .eq("game_id", gameId);

      if (cancelled || error) return;

      const nextOpenHole = getNextOpenHole(results || []);
      const storageKey = currentHoleStorageKey(String(gameId));
      const storedHole = n(window.localStorage.getItem(storageKey), 1);

      if (storedHole < nextOpenHole) {
        window.localStorage.setItem(storageKey, String(nextOpenHole));
        window.location.reload();
      }
    };

    syncCurrentHole();

    return () => {
      cancelled = true;
    };
  }, [gameId, pathname]);

  return null;
}
