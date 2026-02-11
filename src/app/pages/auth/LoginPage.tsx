import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowRight, ShieldCheck, User } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  // We'll use the profile validation logic after login if needed,
  // currently just UI selection as requested.
  const [role, setRole] = useState<"citizen" | "admin">("citizen");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Authorization Check: Verify Profile & Role
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        if (profileError || !profile) {
          // Profile missing (e.g., deleted user but still in auth)
          console.error("Profile fetch error:", profileError);
          await supabase.auth.signOut();
          throw new Error(
            "Account integrity error: Profile missing. Please contact support.",
          );
        }

        if (profile.role !== role) {
          // Role mismatch (e.g., citizen trying to login as admin)
          await supabase.auth.signOut();
          throw new Error(
            `Unauthorized: This account is registered as a ${profile.role}, not ${role}.`,
          );
        }

        // Success: Redirect based on role
        if (profile.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.message.includes("Email not confirmed")) {
        setError("Please check your email inbox to verify your account.");
      } else if (err.message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(
          err.message || "Failed to login. Please check your connection.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
        <div className="bg-blue-600 p-8 text-center text-white">
          <div className="mb-4 flex justify-center">
            {role === "admin" ? <ShieldCheck size={48} /> : <User size={48} />}
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="opacity-90">Sign in to OneServe Portal</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole("citizen")}
                  className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                    role === "citizen"
                      ? "bg-blue-50 border-blue-500 text-blue-700 font-semibold"
                      : "border-gray-200 text-gray-500 hover:border-blue-300"
                  }`}
                >
                  <User size={18} />
                  Citizen
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                    role === "admin"
                      ? "bg-blue-50 border-blue-500 text-blue-700 font-semibold"
                      : "border-gray-200 text-gray-500 hover:border-blue-300"
                  }`}
                >
                  <ShieldCheck size={18} />
                  Admin
                </button>
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email or Phone
              </label>
              <input
                type="text" // Using text to allow potential phone formats visually, though backend expects email
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Sign In <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
