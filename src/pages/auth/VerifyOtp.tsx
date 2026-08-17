import { useState, useEffect } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { authService } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Lottie from "lottie-react";
import WayamLogo from "@/components/WayamLogo";

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [animationData, setAnimationData] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const email = location.state?.email;
  const userId = location.state?.userId;

  useEffect(() => {
    fetch("/json/successful-business-agreement.json")
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error("Error loading Lottie:", err));
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  if (!email || !userId) {
    return <Navigate to="/login" replace />;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await authService.verifyOtp({ user_id: userId, otp });
      if (response.meta.status) {
        toast.success(response.meta.message);
        const { access_token, user_id, email: userEmail } = response.data;
        await login(access_token, { id: user_id, email: userEmail });
        navigate("/");
      } else {
        toast.error(response.meta.message || "Invalid OTP");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while verifying");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const response = await authService.resendOtp({ user_id: userId });
      if (response.meta.status) {
        toast.success(response.meta.message || "OTP Resent successfully");
        setTimer(60);
      } else {
        toast.error(response.meta.message);
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while resending");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0f1115]">
      {/* Left Panel - Animation & Marketing */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-gradient-to-br from-[#0f1115] via-[#14161b] to-[#1a1d24] border-r border-border/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 w-full max-w-lg space-y-8 text-center animate-slide-up">
          <div className="w-full max-w-sm mx-auto h-80 flex items-center justify-center">
            {animationData ? (
              <Lottie 
                animationData={animationData} 
                loop={true} 
                className="w-full h-full drop-shadow-[0_0_30px_rgba(45,212,191,0.2)]" 
              />
            ) : (
              <div className="w-full h-full bg-secondary/20 animate-pulse rounded-full" />
            )}
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">
              Secure <span className="text-primary">Access</span>
            </h1>
            <p className="text-lg text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
              Verifying your identity to ensure the highest level of security for your enterprise operations.
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 py-4">
             <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary tracking-widest uppercase">
                MFA Required
             </div>
             <div className="px-4 py-2 rounded-full bg-secondary/40 border border-border/50 text-xs font-bold text-muted-foreground tracking-widest uppercase">
                AES-256 Encrypted
             </div>
          </div>
        </div>
      </div>

      {/* Right Panel - OTP Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background relative">
        <div className="w-full max-w-md space-y-10 animate-slide-up">
          <div className="flex flex-col items-center text-center space-y-6">
            <WayamLogo alt="Wayam AI" className="h-10 w-auto object-contain mb-2" />
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Verify Identity</h2>
              <p className="text-muted-foreground">
                We've sent a code to <span className="text-foreground font-semibold">{email}</span>
              </p>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-sm border border-border/50 p-8 rounded-2xl shadow-xl space-y-8">
            <form onSubmit={handleVerify} className="space-y-8 flex flex-col items-center">
              <div className="space-y-4 flex flex-col items-center w-full">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Verification Code</Label>
                <InputOTP 
                  id="otp"
                  maxLength={6} 
                  value={otp} 
                  onChange={(value) => setOtp(value)}
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-14 w-12 text-xl" />
                    <InputOTPSlot index={1} className="h-14 w-12 text-xl" />
                    <InputOTPSlot index={2} className="h-14 w-12 text-xl" />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="h-14 w-12 text-xl" />
                    <InputOTPSlot index={4} className="h-14 w-12 text-xl" />
                    <InputOTPSlot index={5} className="h-14 w-12 text-xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              
              <Button type="submit" className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all" disabled={isLoading || otp.length !== 6}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : "Verify & Sign In"}
              </Button>
            </form>

            <div className="text-center text-sm">
              {timer > 0 ? (
                <p className="text-muted-foreground font-medium">
                  Resend code in <span className="text-foreground font-bold">{timer}s</span>
                </p>
              ) : (
                <button 
                  type="button" 
                  onClick={handleResend} 
                  disabled={isResending}
                  className="text-primary hover:underline font-bold transition-all disabled:opacity-50"
                >
                  {isResending ? "Resending..." : "Click to resend OTP"}
                </button>
              )}
            </div>
          </div>

          <div className="pt-8 flex items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            <button onClick={() => navigate("/login")} className="hover:text-foreground transition-colors">Back to Login</button>
            <div className="h-1 w-1 rounded-full bg-border" />
            <span>Support</span>
            <div className="h-1 w-1 rounded-full bg-border" />
            <span>Help Center</span>
          </div>
        </div>
      </div>
    </div>
  );
}
