"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function UserGames() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGames() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error) setGames(data || []);
      setLoading(false);
    }
    fetchGames();
  }, []);

  if (loading) return <div className="p-4">Cargando partidas...</div>;

  return (
    <div className="p-4">
      <h3 className="text-xl font-bold mb-2">Tus partidas</h3>
      <ul className="space-y-2">
        {games.map((g) => (
          <li key={g.id} className="card p-2">
            <span className="font-mono">{g.id}</span> - {g.status}
          </li>
        ))}
        {games.length === 0 && <li>No tienes partidas guardadas.</li>}
      </ul>
    </div>
  );
}
