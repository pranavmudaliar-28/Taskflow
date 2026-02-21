import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { Kanban, Mail, Lock, User, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get("redirect");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/register", { email, password, firstName, lastName });
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      setLocation(redirect || "/onboarding");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    registerMutation.mutate();
  };

  const inputCls = "h-9 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-950 transition-colors";

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      {/* Top bar */}
      <nav className="flex items-center justify-between px-6 h-14 border-b border-slate-100 dark:border-slate-900">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="h-7 w-7 rounded-lg bg-gradient-violet flex items-center justify-center">
              <Kanban className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">TaskFlow Pro</span>
          </div>
        </Link>
        <ThemeToggle />
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in-up">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight mb-1.5">Create your account</h1>
            <p className="text-sm text-muted-foreground">Start for free — no credit card required</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium">First name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`pl-8 ${inputCls}`}
                    required
                    data-testid="input-signup-firstname"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputCls}
                  required
                  data-testid="input-signup-lastname"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-8 ${inputCls}`}
                  required
                  data-testid="input-signup-email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-8 pr-9 ${inputCls}`}
                  required
                  minLength={6}
                  data-testid="input-signup-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-8 pr-9 ${inputCls}`}
                  required
                  minLength={6}
                  data-testid="input-signup-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-9 text-sm font-medium bg-gradient-violet text-white hover:opacity-90 transition-opacity mt-1"
              disabled={registerMutation.isPending}
              data-testid="button-signup-submit"
            >
              {registerMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating account…
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Create Account
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </Button>
          </form>

          {/* Trust bullets */}
          <div className="mt-5 flex flex-col gap-1.5">
            {["Free forever plan", "No credit card required", "Cancel anytime"].map((t) => (
              <div key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {t}
              </div>
            ))}
          </div>

          {/* Sign in link */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={redirect ? `/login?redirect=${redirect}` : "/login"}
              className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
              data-testid="link-login"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">© 2026 TaskFlow Pro · <a href="/" className="hover:text-foreground transition-colors">Home</a></p>
      </div>
    </div>
  );
}
