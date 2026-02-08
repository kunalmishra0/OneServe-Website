import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowRight, ShieldCheck, User } from "lucide-react";

export default function SignupPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"citizen" | "admin">("citizen");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create Profile in Database (Base Layer)
        // Note: 'full_name' is NOT in profiles table anymore, it's in citizens.
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: authData.user.id,
            email: email,
            role: role,
          },
        ]);

        if (profileError) {
          console.error("Profile creation failed:", profileError);
          throw new Error("Failed to create user profile. Please try again.");
        }

        // 3. Create Citizen Entry (Extension Layer) if role is citizen
        if (role === "citizen") {
          const { error: citizenError } = await supabase
            .from("citizens")
            .insert([
              {
                id: authData.user.id, // Link to profile
                full_name: fullName,
                // other fields like phone, address are empty initially
              },
            ]);

          if (citizenError) {
            console.error("Citizen profile creation failed:", citizenError);
            // We might want to allow this to pass, but for data integrity let's warn
            // throw new Error("Failed to initialize citizen details.");
          }
        }

        // Success!
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Signup error:", err);

      let msg = err.message || "Failed to sign up";

      // Custom Error Messages
      if (msg.includes("password") || msg.includes("weak")) {
        msg =
          "Password must be at least 6 characters and contain both letters and numbers.";
      } else if (
        msg.includes("already registered") ||
        msg.includes("unique constraint")
      ) {
        msg =
          "This email is already registered. Please sign in or use a different email. (If you deleted your account, please contact support as the login credentials persist).";
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
        <div className="bg-emerald-600 p-8 text-center text-white">
          <div className="mb-4 flex justify-center">
            {role === "admin" ? <ShieldCheck size={48} /> : <User size={48} />}
          </div>
          <h1 className="text-3xl font-bold mb-2">Join OneServe</h1>
          <p className="opacity-90">Create your account today</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSignup} className="space-y-5">
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
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold"
                      : "border-gray-200 text-gray-500 hover:border-emerald-300"
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
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold"
                      : "border-gray-200 text-gray-500 hover:border-emerald-300"
                  }`}
                >
                  <ShieldCheck size={18} />
                  Admin
                </button>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email or Phone
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
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
                placeholder="Create a strong password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
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
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Create Account <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-emerald-600 hover:text-emerald-800 font-semibold hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
