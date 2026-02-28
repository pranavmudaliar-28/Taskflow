import React, { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    CheckCircle2, ArrowRight, Kanban, Loader2,
    Building2, Mail, MapPin, UserPlus, X, Sparkles,
    Shield, Zap, Users,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

/* ── Step indicator ──────────────────────────────────────── */
const STEPS = [
    { id: "plan", label: "Choose plan" },
    { id: "organization", label: "Set up org" },
    { id: "invite", label: "Invite team" },
];

function StepIndicator({ currentStep }: { currentStep: string }) {
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (currentStep === "verify") return null;
    return (
        <div className="flex items-center justify-center gap-0 mb-10">
            {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center">
                    <div className="flex flex-col items-center gap-1.5">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${i < idx ? "bg-violet-600 border-violet-600 text-white" :
                            i === idx ? "bg-background border-violet-600 text-violet-600" :
                                "bg-background border-border text-muted-foreground"
                            }`}>
                            {i < idx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                        </div>
                        <span className={`text-xs font-medium whitespace-nowrap ${i <= idx ? "text-violet-600" : "text-muted-foreground"
                            }`}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div className={`h-0.5 w-16 sm:w-24 mx-2 mb-5 transition-colors ${i < idx ? "bg-violet-600" : "bg-border"
                            }`} />
                    )}
                </div>
            ))}
        </div>
    );
}

/* ── Plan data ───────────────────────────────────────────── */
type BillingCycle = "monthly" | "annual";

const PLANS = [
    {
        id: "free",
        name: "Free",
        monthlyPrice: "$0",
        annualPrice: "$0",
        per: "/forever",
        description: "For individuals",
        icon: Shield,
        iconBg: "bg-muted",
        iconColor: "text-muted-foreground",
        features: ["Up to 3 projects", "Basic task management", "Time tracking", "Email support"],
        cta: "Get Started Free",
        popular: false,
        isPaid: false,
    },
    {
        id: "pro",
        name: "Pro",
        monthlyPrice: "$29",
        annualPrice: "$23",
        per: "/mo",
        description: "For growing teams",
        icon: Zap,
        iconBg: "bg-violet-100",
        iconColor: "text-violet-600",
        features: ["Unlimited projects", "Advanced analytics", "Priority support", "Custom fields"],
        cta: "Start Free Trial",
        popular: true,
        isPaid: true,
    },
    {
        id: "team",
        name: "Team",
        monthlyPrice: "$99",
        annualPrice: "$79",
        per: "/mo",
        description: "For large orgs",
        icon: Users,
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        features: ["Everything in Pro", "Advanced reporting", "Dedicated support", "SSO & SAML"],
        cta: "Contact Sales",
        popular: false,
        isPaid: true,
    },
];

/* ── Form field ──────────────────────────────────────────── */
function Field({ id, label, type = "text", icon: Icon, value, onChange, placeholder, required }: any) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-sm font-semibold text-foreground/80">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
            <div className="relative">
                {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                <Input id={id} type={type} value={value} onChange={(e: any) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`h-10 border-border bg-background focus:border-violet-500 focus:ring-2 focus:ring-violet-100 ${Icon ? "pl-9" : ""}`} />
            </div>
        </div>
    );
}

/* ── Main component ──────────────────────────────────────── */
export default function Onboarding() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const search = useSearch();
    const queryParams = new URLSearchParams(search);
    const stepParam = queryParams.get("step") || user?.onboardingStep || "plan";
    const sessionId = queryParams.get("session_id");
    const { toast } = useToast();

    const [step, setStep] = useState(stepParam === "completed" ? "plan" : stepParam);
    const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
    const [orgName, setOrgName] = useState("");
    const [orgEmail, setOrgEmail] = useState("");
    const [orgAddress, setOrgAddress] = useState("");
    const [invitations, setInvitations] = useState<string[]>([""]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const { data: pendingInvites } = useQuery<any[]>({
        queryKey: ["/api/invitations/pending"],
        enabled: !!user && user.onboardingStep !== "completed",
        staleTime: 30_000,
    });

    useEffect(() => {
        if (step === "verify" && sessionId) verifyStripeSession();
    }, [step, sessionId]);

    // If user has pending invites, redirect to accept-invitation immediately (runs once on mount)
    useEffect(() => {
        console.log("[Onboarding] Checking pending invites:", {
            count: pendingInvites?.length,
            onboardingStep: user?.onboardingStep
        });
        if (pendingInvites && pendingInvites.length > 0 && user?.onboardingStep !== "completed") {
            console.log("[Onboarding] Redirecting to invite:", pendingInvites[0].token);
            setLocation(`/accept-invitation?token=${pendingInvites[0].token}`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingInvites, user?.onboardingStep]);

    /* Redirect if already onboarded */
    if (user?.onboardingStep === "completed") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="bg-card rounded-2xl border border-border shadow-sm p-8 w-full max-w-sm text-center">
                    <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-500" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground mb-1">All set!</h2>
                    <p className="text-sm text-muted-foreground mb-5">Your account is ready to go.</p>
                    <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={() => window.location.href = "/dashboard"}>
                        Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    /* ── Stripe session verification (after paid plan redirect) ── */
    const verifyStripeSession = async () => {
        setIsVerifying(true);
        try {
            const res = await apiRequest("GET", `/api/stripe/session-status?session_id=${sessionId}`);
            const data = await res.json();
            if (data.status === "success") {
                await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
                setStep("organization");
            } else {
                toast({ title: "Payment pending", description: "Waiting for confirmation…" });
                setTimeout(verifyStripeSession, 3000);
            }
        } catch {
            toast({ title: "Verification failed", description: "Contact support.", variant: "destructive" });
            setStep("plan");
        } finally {
            setIsVerifying(false);
        }
    };

    /* ── Plan selection handler ── */
    const handlePlanSelect = async (planId: string) => {
        // ✅ Free plan: NO Stripe — just move to the next step
        if (planId === "free") {
            try {
                setIsSubmitting(true);
                // Save the free plan to user record
                await apiRequest("POST", "/api/stripe/create-checkout-session", {
                    plan: "free",
                    billing: "none",
                    returnTo: "onboarding",
                });
            } catch {
                // Even if the API call fails, proceed — free plan doesn't need Stripe
            } finally {
                setIsSubmitting(false);
            }
            setStep("organization");
            return;
        }

        // ✅ Paid plan: trigger Stripe with billing cycle
        setIsSubmitting(true);
        try {
            const res = await apiRequest("POST", "/api/stripe/create-checkout-session", {
                plan: planId,
                billing: billingCycle,
                returnTo: "onboarding",
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast({ title: "Could not start checkout. Please try again.", variant: "destructive" });
            }
        } catch {
            toast({ title: "Checkout error. Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNextToInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgName.trim()) return;
        setStep("invite");
    };

    const handleCompleteSetup = async () => {
        setIsSubmitting(true);
        try {
            const filteredInvites = invitations.filter(e => e.trim() !== "");
            await apiRequest("POST", "/api/onboarding/setup-organization", {
                name: orgName, email: orgEmail, address: orgAddress, invitations: filteredInvites,
            });
            await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
            toast({ title: "Welcome aboard! 🎉", description: "Your organization is ready." });
        } catch {
            toast({ title: "Setup failed. Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const features = [
        "Manage tasks with Kanban boards",
        "Track time and productivity",
        "Collaborate with your team",
        "Real-time notifications",
    ];

    return (
        <div className="min-h-screen flex overflow-hidden">
            {/* ── Left: dark brand panel ── */}
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
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-violet-600 flex items-center justify-center">
                            <Kanban className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-white font-bold text-lg">TaskFlow</span>
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                        <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
                            Set up your<br />
                            <span className="text-violet-400">workspace</span>
                        </h1>
                        <p className="text-slate-400 text-base mb-10 leading-relaxed">
                            Complete these quick steps to customize TaskFlow for your team and get started immediately.
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
                <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 xl:px-12 py-12 max-w-4xl w-full mx-auto">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center">
                            <Kanban className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-bold text-foreground">TaskFlow</span>
                    </div>

                    {/* Step indicator */}
                    <StepIndicator currentStep={step} />

                    {/* ── Step: Plan ── */}
                    {step === "plan" && (
                        <div className="w-full max-w-3xl">
                            <div className="text-center mb-6">
                                <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">Choose your plan</h1>
                                <p className="text-muted-foreground">Select the plan that fits your team. You can change it anytime.</p>
                            </div>

                            {/* ── Billing toggle ── */}
                            <div className="flex items-center justify-center mb-8">
                                <div className="relative flex items-center bg-muted rounded-full p-1 gap-1">
                                    <button
                                        onClick={() => setBillingCycle("monthly")}
                                        className={`relative z-10 px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${billingCycle === "monthly"
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setBillingCycle("annual")}
                                        className={`relative z-10 px-5 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${billingCycle === "annual"
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        Annual
                                        <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">-20%</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-5">
                                {PLANS.map((plan) => {
                                    const displayPrice = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
                                    const displayPer = plan.id === "free" ? plan.per : `/${billingCycle === "annual" ? "mo, billed annually" : "month"}`;

                                    return (
                                        <div key={plan.id} className={`relative bg-card rounded-2xl border p-6 flex flex-col shadow-sm transition-all hover:shadow-md ${plan.popular ? "border-violet-300 ring-2 ring-violet-200 dark:ring-violet-900/30" : "border-border"
                                            }`}>
                                            {plan.popular && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                                                    <Sparkles className="h-3 w-3" /> Most Popular
                                                </div>
                                            )}
                                            <div className={`h-10 w-10 rounded-xl ${plan.iconBg} flex items-center justify-center mb-4`}>
                                                <plan.icon className={`h-5 w-5 ${plan.iconColor}`} />
                                            </div>
                                            <h3 className="font-bold text-foreground text-lg mb-0.5">{plan.name}</h3>
                                            <div className="flex items-baseline gap-0.5 mb-1">
                                                <span className="text-3xl font-extrabold text-foreground">{displayPrice}</span>
                                                <span className="text-xs text-muted-foreground">{displayPer}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-5">{plan.description}</p>
                                            <ul className="space-y-2 flex-1 mb-6">
                                                {plan.features.map((f, i) => (
                                                    <li key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                        {f}
                                                    </li>
                                                ))}
                                            </ul>
                                            <Button
                                                className={`w-full font-semibold ${plan.popular
                                                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                                                    : "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                                                    }`}
                                                disabled={isSubmitting}
                                                onClick={() => handlePlanSelect(plan.id)}
                                            >
                                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                                {plan.cta}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Step: Verify payment ── */}
                    {step === "verify" && (
                        <div className="flex flex-col items-center gap-5 py-16 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Verifying your payment…</h2>
                                <p className="text-sm text-muted-foreground mt-1">Please don't close this page.</p>
                            </div>
                        </div>
                    )}

                    {/* ── Step: Organization ── */}
                    {step === "organization" && (
                        <div className="w-full max-w-md">
                            <div className="text-center mb-7">
                                <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">Set up your organization</h1>
                                <p className="text-sm text-muted-foreground">This is how your team will be identified in TaskFlow.</p>
                            </div>
                            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                                <form onSubmit={handleNextToInvite} className="space-y-4">
                                    <Field id="orgName" label="Organization name" icon={Building2}
                                        value={orgName} onChange={setOrgName}
                                        placeholder="Acme Corp" required />
                                    <Field id="orgEmail" label="Organization email" type="email" icon={Mail}
                                        value={orgEmail} onChange={setOrgEmail}
                                        placeholder="contact@acme.com" />
                                    <Field id="orgAddress" label="Office address" icon={MapPin}
                                        value={orgAddress} onChange={setOrgAddress}
                                        placeholder="123 Market St, San Francisco, CA" />
                                    <div className="pt-2">
                                        <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                                            disabled={isSubmitting || !orgName.trim()}>
                                            Continue <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ── Step: Invite ── */}
                    {step === "invite" && (
                        <div className="w-full max-w-md mx-auto">
                            <div className="text-center mb-7">
                                <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">Invite your team</h1>
                                <p className="text-sm text-muted-foreground">Add teammates to get started collaborating right away.</p>
                            </div>
                            <div className="bg-background rounded-none border-0 sm:bg-card sm:rounded-2xl sm:border border-border shadow-none sm:shadow-sm p-0 sm:p-6">
                                <div className="space-y-3 mb-4">
                                    {invitations.map((email, index) => (
                                        <div key={index} className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input type="email" placeholder="colleague@example.com" value={email}
                                                onChange={(e) => {
                                                    const next = [...invitations];
                                                    next[index] = e.target.value;
                                                    setInvitations(next);
                                                }}
                                                className="pl-9 h-11 border-border focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                                            />
                                            {invitations.length > 1 && (
                                                <button onClick={() => setInvitations(invitations.filter((_, i) => i !== index))}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setInvitations([...invitations, ""])}
                                    className="w-full h-11 border-dashed gap-2 mb-6 text-foreground/70 hover:text-foreground">
                                    <UserPlus className="h-4 w-4" /> Add another teammate
                                </Button>
                                <div className="space-y-3 mt-8">
                                    <Button className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-sm"
                                        onClick={handleCompleteSetup} disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin flex-shrink-0 mr-2" /> : null}
                                        <span>Finish {"&"} Go to Dashboard</span>
                                    </Button>
                                    <Button variant="ghost" className="w-full h-11 text-muted-foreground hover:text-foreground"
                                        onClick={handleCompleteSetup} disabled={isSubmitting}>
                                        Skip for now
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
