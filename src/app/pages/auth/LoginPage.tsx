import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowRight, ShieldCheck, User, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  // We'll use the profile validation logic after login if needed,
  // currently just UI selection as requested.
  const [role, setRole] = useState<"citizen" | "admin">("citizen");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
        // 2. Fetch or create the user's profile
        let { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        const userMeta = authData.user.user_metadata;
        const metaRole = userMeta?.role || "citizen";
        const metaName = userMeta?.full_name || "User";

        if (profileError || !profile) {
          // Profile missing — auto-create using metadata stored during signup
          const { error: createError } = await supabase
            .from("profiles")
            .upsert({
              id: authData.user.id,
              email: authData.user.email,
              role: metaRole,
            });

          if (createError) {
            console.error("Auto-create profile failed:", createError);
            await supabase.auth.signOut();
            throw new Error(
              "Failed to set up your profile. Please try again or contact support.",
            );
          }

          profile = { role: metaRole };
        }

        const actualRole = profile.role;

        // 3. Ensure citizens entry exists for citizen accounts (prevents FK errors)
        if (actualRole === "citizen") {
          const { data: citizenExists } = await supabase
            .from("citizens")
            .select("id")
            .eq("id", authData.user.id)
            .single();

          if (!citizenExists) {
            await supabase.from("citizens").upsert({
              id: authData.user.id,
              full_name: metaName,
              email: authData.user.email,
            });
          }
        }

        // 4. Verify the selected UI role matches their actual registered role
        if (actualRole !== role) {
          await supabase.auth.signOut();
          throw new Error(
            `This account is registered as a ${actualRole}. Please select "${actualRole}" above and try again.`,
          );
        }

        // 5. Success: Redirect based on role
        if (actualRole === "admin") {
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
                Email
              </label>
              <input
                type="email" // Backend only supports email auth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
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
