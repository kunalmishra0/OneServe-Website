import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { generateOTP, sendAndStoreOTP } from "@/lib/otp";
import { Loader2, ArrowRight, User } from "lucide-react";

export default function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic client-side validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      // 1. Sign up with Supabase Auth (stores credentials, but user email is unconfirmed)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: "citizen",
          },
          // We don't auto-redirect. We handle verification ourselves.
          emailRedirectTo: undefined,
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Signup failed. Please try again.");
      }

      // 2. Generate OTP and send via server-side Supabase function (uses Resend via pg_net)
      const otpCode = generateOTP();

      const result = await sendAndStoreOTP(email, otpCode, fullName);
      if (!result.success) {
        // OTP storage/sending failed — but user is created. They can resend from verify page.
        console.error("OTP send failed:", result.error);
      }

      // 3. Navigate to verification page
      navigate("/verify", {
        state: {
          email,
          fullName,
          role: "citizen",
          userId: authData.user.id,
        },
      });
    } catch (err: any) {
      let msg = err.message || "Failed to sign up";

      if (msg.includes("password") || msg.includes("weak")) {
        msg =
          "Password must be at least 6 characters and contain both letters and numbers.";
      } else if (
        msg.includes("already registered") ||
        msg.includes("unique constraint") ||
        msg.includes("User already registered")
      ) {
        msg =
          "This email is already registered. Try signing in, or use 'Resend Code' on the verification page.";
        // Auto-redirect to verify for stuck users
        setTimeout(() => {
          navigate("/verify", { state: { email } });
        }, 3000);
      }

      setError(msg);

      if (err.status === 429) {
        setError(
          "Too many signup attempts. Please wait a few minutes before trying again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
        <div className="bg-emerald-600 p-8 text-center text-white">
          <div className="mb-4 flex justify-center">
            <User size={48} />
          </div>
          <h1 className="text-3xl font-bold mb-2">Join OneServe</h1>
          <p className="opacity-90">Create your account today</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSignup} className="space-y-5">
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
                Email
              </label>
              <input
                type="email"
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
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
