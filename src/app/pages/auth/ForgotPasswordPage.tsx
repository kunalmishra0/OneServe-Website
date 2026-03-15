import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (resetError) throw resetError;

      setSuccess(true);
    } catch (err: any) {
      console.error("Password reset failed:", err);
      setError(err.message || "Failed to send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
        <div className="bg-blue-600 p-8 text-center text-white">
          <div className="mb-4 flex justify-center">
            <KeyRound size={48} />
          </div>
          <h1 className="text-3xl font-bold mb-2">Forgot Password</h1>
          <p className="opacity-90">Reset your OneServe account password</p>
        </div>

        <div className="p-8">
          {success ? (
            <div className="text-center space-y-6">
              <div className="flex justify-center text-green-500">
                <CheckCircle2 size={64} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Email Sent!</h2>
              <p className="text-gray-600">
                We've sent a password reset link to{" "}
                <span className="font-semibold text-gray-800">{email}</span>.
                Please check your inbox.
              </p>
              <Link
                to="/login"
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft size={20} /> Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <p className="text-sm text-gray-600 mb-6 font-medium">
                Enter your registered electric company email address, and we'll
                send you a link to get back into your account.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
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
                disabled={loading || !email}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  "Send Reset Link"
                )}
              </button>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-gray-500 hover:text-blue-600 font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowLeft size={16} /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
