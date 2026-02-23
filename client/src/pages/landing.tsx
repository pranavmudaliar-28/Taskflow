import { Link } from "wouter";
import { useEffect, useState, useRef, useCallback } from "react";
import {
    ArrowRight, CheckCircle2, Zap, Users, BarChart3, Bell, Star,
    Play, Twitter, Github, Linkedin, ChevronDown, ListTodo,
    Calendar, Target, TrendingUp, Layout, Briefcase, User,
    Building2, Sparkles, Shield, Workflow, ChevronRight,
} from "lucide-react";

/* ── scroll reveal ─────────────────────────────────── */
function useScrollReveal() {
    useEffect(() => {
        const obs = new IntersectionObserver(
            (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("lp3-visible"); obs.unobserve(e.target); } }),
            { threshold: 0.09 }
        );
        document.querySelectorAll(".lp3-reveal").forEach((el) => obs.observe(el));
        return () => obs.disconnect();
    }, []);
}

/* ── canvas particles ─────────────────────────────── */
function useParticles(ref: React.RefObject<HTMLCanvasElement>) {
    useEffect(() => {
        const canvas = ref.current; if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        let raf: number;
        const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
        resize();
        window.addEventListener("resize", resize);
        const N = 55;
        type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
        const pts: P[] = Array.from({ length: N }, () => ({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
            r: Math.random() * 1.6 + 0.5, a: Math.random(),
        }));
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pts.forEach((p) => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(129,140,248,${p.a * 0.55})`; ctx.fill();
            });
            for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
                const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < 110) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = `rgba(99,102,241,${(1 - d / 110) * 0.18})`; ctx.lineWidth = 0.6; ctx.stroke(); }
            }
            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
    }, [ref]);
}

/* ── animated counter ─────────────────────────────── */
function useCountUp(target: number, duration = 1400) {
    const [val, setVal] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const el = ref.current; if (!el) return;
        const obs = new IntersectionObserver(([e]) => {
            if (!e.isIntersecting) return;
            obs.disconnect();
            const start = performance.now();
            const tick = (now: number) => {
                const p = Math.min(1, (now - start) / duration);
                const ease = 1 - Math.pow(1 - p, 4);
                setVal(Math.round(ease * target));
                if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }, { threshold: 0.5 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [target, duration]);
    return { ref, val };
}

/* ── tilt ─────────────────────────────────────────── */
function useTilt(str = 8) {
    const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        e.currentTarget.style.transform = `perspective(900px) rotateX(${-y * str}deg) rotateY(${x * str}deg) scale(1.02)`;
    }, [str]);
    const onMouseLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
        e.currentTarget.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)";
    }, []);
    return { onMouseMove, onMouseLeave };
}

/* ── floating hero badges ─────────────────────────── */
function HeroBadges() {
    return (
        <>
            <div className="lp5-badge" style={{ top: "18%", left: "-8%", animation: "lp5-b1 4.5s ease-in-out infinite" }}>
                <span style={{ height: 8, width: 8, borderRadius: 99, background: "#22C55E", flexShrink: 0, boxShadow: "0 0 8px rgba(34,197,94,0.7)" }} />
                <span>12 tasks shipped today</span>
            </div>
            <div className="lp5-badge" style={{ top: "44%", right: "-6%", animation: "lp5-b2 5.2s ease-in-out infinite 0.8s" }}>
                <span style={{ fontSize: 13 }}>📈</span>
                <span>Team velocity <strong style={{ color: "#86EFAC" }}>+28%</strong></span>
            </div>
            <div className="lp5-badge" style={{ bottom: "22%", left: "-5%", animation: "lp5-b3 4s ease-in-out infinite 1.4s" }}>
                <span className="lp5-live-dot" />
                <span>Sprint review — 2 pm</span>
            </div>
        </>
    );
}

/* ── tokens ───────────────────────────────────────── */
const BG = "#0B0F19", SURF = "#111827", IND = "#6366F1", INDL = "#818CF8";
const GN = "#22C55E", TXT = "#F9FAFB", SEC = "#9CA3AF", BOR = "rgba(255,255,255,0.08)";

/* ── data ─────────────────────────────────────────── */
const features = [
    { icon: ListTodo, title: "Task Tracking", desc: "Create, assign and prioritise tasks with clear owners and deadlines.", color: IND, bg: "rgba(99,102,241,0.12)" },
    { icon: TrendingUp, title: "Project Visibility", desc: "Real-time boards and timelines so everyone knows the status instantly.", color: GN, bg: "rgba(34,197,94,0.10)" },
    { icon: Users, title: "Team Collaboration", desc: "Comments, mentions and shared views — no scattered threads.", color: "#3B82F6", bg: "rgba(59,130,246,0.10)" },
    { icon: Target, title: "Milestones", desc: "Set milestone dates and surface blockers before they become emergencies.", color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
    { icon: BarChart3, title: "Reporting", desc: "Velocity, progress and team health dashboards your execs will actually read.", color: "#8B5CF6", bg: "rgba(139,92,246,0.10)" },
    { icon: Bell, title: "Smart Notifications", desc: "Only the alerts that matter — no noise, timed right, every time.", color: "#EC4899", bg: "rgba(236,72,153,0.10)" },
];

const showcasePanels = [
    { key: "board", label: "Task Board", icon: Layout, desc: "Kanban-style boards that keep work visible and blockers surfaced." },
    { key: "tl", label: "Timeline", icon: Calendar, desc: "Gantt-style timeline that shows how projects progress week by week." },
    { key: "dash", label: "Dashboard", icon: BarChart3, desc: "Sprint velocity, workload and completion rates at a glance." },
    { key: "collab", label: "Collaboration", icon: Users, desc: "Inline comments, @mentions and shared views — synced in real time." },
];

const useCaseData: Record<string, { headline: string; bullets: string[]; color: string }> = {
    Teams: { headline: "One workspace for every sprint", color: IND, bullets: ["Shared task boards & goals", "Real-time status updates", "Cross-functional clarity"] },
    Managers: { headline: "Full portfolio visibility, zero chaos", color: "#8B5CF6", bullets: ["Portfolio & resource view", "Automated status reports", "Milestone tracking"] },
    Developers: { headline: "Ship faster with less process", color: GN, bullets: ["GitHub / GitLab links on tasks", "Sprint planning & velocity", "One-click priority triage"] },
    Agencies: { headline: "Multi-client delivery, one workspace", color: "#F59E0B", bullets: ["Client-separated projects", "Deadline & billing visibility", "Role-based access control"] },
};

const testimonials = [
    { name: "Alen Baran", role: "PM · Stripe", init: "AB", color: IND, q: "TaskFlow cut our sprint planning meetings from 90 minutes to 20. That time compounds." },
    { name: "Monika Harlow", role: "Founder · BuildFast", init: "MH", color: GN, q: "Our remote team finally knows what's happening. No more 'can you give me an update?' Slack messages." },
    { name: "Grace Kim", role: "Design Lead · Figma", init: "GK", color: "#8B5CF6", q: "I've tried six tools. This is the first one my engineers actually keep updated." },
    { name: "David Park", role: "Eng Mgr · Vercel", init: "DP", color: "#F59E0B", q: "We replaced Jira, Asana, and three spreadsheets. One weekly sync now replaces four." },
];

const plans = [
    {
        name: "Starter", mp: 0, yp: 0, badge: null, cta: "Get Started Free", link: "/signup", featured: false,
        perks: ["Up to 5 projects", "3 team members", "Core task views", "Community support"]
    },
    {
        name: "Pro", mp: 29, yp: 22, badge: "Most Popular", cta: "Start Free Trial", link: "/signup", featured: true,
        perks: ["Unlimited projects", "Up to 25 members", "Advanced views", "Timeline & calendar", "Priority support"]
    },
    {
        name: "Business", mp: 99, yp: 79, badge: null, cta: "Start Free Trial", link: "/signup", featured: false,
        perks: ["Everything in Pro", "Unlimited members", "SSO & SAML", "Role permissions", "Advanced reporting", "Dedicated support"]
    },
];

const faqs = [
    { q: "Is TaskFlow Pro free to start?", a: "Yes — our Starter plan is entirely free, no credit card needed. Core boards and task views are included forever." },
    { q: "Can I bring data from Jira or Asana?", a: "Absolutely. We support CSV import and direct connectors for Trello, Asana and Jira — most teams migrate in under an hour." },
    { q: "How does real-time collaboration work?", a: "Every update syncs instantly. Teammates see task changes, comments and status moves live — no refresh required." },
    { q: "Is my data secure?", a: "Yes. Encrypted in transit and at rest, SOC 2 Type II compliant, with optional SSO on Business plans." },
    { q: "Can I cancel anytime?", a: "Of course — no lock-in. Cancel anytime and your team keeps access until the end of the billing period." },
    { q: "Do you offer nonprofit or edu pricing?", a: "Yes, 50% off verified nonprofit and educational organisations. Email us to apply." },
];

/* ── DashMockup ───────────────────────────────────── */
function DashMockup({ panel }: { panel: number }) {
    const cols = [
        { label: "To Do", dot: SEC, tasks: ["Research competitors", "Write copy", "Define metrics"] },
        { label: "In Progress", dot: INDL, tasks: ["Design hero", "API integration"] },
        { label: "Done", dot: GN, tasks: ["Set up CI/CD", "User research"] },
    ];
    return (
        <div style={{ borderRadius: 18, overflow: "hidden", background: SURF, border: `1px solid ${BOR}`, boxShadow: `0 0 0 1px rgba(99,102,241,0.15), 0 40px 100px rgba(0,0,0,0.6)`, width: "100%", maxWidth: 780 }}>
            {/* chrome */}
            <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.25)", borderBottom: `1px solid ${BOR}`, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 6 }}>{["#FF5F57", "#FFBD2E", "#27C840"].map(c => <div key={c} style={{ height: 10, width: 10, borderRadius: 99, background: c }} />)}</div>
                <div style={{ flex: 1, height: 20, borderRadius: 6, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="lp5-chrome-url" style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>app.taskflowpro.com/{["board", "timeline", "dashboard", "team"][panel]}</span>
                </div>
            </div>
            {/* body */}
            <div className="lp5-board-body" style={{ padding: 16, minHeight: 220 }}>
                {panel === 0 && (
                    <div className="lp5-board-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        {cols.map(col => (
                            <div key={col.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 10, border: `1px solid ${BOR}` }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                                    <span style={{ height: 7, width: 7, borderRadius: 99, background: col.dot }} />
                                    <span style={{ fontSize: 9, fontWeight: 700, color: SEC, textTransform: "uppercase", letterSpacing: "0.06em" }}>{col.label}</span>
                                </div>
                                {col.tasks.map(t => <div key={t} style={{ padding: "6px 8px", borderRadius: 7, background: "rgba(255,255,255,0.05)", border: `1px solid ${BOR}`, fontSize: 10, color: "rgba(255,255,255,0.75)", marginBottom: 5 }}>{t}</div>)}
                            </div>
                        ))}
                    </div>
                )}
                {panel === 1 && (
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: SEC, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Q1 Timeline</div>
                        {["Research phase", "Design & prototype", "Engineering build", "QA & launch"].map((t, i) => (
                            <div key={t} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                                <span style={{ fontSize: 10, color: SEC, minWidth: 110 }}>{t}</span>
                                <div style={{ flex: 1, height: 14, borderRadius: 4, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${[90, 70, 45, 20][i]}%`, background: `linear-gradient(90deg,${IND},${INDL})`, opacity: i === 0 ? 1 : 0.7 - i * 0.1, borderRadius: 4 }} />
                                </div>
                                <span style={{ fontSize: 9, color: INDL, minWidth: 30, textAlign: "right" }}>{[90, 70, 45, 20][i]}%</span>
                            </div>
                        ))}
                    </div>
                )}
                {panel === 2 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {[{ label: "Tasks Done", val: "124", sub: "↑ 18% this week" }, { label: "On Track", val: "87%", sub: "8 of 12 projects" }, { label: "Avg Velocity", val: "31 pts", sub: "per sprint" }, { label: "Team Health", val: "Good", sub: "No blockers" }].map(m => (
                            <div key={m.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "14px 16px", border: `1px solid ${BOR}` }}>
                                <div style={{ fontSize: 10, color: SEC, marginBottom: 6 }}>{m.label}</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: TXT, letterSpacing: "-0.03em", marginBottom: 2 }}>{m.val}</div>
                                <div style={{ fontSize: 10, color: GN }}>{m.sub}</div>
                            </div>
                        ))}
                    </div>
                )}
                {panel === 3 && (
                    <div>
                        {["@monika left a comment on Design hero", "@grace completed API integration", "@david assigned 3 tasks to Alen", "Sprint 4 review scheduled for Feb 28"].map((ev, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: i < 3 ? `1px solid ${BOR}` : "none" }}>
                                <div style={{ height: 28, width: 28, borderRadius: 99, background: [IND, GN, "#8B5CF6", "#F59E0B"][i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{["MH", "GK", "DP", "AB"][i]}</div>
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{ev}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── MetricCell (animated counter) ───────────────────────────────────── */
function MetricCell({ num, label, display }: { num: number; label: string; suffix: string; display: string }) {
    const { ref, val } = useCountUp(num);
    // Show the animated number until it reaches the target, then show the display string
    const shown = val >= num ? display : val.toLocaleString();
    return (
        <div style={{ textAlign: "center", padding: "28px 16px", background: "rgba(255,255,255,0.025)", borderRight: `1px solid rgba(255,255,255,0.08)` }}>
            <span ref={ref} className="lp5-stat-num">{shown}</span>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                {label === "Tasks daily" && <span className="lp5-live-dot" style={{ width: 6, height: 6, flexShrink: 0 }} />}
                {label}
            </div>
        </div>
    );
}

/* ── TechStackBadge ──────────────────────────────── */
function TechStackBadge() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const stack = [
        { cat: "Frontend", icon: "⚛️", items: ["React 18 + TypeScript", "Vite", "TailwindCSS", "React Query", "Wouter (routing)"] },
        { cat: "Backend", icon: "🟢", items: ["Node.js + Express", "Passport.js (auth)", "Socket.io (realtime)"] },
        { cat: "Database", icon: "🗄️", items: ["MongoDB", "Mongoose"] },
        { cat: "Payments", icon: "💳", items: ["Stripe"] },
    ];

    return (
        <div ref={ref} style={{ position: "fixed", bottom: 80, right: 20, zIndex: 9999 }}>
            {/* ── Badge trigger ── */}
            <button
                onClick={() => setOpen(!open)}
                className="lp6-badge-btn"
                aria-label="Tech stack info"
            >
                <span className="lp6-badge-dot" />
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>Built by SlashEasy</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transition: "transform 0.3s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* ── Popup panel ── */}
            {open && (
                <div className="lp6-popup">
                    {/* header */}
                    <div className="lp6-popup-head">
                        <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 15, color: "#fff" }}>
                            <span style={{ fontSize: 18 }}>{'</>'}</span> Tech Stack
                        </span>
                        <button onClick={() => setOpen(false)} className="lp6-close-btn" aria-label="Close">×</button>
                    </div>

                    {/* stack rows */}
                    <div style={{ padding: "12px 16px" }}>
                        {stack.map(({ cat, icon, items }) => (
                            <div key={cat} className="lp6-stack-row">
                                <div className="lp6-stack-cat">
                                    <span>{icon}</span>
                                    <span>{cat}</span>
                                </div>
                                <div className="lp6-stack-pills">
                                    {items.map(i => <span key={i} className="lp6-pill">{i}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* footer */}
                    <div className="lp6-popup-footer" style={{ flexDirection: "column", gap: 2 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span>Made with </span>
                            <span style={{ color: "#EF4444", fontSize: 15 }}>♥</span>
                            <span> by </span>
                            <span style={{ fontWeight: 800, background: "linear-gradient(90deg,#6366F1,#8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                SlashEasy
                            </span>
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>Developer: Pranav Mudaliyar</div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── AccordionItem ────────────────────────────────── */

function Acc({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="lp4-acc-item">
            <button className="lp4-acc-trig" onClick={() => setOpen(!open)}>
                {q}
                <ChevronDown style={{ height: 18, width: 18, flexShrink: 0, color: open ? INDL : SEC, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.3s, color 0.2s" }} />
            </button>
            <div className={`lp4-acc-body${open ? " open" : ""}`}>{a}</div>
        </div>
    );
}

/* ── Main ─────────────────────────────────────────── */
export default function Landing() {
    useScrollReveal();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useParticles(canvasRef);
    const [activePanel, setActivePanel] = useState(0);
    const tilt = useTilt(6);

    const [annual, setAnnual] = useState(true);
    const [ucTab, setUcTab] = useState<keyof typeof useCaseData>("Teams");
    const [tsIdx, setTsIdx] = useState(0);
    const [navBg, setNavBg] = useState(false);

    useEffect(() => {
        const fn = () => setNavBg(window.scrollY > 24);
        window.addEventListener("scroll", fn, { passive: true });
        return () => window.removeEventListener("scroll", fn);
    }, []);

    const W: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "0 24px", width: "100%", boxSizing: "border-box" };
    const sec: React.CSSProperties = { fontSize: "clamp(30px,4vw,48px)", fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.06, color: TXT };

    return (
        <div style={{ fontFamily: "'Inter',system-ui,-apple-system,sans-serif", background: BG, color: TXT, overflowX: "hidden" }}>

            {/* ── NAV ─────────────────────────────────────── */}
            <nav style={{ position: "sticky", top: 0, zIndex: 100, background: navBg ? "rgba(11,15,25,0.88)" : "transparent", backdropFilter: navBg ? "blur(20px)" : "none", borderBottom: navBg ? `1px solid ${BOR}` : "1px solid transparent", transition: "all 0.35s ease" }}>
                <div style={{ ...W, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
                        <span style={{ height: 30, width: 30, borderRadius: 9, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(99,102,241,0.5)" }}><Zap style={{ height: 14, width: 14, color: "#fff" }} /></span>
                        <span style={{ fontWeight: 800, fontSize: 16, color: TXT, letterSpacing: "-0.02em" }}>TaskFlow Pro</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 28 }} className="lp4-hide-tab">
                        {["Product", "Features", "Pricing", "Docs"].map(l => <a key={l} href={`#${l.toLowerCase()}`} className="lp4-nav-link">{l}</a>)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <Link href="/login"><a className="lp4-nav-link" style={{ fontWeight: 600 }}>Login</a></Link>
                        <Link href="/signup"><a className="lp4-cta-btn" style={{ height: 38, padding: "0 18px", fontSize: 13, borderRadius: 10 }}>Start Free</a></Link>
                    </div>
                </div>
            </nav>

            {/* ── HERO ─────────────────────────────────────── */}
            <section className="lp5-hero-section" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: 72 }}>
                <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
                {/* bg orbs – absolute, won't affect layout */}
                <div style={{ position: "absolute", top: "8%", left: "5%", width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.16) 0%,transparent 70%)", pointerEvents: "none", animation: "lp3-orb-a 20s ease-in-out infinite" }} />
                <div style={{ position: "absolute", bottom: "5%", right: "5%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 70%)", pointerEvents: "none", animation: "lp3-orb-b 24s ease-in-out infinite" }} />

                <div style={{ ...W, position: "relative", paddingTop: 40, paddingBottom: 80 }}>
                    {/* ── 2-column hero grid ── */}
                    <div className="lp5-hero-grid">
                        {/* LEFT — copy */}
                        <div className="lp5-hero-copy">
                            <div className="lp3-hero-in lp3-hi-1" style={{ marginBottom: 20 }}>
                                <span className="lp4-pill"><Sparkles style={{ height: 10, width: 10 }} /> Now free for teams up to 5</span>
                            </div>
                            <h1 className="lp3-hero-in lp3-hi-2" style={{ fontSize: "clamp(36px,5.5vw,76px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.06, marginBottom: 22, wordBreak: "break-word" }}>
                                Ship projects<br />with <span className="lp3-grad">perfect clarity.</span>
                            </h1>
                            <p className="lp3-hero-in lp3-hi-3" style={{ fontSize: "clamp(15px,1.6vw,18px)", color: SEC, lineHeight: 1.75, marginBottom: 36, maxWidth: 480 }}>
                                Plan work, track progress and keep every team member aligned — all in one fast, focused workspace.
                            </p>
                            <div className="lp3-hero-in lp3-hi-4 lp5-hero-btns" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                                <Link href="/signup"><a className="lp4-cta-btn" style={{ height: 52, padding: "0 30px", fontSize: 15 }}>Start Free Workspace <ArrowRight style={{ height: 16, width: 16 }} /></a></Link>
                                <a href="#showcase" className="lp4-ghost-btn" style={{ height: 52, padding: "0 22px" }}>
                                    <span style={{ height: 28, width: 28, borderRadius: 99, background: "rgba(255,255,255,0.08)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Play style={{ height: 10, width: 10, fill: TXT, color: TXT, marginLeft: 2 }} /></span>
                                    Watch Demo
                                </a>
                            </div>
                            <p className="lp3-hero-in lp3-hi-4" style={{ fontSize: 12, color: "rgba(255,255,255,0.28)" }}>No credit card · Free plan forever · 5-min setup</p>
                        </div>

                        {/* RIGHT — mockup */}
                        <div className="lp3-hero-in lp3-hi-5 lp5-hero-visual">
                            <div className="lp3-float" style={{ position: "relative" }} {...tilt}>
                                <DashMockup panel={0} />
                                <HeroBadges />
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* ── TRUST BAR ────────────────────────────────── */}
            <div style={{ borderTop: `1px solid ${BOR}`, borderBottom: `1px solid ${BOR}`, padding: "28px 0" }}>
                <div style={{ ...W, textAlign: "center" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 18 }}>Trusted by 2,000+ teams worldwide</p>
                    <div className="lp5-trust-bar" style={{ display: "flex", justifyContent: "center", gap: 44, flexWrap: "wrap" }}>
                        {["Stripe", "Vercel", "Linear", "Notion", "Figma", "GitHub"].map(co => (
                            <span key={co} style={{ fontWeight: 800, fontSize: 14, color: "rgba(255,255,255,0.18)", letterSpacing: "-0.01em", transition: "color 0.2s", cursor: "default" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.18)")}>{co}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── PROBLEM → SOLUTION ───────────────────────── */}
            <section style={{ padding: "96px 0" }} id="product">
                <div style={W}>
                    <div className="lp4-split lp3-reveal">
                        <div>
                            <span className="lp4-pill" style={{ marginBottom: 20, display: "inline-flex" }}>The Problem</span>
                            <h2 style={{ ...sec, marginBottom: 20 }}>Work is scattered.<br />Clarity is missing.</h2>
                            <p style={{ fontSize: 16, color: SEC, lineHeight: 1.8, marginBottom: 24 }}>
                                Teams juggle tasks across email threads, spreadsheets, chat messages and half-used tools. Deadlines slip. Priorities clash. Nobody knows who's doing what.
                            </p>
                            {["Missed deadlines from unclear ownership", "Status updates buried in 100-message threads", "No single view of what actually matters"].map(b => (
                                <div key={b} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                                    <span style={{ height: 18, width: 18, borderRadius: 99, background: "rgba(239,68,68,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <span style={{ height: 6, width: 6, borderRadius: 99, background: "#EF4444" }} />
                                    </span>
                                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }}>{b}</span>
                                </div>
                            ))}
                        </div>
                        <div>
                            <span className="lp4-pill" style={{ marginBottom: 20, display: "inline-flex", background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.28)", color: "#86EFAC" }}>The Solution</span>
                            <h2 style={{ ...sec, marginBottom: 20 }}>One workspace.<br />Total clarity.</h2>
                            <p style={{ fontSize: 16, color: SEC, lineHeight: 1.8, marginBottom: 24 }}>
                                TaskFlow Pro gives every team a single source of truth — tasks, timelines, updates and priorities visible to everyone, always up to date.
                            </p>
                            {["Every task has a clear owner and deadline", "Status visible without a single update meeting", "Everyone aligned in one organised workspace"].map(b => (
                                <div key={b} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                                    <CheckCircle2 style={{ height: 18, width: 18, color: GN, flexShrink: 0 }} />
                                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{b}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FEATURES ─────────────────────────────────── */}
            <section id="features" style={{ padding: "80px 0", borderTop: `1px solid ${BOR}` }}>
                <div style={W}>
                    <div className="lp3-reveal" style={{ textAlign: "center", marginBottom: 52 }}>
                        <span className="lp4-pill" style={{ marginBottom: 14, display: "inline-flex" }}>Features</span>
                        <h2 style={{ ...sec, marginBottom: 14 }}>Built for real work</h2>
                        <p style={{ fontSize: 16, color: SEC, maxWidth: 480, margin: "0 auto" }}>
                            Practical tools — not feature bloat — designed to reduce friction and keep teams focused.
                        </p>
                    </div>
                    <div className="lp5-feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 14 }}>
                        {features.map(({ icon: Icon, title, desc, color, bg }, i) => (
                            <div key={title}
                                className={`lp4-feat-card lp3-reveal lp3-d${(i % 6) + 1}`}
                                style={{ cursor: "default" }}
                                onMouseMove={e => {
                                    const r = e.currentTarget.getBoundingClientRect();
                                    const x = (e.clientX - r.left) / r.width - 0.5;
                                    const y = (e.clientY - r.top) / r.height - 0.5;
                                    e.currentTarget.style.transform = `perspective(700px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-6px) scale(1.01)`;
                                }}
                                onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
                            >
                                <div style={{ height: 48, width: 48, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, border: `1px solid ${color}22`, transition: "box-shadow 0.3s ease", boxShadow: `0 0 0 0 ${color}00` }}
                                    onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 18px ${color}44`; }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 0 0 ${color}00`; }}
                                >
                                    <Icon style={{ height: 21, width: 21, color, transition: "transform 0.3s" }} />
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: TXT, marginBottom: 8 }}>{title}</div>
                                <div style={{ fontSize: 13, color: SEC, lineHeight: 1.65 }}>{desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRODUCT SHOWCASE ─────────────────────────── */}
            <section id="showcase" style={{ padding: "88px 0", borderTop: `1px solid ${BOR}` }}>
                <div style={{ ...W, display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
                    <div className="lp3-reveal" style={{ textAlign: "center" }}>
                        <span className="lp4-pill" style={{ marginBottom: 14, display: "inline-flex" }}>Product Showcase</span>
                        <h2 style={{ ...sec }}>Every view your team needs</h2>
                    </div>
                    {/* Clickable tab bar */}
                    <div className="lp3-reveal lp4-tabs">
                        {showcasePanels.map(({ key, label, icon: Icon }, i) => (
                            <button
                                key={key}
                                className={`lp4-tab${i === activePanel ? " active" : ""}`}
                                onClick={() => setActivePanel(i)}
                            >
                                <Icon style={{ height: 13, width: 13, display: "inline-block", marginRight: 6, verticalAlign: "middle" }} />{label}
                            </button>
                        ))}
                    </div>
                    <div className="lp3-reveal" style={{ width: "100%", maxWidth: 820, position: "relative" }}>
                        <div style={{ position: "absolute", inset: "-20px", borderRadius: 40, background: "radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.18), transparent 65%)", pointerEvents: "none" }} />
                        {/* key= forces React to remount → CSS lp5-panel-in fires on every tab switch */}
                        <div key={activePanel} className="lp5-panel-in">
                            <DashMockup panel={activePanel} />
                        </div>
                    </div>
                    <p key={`desc-${activePanel}`} className="lp5-panel-in" style={{ fontSize: 14, color: SEC, textAlign: "center", maxWidth: 480, marginTop: 8 }}>
                        {showcasePanels[activePanel].desc}
                    </p>
                </div>
            </section>

            {/* ── USE CASES ────────────────────────────────── */}
            <section style={{ padding: "88px 0", borderTop: `1px solid ${BOR}` }}>
                <div style={W}>
                    <div className="lp3-reveal" style={{ textAlign: "center", marginBottom: 44 }}>
                        <span className="lp4-pill" style={{ marginBottom: 14, display: "inline-flex" }}>Use Cases</span>
                        <h2 style={{ ...sec }}>Built for every kind of team</h2>
                    </div>
                    <div className="lp3-reveal" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
                        <div className="lp4-tabs">
                            {Object.keys(useCaseData).map(k => (
                                <button key={k} className={`lp4-tab${ucTab === k ? " active" : ""}`} onClick={() => setUcTab(k as keyof typeof useCaseData)}>{k}</button>
                            ))}
                        </div>
                        <div className="lp5-uc-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", width: "100%", maxWidth: 820 }}>
                            <div>
                                <h3 style={{ fontSize: "clamp(22px,2.8vw,34px)", fontWeight: 800, letterSpacing: "-0.03em", color: TXT, marginBottom: 20 }}>{useCaseData[ucTab].headline}</h3>
                                {useCaseData[ucTab].bullets.map(b => (
                                    <div key={b} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                                        <CheckCircle2 style={{ height: 17, width: 17, color: useCaseData[ucTab].color, flexShrink: 0 }} />
                                        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{b}</span>
                                    </div>
                                ))}
                                <Link href="/signup"><a className="lp4-cta-btn" style={{ marginTop: 24, height: 46, padding: "0 22px", fontSize: 14 }}>Get Started Free <ChevronRight style={{ height: 15, width: 15 }} /></a></Link>
                            </div>
                            <div style={{ background: SURF, borderRadius: 16, padding: 24, border: `1px solid ${BOR}` }}>
                                {useCaseData[ucTab].bullets.map((b, i) => (
                                    <div key={b} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: i < 2 ? `1px solid ${BOR}` : "none" }}>
                                        <div style={{ height: 36, width: 36, borderRadius: 10, background: `${useCaseData[ucTab].color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <span style={{ height: 10, width: 10, borderRadius: 3, background: useCaseData[ucTab].color }} />
                                        </div>
                                        <span style={{ fontSize: 13, color: SEC }}>{b}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ─────────────────────────────── */}
            <section style={{ padding: "80px 0", borderTop: `1px solid ${BOR}` }}>
                <div style={W}>
                    <div className="lp3-reveal" style={{ textAlign: "center", marginBottom: 48 }}>
                        <h2 style={{ ...sec, marginBottom: 8 }}>Built for teams that move fast.</h2>
                        <p style={{ fontSize: 16, color: SEC }}>Real teams. Real results.</p>
                    </div>
                    <div className="lp5-testi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
                        {testimonials.map(({ name, role, init, color, q }, i) => (
                            <div key={name} className={`lp4-testi-card lp3-reveal lp3-d${i + 1}`}>
                                <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                                    {Array.from({ length: 5 }).map((_, j) => <Star key={j} style={{ height: 14, width: 14, fill: "#F59E0B", color: "#F59E0B" }} />)}
                                </div>
                                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.75, marginBottom: 20, fontStyle: "italic" }}>"{q}"</p>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                    <div style={{ height: 38, width: 38, borderRadius: 99, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>{init}</div>
                                    <div><div style={{ fontSize: 13, fontWeight: 700, color: TXT }}>{name}</div><div style={{ fontSize: 11, color: SEC }}>{role}</div></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Animated Metrics */}
                    <div className="lp5-metrics-grid lp3-reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 1, marginTop: 52, borderRadius: 20, overflow: "hidden", border: `1px solid ${BOR}` }}>
                        <MetricCell num={10000} suffix="k+" label="Tasks daily" display="10k+" />
                        <MetricCell num={999} suffix="%" label="Uptime SLA" display="99.9%" />
                        <MetricCell num={2000} suffix="+" label="Teams" display="2,000+" />
                        <MetricCell num={49} suffix="★" label="Avg rating" display="4.9★" />
                    </div>
                </div>
            </section>

            {/* ── PRICING ──────────────────────────────────── */}
            <section id="pricing" style={{ padding: "80px 0", borderTop: `1px solid ${BOR}` }}>
                <div style={W}>
                    <div className="lp3-reveal" style={{ textAlign: "center", marginBottom: 40 }}>
                        <span className="lp4-pill" style={{ marginBottom: 14, display: "inline-flex" }}>Pricing</span>
                        <h2 style={{ ...sec, marginBottom: 20 }}>Simple, honest pricing</h2>
                        <div className="lp3-toggle">
                            <button className={`lp3-tog-btn${!annual ? " active" : ""}`} onClick={() => setAnnual(false)} style={{ background: !annual ? IND : "transparent", color: !annual ? "#fff" : SEC }}>Monthly</button>
                            <button className={`lp3-tog-btn${annual ? " active" : ""}`} onClick={() => setAnnual(true)} style={{ background: annual ? IND : "transparent", color: annual ? "#fff" : SEC }}>
                                Annual <span style={{ fontSize: 10, background: GN, color: BG, padding: "1px 7px", borderRadius: 999, marginLeft: 5, fontWeight: 800 }}>Save 25%</span>
                            </button>
                        </div>
                    </div>
                    <div className="lp5-pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, alignItems: "start" }}>
                        {plans.map(({ name, mp, yp, badge, cta, link, featured, perks }, i) => {
                            const price = annual ? yp : mp;
                            return (
                                <div key={name} className={`lp4-price-card lp3-reveal lp3-d${i + 1}${featured ? " featured" : ""}`}>
                                    {badge && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: IND, color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 14px", borderRadius: 999, whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}>{badge}</div>}
                                    <div style={{ fontSize: 13, fontWeight: 700, color: SEC, marginBottom: 8 }}>{name}</div>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                                        <span style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-0.04em", color: TXT }}>{price === 0 ? "Free" : `$${price}`}</span>
                                        {price > 0 && <span style={{ fontSize: 13, color: SEC }}>/mo</span>}
                                    </div>
                                    {annual && price > 0 && <div style={{ fontSize: 12, color: GN, fontWeight: 600, marginBottom: 6 }}>Save ${(mp - yp) * 12}/yr when billed annually</div>}
                                    <Link href={link}><a className="lp4-cta-btn" style={{ width: "100%", justifyContent: "center", height: 44, fontSize: 14, borderRadius: 11, marginTop: 16, marginBottom: 20, display: "inline-flex" }}>{cta}</a></Link>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                                        {perks.map(f => <div key={f} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}><CheckCircle2 style={{ height: 15, width: 15, color: featured ? INDL : GN, flexShrink: 0, marginTop: 1 }} /><span style={{ fontSize: 13, color: SEC }}>{f}</span></div>)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── FAQ ──────────────────────────────────────── */}
            <section id="faq" style={{ padding: "80px 0", borderTop: `1px solid ${BOR}` }}>
                <div style={{ ...W, maxWidth: 740 }}>
                    <div className="lp3-reveal" style={{ textAlign: "center", marginBottom: 48 }}>
                        <span className="lp4-pill" style={{ marginBottom: 14, display: "inline-flex" }}>FAQ</span>
                        <h2 style={{ ...sec }}>Questions answered</h2>
                    </div>
                    <div className="lp3-reveal">{faqs.map(f => <Acc key={f.q} q={f.q} a={f.a} />)}</div>
                </div>
            </section>

            {/* ── FINAL CTA ────────────────────────────────── */}
            <section className="lp5-cta-section" style={{ padding: "92px 0", background: "linear-gradient(135deg,#0D1020 0%,#1a0e35 50%,#0B1520 100%)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "20%", left: "15%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)", animation: "lp3-orb-a 18s ease-in-out infinite", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: "10%", right: "12%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.14) 0%,transparent 70%)", animation: "lp3-orb-b 22s ease-in-out infinite", pointerEvents: "none" }} />
                <div style={{ ...W, textAlign: "center", position: "relative" }}>
                    <div className="lp3-reveal">
                        <span className="lp4-pill" style={{ marginBottom: 20, display: "inline-flex" }}><Sparkles style={{ height: 10, width: 10 }} /> No credit card required</span>
                        <h2 style={{ fontSize: "clamp(34px,5.5vw,66px)", fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 1.04, color: TXT, marginBottom: 18 }}>
                            Get organised.<br /><span className="lp3-grad">Start shipping faster.</span>
                        </h2>
                        <p style={{ fontSize: 17, color: SEC, maxWidth: 480, margin: "0 auto 36px", lineHeight: 1.75 }}>
                            Join 2,000+ teams using TaskFlow Pro to plan work, track delivery and stay aligned without the chaos.
                        </p>
                        <Link href="/signup"><a className="lp4-cta-btn" style={{ height: 58, padding: "0 40px", fontSize: 16, fontWeight: 800 }}>Start Free Workspace <ArrowRight style={{ height: 18, width: 18 }} /></a></Link>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 18 }}>Free plan included · Cancel anytime · 5-minute setup</p>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ───────────────────────────────────── */}
            <footer style={{ borderTop: `1px solid ${BOR}`, padding: "52px 0 28px", background: BG }}>
                <div style={W}>
                    <div className="lp5-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", gap: 28, marginBottom: 44 }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                                <span style={{ height: 26, width: 26, borderRadius: 8, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Zap style={{ height: 12, width: 12, color: "#fff" }} /></span>
                                <span style={{ fontWeight: 800, fontSize: 14, color: TXT }}>TaskFlow Pro</span>
                            </div>
                            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, maxWidth: 240, marginBottom: 18 }}>A focused workspace that helps teams plan, track and deliver without chaos.</p>
                            <div style={{ display: "flex", gap: 8 }}>
                                {[Twitter, Github, Linkedin].map((Icon, i) => (
                                    <a key={i} href="#" style={{ height: 32, width: 32, borderRadius: 8, border: `1px solid ${BOR}`, background: "rgba(255,255,255,0.04)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: SEC, transition: "all 0.18s" }}
                                        onMouseEnter={e => { e.currentTarget.style.color = INDL; e.currentTarget.style.borderColor = "rgba(129,140,248,0.4)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = SEC; e.currentTarget.style.borderColor = BOR; }}>
                                        <Icon style={{ height: 14, width: 14 }} />
                                    </a>
                                ))}
                            </div>
                        </div>
                        {[
                            { g: "Product", ls: ["Features", "Integrations", "Pricing", "Changelog", "Roadmap"] },
                            { g: "Company", ls: ["About", "Blog", "Careers", "Press", "Partners"] },
                            { g: "Resources", ls: ["Docs", "API", "Templates", "Status", "Community"] },
                            { g: "Legal", ls: ["Privacy", "Terms", "Security", "Cookies"] },
                        ].map(({ g, ls }) => (
                            <div key={g}>
                                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 14 }}>{g}</div>
                                {ls.map(l => <a key={l} href="#" className="lp4-nav-link" style={{ display: "block", fontSize: 13, marginBottom: 9 }}>{l}</a>)}
                            </div>
                        ))}
                    </div>
                    <div style={{ paddingTop: 20, borderTop: `1px solid ${BOR}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© {new Date().getFullYear()} TaskFlow Pro. All rights reserved.</span>
                        <Link href="/signup"><a className="lp4-cta-btn" style={{ height: 34, padding: "0 14px", fontSize: 12, borderRadius: 8 }}>Get Started <ChevronRight style={{ height: 12, width: 12 }} /></a></Link>
                    </div>
                </div>
            </footer>

            {/* ── MOBILE STICKY CTA ────────────────────────── */}
            <div className="lp4-mobile-cta">
                <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>Ready to get organised?</span>
                <Link href="/signup"><a className="lp4-cta-btn" style={{ height: 40, padding: "0 18px", fontSize: 13, borderRadius: 10, flexShrink: 0 }}>Start Free</a></Link>
            </div>

            {/* ── TECH STACK BADGE ─────────────────────────── */}
            <TechStackBadge />
        </div>
    );
}
