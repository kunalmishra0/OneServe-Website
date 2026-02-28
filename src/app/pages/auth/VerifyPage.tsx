import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowRight, ShieldCheck, Mail } from "lucide-react";

export default function VerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    // Try to get email from navigation state
    const state = location.state as { email?: string };
    if (state?.email) {
      setEmail(state.email);
    } else {
      // If no email, check if user is already logged in but not verified
      const getUser = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) setEmail(user.email);
      };
      getUser();
    }
  }, [location]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "signup",
      });

      if (verifyError) throw verifyError;

      // Success - Redirect to dashboard
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err.message || "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendStatus(null);
    try {
      // Note: signup with existing email triggers a resend in many Supabase configs
      // Or use supabase.auth.resend({ type: 'signup', email })
      await supabase.auth.signUp({
        email,
        password: "dummy_password_not_needed_for_resend_trigger", // In real flow, we'd use resendOtp if available for email
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      // Note: signup with existing email triggers a resend in many Supabase configs
      // Or use supabase.auth.resend({ type: 'signup', email })
      const { error: actualResendError } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (actualResendError) throw actualResendError;

      setResendStatus("A new code has been sent to your email.");
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
              disabled={resending}
              className="text-emerald-600 hover:text-emerald-800 font-semibold text-sm hover:underline flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
            >
              {resending ? (
                <Loader2 className="animate-spin" size={14} />
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
