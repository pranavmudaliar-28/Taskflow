import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Kanban, ArrowLeft, Mail, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPassword() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const forgotPasswordMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to verify email");
            }
            return res.json();
        },
        onSuccess: () => {
            setStep(2);
        },
        onError: (error: any) => {
            toast({
                title: "Account not found",
                description: error.message || "No account is registered with this email.",
                variant: "destructive",
            });
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async () => {
            if (newPassword !== confirmPassword) {
                throw new Error("Passwords do not match");
            }
            if (newPassword.length < 6) {
                throw new Error("Password must be at least 6 characters");
            }
            const res = await apiRequest("POST", "/api/auth/reset-password", { email, password: newPassword });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to reset password");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Your password has been reset successfully. You can now log in.",
            });
            setLocation("/login");
        },
        onError: (error: any) => {
            toast({
                title: "Reset failed",
                description: error.message || "Failed to reset password",
                variant: "destructive",
            });
        },
    });

    const features = [
        "Manage tasks with Kanban boards",
        "Track time and productivity",
        "Collaborate with your team",
        "Real-time notifications",
    ];

    return (
        <div className="min-h-screen flex overflow-hidden">
            {/* ── Left: dark brand panel (Matching login.tsx) ── */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col bg-[#0F172A] relative overflow-hidden"
            >
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-0 w-full h-full opacity-30"
                        style={{ background: "radial-gradient(ellipse 80% 60% at 20% 10%, #3B82F6 0%, transparent 60%)" }} />
                    <div className="absolute bottom-0 right-0 w-96 h-96 opacity-20"
                        style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)" }} />
                    <div className="absolute inset-0 opacity-5"
                        style={{ backgroundImage: "radial-gradient(#94A3B8 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                </div>

                <div className="relative z-10 flex flex-col h-full px-10 py-12">
                    <Link href="/" className="inline-block hover:opacity-90 transition-opacity cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-violet-600 flex items-center justify-center">
                                <Kanban className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-white font-bold text-lg">TaskFlow</span>
                        </div>
                    </Link>

                    <div className="flex-1 flex flex-col justify-center">
                        <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
                            Secure your account<br />
                            <span className="text-violet-400">with TaskFlow Pro</span>
                        </h1>
                        <p className="text-slate-400 text-base mb-10 leading-relaxed">
                            Retrieve your access and get back to managing your projects efficiently.
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
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center">
                                <Kanban className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-bold text-foreground">TaskFlow</span>
                        </div>
                    </Link>

                    {step === 1 ? (
                        <>
                            <div className="mb-8 rotate-0">
                                <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-violet-600 transition-colors mb-6 group">
                                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Login
                                </Link>
                                <h2 className="text-2xl font-bold text-foreground mb-1">Forgot password?</h2>
                                <p className="text-muted-foreground text-sm">Enter your email to verify your account</p>
                            </div>

                            <form
                                className="space-y-5"
                                onSubmit={(e) => { e.preventDefault(); forgotPasswordMutation.mutate(); }}
                            >
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-sm font-medium text-foreground/80">Email address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="name@company.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="h-11 border-border bg-background focus:border-violet-600 focus:ring-violet-600/20 rounded-lg pl-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg shadow-sm"
                                    disabled={forgotPasswordMutation.isPending}
                                >
                                    {forgotPasswordMutation.isPending ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                                    ) : (
                                        <><span>Continue</span><ArrowRight className="ml-2 h-4 w-4" /></>
                                    )}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="mb-8 rotate-0">
                                <button type="button" onClick={() => setStep(1)} className="inline-flex items-center text-sm text-muted-foreground hover:text-violet-600 transition-colors mb-6 group">
                                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back
                                </button>
                                <h2 className="text-2xl font-bold text-foreground mb-1">Set New Password</h2>
                                <p className="text-muted-foreground text-sm">Enter your new password below</p>
                            </div>

                            <form
                                className="space-y-5"
                                onSubmit={(e) => { e.preventDefault(); resetPasswordMutation.mutate(); }}
                            >
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="newPassword" className="text-sm font-medium text-foreground/80">New Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="newPassword"
                                                type="password"
                                                placeholder="••••••••"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="h-11 border-border bg-background focus:border-violet-600 focus:ring-violet-600/20 rounded-lg pl-10"
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">Confirm Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                placeholder="••••••••"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="h-11 border-border bg-background focus:border-violet-600 focus:ring-violet-600/20 rounded-lg pl-10"
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg shadow-sm"
                                    disabled={resetPasswordMutation.isPending}
                                >
                                    {resetPasswordMutation.isPending ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</>
                                    ) : (
                                        <><span>Reset Password</span><CheckCircle2 className="ml-2 h-4 w-4" /></>
                                    )}
                                </Button>
                            </form>
                        </>
                    )}
                </div>

                <div className="px-8 pb-6 text-center">
                    <p className="text-xs text-muted-foreground">
                        Having trouble? <a href="mailto:support@taskflow.pro" className="text-violet-600 hover:underline">Contact Support</a>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
