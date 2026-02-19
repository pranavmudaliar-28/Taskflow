import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function MockBillingPortal() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

    const handlePlanChange = async (planId: string) => {
        setIsSubmitting(planId);
        try {
            await apiRequest("POST", "/api/stripe/mock-swap-plan", { plan: planId });
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            toast({
                title: "Plan Updated",
                description: `You are now on the ${planId} plan (Mock).`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update plan.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(null);
        }
    };

    const plans = [
        {
            id: "free",
            name: "Free",
            price: "$0",
            description: "For individuals and small projects",
            features: ["Up to 3 projects", "Basic task management", "Time tracking", "Email support"],
        },
        {
            id: "pro",
            name: "Pro",
            price: "$29",
            description: "For growing teams",
            features: ["Unlimited projects", "Advanced analytics", "Priority support", "Custom fields"],
        },
        {
            id: "team",
            name: "Team",
            price: "$99",
            description: "For large organizations",
            features: ["Everything in Pro", "Advanced reporting", "Dedicated support", "SSO & compliance"],
        }
    ];

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/settings">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Settings
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Billing Portal (Mock Mode)</h1>
                </div>

                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Developer Mode</AlertTitle>
                    <AlertDescription>
                        This is a mock billing portal for testing purposes. No real payments are processed.
                    </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                        const isCurrent = user?.plan === plan.id || (!user?.plan && plan.id === "free");
                        return (
                            <Card
                                key={plan.id}
                                className={`relative flex flex-col ${isCurrent ? 'border-primary ring-1 ring-primary' : ''}`}
                            >
                                {isCurrent && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <Badge variant="default">Current Plan</Badge>
                                    </div>
                                )}
                                <CardHeader>
                                    <CardTitle>{plan.name}</CardTitle>
                                    <div className="text-3xl font-bold">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                                    <CardDescription>{plan.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-4 flex flex-col">
                                    <ul className="space-y-2 flex-1">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <Button
                                        className="w-full mt-auto"
                                        variant={isCurrent ? "outline" : "default"}
                                        disabled={isCurrent || isSubmitting !== null}
                                        onClick={() => handlePlanChange(plan.id)}
                                    >
                                        {isSubmitting === plan.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {isCurrent ? "Current Plan" : `Switch to ${plan.name}`}
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
