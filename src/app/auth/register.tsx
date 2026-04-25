"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else router.push("/auth/login");
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      <form onSubmit={handleRegister} className="space-y-4">
        <input type="email" className="input input-bordered w-full" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" className="input input-bordered w-full" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" className="btn btn-gold w-full" disabled={loading}>{loading ? "Registering..." : "Register"}</button>
        {error && <div className="text-danger text-sm mt-2">{error}</div>}
      </form>
    </div>
  );
}
