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
            setTimeout(() => setLocation("/onboarding"), 2500);
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-700 to-fuchsia-600 p-6">
                <Card className="max-w-md w-full border-none shadow-2xl rounded-3xl overflow-hidden animate-fade-in">
                    <CardHeader className="text-center pt-10">
                        <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-foreground">Invalid Link</CardTitle>
                        <CardDescription className="text-muted-foreground mt-2 px-6">
                            The invitation link appears to be invalid or has expired. Please contact your administrator.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="pb-10 pt-4 px-10">
                        <Button asChild className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]">
                            <Link href="/">Return to Home</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Checking Authentication...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-700 to-fuchsia-600 p-6">
                <Card className="max-w-md w-full border-none shadow-2xl rounded-3xl overflow-hidden animate-fade-in">
                    <CardHeader className="text-center pt-10">
                        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-primary/5">
                            <CheckCircle2 className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle className="text-3xl font-extrabold text-foreground tracking-tight">You're Invited!</CardTitle>
                        <CardDescription className="text-muted-foreground mt-3 text-lg px-4 leading-relaxed">
                            You've been invited to collaborate on <strong>Taskflow Pro</strong>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center py-6 px-10">
                        <p className="text-muted-foreground font-medium">Please sign in or create an account to accept your invitation.</p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 pb-12 pt-2 px-10">
                        <Button asChild className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-2xl shadow-xl transition-all active:scale-[0.98] group">
                            <Link href={`/login?redirect=/accept-invitation?token=${token}`}>
                                Login to Accept
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                        <Button asChild variant="ghost" className="w-full h-12 text-muted-foreground hover:text-foreground font-bold rounded-2xl">
                            <Link href={`/signup?redirect=/accept-invitation?token=${token}`}>
                                Create new account
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-700 to-fuchsia-600 p-6">
            <Card className="max-w-md w-full border-none shadow-2xl rounded-3xl overflow-hidden animate-scale-in">
                <CardHeader className="text-center pt-10">
                    <div className="mb-8">
                        {success ? (
                            <div className="h-24 w-24 bg-success/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-success/5 animate-bounce">
                                <CheckCircle2 className="h-12 w-12 text-success" />
                            </div>
                        ) : error ? (
                            <div className="h-24 w-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-destructive/5">
                                <AlertCircle className="h-12 w-12 text-destructive" />
                            </div>
                        ) : (
                            <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-primary/5">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                    <CardTitle className="text-3xl font-extrabold text-foreground tracking-tight">
                        {success ? "Welcome Aboard!" : error ? "Invitation Error" : "Processing..."}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground mt-4 text-lg px-6 leading-relaxed">
                        {success
                            ? "You've successfully joined. We're redirecting you to your workspace now..."
                            : error
                                ? error
                                : "Give us a moment while we validate your invitation link."}
                    </CardDescription>
                </CardHeader>
                <CardFooter className="pb-12 pt-8 px-10">
                    {error && (
                        <Button asChild variant="outline" className="w-full h-12 border-border text-foreground/80 font-bold rounded-xl active:scale-[0.98]">
                            <Link href="/onboarding">Return to Workspace</Link>
                        </Button>
                    )}
                    {success && (
                        <div className="w-full flex justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary/30" />
                        </div>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}

