import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Building2, Kanban, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function AcceptInvitation() {
    const [, setLocation] = useLocation();
    const { user, isLoading: authLoading } = useAuth();
    const { toast } = useToast();

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    // Fetch invitation details (org name etc.) — no auth required
    const { data: invite, isLoading: inviteLoading, isError: inviteError } = useQuery<{
        token: string;
        email: string;
        organizationName: string;
        status: string;
        expiresAt: string;
    }>({
        queryKey: [`/api/invitations/${token}`],
        enabled: !!token,
        retry: 1,
    });

    const acceptMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", `/api/invitations/accept/${token}`);
            return res.json();
        },
        onSuccess: async () => {
            toast({ title: "Welcome aboard! 🎉", description: `You've joined ${invite?.organizationName || "the organization"}.` });
            // Wait for user cache to refresh (so onboardingStep="completed" is in cache)
            // BEFORE navigating — otherwise App.tsx still sees the old step and redirects to /onboarding
            await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
            setLocation("/dashboard");
        },
        onError: (err: any) => {
            toast({
                title: "Failed to accept invitation",
                description: err.message || "The invitation may have expired or already been used.",
                variant: "destructive",
            });
        },
    });

    // ── No token in URL ──────────────────────────────────────
    if (!token) {
        return (
            <PageShell>
                <IconBox color="text-destructive" bg="bg-destructive/10">
                    <AlertCircle className="h-7 w-7" />
                </IconBox>
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">Invalid Link</h1>
                <p className="text-sm text-muted-foreground mb-6">This invitation link appears to be invalid or has expired.</p>
                <Button asChild className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold">
                    <Link href="/">Return to Home</Link>
                </Button>
            </PageShell>
        );
    }

    // ── Loading auth or invite details ───────────────────────
    if (authLoading || inviteLoading) {
        return (
            <PageShell>
                <Loader2 className="h-10 w-10 animate-spin text-violet-500 mb-4" />
                <p className="text-sm text-muted-foreground font-medium">Loading invitation details…</p>
            </PageShell>
        );
    }

    // ── Invite not found or expired ──────────────────────────
    if (inviteError || !invite || invite.status === "expired") {
        return (
            <PageShell>
                <IconBox color="text-destructive" bg="bg-destructive/10">
                    <AlertCircle className="h-7 w-7" />
                </IconBox>
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">Invitation Expired</h1>
                <p className="text-sm text-muted-foreground mb-6">This invitation link has expired or is no longer valid. Please ask your admin to resend it.</p>
                <Button asChild className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold">
                    <Link href="/">Return to Home</Link>
                </Button>
            </PageShell>
        );
    }

    // ── Invite already accepted ──────────────────────────────
    if (invite.status === "accepted") {
        return (
            <PageShell>
                <IconBox color="text-emerald-600" bg="bg-emerald-500/10">
                    <CheckCircle2 className="h-7 w-7" />
                </IconBox>
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">Already Joined!</h1>
                <p className="text-sm text-muted-foreground mb-6">You have already accepted this invitation and joined <strong>{invite.organizationName}</strong>.</p>
                <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold" onClick={() => setLocation("/dashboard")}>
                    Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </PageShell>
        );
    }

    // ── User not logged in — prompt to login / signup ────────
    if (!user) {
        return (
            <PageShell>
                <IconBox color="text-violet-600" bg="bg-violet-500/10">
                    <Users className="h-7 w-7" />
                </IconBox>
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">You're Invited!</h1>
                <p className="text-sm text-muted-foreground mb-1">You've been invited to join</p>
                <p className="text-lg font-bold text-foreground mb-6">{invite.organizationName}</p>
                <p className="text-sm text-muted-foreground mb-6">Sign in or create an account to accept your invitation.</p>
                <div className="space-y-3 w-full">
                    <Button asChild className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold">
                        <Link href={`/login?redirect=${encodeURIComponent(`/accept-invitation?token=${token}`)}`}>
                            Login to Accept <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full font-semibold">
                        <Link href={`/signup?redirect=${encodeURIComponent(`/accept-invitation?token=${token}`)}`}>
                            Create New Account
                        </Link>
                    </Button>
                </div>
            </PageShell>
        );
    }

    // ── Accepted successfully ────────────────────────────────
    if (acceptMutation.isSuccess) {
        return (
            <PageShell>
                <IconBox color="text-emerald-600" bg="bg-emerald-500/10">
                    <CheckCircle2 className="h-7 w-7" />
                </IconBox>
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">Welcome Aboard!</h1>
                <p className="text-sm text-muted-foreground mb-1">You've successfully joined</p>
                <p className="text-lg font-bold text-foreground mb-6">{invite.organizationName}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting to Dashboard…
                </div>
            </PageShell>
        );
    }

    // ── Main: logged in, pending invite — show accept button ─
    return (
        <PageShell>
            <IconBox color="text-violet-600" bg="bg-violet-500/10">
                <Building2 className="h-7 w-7" />
            </IconBox>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">Join Organization</h1>
            <p className="text-sm text-muted-foreground mb-2">You've been invited to join</p>
            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl px-6 py-3 mb-6 w-full text-center">
                <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{invite.organizationName}</p>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
                Click below to accept the invitation and start collaborating with your team.
            </p>
            <Button
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold h-11"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
            >
                {acceptMutation.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Accepting…</>
                    : <>Accept Invitation <ArrowRight className="ml-2 h-4 w-4" /></>
                }
            </Button>
            {acceptMutation.isError && (
                <p className="text-xs text-destructive mt-3 text-center">
                    {(acceptMutation.error as any)?.message || "Something went wrong. Please try again."}
                </p>
            )}
        </PageShell>
    );
}

/* ── Shared layout shell ─────────────────────────────────── */
function PageShell({ children }: { children: React.ReactNode }) {
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
                            Join your team on<br />
                            <span className="text-violet-400">TaskFlow</span>
                        </h1>
                        <p className="text-slate-400 text-base mb-10 leading-relaxed">
                            Collaborate effortlessly, manage projects efficiently, and keep everyone aligned in one workspace.
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

                    <div className="flex flex-col items-center text-center">
                        {children}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

/* ── Icon box helper ─────────────────────────────────────── */
function IconBox({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
    return (
        <div className={`h-14 w-14 ${bg} rounded-2xl flex items-center justify-center mb-5`}>
            <span className={color}>{children}</span>
        </div>
    );
}
