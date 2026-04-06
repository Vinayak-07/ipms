"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createContext, useEffect, useState } from "react";
import { setupUser } from "@/lib/setupUser";

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          await setupUser(firebaseUser);
        }
      } catch (error) {
        console.error("Failed to prepare the user device mapping.", error);
      } finally {
        setUser(firebaseUser || null);
        setAuthLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, logout, authLoading }}> {/* ✅ expose it */}
      {children}
    </AuthContext.Provider>
  );
}
