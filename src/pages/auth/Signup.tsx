import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authService } from "@/api/auth";
import { toast } from "sonner";
import Lottie from "lottie-react";
import logo from "@/assets/j2w wh logo.png";

export default function Signup() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    phone_number: "",
    email: "",
    company_size: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/json/business-team-generating-idea.json")
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error("Error loading Lottie:", err));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, company_size: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await authService.signup(formData);
      if (response.meta.status) {
        toast.success(response.meta.message);
        navigate("/login");
      } else {
        toast.error(response.meta.message || "Failed to register");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during registration");
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
              Scale Your <span className="text-primary">Ops</span>
            </h1>
            <p className="text-lg text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
              Join leading enterprises using AutoOps to automate complex IT workflows and resolve incidents in minutes, not hours.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-left">
              <p className="text-xl font-bold text-foreground">Secure</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Enterprise-Grade Security</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-left">
              <p className="text-xl font-bold text-foreground">Scalable</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Unlimited Agent Support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background relative overflow-y-auto">
        <div className="w-full max-w-lg space-y-8 py-12 animate-slide-up">
          <div className="flex flex-col items-center text-center space-y-4">
            <img src={logo} alt="AutoOps Logo" className="h-10 w-auto object-contain mb-2" />
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Create Account</h2>
              <p className="text-muted-foreground">Fill in your details to request access to the platform</p>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-sm border border-border/50 p-8 rounded-2xl shadow-xl space-y-6">
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">First Name</Label>
                  <Input 
                    id="first_name" required value={formData.first_name} onChange={handleInputChange}
                    className="h-11 bg-secondary/30 border-border/50 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Last Name</Label>
                  <Input 
                    id="last_name" required value={formData.last_name} onChange={handleInputChange}
                    className="h-11 bg-secondary/30 border-border/50 focus:ring-primary/20"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Work Email</Label>
                <Input 
                  id="email" type="email" placeholder="name@company.com" required value={formData.email} onChange={handleInputChange}
                  className="h-11 bg-secondary/30 border-border/50 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Phone Number</Label>
                <Input 
                  id="phone_number" type="tel" placeholder="+1234567890" required value={formData.phone_number} onChange={handleInputChange}
                  className="h-11 bg-secondary/30 border-border/50 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Company</Label>
                  <Input 
                    id="company_name" required value={formData.company_name} onChange={handleInputChange}
                    className="h-11 bg-secondary/30 border-border/50 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_size" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Size</Label>
                  <Select onValueChange={handleSelectChange} required>
                    <SelectTrigger id="company_size" className="h-11 bg-secondary/30 border-border/50">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10</SelectItem>
                      <SelectItem value="11-50">11-50</SelectItem>
                      <SelectItem value="51-200">51-200</SelectItem>
                      <SelectItem value="201-500">201-500</SelectItem>
                      <SelectItem value="500+">500+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 mt-4 hover:scale-[1.01] transition-all" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : "Create Account"}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground pb-8">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-bold transition-all">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
