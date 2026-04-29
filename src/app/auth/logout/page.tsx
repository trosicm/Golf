"use client";
import { useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Logout() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.signOut().then(() => router.push("/auth/login"));
  }, [router]);
  return <div className="p-4">Logging out...</div>;
}
