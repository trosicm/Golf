"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/auth/login");
      else setUser(data.user);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!user) return null;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Perfil</h2>
      <div className="mb-2">Email: <span className="font-mono">{user.email}</span></div>
      <a href="/auth/logout" className="btn btn-danger mt-4">Cerrar sesión</a>
    </div>
  );
}
