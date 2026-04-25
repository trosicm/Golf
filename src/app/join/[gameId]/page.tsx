"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function JoinGame() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useParams();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameId) return;
    const stored = localStorage.getItem(`golfrivals-game-${gameId}`);
    if (!stored) {
      setError("Game not found");
      return;
    }
    const game = JSON.parse(stored);
    const team = game.teams.find((t: any) => t.code === code);
    if (!team) {
      setError("Invalid code");
      return;
    }
    // Store session in localStorage
    localStorage.setItem("golfrivals-session", JSON.stringify({ gameId, teamId: team.id }));
    router.push(`/game/${gameId}`);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Join Game</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          className="input input-bordered w-full text-lg"
          placeholder="Enter your team code"
          value={code}
          onChange={e => setCode(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-gold w-full text-lg font-bold">Login</button>
        {error && <div className="text-danger text-sm mt-2">{error}</div>}
      </form>
    </div>
  );
}
