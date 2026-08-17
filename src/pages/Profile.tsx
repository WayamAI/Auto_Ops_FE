import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/api/auth";
import { toast } from "sonner";
import { Loader2, User, Camera, ShieldCheck, Mail, Phone, Building2, Users } from "lucide-react";
import { motion } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import DEFAULT_AVATAR from "@/assets/default-avatar.svg";

export default function Profile() {
  const { user, updateUserContext } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    company_size: "",
    email: "",
    phone_number: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        company_name: user.company_name || "",
        company_size: user.company_size || "",
        email: user.email || "",
        phone_number: user.phone_number || "",
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, company_size: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await authService.updateUser(user.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        company_name: formData.company_name,
        company_size: formData.company_size,
      });

      if (res.meta.status) {
        toast.success(res.meta.message || "Profile updated successfully");
        updateUserContext({
          first_name: formData.first_name,
          last_name: formData.last_name,
          company_name: formData.company_name,
          company_size: formData.company_size,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const uploadData = new FormData();
    uploadData.append("file", file);

    setIsUploading(true);
    try {
      const uploadRes = await authService.uploadFile(uploadData);
      if (uploadRes.meta.status) {
        const profile_url = uploadRes.data.url;
        const updateRes = await authService.updateUser(user.id, { profile_url });
        
        if (updateRes.meta.status) {
          toast.success("Profile picture updated");
          updateUserContext({ profile_url });
        } else {
          toast.error(updateRes.meta.message || "Failed to update profile picture");
        }
      } else {
        toast.error(uploadRes.meta.message || "Upload failed");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <AppLayout title="Profile Settings" subtitle="Manage your account preferences and personal details">
      <div className="max-w-4xl mx-auto pb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/60 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Top Banner / Header area */}
          <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border-b border-border/40 relative">
            <div className="absolute -bottom-12 left-10">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl border-4 border-background bg-secondary flex items-center justify-center overflow-hidden shadow-xl ring-1 ring-border/60">
                  {isUploading ? (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : null}
                  <img 
                    src={user?.profile_url || DEFAULT_AVATAR} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer z-10 backdrop-blur-[2px]"
                  >
                    <Camera size={20} className="text-white mb-1" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Update</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleUpload} 
                  className="hidden" 
                  accept="image/*" 
                />
              </div>
            </div>
          </div>

          <div className="pt-16 px-10 pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              
              {/* Left Column - Info/Helper */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <User size={18} className="text-primary" />
                    Personal Info
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Update your personal identity details used across the Auto Ops platform.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheck size={18} className="text-primary mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Verified Account</h4>
                      <p className="text-[12px] text-muted-foreground mt-1">Your account is secured with enterprise grade encryption.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Form Fields */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Name Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">First Name</Label>
                    <div className="relative group">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                      <Input 
                        name="first_name" 
                        value={formData.first_name} 
                        onChange={handleChange}
                        className="h-11 pl-9 bg-secondary/30 border-border/40 focus:bg-background transition-all rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Last Name</Label>
                    <div className="relative group">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                      <Input 
                        name="last_name" 
                        value={formData.last_name} 
                        onChange={handleChange}
                        className="h-11 pl-9 bg-secondary/30 border-border/40 focus:bg-background transition-all rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Company Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Company Name</Label>
                    <div className="relative group">
                      <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                      <Input 
                        name="company_name" 
                        value={formData.company_name} 
                        onChange={handleChange}
                        className="h-11 pl-9 bg-secondary/30 border-border/40 focus:bg-background transition-all rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Company Size</Label>
                    <div className="relative group">
                      <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 z-10 group-focus-within:text-primary transition-colors pointer-events-none" />
                      <Select onValueChange={handleSelectChange} value={formData.company_size}>
                        <SelectTrigger className="h-11 pl-9 bg-secondary/30 border-border/40 focus:bg-background transition-all rounded-xl">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border/40">
                          <SelectItem value="1-10">1-10 Employees</SelectItem>
                          <SelectItem value="11-50">11-50 Employees</SelectItem>
                          <SelectItem value="51-200">51-200 Employees</SelectItem>
                          <SelectItem value="201-500">201-500 Employees</SelectItem>
                          <SelectItem value="500+">500+ Employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Protected Section */}
                <div className="pt-8 border-t border-border/40">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 mb-6 flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-border/40" />
                    Read only Contact Info
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40 ml-1">Email Address</Label>
                      <div className="relative group opacity-60">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
                        <Input 
                          disabled 
                          value={formData.email} 
                          className="h-11 pl-9 bg-black/20 border-border/20 cursor-not-allowed rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40 ml-1">Phone Number</Label>
                      <div className="relative group opacity-60">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
                        <Input 
                          disabled 
                          value={formData.phone_number} 
                          className="h-11 pl-9 bg-black/20 border-border/20 cursor-not-allowed rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex justify-end pt-6">
                  <Button 
                    onClick={handleSave} 
                    disabled={loading} 
                    className="min-w-[160px] h-12 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Profile"}
                  </Button>
                </div>

              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
