import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

export default function AcceptInvitation() {
    const [location, setLocation] = useLocation();
    const { user, isLoading: authLoading } = useAuth();
    const { toast } = useToast();

    // Parse token from URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    const [isAccepting, setIsAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const acceptMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", `/api/invitations/accept/${token}`);
            return res.json();
        },
        onSuccess: () => {
            setSuccess(true);
            toast({ title: "Welcome!", description: "You have successfully joined the organization." });
            // Redirect to dashboard after a short delay
            setTimeout(() => setLocation("/onboarding"), 3000);
        },
        onError: (err: any) => {
            setError(err.message || "Failed to accept invitation. It may have expired or already been used.");
        },
    });

    useEffect(() => {
        if (user && token && !isAccepting && !success && !error) {
            setIsAccepting(true);
            acceptMutation.mutate();
        }
    }, [user, token]);

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Invalid Link
                        </CardTitle>
                        <CardDescription>
                            The invitation link appears to be invalid or incomplete.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/">Return to Home</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <Card className="max-w-md w-full shadow-lg border-primary/20">
                    <CardHeader className="text-center pb-2">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">You're Invited!</CardTitle>
                        <CardDescription className="text-base">
                            You've been invited to join an organization on TaskFlow Pro.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4 pt-4">
                        <p className="text-muted-foreground">
                            Please sign in or create an account to accept your invitation and start collaborating.
                        </p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 pt-6">
                        <Button asChild className="w-full group">
                            <Link href={`/login?redirect=/accept-invitation?token=${token}`}>
                                Login to Accept
                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                            <Link href={`/signup?redirect=/accept-invitation?token=${token}`}>
                                Create New Account
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="max-w-md w-full shadow-lg">
                <CardHeader className="text-center">
                    {success ? (
                        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                    ) : error ? (
                        <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                    ) : (
                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    <CardTitle className="text-2xl">
                        {success ? "Success!" : error ? "Invitation Error" : "Processing..."}
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        {success
                            ? "You are now a member of the organization. Redirecting to dashboard..."
                            : error
                                ? error
                                : "Validating and accepting your invitation."}
                    </CardDescription>
                </CardHeader>
                <CardFooter className="pt-6">
                    {error && (
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/onboarding">Go to Onboarding</Link>
                        </Button>
                    )}
                    {success && (
                        <Button asChild className="w-full">
                            <Link href="/onboarding">Click here if not redirected</Link>
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
