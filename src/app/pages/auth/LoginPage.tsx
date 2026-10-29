import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowRight, ShieldCheck, User, Eye, EyeOff, Wrench, Sparkles } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"citizen" | "admin" | "worker">("citizen");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Quick 1-Click Fill for Demo Logins
  const handleFillDemo = (type: "citizen" | "worker" | "admin") => {
    setRole(type);
    if (type === "citizen") {
      setEmail("citizen@oneserve.in");
      setPassword("demo1234");
    } else if (type === "worker") {
      setEmail("worker.roads@oneserve.in");
      setPassword("demo1234");
    } else if (type === "admin") {
      setEmail("admin@oneserve.in");
      setPassword("demo1234");
    }
  };

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

        if (profileError || !profile) {
          // Profile missing — auto-create using metadata
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

          if (metaRole === "citizen") {
            await supabase.from("citizens").upsert({
              id: authData.user.id,
              full_name: userMeta?.full_name || "Citizen User",
              email: authData.user.email,
              phoneno: "+91 98110 00000",
              address_line_1: "Faridabad Sector 15",
              city: "Faridabad",
              state: "Haryana",
              pincode: "121007",
            });
          }

          profile = { role: metaRole };
        }

        // 3. Validation: prevent cross-portal role mismatches
        if (role === "admin" && profile.role !== "admin") {
          await supabase.auth.signOut();
          throw new Error("Access denied: You do not have administrator credentials.");
        }

        if (role === "worker" && profile.role !== "worker") {
          await supabase.auth.signOut();
          throw new Error("Access denied: You do not have registered worker credentials.");
        }

        // Redirect based on selected portal
        if (role === "worker") {
          navigate("/field-dashboard");
        } else if (role === "admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              OneServe <span className="text-blue-600">Faridabad</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Municipal Corporation Faridabad & Civic Portal
            </p>
          </div>

          {/* Quick Demo Pre-fills */}
          <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>1-Click Demo Logins:</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo("citizen")}
                className="py-1.5 px-2 text-xs font-medium bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-lg transition-colors text-center shadow-xs"
              >
                👤 Citizen
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo("worker")}
                className="py-1.5 px-2 text-xs font-medium bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-lg transition-colors text-center shadow-xs"
              >
                🛠️ Worker
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo("admin")}
                className="py-1.5 px-2 text-xs font-medium bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-lg transition-colors text-center shadow-xs"
              >
                🛡️ Admin
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Role Switcher */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Sign In As
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("citizen")}
                  className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                    role === "citizen"
                      ? "bg-blue-50 border-blue-500 text-blue-700 font-semibold"
                      : "border-gray-200 text-gray-500 hover:border-blue-300"
                  }`}
                >
                  <User size={16} />
                  <span className="text-xs">Citizen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("worker")}
                  className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                    role === "worker"
                      ? "bg-blue-50 border-blue-500 text-blue-700 font-semibold"
                      : "border-gray-200 text-gray-500 hover:border-blue-300"
                  }`}
                >
                  <Wrench size={16} />
                  <span className="text-xs">Worker</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                    role === "admin"
                      ? "bg-blue-50 border-blue-500 text-blue-700 font-semibold"
                      : "border-gray-200 text-gray-500 hover:border-blue-300"
                  }`}
                >
                  <ShieldCheck size={16} />
                  <span className="text-xs">Admin</span>
                </button>
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@oneserve.in"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
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
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
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
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            {role === "citizen" && (
              <p>
                New citizen?{" "}
                <Link to="/signup" className="text-blue-600 font-semibold hover:underline">
                  Sign up here
                </Link>
              </p>
            )}
            {role === "worker" && (
              <p>
                Have an invite code?{" "}
                <Link to="/worker-signup" className="text-blue-600 font-semibold hover:underline">
                  Register worker account
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
