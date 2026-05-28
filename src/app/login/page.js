"use client";

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { toast } from "sonner";
import { LogoIcon, ArrowLeftIcon } from "@/components/icons";

export default function LoginPage() {
  const { user, authLoading } = useContext(AuthContext);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user) router.replace("/home");
  }, [user, authLoading, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      toast.error("Login failed", { description: err.message });
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      toast.error("Google login failed", { description: err.message });
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="auth-container">
        <LogoIcon className="auth-logo animate-subtle-pulse" />
      </div>
    );
  }

  return (
    <div className="auth-container">
      <button
        className="auth-back animate-fade-in-up"
        onClick={() => router.push("/")}
        type="button"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back
      </button>

      <div className="auth-form-card animate-fade-in-up animation-delay-100">
        <div className="flex flex-col items-center mb-8">
          <LogoIcon size={48} />
          <h2
            className="text-xl font-bold mt-4"
            style={{ color: "var(--text-primary)" }}
          >
            Welcome back
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Sign in to your IPMS account
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="auth-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-6">
            <label className="auth-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="auth-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Log In"}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <button
          type="button"
          className="auth-btn auth-btn-secondary"
          onClick={handleGoogle}
          disabled={loading}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <p
          className="text-center text-sm mt-6"
          style={{ color: "var(--text-tertiary)" }}
        >
          Don&apos;t have an account?{" "}
          <button
            type="button"
            className="font-medium"
            style={{ color: "var(--accent-blue)", background: "none", border: "none", cursor: "pointer" }}
            onClick={() => router.push("/signup")}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
