import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

// Define the shape of our User Profile with Roles
export type UserRole = "citizen" | "admin";

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null; // Added error state
  isAdmin: boolean;
  role: UserRole | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived state for user to ensure synchronization
  const user = session?.user ?? null;

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error getting session:", error);
      }
      setSession(session);
      // If no user, we are done loading. If there is a user, the profile effect will handle loading state.
      if (!session?.user) {
        setIsLoading(false);
      }
    });

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session?.user) {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Dedicated effect for fetching profile when user changes
  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      try {
        setError(null);
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          // If profile is not found (e.g. 406 or explicit empty), it means the user was deleted from DB but session persists.
          // We should force sign out.
          if (error.code === "PGRST116" || error.message.includes("JSON")) {
            console.warn("User profile not found. Forcing sign out.");
            await supabase.auth.signOut();
            setSession(null);
            setProfile(null);
            return;
          }
          setError("Failed to load user profile");
        } else {
          setProfile(data as UserProfile);
        }
      } catch (err: any) {
        console.error("Unexpected error fetching profile:", err);
        setError(err.message || "Unexpected error loading profile");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      // Fetch if no profile or ID mismatch
      if (!profile || profile.id !== user.id) {
        fetchProfile(user.id);
      } else {
        setIsLoading(false);
      }
    }
  }, [user, profile]); // Dependency on user ensures this runs when session updates

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setError(null);
  };

  const value = {
    user,
    session,
    profile,
    isLoading,
    error,
    isAdmin: profile?.role === "admin",
    role: profile?.role ?? null,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
