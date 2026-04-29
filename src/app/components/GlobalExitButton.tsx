"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export function GlobalExitButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setIsLoggedIn(Boolean(data.user));
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleExit = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const isAuthScreen = pathname?.startsWith("/auth/login") || pathname?.startsWith("/auth/register");

  if (loading || !isLoggedIn || isAuthScreen) return null;

  return (
    <button
      type="button"
      onClick={handleExit}
      className="fixed right-4 top-4 z-50 rounded-full border border-[var(--gr-danger)] bg-[rgba(24,27,30,0.86)] px-4 py-2 text-sm font-extrabold text-[var(--gr-sand)] shadow-xl backdrop-blur-md"
      aria-label="Cerrar sesión"
    >
      Salir
    </button>
  );
}
