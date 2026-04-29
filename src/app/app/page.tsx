"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AppPage() {
  const [profile, setProfile] = useState<any>(null);
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
      setLoading(false);
    });
  }, [router]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-danger">{error}</div>;
  if (!profile) return null;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Welcome, {profile.display_name}</h2>
      <div className="mb-2">Email: <span className="font-mono">{profile.email}</span></div>
      <div className="mb-2">Role: <span className="font-mono">{profile.role}</span></div>
      <div className="mb-2">Player: <span className="font-mono">{profile.player?.name}</span></div>
      <div className="mb-2">Team: <span className="font-mono">(auto)</span></div>
      <div className="mb-2">Match: <span className="font-mono">Skins por Hoyos - Villamartin</span></div>
      <div className="flex flex-col gap-3 mt-6">
        <button className="btn btn-gold w-full">Open Match</button>
        <button className="btn btn-gold w-full">Scorecard</button>
        <button className="btn btn-gold w-full">Leaderboard</button>
        {profile.role === "admin" && (
          <button className="btn btn-danger w-full">Admin Panel</button>
        )}
      </div>
    </div>
  );
}
