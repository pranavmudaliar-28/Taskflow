import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Organization } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ArrowRight, Kanban, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

    if (user?.onboardingStep === "completed") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Setup Complete</CardTitle>
                        <CardDescription>Your account is ready.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" onClick={() => window.location.href = "/dashboard"}>
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { data: organizations } = useQuery<Organization[]>({
        queryKey: ["/api/organizations"],
        enabled: !!user
    });


    useEffect(() => {
        if (step === "verify" && sessionId) {
            verifyStripeSession();
        }
    }, [step, sessionId]);

    useEffect(() => {
        if (organizations && organizations.length > 0 && step === "plan") {
            setStep("organization");
        }
    }, [organizations, step]);

    const verifyStripeSession = async () => {
        setIsVerifying(true);
        try {
            const res = await apiRequest("GET", `/api/stripe/session-status?session_id=${sessionId}`);
            const data = await res.json();
            if (data.status === "success") {
                // Refetch (not just invalidate) so App.tsx immediately gets the
                // updated onboardingStep value from the server.
                await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
                setStep("organization");
            } else {
                toast({
                    title: "Payment Pending",
                    description: "We're still waiting for payment confirmation. Please wait a moment.",
                });
                setTimeout(verifyStripeSession, 3000);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to verify payment. Please contact support.",
                variant: "destructive",
            });
            setStep("plan");
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePlanSelect = async (plan: string) => {
        setIsSubmitting(true);
        try {
            const res = await apiRequest("POST", "/api/stripe/create-checkout-session", {
                plan,
                returnTo: "onboarding",  // ← tell backend to redirect back to /onboarding after payment
            });
            const data = await res.json();
            if (data.url) {
                if (plan === "free") {
                    await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                    setStep("organization");
                } else {
                    window.location.href = data.url;
                }
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to start checkout. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkipToDashboard = async () => {
        try {
            await apiRequest("POST", "/api/onboarding/complete");
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            setLocation("/dashboard");
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to complete setup.",
                variant: "destructive",
            });
        }
    };

    const handleNextToInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgName.trim()) return;
        setStep("invite");
    };

    const addInviteField = () => {
        setInvitations([...invitations, ""]);
    };

    const updateInviteField = (index: number, value: string) => {
        const newInvites = [...invitations];
        newInvites[index] = value;
        setInvitations(newInvites);
    };

    const removeInviteField = (index: number) => {
        if (invitations.length === 1) return;
        setInvitations(invitations.filter((_, i) => i !== index));
    };

    const handleCompleteSetup = async () => {
        setIsSubmitting(true);
        try {
            const filteredInvites = invitations.filter(email => email.trim() !== "");
            await apiRequest("POST", "/api/onboarding/setup-organization", {
                name: orgName,
                email: orgEmail,
                address: orgAddress,
                invitations: filteredInvites
            });
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            toast({
                title: "Welcome aboard!",
                description: "Your organization has been set up successfully.",
            });
            setLocation("/dashboard");
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to setup organization. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const plans = [
        {
            id: "free",
            name: "Free",
            price: "$0",
            description: "For individuals and small projects",
            features: ["Up to 3 projects", "Basic task management", "Time tracking", "Email support"],
            cta: "Get Started",
            popular: false
        },
        {
            id: "pro",
            name: "Pro",
            price: "$29",
            description: "For growing teams",
            features: ["Unlimited projects", "Advanced analytics", "Priority support", "Custom fields"],
            cta: "Start Free Trial",
            popular: true
        },
        {
            id: "team",
            name: "Team",
            price: "$99",
            description: "For large organizations",
            features: ["Everything in Pro", "Advanced reporting", "Dedicated support", "SSO & compliance"],
            cta: "Contact Sales",
            popular: false
        }
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="max-w-4xl w-full space-y-8">
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
                            <Kanban className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <span className="text-2xl font-bold italic tracking-tighter">TaskFlow Pro</span>
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight">
                        {step === "plan" && "Choose your plan"}
                        {step === "verify" && "Verifying your payment..."}
                        {step === "organization" && "Organization Details"}
                        {step === "invite" && "Invite your team"}
                    </h1>
                    <p className="text-muted-foreground">
                        {step === "plan" && "Select the plan that best fits your team's needs."}
                        {step === "verify" && "Please don't close this page while we confirm your subscription."}
                        {step === "organization" && "Tell us a bit more about your organization."}
                        {step === "invite" && "Start collaborating by inviting your team members."}
                    </p>
                </div>

                {step === "plan" && (
                    <div className="grid md:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <Card
                                key={plan.id}
                                className={`relative flex flex-col ${plan.popular ? 'ring-2 ring-primary shadow-lg' : ''}`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                                            Most Popular
                                        </span>
                                    </div>
                                )}
                                <CardHeader>
                                    <CardTitle>{plan.name}</CardTitle>
                                    <div className="text-3xl font-bold">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                                    <CardDescription>{plan.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-4">
                                    <ul className="space-y-2">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <Button
                                        className="w-full mt-auto"
                                        variant={plan.popular ? "default" : "outline"}
                                        disabled={isSubmitting}
                                        onClick={() => handlePlanSelect(plan.id)}
                                    >
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {plan.cta}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {step === "verify" && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="font-medium animate-pulse">This will only take a moment...</p>
                    </div>
                )}

                {step === "organization" && (
                    <Card className="max-w-md mx-auto w-full">
                        <CardContent className="pt-6">
                            {organizations && organizations.length > 0 && !showOrgForm ? (
                                <div className="text-center space-y-6">
                                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <CardTitle>You've Joined an Organization!</CardTitle>
                                        <CardDescription>
                                            You are already a member of <strong>{organizations[0].name}</strong>.
                                        </CardDescription>
                                    </div>

                                    <div className="space-y-3">
                                        <Button className="w-full" onClick={handleSkipToDashboard}>
                                            Continue to Dashboard
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>

                                        <div className="relative py-2">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-background px-2 text-muted-foreground">Or</span>
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => setShowOrgForm(true)}
                                        >
                                            Create Another Organization
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleNextToInvite} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="orgName">Organization Name *</Label>
                                        <Input
                                            id="orgName"
                                            placeholder="e.g. Acme Corp"
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="orgEmail">Organization Email (Optional)</Label>
                                        <Input
                                            id="orgEmail"
                                            type="email"
                                            placeholder="contact@acme.com"
                                            value={orgEmail}
                                            onChange={(e) => setOrgEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="orgAddress">Office Address (Optional)</Label>
                                        <Input
                                            id="orgAddress"
                                            placeholder="123 Silicon Valley, CA"
                                            value={orgAddress}
                                            onChange={(e) => setOrgAddress(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <Button className="w-full" disabled={isSubmitting || !orgName.trim()}>
                                            Continue
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                        {showOrgForm && (
                                            <Button
                                                variant="ghost"
                                                className="w-full"
                                                onClick={() => setShowOrgForm(false)}
                                                type="button"
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                )}

                {step === "invite" && (
                    <Card className="max-w-md mx-auto w-full">
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Invite Team Members</Label>
                                    {invitations.map((email, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                type="email"
                                                placeholder="colleague@example.com"
                                                value={email}
                                                onChange={(e) => updateInviteField(index, e.target.value)}
                                            />
                                            {invitations.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeInviteField(index)}
                                                >
                                                    &times;
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-dashed"
                                        onClick={addInviteField}
                                    >
                                        + Add another
                                    </Button>
                                </div>
                                <div className="pt-4 flex flex-col gap-2">
                                    <Button className="w-full" onClick={handleCompleteSetup} disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Finish Setup & Go to Dashboard
                                    </Button>
                                    <Button variant="ghost" className="text-muted-foreground" onClick={handleCompleteSetup} disabled={isSubmitting}>
                                        Invite later
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
