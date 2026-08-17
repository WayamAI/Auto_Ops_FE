import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "@/api/auth";
import { useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  email?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  company_size?: string;
  phone_number?: string;
  profile_url?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authorizedModules: string[];
  login: (token: string, userData: User) => Promise<void>;
  logout: () => void;
  updateUserContext: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authorizedModules, setAuthorizedModules] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("access_token");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          try {
            const [moduleRes, userRes] = await Promise.all([
              authService.getAccessModule(),
              authService.getUserDetails(parsedUser.id)
            ]);
            if (moduleRes.meta.status) {
              setAuthorizedModules(moduleRes.data.role.module_master.map(m => m.code));
            }
            if (userRes.meta.status) {
              const freshUser = { ...parsedUser, ...userRes.data, id: userRes.data.user_id };
              setUser(freshUser);
              localStorage.setItem("user", JSON.stringify(freshUser));
            }
          } catch (e) {
            console.error("Failed to load user dependencies", e);
          }

          setIsAuthenticated(true);
        } catch (e) {
          // Invalid user data
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (token: string, userData: User) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    
    try {
      const [moduleRes, userRes] = await Promise.all([
        authService.getAccessModule(),
        authService.getUserDetails(userData.id)
      ]);
      if (moduleRes.meta.status) {
        setAuthorizedModules(moduleRes.data.role.module_master.map(m => m.code));
      }
      if (userRes.meta.status) {
        const freshUser = { ...userData, ...userRes.data, id: userRes.data.user_id };
        setUser(freshUser);
        localStorage.setItem("user", JSON.stringify(freshUser));
      }
    } catch (e) {
      console.error("Failed to load user dependencies on login", e);
    }
  };

  const logout = () => {
    // Clear all storage and query cache
    localStorage.clear();
    queryClient.clear();
    
    setUser(null);
    setAuthorizedModules([]);
    setIsAuthenticated(false);
    
    // Force a full page reload to clear the network tab and all memory state
    window.location.href = "/login";
  };

  const updateUserContext = (data: Partial<User>) => {
    if (user) {
      const freshUser = { ...user, ...data };
      setUser(freshUser);
      localStorage.setItem("user", JSON.stringify(freshUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, authorizedModules, login, logout, updateUserContext }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
