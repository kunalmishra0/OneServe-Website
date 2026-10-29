import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { generateOTP, sendAndStoreOTP } from "@/lib/otp";
import { Loader2, ArrowRight, User, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function WorkerSignupPage() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
      // 1. Verify the invite code before anything else to save overhead
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, auth_user_id")
        .eq("invite_code", inviteCode)
        .single();

      if (staffError || !staffData) {
        console.error("Invite code check failed:", staffError);
        throw new Error("Invalid invite code. Please check with your administrator. " + (staffError?.message || ""));
      }

      if (staffData.auth_user_id) {
         throw new Error("This invite code has already been used.");
      }

      // 2. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: "worker",
          },
          emailRedirectTo: undefined,
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Signup failed. Please try again.");
      }

      // 3. Generate OTP and send
      const otpCode = generateOTP();
      const result = await sendAndStoreOTP(email, otpCode, fullName);
      
      if (!result.success) {
        console.error("OTP send failed:", result.error);
      }

      // 4. Navigate to verification page with worker meta
      navigate("/verify", {
        state: {
          email,
          fullName,
          role: "worker",
          userId: authData.user.id,
          inviteCode: inviteCode // Passed to verify page to execute RPC after OTP success
        },
      });
    } catch (err: any) {
      let msg = err.message || "Failed to sign up";

      if (msg.includes("password") || msg.includes("weak")) {
        msg = "Password must be at least 6 characters and contain both letters and numbers.";
      } else if (
        msg.includes("already registered") ||
        msg.includes("unique constraint") ||
        msg.includes("User already registered")
      ) {
        msg = "This email is already registered. Try signing in, or use 'Resend Code' on the verification page.";
        setTimeout(() => {
          navigate("/verify", { state: { email } });
        }, 3000);
      }

      setError(msg);

      if (err.status === 429) {
        setError("Too many signup attempts. Please wait a few minutes before trying again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
        <div className="bg-blue-800 p-8 text-center text-white relative flex flex-col items-center">
          <div className="absolute top-4 left-4">
               <Link to="/login" className="text-blue-200 hover:text-white transition-colors text-sm font-medium">← Back</Link>
          </div>
          <div className="mb-4">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 shadow-inner">
               <ShieldCheck className="text-white w-8 h-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Worker Registration</h1>
          <p className="opacity-90">Field Staff & Service Agents Only</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Invite Code
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. WORKER-XYZ123"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-mono uppercase"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
                <User
                  className="absolute left-4 top-3.5 text-gray-400"
                  size={18}
                />
              </div>
            </div>

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
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-6 relative overflow-hidden group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Verify Code & Create Account <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600">
            <p>
              Already have a worker account?{" "}
              <Link
                to="/login"
                className="text-blue-800 hover:text-blue-900 font-semibold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
