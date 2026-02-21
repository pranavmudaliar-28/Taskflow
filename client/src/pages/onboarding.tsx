import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Organization } from "@shared/schema";
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
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

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
                                i === idx ? "bg-white border-violet-600 text-violet-600" :
                                    "bg-white border-slate-200 text-slate-300"
                            }`}>
                            {i < idx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                        </div>
                        <span className={`text-xs font-medium whitespace-nowrap ${i <= idx ? "text-violet-700" : "text-slate-400"
                            }`}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div className={`h-0.5 w-16 sm:w-24 mx-2 mb-5 transition-colors ${i < idx ? "bg-violet-600" : "bg-slate-200"
                            }`} />
                    )}
                </div>
            ))}
        </div>
    );
}

/* ── Plan card ───────────────────────────────────────────── */
const PLANS = [
    {
        id: "free", name: "Free", price: "$0", per: "/forever",
        description: "For individuals",
        icon: Shield, iconBg: "bg-slate-100", iconColor: "text-slate-600",
        features: ["Up to 3 projects", "Basic task management", "Time tracking", "Email support"],
        cta: "Get Started Free", popular: false,
    },
    {
        id: "pro", name: "Pro", price: "$29", per: "/month",
        description: "For growing teams",
        icon: Zap, iconBg: "bg-violet-100", iconColor: "text-violet-600",
        features: ["Unlimited projects", "Advanced analytics", "Priority support", "Custom fields"],
        cta: "Start Free Trial", popular: true,
    },
    {
        id: "team", name: "Team", price: "$99", per: "/month",
        description: "For large orgs",
        icon: Users, iconBg: "bg-blue-100", iconColor: "text-blue-600",
        features: ["Everything in Pro", "Advanced reporting", "Dedicated support", "SSO & SAML"],
        cta: "Contact Sales", popular: false,
    },
];

/* ── Form field ──────────────────────────────────────────── */
function Field({ id, label, type = "text", icon: Icon, value, onChange, placeholder, required }: any) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
            <div className="relative">
                {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />}
                <Input id={id} type={type} value={value} onChange={(e: any) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`h-10 border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 ${Icon ? "pl-9" : ""}`} />
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

    const [step, setStep] = useState(stepParam);
    const [orgName, setOrgName] = useState("");
    const [orgEmail, setOrgEmail] = useState("");
    const [orgAddress, setOrgAddress] = useState("");
    const [invitations, setInvitations] = useState<string[]>([""]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showOrgForm, setShowOrgForm] = useState(false);

    /* Redirect if already onboarded */
    if (user?.onboardingStep === "completed") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 w-full max-w-sm text-center">
                    <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-1">All set!</h2>
                    <p className="text-sm text-slate-400 mb-5">Your account is ready to go.</p>
                    <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={() => window.location.href = "/dashboard"}>
                        Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    const { data: organizations } = useQuery<Organization[]>({
        queryKey: ["/api/organizations"],
        enabled: !!user,
    });

    useEffect(() => {
        if (step === "verify" && sessionId) verifyStripeSession();
    }, [step, sessionId]);

    useEffect(() => {
        if (organizations && organizations.length > 0 && step === "plan") setStep("organization");
    }, [organizations, step]);

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

    const handlePlanSelect = async (plan: string) => {
        setIsSubmitting(true);
        try {
            const res = await apiRequest("POST", "/api/stripe/create-checkout-session", { plan, returnTo: "onboarding" });
            const data = await res.json();
            if (data.url) {
                if (plan === "free") {
                    await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                    setStep("organization");
                } else {
                    window.location.href = data.url;
                }
            }
        } catch {
            toast({ title: "Checkout error", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkipToDashboard = async () => {
        try {
            await apiRequest("POST", "/api/onboarding/complete");
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            setLocation("/dashboard");
        } catch {
            toast({ title: "Failed to complete setup", variant: "destructive" });
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
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            toast({ title: "Welcome aboard! 🎉", description: "Your organization is ready." });
            setLocation("/dashboard");
        } catch {
            toast({ title: "Setup failed. Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex flex-col items-center justify-center p-4">

            {/* Brand logo */}
            <div className="flex items-center gap-2.5 mb-10">
                <div className="h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-md">
                    <Kanban className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">TaskFlow</span>
            </div>

            {/* Step indicator */}
            <StepIndicator currentStep={step} />

            {/* ── Step: Plan ── */}
            {step === "plan" && (
                <div className="w-full max-w-3xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Choose your plan</h1>
                        <p className="text-slate-400">Select the plan that fits your team. You can change it anytime.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-5">
                        {PLANS.map((plan) => (
                            <div key={plan.id} className={`relative bg-white rounded-2xl border p-6 flex flex-col shadow-sm transition-all hover:shadow-md ${plan.popular ? "border-violet-300 ring-2 ring-violet-200" : "border-slate-100"
                                }`}>
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                                        <Sparkles className="h-3 w-3" /> Most Popular
                                    </div>
                                )}
                                <div className={`h-10 w-10 rounded-xl ${plan.iconBg} flex items-center justify-center mb-4`}>
                                    <plan.icon className={`h-5 w-5 ${plan.iconColor}`} />
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg mb-0.5">{plan.name}</h3>
                                <div className="flex items-baseline gap-0.5 mb-1">
                                    <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
                                    <span className="text-sm text-slate-400">{plan.per}</span>
                                </div>
                                <p className="text-xs text-slate-400 mb-5">{plan.description}</p>
                                <ul className="space-y-2 flex-1 mb-6">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    className={`w-full font-semibold ${plan.popular
                                        ? "bg-violet-600 hover:bg-violet-700 text-white"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                                        }`}
                                    disabled={isSubmitting}
                                    onClick={() => handlePlanSelect(plan.id)}
                                >
                                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    {plan.cta}
                                </Button>
                            </div>
                        ))}
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
                        <h2 className="text-xl font-bold text-slate-900">Verifying your payment…</h2>
                        <p className="text-sm text-slate-400 mt-1">Please don't close this page.</p>
                    </div>
                </div>
            )}

            {/* ── Step: Organization ── */}
            {step === "organization" && (
                <div className="w-full max-w-md">
                    <div className="text-center mb-7">
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">Set up your organization</h1>
                        <p className="text-sm text-slate-400">This is how your team will be identified in TaskFlow.</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        {organizations && organizations.length > 0 && !showOrgForm ? (
                            <div className="text-center space-y-5">
                                <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base mb-1">You're already in an organization</h3>
                                    <p className="text-sm text-slate-400">
                                        You're a member of <strong className="text-slate-700">{organizations[0].name}</strong>.
                                    </p>
                                </div>
                                <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold" onClick={handleSkipToDashboard}>
                                    Continue to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                <button onClick={() => setShowOrgForm(true)}
                                    className="text-sm text-slate-400 hover:text-slate-700 underline-offset-2 hover:underline transition-colors">
                                    Create another organization
                                </button>
                            </div>
                        ) : (
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
                                <div className="pt-2 space-y-2">
                                    <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                                        disabled={isSubmitting || !orgName.trim()}>
                                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                    {showOrgForm && (
                                        <Button type="button" variant="ghost" className="w-full text-slate-400"
                                            onClick={() => setShowOrgForm(false)}>
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ── Step: Invite ── */}
            {step === "invite" && (
                <div className="w-full max-w-md">
                    <div className="text-center mb-7">
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">Invite your team</h1>
                        <p className="text-sm text-slate-400">Add teammates to get started collaborating right away.</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
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
                                        className="pl-9 h-10 border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
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
                            className="w-full border-dashed gap-2 mb-5 text-slate-500 hover:text-slate-700">
                            <UserPlus className="h-4 w-4" /> Add another
                        </Button>
                        <div className="space-y-2">
                            <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                                onClick={handleCompleteSetup} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Finish & Go to Dashboard
                            </Button>
                            <Button variant="ghost" className="w-full text-slate-400 hover:text-slate-700"
                                onClick={handleCompleteSetup} disabled={isSubmitting}>
                                Skip for now
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
