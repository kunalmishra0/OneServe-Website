import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { verifyOTP, generateOTP, sendAndStoreOTP } from "@/lib/otp";
import { Loader2, ArrowRight, ShieldCheck, Mail } from "lucide-react";

export default function VerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState(""); // For manual email entry
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Get email from navigation state
  useEffect(() => {
    const state = location.state as {
      email?: string;
      fullName?: string;
      role?: string;
      userId?: string;
    };
    if (state?.email) {
      setEmail(state.email);
    }
  }, [location]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = email || emailInput;

    if (!targetEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (otp.length < 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Verify OTP against our custom otp_codes table
      const result = await verifyOTP(targetEmail, otp);

      if (!result.valid) {
        throw new Error(
          result.error || "Invalid or expired code. Please try again.",
        );
      }

      // 2. Sign in the user with their credentials
      // The user was already created during signup, so we need to get the session.
      // Try to get the current session first
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let user = session?.user;

      if (!user) {
        // No active session — session expired between signup and verification.
        // Try to create profile using data passed from signup page (navigation state),
        // so when they login, the profile already exists.
        const state = location.state as {
          fullName?: string;
          role?: string;
          userId?: string;
        };

        if (state?.userId) {
          // Attempt profile creation with the userId from signup
          const autoRole = state.role || "citizen";
          const autoName = state.fullName || "User";

          await supabase.from("profiles").upsert({
            id: state.userId,
            email: targetEmail,
            role: autoRole,
          });

          if (autoRole === "citizen") {
            await supabase.from("citizens").upsert({
              id: state.userId,
              full_name: autoName,
              email: targetEmail,
            });
          }
        }

        setError(
          "Verification successful! Please sign in with your credentials.",
        );
        setLoading(false);
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      // 3. Post-Verification: Create Profile & Citizen entries
      const fullName =
        (location.state as any)?.fullName ||
        user.user_metadata?.full_name ||
        "User";
      const role =
        (location.state as any)?.role || user.user_metadata?.role || "citizen";

      // Upsert Profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        role: role,
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Non-blocking — continue to dashboard
      }

      // Upsert Citizen if applicable
      if (role === "citizen") {
        const { error: citizenError } = await supabase.from("citizens").upsert({
          id: user.id,
          full_name: fullName,
          email: user.email,
        });

        if (citizenError) {
          console.error("Citizen profile creation error:", citizenError);
        }
      }

      // 4. Success — navigate to dashboard
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const targetEmail = email || emailInput;
    if (!targetEmail) {
      setError("Please enter your email address to resend the code.");
      return;
    }

    setResending(true);
    setResendStatus(null);
    setError(null);

    try {
      // Generate new OTP and send via server-side Supabase function
      const otpCode = generateOTP();

      const result = await sendAndStoreOTP(targetEmail, otpCode);
      if (!result.success) {
        throw new Error(result.error || "Failed to send verification code.");
      }

      setResendStatus("A new 6-digit code has been sent to your email.");
      setCooldown(60); // 60-second cooldown
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-emerald-600 p-8 text-center text-white">
          <div className="mb-4 flex justify-center">
            <ShieldCheck size={48} />
          </div>
          <h1 className="text-3xl font-bold mb-2">Verify Account</h1>
          <p className="opacity-90">Secure OTP Verification</p>
        </div>

        <div className="p-8">
          <div className="mb-6 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="text-emerald-600" size={20} />
            </div>
            <p className="text-gray-600 text-sm">
              We've sent a 6-digit verification code to
              <br />
              <span className="font-semibold text-gray-800">
                {email || "your email"}
              </span>
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            {/* Email input if not from state */}
            {!email && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                />
              </div>
            )}

            <div>
              <input
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="0 0 0 0 0 0"
                className="w-full text-center text-3xl tracking-[1em] font-bold px-4 py-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                {error}
              </div>
            )}

            {resendStatus && (
              <div className="p-3 rounded-lg bg-green-50 text-green-600 text-sm border border-green-100">
                {resendStatus}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Verify & Continue <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-2">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="text-emerald-600 hover:text-emerald-800 font-semibold text-sm hover:underline flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
            >
              {resending ? (
                <Loader2 className="animate-spin" size={14} />
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                "Resend Code"
              )}
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-gray-400">
            <Link to="/signup" className="hover:text-gray-600 underline">
              Back to Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
