import React, { createContext, useContext, useEffect, useState } from "react";

export interface AdminUser {
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const STORAGE_KEY = "flip_admin_session";

// Demo credentials
export const DEMO_CREDENTIALS = {
  email: "admin@flip.local",
  password: "flip2026!",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }
    } catch (e) {
      console.warn("Failed to load admin session from storage", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Validate inputs
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: "Please enter both email and password." };
    }

    // Demo credentials check OR standard admin credentials
    const isDemo = cleanEmail === DEMO_CREDENTIALS.email && cleanPass === DEMO_CREDENTIALS.password;
    const isValidAdmin = cleanEmail.includes("@") && cleanPass.length >= 6;

    if (isDemo || isValidAdmin) {
      const adminUser: AdminUser = {
        email: cleanEmail,
        name: isDemo ? "Store Administrator" : cleanEmail.split("@")[0].replace(/[._-]/g, " "),
        role: "Super Admin",
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
      } catch (e) {
        console.warn("Could not persist session", e);
      }

      setUser(adminUser);
      return { success: true };
    }

    return { success: false, error: "Invalid credentials. Use demo: admin@flip.local / flip2026!" };
  };

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
