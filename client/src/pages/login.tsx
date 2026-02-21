import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Kanban, CheckCircle2, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");

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
        title: "Sign in failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const features = [
    "Manage tasks with Kanban boards",
    "Track time and productivity",
    "Collaborate with your team",
    "Real-time notifications",
  ];

  return (
    <div className="min-h-screen flex">
      {/* ── Left: dark brand panel ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col bg-[#0F172A] relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full opacity-30"
            style={{ background: "radial-gradient(ellipse 80% 60% at 20% 10%, #3B82F6 0%, transparent 60%)" }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 opacity-20"
            style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)" }} />
          {/* Grid dots */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(#94A3B8 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>

        <div className="relative z-10 flex flex-col h-full px-10 py-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-violet-600 flex items-center justify-center">
              <Kanban className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">TaskFlow</span>
          </div>

          {/* Middle content */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              Manage your work<br />
              <span className="text-violet-400">smarter, not harder</span>
            </h1>
            <p className="text-slate-400 text-base mb-10 leading-relaxed">
              TaskFlow brings your team's projects, tasks, and timelines together in one powerful workspace.
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

          {/* Floating mock dashboard */}
          <div className="mt-8">
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-2.5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-slate-500 text-xs ml-2">taskflow.app/dashboard</span>
              </div>
              {["Design new landing page", "Fix API auth bug", "Write unit tests"].map((t, i) => (
                <div key={t} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                  <div className={`h-2 w-2 rounded-full ${["bg-violet-400", "bg-amber-400", "bg-emerald-400"][i]}`} />
                  <span className="text-slate-300 text-xs">{t}</span>
                  <div className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${["bg-violet-500/20 text-violet-400", "bg-amber-500/20 text-amber-400", "bg-emerald-500/20 text-emerald-400"][i]}`}>
                    {["In Progress", "Review", "Done"][i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 xl:px-16 py-12 max-w-md w-full mx-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Kanban className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">TaskFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to your account to continue</p>
          </div>

          <form
            className="space-y-5"
            onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-slate-200 focus:border-violet-600 focus:ring-violet-600/20 rounded-lg"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                <button type="button" className="text-xs text-violet-600 hover:text-violet-700 font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-slate-200 focus:border-violet-600 focus:ring-violet-600/20 rounded-lg pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg shadow-sm"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
              ) : (
                <><span>Sign in</span><ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link href="/signup" className="font-semibold text-violet-600 hover:text-violet-700">
              Create account
            </Link>
          </p>
        </div>

        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-slate-400">
            By signing in, you agree to our{" "}
            <button className="underline hover:text-slate-600">Terms</button> and{" "}
            <button className="underline hover:text-slate-600">Privacy Policy</button>
          </p>
        </div>
      </div>
    </div>
  );
}
