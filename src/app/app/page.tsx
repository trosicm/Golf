"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AppPage() {
  const [profile, setProfile] = useState<any>(null);
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/auth/login");
        return;
      }

      const authEmail = (data.user.email || "").trim().toLowerCase();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*, player:player_id(*)")
        .eq("id", data.user.id)
        .maybeSingle();

      const { data: invites, error: inviteError } = await supabase
        .from("game_invites")
        .select("*")
        .ilike("email", authEmail)
        .limit(1);

      const inviteRow = invites?.[0];

      if (inviteError || !inviteRow) {
        setError(`No game assigned to this user (email: ${authEmail})`);
        setLoading(false);
        return;
      }

      const safeProfile = profileData || {
        id: data.user.id,
        email: authEmail,
        display_name: inviteRow.name || authEmail.split("@")[0] || "Player",
        role: inviteRow.role || "player",
        player: null,
      };

      setProfile(safeProfile);
      setInvite(inviteRow);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-danger">{error}</div>;
  if (!profile) return null;

  const gameId = invite?.game_id;
  const role = invite?.role || profile.role || "player";
  const playerName = profile.player?.name || invite?.name || profile.display_name || "Player";

  const handleOpenMatch = () => {
    if (gameId) router.push(`/game/${gameId}`);
  };
  const handleScorecard = () => {
    if (gameId) router.push(`/game/${gameId}/scorecard`);
  };
  const handleLeaderboard = () => {
    if (gameId) router.push(`/game/${gameId}/leaderboard`);
  };
  const handleAdminPanel = () => {
    if (gameId) router.push(`/game/${gameId}/admin`);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Welcome, {profile.display_name}</h2>
      <div className="mb-2">Email: <span className="font-mono">{profile.email}</span></div>
      <div className="mb-2">Role: <span className="font-mono">{role}</span></div>
      <div className="mb-2">Player: <span className="font-mono">{playerName}</span></div>
      <div className="mb-2">Team: <span className="font-mono">(auto)</span></div>
      <div className="mb-2">Match: <span className="font-mono">{invite?.game_id ? "Skins por Hoyos - Villamartin" : "No match assigned"}</span></div>
      <div className="flex flex-col gap-3 mt-6">
        <button className="btn btn-gold w-full" onClick={handleOpenMatch} disabled={!gameId}>Open Match</button>
        <button className="btn btn-gold w-full" onClick={handleScorecard} disabled={!gameId}>Scorecard</button>
        <button className="btn btn-gold w-full" onClick={handleLeaderboard} disabled={!gameId}>Leaderboard</button>
        {role === "admin" && (
          <button className="btn btn-danger w-full" onClick={handleAdminPanel} disabled={!gameId}>Admin Panel</button>
        )}
      </div>
    </div>
  );
}
