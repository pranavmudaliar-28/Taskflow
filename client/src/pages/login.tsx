import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { Kanban, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      setLocation(redirect || "/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      {/* Minimal top bar */}
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

      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in-up">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight mb-1.5">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="pl-8 h-9 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-950 transition-colors"
                  required
                  data-testid="input-login-email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <a href="#" className="text-xs text-violet-600 dark:text-violet-400 hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-8 pr-9 h-9 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-950 transition-colors"
                  required
                  data-testid="input-login-password"
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

            <Button
              type="submit"
              className="w-full h-9 text-sm font-medium bg-gradient-violet text-white hover:opacity-90 transition-opacity"
              disabled={loginMutation.isPending}
              data-testid="button-login-submit"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Sign In
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="text-violet-600 dark:text-violet-400 font-medium hover:underline" data-testid="link-signup">
              Create account
            </Link>
          </p>
        </div>
      </div>

      {/* Minimal footer */}
      <div className="px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">© 2026 TaskFlow Pro · <a href="/" className="hover:text-foreground transition-colors">Home</a></p>
      </div>
    </div>
  );
}
