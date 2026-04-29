"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function UserMenu() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  if (user) {
    return (
      <div className="flex gap-4 mt-4">
        <Link href="/profile" className="btn btn-gold">Perfil</Link>
        <Link href="/auth/logout" className="btn btn-danger">Cerrar sesión</Link>
      </div>
    );
  }
  return (
    <div className="flex gap-4 mt-4">
      <Link href="/auth/login" className="btn btn-gold">Iniciar sesión</Link>
      <Link href="/auth/register" className="btn btn-blue">Registrarse</Link>
    </div>
  );
}
