import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/api/auth";
import { demoLogin, isValidEmail } from "@/api/demoAuth";
import { useAuth } from "@/context/AuthContext";
import { isDemoMode } from "@/lib/demoMode";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import Lottie from "lottie-react";
import logo from "@/assets/j2w wh logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const demo = isDemoMode();

  useEffect(() => {
    fetch("/json/ai-robot-colored.json")
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error("Error loading Lottie:", err));
  }, []);

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!isValidEmail(email)) next.email = "Enter a valid email address";
    if (demo && !password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      if (demo) {
        // Client side demo auth: any syntactically valid email + any non empty
        // password succeeds, no backend round trip.
        const { token, user } = demoLogin(email, password);
        await login(token, user);
        toast.success(`Welcome, ${user.first_name}`);
        navigate("/");
        return;
      }

      // Real backend flow: email only, backend sends an OTP to verify.
      const response = await authService.login({ email });
      if (response.meta.status) {
        toast.success(response.meta.message);
        navigate("/verify-otp", { state: { email, userId: response.data.user_id } });
      } else {
        toast.error(response.meta.message || "Failed to send OTP");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred during login";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0f1115]">
      {/* Left Panel - Animation & Marketing */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-gradient-to-br from-[#0f1115] via-[#14161b] to-[#1a1d24] border-r border-border/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 w-full max-w-lg space-y-8 text-center animate-slide-up">
          <div className="w-full max-w-sm mx-auto h-80 flex items-center justify-center">
            {animationData ? (
              <Lottie
                animationData={animationData}
                loop={true}
                className="w-full h-full drop-shadow-[0_0_30px_rgba(249,115,22,0.2)]"
              />
            ) : (
              <div className="w-full h-full bg-secondary/20 animate-pulse rounded-full" />
            )}
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">
              Autonomous <span className="text-primary">IT Ops</span>
            </h1>
            <p className="text-lg text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
              Experience the future of enterprise infrastructure management with AI driven autonomous remediation.
            </p>
          </div>
          <div className="flex items-center justify-center gap-8 pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">94%</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Faster MTTR</p>
            </div>
            <div className="h-8 w-[1px] bg-border/40" />
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">91%</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Automation Rate</p>
            </div>
            <div className="h-8 w-[1px] bg-border/40" />
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">97%</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Cost Savings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background relative">
        <div className="w-full max-w-md space-y-10 animate-slide-up">
          <div className="flex flex-col items-center text-center space-y-6">
            <img src={logo} alt="Wayam AI" className="h-10 w-auto object-contain mb-2" />
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome Back</h2>
              <p className="text-muted-foreground">Enter your credentials to access your dashboard</p>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-sm border border-border/50 p-8 rounded-2xl shadow-xl space-y-6">
            {demo && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-primary font-medium text-center">
                Demo mode: enter any valid email and any password to sign in
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!errors.email}
                  className="h-12 bg-secondary/30 border-border/50 focus:ring-primary/20 text-base"
                />
                {errors.email && <p className="text-xs text-destructive ml-1">{errors.email}</p>}
              </div>

              {demo && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={!!errors.password}
                      className="h-12 bg-secondary/30 border-border/50 focus:ring-primary/20 text-base pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive ml-1">{errors.password}</p>}
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {demo ? "Signing In..." : "Sending OTP..."}
                  </span>
                ) : demo ? "Sign In" : "Sign In with OTP"}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-bold transition-all">
              Request Access
            </Link>
          </p>

          <div className="pt-8 flex items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            <span>Privacy Policy</span>
            <div className="h-1 w-1 rounded-full bg-border" />
            <span>Terms of Service</span>
            <div className="h-1 w-1 rounded-full bg-border" />
            <span>Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
