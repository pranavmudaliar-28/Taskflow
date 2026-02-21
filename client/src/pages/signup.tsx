import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Kanban, CheckCircle2, Eye, EyeOff, ArrowRight, Users, Zap, Shield } from "lucide-react";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");

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
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const highlights = [
    { icon: Zap, title: "Fast setup", desc: "Get started in under 2 minutes" },
    { icon: Users, title: "Team collaboration", desc: "Invite your whole team for free" },
    { icon: Shield, title: "Secure by default", desc: "Enterprise-grade security" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* ── Left: form panel ── */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 xl:px-16 py-12 max-w-md w-full mx-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Kanban className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">TaskFlow</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h2>
            <p className="text-slate-500 text-sm">Start managing projects like a pro</p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); registerMutation.mutate(); }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">First name</Label>
                <Input
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 border-slate-200 focus:border-violet-600 focus:ring-violet-600/20 rounded-lg"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Last name</Label>
                <Input
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 border-slate-200 focus:border-violet-600 focus:ring-violet-600/20 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Email address</Label>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-slate-200 focus:border-violet-600 focus:ring-violet-600/20 rounded-lg"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-slate-200 focus:border-violet-600 focus:ring-violet-600/20 rounded-lg pr-10"
                  required
                  minLength={6}
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
              className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg shadow-sm mt-2"
              disabled={registerMutation.isPending}
              data-testid="button-register"
            >
              {registerMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>
              ) : (
                <><span>Create account</span><ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-violet-600 hover:text-violet-700">
              Sign in
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-400">
            By creating an account, you agree to our{" "}
            <button className="underline">Terms</button> and{" "}
            <button className="underline">Privacy Policy</button>
          </p>
        </div>
      </div>

      {/* ── Right: dark brand panel ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col bg-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-full h-full opacity-30"
            style={{ background: "radial-gradient(ellipse 80% 60% at 80% 10%, #6366F1 0%, transparent 60%)" }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 opacity-20"
            style={{ background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)" }} />
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(#94A3B8 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>

        <div className="relative z-10 flex flex-col h-full px-10 py-12">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-violet-600 flex items-center justify-center">
              <Kanban className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">TaskFlow</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              One workspace for<br />
              <span className="text-violet-400">your entire team</span>
            </h1>
            <p className="text-slate-400 text-base mb-10 leading-relaxed">
              Join thousands of teams who use TaskFlow to ship projects faster and stay organized.
            </p>

            <div className="space-y-5">
              {highlights.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{title}</p>
                    <p className="text-slate-400 text-sm mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { val: "10k+", label: "Active teams" },
              { val: "99.9%", label: "Uptime SLA" },
              { val: "4.9★", label: "User rating" },
            ].map(({ val, label }) => (
              <div key={label} className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                <p className="text-xl font-bold text-white">{val}</p>
                <p className="text-slate-400 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
