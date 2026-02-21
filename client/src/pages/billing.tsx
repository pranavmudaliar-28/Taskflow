import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
    CheckCircle2, ArrowLeft, Loader2, CreditCard, ExternalLink,
    Zap, Users, Shield, Crown, ArrowRight, Star,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────────────────────────── */
interface SubscriptionStatus {
    plan: string;
    subscription: {
        id: string;
        status: string;
        cancelAtPeriodEnd: boolean;
    } | null;
}

/* ── Plan config ──────────────────────────────────────────────────────────── */
const PLANS = [
    {
        id: "free",
        name: "Free",
        price: "$0",
        per: "/forever",
        description: "For individuals and small projects",
        icon: Shield,
        color: "text-slate-600 dark:text-slate-400",
        iconBg: "bg-slate-100 dark:bg-slate-800",
        features: [
            "Up to 3 projects",
            "Basic task management",
            "Time tracking",
            "Email support",
        ],
        cta: "Current Plan",
        popular: false,
    },
    {
        id: "pro",
        name: "Pro",
        price: "$29",
        per: "/month",
        description: "For growing teams",
        icon: Zap,
        color: "text-violet-600 dark:text-violet-400",
        iconBg: "bg-violet-100 dark:bg-violet-950",
        features: [
            "Unlimited projects",
            "Advanced analytics",
            "Priority support",
            "Custom fields",
            "Role-based access",
        ],
        cta: "Upgrade to Pro",
        popular: true,
    },
    {
        id: "team",
        name: "Team",
        price: "$99",
        per: "/month",
        description: "For large organizations",
        icon: Users,
        color: "text-blue-600 dark:text-blue-400",
        iconBg: "bg-blue-100 dark:bg-blue-950",
        features: [
            "Everything in Pro",
            "Advanced reporting",
            "Dedicated support",
            "SSO & SAML",
            "Audit logs",
        ],
        cta: "Upgrade to Team",
        popular: false,
    },
];

export default function BillingPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    // ── Handle Stripe redirect query params ─────────────────────────────────────
    // ── Handle Stripe redirect query params ─────────────────────────────────────
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const success = params.get("success") === "true";
        const canceled = params.get("canceled") === "true";
        const sessionId = params.get("session_id");
        const planParam = params.get("plan");

        if (success) {
            // If verification session ID exists, verify it immediately (robustness for local dev / delayed webhooks)
            if (sessionId) {
                apiRequest("GET", `/api/stripe/session-status?session_id=${sessionId}`)
                    .then(async () => {
                        // Use refetchQueries (not just invalidate) so plan
                        // updates immediately without a manual page refresh.
                        await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
                        await queryClient.refetchQueries({ queryKey: ["/api/stripe/subscription-status"] });
                    })
                    .catch(e => console.error("Session verification failed:", e));
            }

            toast({
                title: "🎉 Subscription activated!",
                description: `You're now on the ${planParam ? planParam.charAt(0).toUpperCase() + planParam.slice(1) : ""} plan. Welcome!`,
            });
            window.history.replaceState({}, "", "/billing");
        }

        if (canceled) {
            toast({
                title: "Checkout canceled",
                description: "Your subscription was not changed.",
                variant: "destructive",
            });
            window.history.replaceState({}, "", "/billing");
        }
    }, [toast]);

    // ── Fetch live subscription status from Stripe ──────────────────────────────
    const { data: subStatus, isLoading: subLoading } = useQuery<SubscriptionStatus>({
        queryKey: ["/api/stripe/subscription-status"],
    });

    const currentPlan = subStatus?.plan || user?.plan || "free";
    const hasPaidSub = !!subStatus?.subscription;

    // ── Checkout mutation ────────────────────────────────────────────────────────
    const checkoutMutation = useMutation({
        mutationFn: async (plan: string) => {
            const res = await apiRequest("POST", "/api/stripe/create-checkout-session", { plan });
            return res.json() as Promise<{ url: string }>;
        },
        onSuccess: (data) => {
            if (data.url) window.location.href = data.url;
        },
        onError: (err: any) => {
            toast({
                title: "Checkout error",
                description: err.message || "Could not start checkout. Check your Stripe configuration.",
                variant: "destructive",
            });
        },
        onSettled: () => setLoadingPlan(null),
    });

    // ── Portal mutation ──────────────────────────────────────────────────────────
    const portalMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/stripe/create-portal-session");
            return res.json() as Promise<{ url: string }>;
        },
        onSuccess: (data) => {
            if (data.url) window.location.href = data.url;
        },
        onError: (err: any) => {
            toast({
                title: "Portal error",
                description: err.message || "Could not open billing portal.",
                variant: "destructive",
            });
        },
    });

    const handleUpgrade = (planId: string) => {
        setLoadingPlan(planId);
        // If user already has an active subscription, changes (including
        // downgrades) must go through the Stripe billing portal — Stripe
        // does not allow creating a new checkout session over an existing sub.
        if (hasPaidSub) {
            portalMutation.mutate();
        } else {
            checkoutMutation.mutate(planId);
        }
    };

    const isCurrentPlan = (planId: string) => planId === currentPlan;

    return (
        <div className="p-5 sm:p-6 max-w-4xl space-y-6">
            {/* ── Header ──────────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/settings">
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-sm">
                            <ArrowLeft className="h-3.5 w-3.5" /> Settings
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold">Billing & Plans</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Manage your subscription via Stripe
                        </p>
                    </div>
                </div>

                {/* Manage subscription button (only if user has paid sub) */}
                {hasPaidSub && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-sm"
                        onClick={() => portalMutation.mutate()}
                        disabled={portalMutation.isPending}
                        data-testid="button-manage-subscription"
                    >
                        {portalMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <CreditCard className="h-3.5 w-3.5" />
                        )}
                        Manage Subscription
                        <ExternalLink className="h-3 w-3 ml-0.5 text-muted-foreground" />
                    </Button>
                )}
            </div>

            {/* ── Current Plan Banner ─────────────────────────────────────────────── */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                        <Crown className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Current Plan</p>
                        {subLoading ? (
                            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm capitalize">{currentPlan}</span>
                                <Badge
                                    variant="secondary"
                                    className={
                                        currentPlan === "pro"
                                            ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 text-[10px]"
                                            : currentPlan === "team"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px]"
                                                : "text-[10px]"
                                    }
                                >
                                    {currentPlan === "free" ? "Free Forever" : "Active"}
                                </Badge>
                                {subStatus?.subscription?.cancelAtPeriodEnd && (
                                    <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300">
                                        Cancels at period end
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {hasPaidSub && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => portalMutation.mutate()}
                        disabled={portalMutation.isPending}
                    >
                        {portalMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        Cancel / Modify
                    </Button>
                )}
            </div>

            {/* ── Plan Cards ──────────────────────────────────────────────────────── */}
            <div className="grid md:grid-cols-3 gap-4">
                {PLANS.map((plan) => {
                    const isCurrent = isCurrentPlan(plan.id);
                    const isPaid = plan.id !== "free";

                    return (
                        <div
                            key={plan.id}
                            className={`relative rounded-2xl border p-5 flex flex-col transition-shadow card-hover-lift ${plan.popular
                                ? "border-violet-300 dark:border-violet-600 shadow-md"
                                : "border-slate-200 dark:border-slate-800"
                                } ${isCurrent ? "ring-2 ring-violet-400 dark:ring-violet-600" : ""}`}
                            data-testid={`plan-card-${plan.id}`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[10px] font-semibold px-3 py-1 rounded-full">
                                    <Star className="h-2.5 w-2.5 fill-current" /> Most Popular
                                </div>
                            )}
                            {isCurrent && (
                                <div className="absolute -top-3 right-4 bg-emerald-500 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                                    Current
                                </div>
                            )}

                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 ${plan.iconBg}`}>
                                <plan.icon className={`h-4 w-4 ${plan.color}`} />
                            </div>

                            <h3 className="font-bold text-slate-900 dark:text-white mb-0.5">{plan.name}</h3>
                            <div className="flex items-baseline gap-0.5 mb-1">
                                <span className="text-2xl font-extrabold">{plan.price}</span>
                                <span className="text-xs text-muted-foreground">{plan.per}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>

                            <ul className="space-y-1.5 flex-1 mb-5">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span className="text-slate-600 dark:text-slate-300 text-xs">{f}</span>
                                    </li>
                                ))}
                            </ul>

                            {isCurrent ? (
                                <Button
                                    className="w-full h-8 text-xs"
                                    variant="outline"
                                    disabled
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                                    Current Plan
                                </Button>
                            ) : isPaid ? (
                                <Button
                                    className={`w-full h-8 text-xs font-medium ${plan.popular
                                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
                                        : ""
                                        }`}
                                    variant={plan.popular ? "default" : "outline"}
                                    onClick={() => handleUpgrade(plan.id)}
                                    disabled={loadingPlan !== null}
                                    data-testid={`button-upgrade-${plan.id}`}
                                >
                                    {loadingPlan === plan.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                    ) : (
                                        <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                                    )}
                                    {hasPaidSub ? "Switch Plan" : plan.cta}
                                </Button>
                            ) : (
                                <Button className="w-full h-8 text-xs" variant="ghost" disabled>
                                    Free — No Upgrade Needed
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Stripe notice ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-2 pt-2">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                    Payments processed securely by{" "}
                    <a
                        href="https://stripe.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
                    >
                        Stripe
                    </a>
                    {" "}— your card details are never stored on our servers.
                </p>
            </div>
        </div>
    );
}
