import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PersistentLayout from "./components/layout/PersistentLayout";
import ControlTower from "./pages/ControlTower";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import Actions from "./pages/Actions";
import ApprovalQueue from "./pages/ApprovalQueue";
import ToolRegistry from "./pages/ToolRegistry";
import KnowledgeEngine from "./pages/KnowledgeEngine";
import Analytics from "./pages/Analytics";
import SettingsPage from "./pages/Settings";
import ServiceNowIncident from "./pages/ServiceNowIncident";
import HealthMonitor from "./pages/HealthMonitor";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import VerifyOtp from "./pages/auth/VerifyOtp";

import { ThemeProvider } from "./components/theme-provider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="autoops-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />

              <Route element={<ProtectedRoute />}>
                {/* ServiceNow page is fully standalone — no sidebar */}
                <Route path="/incident/:id" element={<ServiceNowIncident />} />
                {/* All other pages share the persistent sidebar */}
                <Route element={<PersistentLayout />}>
                  <Route path="/" element={<ControlTower />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/agents/:id" element={<AgentDetail />} />
                  <Route path="/actions" element={<Actions />} />
                  <Route path="/health" element={<HealthMonitor />} />
                  <Route path="/approvals" element={<ApprovalQueue />} />
                  <Route path="/tools" element={<ToolRegistry />} />
                  <Route path="/knowledge" element={<KnowledgeEngine />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
