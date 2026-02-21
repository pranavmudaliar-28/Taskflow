import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    CheckCircle2, Clock, Users, BarChart3, Zap, Shield,
    ArrowRight, Kanban, Star, Play, ChevronRight,
    Globe, Lock, Layers, Sparkles, TrendingUp,
} from "lucide-react";

/* ── Hero Mockup ─────────────────── */
function HeroMockup() {
    const tasks = [
        { title: "Design system update", dot: "bg-emerald-400", badge: "high", bc: "text-orange-600 bg-orange-50" },
        { title: "User research synthesis", dot: "bg-violet-400", badge: "medium", bc: "text-blue-600 bg-blue-50" },
        { title: "API integration sprint", dot: "bg-blue-400", badge: "urgent", bc: "text-red-600 bg-red-50" },
        { title: "Launch campaign docs", dot: "bg-slate-300", badge: "low", bc: "text-slate-500 bg-slate-100" },
    ];

    return (
        <div className="relative w-full max-w-md mx-auto select-none">
            {/* Board card */}
            <div className="relative z-10 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-xl p-5 animate-float">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-md bg-gradient-violet flex items-center justify-center">
                            <Kanban className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Active Sprint</span>
                    </div>
                    <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-red-400" />
                        <div className="h-2 w-2 rounded-full bg-yellow-400" />
                        <div className="h-2 w-2 rounded-full bg-green-400" />
                    </div>
                </div>

                <div className="space-y-1.5">
                    {tasks.map((t, i) => (
                        <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${t.dot}`} />
                            <span className="text-xs flex-1 text-slate-700 dark:text-slate-300 truncate">{t.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${t.bc}`}>{t.badge}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                        {[{ l: "A", c: "bg-violet-500" }, { l: "B", c: "bg-blue-500" }, { l: "C", c: "bg-emerald-500" }].map(({ l, c }, i) => (
                            <div key={i} className={`h-5 w-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-bold text-white ${c}`}>{l}</div>
                        ))}
                    </div>
                    <span className="text-[10px] text-slate-400">4 tasks · 2 active</span>
                </div>
            </div>

            {/* Stat float — top right */}
            <div className="absolute -top-3 -right-3 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-md animate-float-slow delay-200">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-400 leading-none mb-0.5">Productivity</p>
                        <p className="text-xs font-bold text-emerald-600 leading-none">+38%</p>
                    </div>
                </div>
            </div>

            {/* Timer float — bottom left */}
            <div className="absolute -bottom-3 -left-3 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-md animate-float delay-300">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                        <Clock className="h-3 w-3 text-violet-600" />
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-400 leading-none mb-0.5">Time logged</p>
                        <p className="text-xs font-bold text-violet-600 leading-none">12h 40m</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Mini feature mockups ─── */
function TaskMockup() {
    return (
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5 mt-3">
            {["Design mockups", "Review PR #42", "Write docs"].map((t, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${i < 2 ? "bg-violet-400" : "bg-slate-300"}`} />
                    <span className="text-[11px] flex-1 text-slate-600 dark:text-slate-400">{t}</span>
                    {i < 2 && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                </div>
            ))}
        </div>
    );
}

function ChartMockup() {
    return (
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 mt-3">
            <div className="flex items-end gap-1 h-14">
                {[35, 60, 45, 78, 55, 90, 68].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: `hsl(${262 + i * 4} 60% ${55 + i * 2}%)` }} />
                ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-none">7-day completion rate</p>
        </div>
    );
}

function TeamMockup() {
    return (
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 mt-3 space-y-2">
            {[
                { name: "Sarah K.", role: "Designer", c: "bg-pink-400" },
                { name: "James L.", role: "Dev", c: "bg-blue-400" },
                { name: "Priya M.", role: "PM", c: "bg-violet-400" },
            ].map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className={`h-5 w-5 rounded-full ${m.c} flex items-center justify-center text-[8px] font-bold text-white shrink-0`}>{m.name[0]}</div>
                    <div className="flex-1">
                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 leading-none">{m.name}</p>
                        <p className="text-[9px] text-slate-400 leading-none mt-0.5">{m.role}</p>
                    </div>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </div>
            ))}
        </div>
    );
}

const features = [
    { icon: Kanban, title: "Kanban Boards", desc: "Drag-and-drop boards with real-time sync. See your entire workflow at a glance.", mockup: <TaskMockup />, grad: "from-violet-50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/10", ic: "bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400" },
    { icon: BarChart3, title: "Analytics", desc: "Track completion rates, team velocity, and project health in one view.", mockup: <ChartMockup />, grad: "from-blue-50 to-sky-50/50 dark:from-blue-950/20 dark:to-sky-950/10", ic: "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400" },
    { icon: Users, title: "Team Collaboration", desc: "Assign tasks, add reviewers, and manage permissions across your organization.", mockup: <TeamMockup />, grad: "from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10", ic: "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" },
    { icon: Clock, title: "Time Tracking", desc: "One-click time logs on every task. Export timesheets in seconds.", grad: "from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10", ic: "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400" },
    { icon: Shield, title: "Role-Based Access", desc: "Fine-grained permissions for admins, leads, and members.", grad: "from-rose-50 to-red-50/50 dark:from-rose-950/20 dark:to-red-950/10", ic: "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400" },
    { icon: Zap, title: "Real-Time Updates", desc: "Live sync keeps everyone aligned without refreshing the page.", grad: "from-indigo-50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/10", ic: "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400" },
];

const testimonials = [
    { name: "Ananya Sharma", role: "Lead Designer @ Aerolabs", initials: "AS", col: "bg-violet-500", quote: "TaskFlow completely changed how our team ships work. The Kanban view is stunning and time tracking is actually useful." },
    { name: "Marcus Boateng", role: "CTO @ Nexvio", initials: "MB", col: "bg-blue-500", quote: "We replaced 3 tools with TaskFlow. Role-based access and real-time updates are exactly what a distributed team needs." },
    { name: "Chen Wei", role: "Product Manager @ Strata", initials: "CW", col: "bg-emerald-500", quote: "The analytics dashboard gives us insights we were missing. Completion rates have gone up 40% since we started." },
];

const plans = [
    { name: "Free", price: "$0", per: "forever", desc: "For individuals and small projects", features: ["Up to 3 projects", "Basic task management", "Time tracking", "Email support"], cta: "Get Started", popular: false, slug: "free" },
    { name: "Pro", price: "$29", per: "/mo", desc: "For growing teams", features: ["Unlimited projects", "Advanced analytics", "Priority support", "Custom fields", "Role-based access"], cta: "Start Free Trial", popular: true, slug: "pro" },
    { name: "Team", price: "$99", per: "/mo", desc: "For large organizations", features: ["Everything in Pro", "Advanced reporting", "Dedicated support", "SSO & compliance", "Audit logs"], cta: "Contact Sales", popular: false, slug: "team" },
];

export default function Landing() {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 overflow-x-hidden">

            {/* ── NAV ───────────────────────────────────────── */}
            <nav className="fixed top-0 inset-x-0 z-50 h-14 glass-nav flex items-center">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">
                    <Link href="/">
                        <div className="flex items-center gap-2 cursor-pointer">
                            <div className="h-7 w-7 rounded-lg bg-gradient-violet flex items-center justify-center">
                                <Kanban className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="font-bold text-sm tracking-tight">TaskFlow Pro</span>
                        </div>
                    </Link>

                    <div className="hidden md:flex items-center gap-7 text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {["Features", "Pricing", "Testimonials"].map(l => (
                            <a key={l} href={`#${l.toLowerCase()}`} className="hover:text-slate-900 dark:hover:text-white transition-colors" data-testid={`link-${l.toLowerCase()}`}>{l}</a>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href="/login">
                            <Button variant="ghost" size="sm" className="text-sm h-8" data-testid="button-signin">Sign in</Button>
                        </Link>
                        <Link href="/signup">
                            <Button size="sm" className="h-8 text-sm bg-gradient-violet text-white hover:opacity-90 transition-opacity" data-testid="button-login">
                                Get started <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── HERO ──────────────────────────────────────── */}
            <section className="relative pt-28 pb-24 px-4 sm:px-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-hero" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-80 violet-glow opacity-20 rounded-full -mt-24 pointer-events-none" />

                <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
                    {/* Text */}
                    <div className="space-y-6 animate-fade-in-up">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-800">
                            <Sparkles className="h-3 w-3" />
                            Smart Task Management
                        </span>

                        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.06] text-slate-900 dark:text-white">
                            Manage Work with
                            <br />
                            <span className="gradient-text">Clarity & Focus</span>
                        </h1>

                        <p className="text-base text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                            Real-time task tracking, time management, and team collaboration — all in one clean, focused workspace.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-2.5">
                            <Link href="/signup">
                                <Button size="lg" className="h-10 px-6 text-sm font-semibold bg-gradient-violet text-white hover:opacity-90 transition-opacity" data-testid="button-get-started">
                                    Start for free <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="h-10 px-5 text-sm border-slate-200 dark:border-slate-700 gap-2" data-testid="button-learn-more">
                                <Play className="h-3.5 w-3.5 fill-current" /> Watch demo
                            </Button>
                        </div>

                        {/* Social proof */}
                        <div className="flex flex-wrap items-center gap-5 pt-1">
                            <div className="flex items-center gap-2.5">
                                <div className="flex -space-x-1.5">
                                    {[
                                        { l: "S", c: "bg-violet-500" }, { l: "M", c: "bg-blue-500" },
                                        { l: "J", c: "bg-emerald-500" }, { l: "P", c: "bg-pink-500" },
                                    ].map(({ l, c }, i) => (
                                        <Avatar key={i} className="h-6 w-6 border-2 border-white dark:border-slate-950">
                                            <AvatarFallback className={`text-[9px] font-bold text-white ${c}`}>{l}</AvatarFallback>
                                        </Avatar>
                                    ))}
                                </div>
                                <div>
                                    <div className="flex gap-0.5">
                                        {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                                    </div>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">10,000+ happy teams</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                No credit card required
                            </div>
                        </div>
                    </div>

                    {/* Mockup */}
                    <div className="animate-fade-in-up delay-200">
                        <HeroMockup />
                    </div>
                </div>
            </section>

            {/* ── LOGOS ─────────────────────────────────────── */}
            <div className="border-y border-slate-100 dark:border-slate-800/60 py-8 px-4 bg-slate-50/60 dark:bg-slate-900/30">
                <div className="max-w-6xl mx-auto">
                    <p className="text-center text-[11px] uppercase tracking-widest font-semibold text-slate-400 mb-6">Trusted by teams at</p>
                    <div className="flex flex-wrap justify-center gap-8">
                        {["Aerolabs", "Nexvio", "Strata", "Orbotech", "Helix", "Quantum"].map(c => (
                            <span key={c} className="text-sm font-bold text-slate-300 dark:text-slate-700">{c}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── FEATURES ──────────────────────────────────── */}
            <section id="features" className="py-20 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Features</p>
                        <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
                            All You Need to <span className="gradient-text">Ship Faster</span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm">One platform for tasks, time, and team — designed for focus.</p>
                    </div>

                    {/* Top 3 — with mockups */}
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                        {features.slice(0, 3).map((f, i) => (
                            <div key={i} className={`rounded-2xl p-5 bg-gradient-to-br ${f.grad} border border-slate-100 dark:border-slate-800/60 card-hover-lift`}>
                                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${f.ic} mb-3`}>
                                    <f.icon className="h-4.5 w-4.5 h-4 w-4" />
                                </div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{f.title}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                                {f.mockup}
                            </div>
                        ))}
                    </div>

                    {/* Bottom 3 — compact */}
                    <div className="grid md:grid-cols-3 gap-4">
                        {features.slice(3).map((f, i) => (
                            <div key={i} className={`rounded-2xl p-5 bg-gradient-to-br ${f.grad} border border-slate-100 dark:border-slate-800/60 card-hover-lift flex gap-3.5`}>
                                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${f.ic}`}>
                                    <f.icon className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{f.title}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ──────────────────────────────── */}
            <section id="testimonials" className="py-20 px-4 sm:px-6 bg-slate-50/60 dark:bg-slate-900/30">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Testimonials</p>
                        <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Loved by <span className="gradient-text">Real Teams</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                        {testimonials.map((t, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 card-hover-lift">
                                <div className="flex gap-0.5 mb-3.5">
                                    {[...Array(5)].map((_, s) => <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">"{t.quote}"</p>
                                <div className="flex items-center gap-2.5">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className={`text-xs font-bold text-white ${t.col}`}>{t.initials}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t.name}</p>
                                        <p className="text-xs text-slate-400">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRICING ───────────────────────────────────── */}
            <section id="pricing" className="py-20 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Pricing</p>
                        <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Start free, upgrade when ready. No hidden fees.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                        {plans.map((p, i) => (
                            <div key={i} className={`relative rounded-2xl p-6 border card-hover-lift ${p.popular
                                ? "border-violet-300 dark:border-violet-600 shadow-lg bg-gradient-to-b from-violet-50 to-white dark:from-violet-950/20 dark:to-slate-900 card-shadow-violet"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                                }`}>
                                {p.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-gradient-violet text-white text-xs font-semibold px-3 py-1 rounded-full">Most Popular</span>
                                    </div>
                                )}
                                <div className="mb-5">
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">{p.name}</h3>
                                    <div className="flex items-baseline gap-0.5 mb-1.5">
                                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{p.price}</span>
                                        <span className="text-slate-400 text-sm">{p.per}</span>
                                    </div>
                                    <p className="text-xs text-slate-400">{p.desc}</p>
                                </div>
                                <ul className="space-y-2 mb-5">
                                    {p.features.map((f, fi) => (
                                        <li key={fi} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/signup">
                                    <Button
                                        className={`w-full text-sm font-medium ${p.popular ? "bg-gradient-violet text-white hover:opacity-90" : ""}`}
                                        variant={p.popular ? "default" : "outline"}
                                        data-testid={`button-plan-${p.slug}`}
                                    >
                                        {p.cta} <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                    </Button>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA BANNER ────────────────────────────────── */}
            <section className="px-4 sm:px-6 mb-16">
                <div className="max-w-6xl mx-auto rounded-2xl px-8 py-14 text-center text-white"
                    style={{ background: "linear-gradient(135deg, hsl(262 65% 50%), hsl(280 65% 54%))" }}>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">Ready to Transform Your Workflow?</h2>
                    <p className="text-violet-200 mb-7 max-w-lg mx-auto text-sm">Join 10,000+ teams already shipping faster with TaskFlow Pro.</p>
                    <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                        <Link href="/signup">
                            <Button size="lg" className="h-10 px-6 text-sm font-semibold bg-white text-violet-700 hover:bg-violet-50" data-testid="button-cta-signup">
                                Start for free <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Button size="lg" variant="outline" className="h-10 px-5 text-sm border-white/30 text-white hover:bg-white/10 gap-2">
                            <Play className="h-3.5 w-3.5 fill-current" /> Watch demo
                        </Button>
                    </div>
                    <p className="text-violet-300 text-xs mt-4">No credit card required · Set up in 2 minutes</p>
                </div>
            </section>

            {/* ── FOOTER ────────────────────────────────────── */}
            <footer className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 py-12 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
                        <div className="lg:col-span-2">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="h-7 w-7 rounded-lg bg-gradient-violet flex items-center justify-center">
                                    <Kanban className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="font-bold text-sm">TaskFlow Pro</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">The focused task management platform for modern teams.</p>
                            <div className="flex gap-2 mt-4">
                                {[Globe, Lock, Layers].map((Icon, i) => (
                                    <div key={i} className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-violet-400 transition-colors cursor-pointer">
                                        <Icon className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        {[
                            { h: "Product", l: ["Features", "Pricing", "Roadmap", "Changelog"] },
                            { h: "Company", l: ["About", "Blog", "Careers", "Contact"] },
                            { h: "Legal", l: ["Privacy", "Terms", "Cookies", "Security"] },
                        ].map(c => (
                            <div key={c.h}>
                                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 text-slate-600 dark:text-slate-300">{c.h}</h4>
                                <ul className="space-y-2">
                                    {c.l.map(l => (
                                        <li key={l}><a href="#" className="text-xs text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">{l}</a></li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <p className="text-xs text-slate-400">© 2026 TaskFlow Pro. All rights reserved.</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            All systems operational
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
