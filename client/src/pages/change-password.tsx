import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, ShieldCheck, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";

export default function ChangePassword() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const changePasswordMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/user/change-password", {
                currentPassword,
                newPassword,
            });
            return res.json();
        },
        onSuccess: (updatedUser) => {
            // Update auth state directly so App Router immediately unblocks
            queryClient.setQueryData(["/api/auth/user"], updatedUser);
            toast({ title: "Password updated", description: "Your temporary password has been replaced." });
            setLocation("/dashboard");
        },
        onError: (error: any) => {
            let desc = error.message || "Could not change password";
            if (desc.includes("Current password is incorrect")) {
                desc = "The temporary password you entered is incorrect.";
            }
            toast({
                title: "Update failed",
                description: desc,
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ title: "Passwords mismatch", description: "New passwords do not match", variant: "destructive" });
            return;
        }
        if (newPassword.length < 6) {
            toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
            return;
        }
        changePasswordMutation.mutate();
    };

    const features = [
        "Manage tasks with Kanban boards",
        "Track time and productivity",
        "Collaborate with your team",
        "Real-time notifications",
    ];

    return (
        <div className="min-h-screen flex hover:overflow-hidden">
            {/* ── Left: dark brand panel ── */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col bg-[#0F172A] relative overflow-hidden"
            >
                {/* Background decorations */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-0 w-full h-full opacity-30"
                        style={{ background: "radial-gradient(ellipse 80% 60% at 20% 10%, #3B82F6 0%, transparent 60%)" }} />
                    <div className="absolute bottom-0 right-0 w-96 h-96 opacity-20"
                        style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)" }} />
                    {/* Grid dots */}
                    <div className="absolute inset-0 opacity-5"
                        style={{ backgroundImage: "radial-gradient(#94A3B8 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                </div>

                <div className="relative z-10 flex flex-col h-full px-10 py-12">
                    {/* Logo */}
                    <Link href="/" className="inline-block hover:opacity-90 transition-opacity cursor-pointer">
                        <Logo className="text-white" iconSize={36} textSize="text-xl" />
                    </Link>

                    {/* Middle content */}
                    <div className="flex-1 flex flex-col justify-center">
                        <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
                            Secure your<br />
                            <span className="text-violet-400">new account</span>
                        </h1>
                        <p className="text-slate-400 text-base mb-10 leading-relaxed">
                            TaskFlow keeps your team's projects and data secure. Please update your temporary password to continue.
                        </p>

                        <div className="space-y-4">
                            {features.map((f) => (
                                <div key={f} className="flex items-center gap-3">
                                    <div className="h-5 w-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
                                    </div>
                                    <span className="text-slate-300 text-sm">{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Floating mock dashboard */}
                    <div className="mt-8">
                        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-2.5">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="h-2 w-2 rounded-full bg-red-400" />
                                <div className="h-2 w-2 rounded-full bg-amber-400" />
                                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                                <span className="text-slate-500 text-xs ml-2">taskflow.app/security</span>
                            </div>
                            <div className="bg-white/5 rounded-lg px-3 py-6 flex flex-col items-center justify-center space-y-3">
                                <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                                    <ShieldCheck className="h-6 w-6 text-violet-400" />
                                </div>
                                <span className="text-slate-300 text-xs font-medium">Resetting Password...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Right: form panel ── */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                className="flex-1 flex flex-col bg-background"
            >
                <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 xl:px-16 py-12 max-w-md w-full mx-auto">
                    {/* Mobile logo */}
                    <Link href="/" className="inline-block hover:opacity-80 transition-opacity cursor-pointer mb-10 lg:hidden">
                        <Logo className="text-foreground lg:hidden" iconSize={32} textSize="text-xl" />
                    </Link>

                    <div className="mb-8">
                        <div className="h-12 w-12 bg-violet-100 rounded-2xl flex items-center justify-center mb-6">
                            <KeyRound className="h-6 w-6 text-violet-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-1">Set New Password</h2>
                        <p className="text-muted-foreground text-sm">Welcome to the team! For security, please replace your temporary password with a new one.</p>
                    </div>

                    <form
                        className="space-y-5"
                        onSubmit={handleSubmit}
                    >
                        <div className="space-y-1.5">
                            <Label htmlFor="currentPassword" className="text-sm font-medium text-foreground/80">Temporary Password</Label>
                            <div className="relative">
                                <Input
                                    id="currentPassword"
                                    type={showCurrent ? "text" : "password"}
                                    placeholder="Password from your email"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="h-11 border-border bg-background focus:border-violet-600 focus:ring-violet-600/20 rounded-lg pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="newPassword" className="text-sm font-medium text-foreground/80">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showNew ? "text" : "password"}
                                    placeholder="Min 6 characters"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="h-11 border-border bg-background focus:border-violet-600 focus:ring-violet-600/20 rounded-lg pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">Confirm New Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="Verify your new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="h-11 border-border bg-background focus:border-violet-600 focus:ring-violet-600/20 rounded-lg pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg shadow-sm"
                            disabled={changePasswordMutation.isPending}
                        >
                            {changePasswordMutation.isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                            ) : (
                                <><span>Save & Continue</span><ArrowRight className="ml-2 h-4 w-4" /></>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 flex items-center gap-2 text-[11px] text-muted-foreground justify-center">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Your connection is encrypted and secure</span>
                    </div>
                </div>

                <div className="px-8 pb-6 text-center">
                    <p className="text-xs text-muted-foreground">
                        Secure password reset for <span className="font-medium text-foreground">{user?.email}</span>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
