"use client";

import { useContext, useEffect } from "react";
import { AuthContext } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { LogoIcon } from "@/components/icons";

export default function LandingPage() {
  const { user, authLoading } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (user) router.replace("/home");
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="auth-container">
        <LogoIcon className="auth-logo animate-subtle-pulse" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="auth-container">
      <div className="animate-fade-in-up">
        <LogoIcon className="auth-logo" size={80} />
      </div>

      <h1 className="auth-title animate-fade-in-up animation-delay-100">
        IPMS
      </h1>

      <p className="auth-subtitle animate-fade-in-up animation-delay-200">
        Indoor Pollution Monitoring System
      </p>

      <div
        className="flex flex-col gap-3 w-full items-center animate-fade-in-up animation-delay-300"
      >
        <button
          className="auth-btn auth-btn-primary"
          onClick={() => router.push("/login")}
          type="button"
        >
          Log In
        </button>

        <button
          className="auth-btn auth-btn-secondary"
          onClick={() => router.push("/signup")}
          type="button"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
