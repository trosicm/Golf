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
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*, player:player_id(*)")
        .eq("id", data.user.id)
        .single();
      if (error || !profile) {
        setError("Profile not found");
        setLoading(false);
        return;
      }
      setProfile(profile);

      // Buscar game_invite por email normalizado
      const email = (profile.email || "").toLowerCase();
      const { data: invite, error: inviteError } = await supabase
        .from("game_invites")
        .select("*")
        .eq("email", email)
        .single();
      if (inviteError || !invite) {
        setError("No game assigned to this user.");
        setLoading(false);
        return;
      }
      setInvite(invite);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-danger">{error}</div>;
  if (!profile) return null;

  const gameId = invite?.game_id;

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
      <div className="mb-2">Role: <span className="font-mono">{profile.role}</span></div>
      <div className="mb-2">Player: <span className="font-mono">{profile.player?.name}</span></div>
      <div className="mb-2">Team: <span className="font-mono">(auto)</span></div>
      <div className="mb-2">Match: <span className="font-mono">{invite?.game_id ? 'Skins por Hoyos - Villamartin' : 'No match assigned'}</span></div>
      <div className="flex flex-col gap-3 mt-6">
        <button className="btn btn-gold w-full" onClick={handleOpenMatch} disabled={!gameId}>Open Match</button>
        <button className="btn btn-gold w-full" onClick={handleScorecard} disabled={!gameId}>Scorecard</button>
        <button className="btn btn-gold w-full" onClick={handleLeaderboard} disabled={!gameId}>Leaderboard</button>
        {profile.role === "admin" && (
          <button className="btn btn-danger w-full" onClick={handleAdminPanel} disabled={!gameId}>Admin Panel</button>
        )}
      </div>
    </div>
  );
}
