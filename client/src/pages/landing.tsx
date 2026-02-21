import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    CheckCircle2,
    Zap,
    Users,
    BarChart3,
    Clock,
    Bell,
    Shield,
    Star,
    Kanban,
    Play,
    LayoutDashboard,
    ListTodo,
    Settings,
    ChevronRight,
    Twitter,
    Linkedin,
    Github,
    Globe,
    Layers,
    Target,
    TrendingUp,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   DATA (updated to match the screenshot layout + vibe)
   NOTE: Company/brand name kept as "TaskFlow"
───────────────────────────────────────────────────────────── */

const featureCards = [
    {
        icon: ListTodo,
        title: "Task Progress",
        desc: "Track progress at a glance with a clean, simple workflow.",
        bg: "#FFF7ED",
        dot: "#FB923C",
    },
    {
        icon: Clock,
        title: "Plan Calendar",
        desc: "Plan tasks with a calm calendar and timeline planning.",
        bg: "#F5F3FF",
        dot: "#8B5CF6",
    },
    {
        icon: Users,
        title: "Collaborations",
        desc: "Stay aligned with comments, mentions and team updates.",
        bg: "#ECFDF5",
        dot: "#10B981",
    },
];

const bigFeatures = [
    {
        badge: "Simple",
        title: "Simple to use,\npowerful when need.",
        desc: "Create tasks fast, organize them clearly, and keep your team aligned without extra clutter.",
        bullets: ["Create tasks in seconds", "Customize view for your workflow", "Work with your team in real-time"],
        bgColor: "#F34B27",
        flip: false,
    },
    {
        badge: "Projects",
        title: "Take complex\nprojects with ease",
        desc: "Plan, assign, and execute work smoothly with clean structure and fast updates.",
        bullets: ["Keep everyone accountable", "Team overview in one place", "Make work visible to everyone"],
        bgColor: "#0E7A4C",
        flip: true,
    },
    {
        badge: "Integrations",
        title: "Create calm with\nintegrations.",
        desc: "Connect the tools you already use and keep everything in sync with fewer handoffs.",
        bullets: ["Connect Slack / Outlook", "Bring tasks from other tools", "Automate updates"],
        bgColor: "#7C3AED",
        flip: false,
    },
];

const plans = [
    {
        name: "Basic",
        price: "$9.99",
        period: "per month",
        desc: "For small teams",
        cta: "Get started",
        highlight: false,
        features: ["Basic boards", "Team collaboration", "Core integrations", "Email support"],
    },
    {
        name: "Pro",
        price: "$12.99",
        period: "per month",
        desc: "Best for growing teams",
        cta: "Get started",
        highlight: true,
        features: ["Everything in Basic", "Unlimited projects", "Advanced views", "Priority support"],
    },
    {
        name: "Enterprise",
        price: "Contact",
        period: "custom",
        desc: "For large orgs",
        cta: "Contact sales",
        highlight: false,
        features: ["Custom setup", "SSO / SAML", "Dedicated support", "Custom SLA"],
    },
];

const testimonials = [
    { name: "Alen Baran", role: "Product Manager", avatar: "AB", color: "#7C3AED", text: "Fast, clean, and keeps our work organized without the usual noise." },
    { name: "Monika H.", role: "Founder", avatar: "MH", color: "#FB923C", text: "The calm UI helps our team stay focused. Planning is finally painless." },
    { name: "Grave K.", role: "Design Lead", avatar: "GK", color: "#10B981", text: "My team actually likes updating tasks now. That’s the biggest win." },
];

const footerLinks: Record<string, string[]> = {
    Explore: ["Features", "Benefits", "Integrations", "Pricing"],
    Support: ["Help center", "Documentation", "Status"],
    Legal: ["Privacy", "Terms", "Cookies"],
};

/* ─────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────── */

function Stars({ n = 5 }: { n?: number }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: n }).map((_, i) => (
                <Star key={i} style={{ height: 14, width: 14 }} className="fill-amber-400 text-amber-400" />
            ))}
        </div>
    );
}

function MiniFeatureMock() {
    return (
        <div
            style={{
                borderRadius: 16,
                border: "1px solid #EEF2F7",
                background: "#FFFFFF",
                overflow: "hidden",
            }}
        >
            <div style={{ padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ height: 10, width: 10, borderRadius: 99, background: "#7C3AED" }} />
                <div style={{ height: 10, width: "55%", borderRadius: 999, background: "#E2E8F0" }} />
            </div>
            <div style={{ padding: 12, paddingTop: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ height: 28, borderRadius: 12, background: "#F1F5F9" }} />
                ))}
                <div style={{ height: 48, borderRadius: 14, background: "#FEF3C7" }} />
            </div>
        </div>
    );
}

/** Hero mock (matches screenshot vibe: centered app card + marker strokes) */
function HeroDashboard() {
    return (
        <div style={{ position: "relative", width: "100%", maxWidth: 980, margin: "0 auto", padding: "0 18px" }}>
            {/* marker strokes */}
            <div
                style={{
                    position: "absolute",
                    left: 14,
                    top: 60,
                    width: 150,
                    height: 18,
                    background: "#FB7185",
                    borderRadius: 999,
                    transform: "rotate(-6deg)",
                    opacity: 0.55,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    right: 26,
                    top: 36,
                    width: 180,
                    height: 18,
                    background: "#FB923C",
                    borderRadius: 999,
                    transform: "rotate(7deg)",
                    opacity: 0.55,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    left: 86,
                    bottom: -10,
                    width: 220,
                    height: 18,
                    background: "#F472B6",
                    borderRadius: 999,
                    transform: "rotate(4deg)",
                    opacity: 0.5,
                }}
            />

            {/* app card */}
            <div
                style={{
                    position: "relative",
                    background: "#FFFFFF",
                    border: "1px solid #EEF2F7",
                    borderRadius: 18,
                    boxShadow: "0 18px 50px rgba(15,23,42,0.10)",
                    overflow: "hidden",
                }}
            >
                {/* top browser bar */}
                <div
                    style={{
                        padding: "10px 14px",
                        borderBottom: "1px solid #EEF2F7",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "#FFFFFF",
                    }}
                >
                    <div style={{ display: "flex", gap: 6 }}>
                        {["#FF5F57", "#FFBD2E", "#27C840"].map((c) => (
                            <div key={c} style={{ height: 10, width: 10, borderRadius: 99, background: c }} />
                        ))}
                    </div>
                    <div style={{ flex: 1 }} />
                    <div style={{ height: 10, width: 90, borderRadius: 999, background: "#F1F5F9" }} />
                </div>

                {/* body */}
                <div style={{ display: "flex", minHeight: 270 }}>
                    {/* left */}
                    <div style={{ width: 180, borderRight: "1px solid #EEF2F7", padding: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                            <span style={{ height: 10, width: 10, borderRadius: 99, background: "#F43F5E" }} />
                            <span style={{ fontWeight: 950, fontSize: 13, color: "#0F172A" }}>TaskFlow</span>
                        </div>

                        {["Overview", "Projects", "Calendar", "Teams", "Settings"].map((l, i) => (
                            <div
                                key={l}
                                style={{
                                    padding: "8px 10px",
                                    borderRadius: 10,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    color: i === 1 ? "#7C3AED" : "#64748B",
                                    background: i === 1 ? "#F5F3FF" : "transparent",
                                    marginBottom: 6,
                                }}
                            >
                                {l}
                            </div>
                        ))}

                        <div
                            style={{
                                marginTop: 12,
                                padding: 12,
                                borderRadius: 14,
                                background: "#FDF4FF",
                                border: "1px solid #F5D0FE",
                            }}
                        >
                            <div style={{ fontSize: 11, fontWeight: 950, color: "#6D28D9", marginBottom: 8 }}>Upgrade</div>
                            <div style={{ height: 8, borderRadius: 999, background: "#E9D5FF" }} />
                        </div>
                    </div>

                    {/* main */}
                    <div style={{ flex: 1, padding: 14, background: "#FBFBFE" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                            <div>
                                <div style={{ fontWeight: 950, fontSize: 14, color: "#0F172A" }}>TaskFlow Landing Page</div>
                                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Overview · Tasks · Calendar</div>
                            </div>
                            <div
                                style={{
                                    height: 28,
                                    width: 28,
                                    borderRadius: 99,
                                    background: "#7C3AED",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <span style={{ color: "#fff", fontWeight: 950, fontSize: 11 }}>U</span>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12, marginTop: 12 }}>
                            <div style={{ background: "#fff", border: "1px solid #EEF2F7", borderRadius: 14, padding: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 950, color: "#0F172A", marginBottom: 10 }}>November 16</div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    {["Design", "Wireframes", "Copy", "QA"].map((t, i) => (
                                        <div
                                            key={t}
                                            style={{
                                                padding: "6px 10px",
                                                borderRadius: 999,
                                                border: "1px solid #EEF2F7",
                                                background: i === 0 ? "#F5F3FF" : "#FFFFFF",
                                                color: i === 0 ? "#7C3AED" : "#475569",
                                                fontSize: 11,
                                                fontWeight: 900,
                                            }}
                                        >
                                            {t}
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                                    {[
                                        { t: "Homepage section updates", c: "#FDE68A" },
                                        { t: "Pricing plan polish", c: "#A7F3D0" },
                                        { t: "Integration icons", c: "#DDD6FE" },
                                    ].map((row) => (
                                        <div
                                            key={row.t}
                                            style={{
                                                padding: "10px 12px",
                                                borderRadius: 12,
                                                background: "#FFFFFF",
                                                border: "1px solid #EEF2F7",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                            }}
                                        >
                                            <span style={{ height: 10, width: 10, borderRadius: 99, background: row.c }} />
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 800,
                                                    color: "#334155",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {row.t}
                                            </span>
                                            <div style={{ marginLeft: "auto", height: 18, width: 54, borderRadius: 999, background: "#F1F5F9" }} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div style={{ background: "#fff", border: "1px solid #EEF2F7", borderRadius: 14, padding: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 950, color: "#0F172A", marginBottom: 8 }}>Status</div>
                                    <div style={{ height: 10, borderRadius: 999, background: "#E9D5FF", overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: "64%", background: "#7C3AED" }} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#64748B", fontWeight: 900 }}>
                                        <span>Progress</span>
                                        <span>64%</span>
                                    </div>
                                </div>

                                <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 14, padding: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 950, color: "#9A3412", marginBottom: 8 }}>Today</div>
                                    <div style={{ height: 26, borderRadius: 12, background: "#FFFFFF", border: "1px solid #FDE68A" }} />
                                    <div style={{ height: 26, borderRadius: 12, background: "#FFFFFF", border: "1px solid #FDE68A", marginTop: 8 }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Card mock inside colored bands */
function BandMockup({ accent }: { accent: string }) {
    return (
        <div
            style={{
                width: "100%",
                maxWidth: 520,
                background: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.24)",
                borderRadius: 22,
                padding: 18,
                boxShadow: "0 24px 70px rgba(0,0,0,0.22)",
                backdropFilter: "blur(10px)",
            }}
        >
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
                <div style={{ height: 10, width: 10, borderRadius: 99, background: "rgba(255,255,255,0.9)" }} />
                <div style={{ height: 10, width: 120, borderRadius: 999, background: "rgba(255,255,255,0.35)" }} />
                <div style={{ marginLeft: "auto", height: 10, width: 70, borderRadius: 999, background: "rgba(255,255,255,0.25)" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "rgba(255,255,255,0.14)", borderRadius: 16, padding: 12 }}>
                    <div style={{ height: 10, width: "70%", borderRadius: 999, background: "rgba(255,255,255,0.45)", marginBottom: 10 }} />
                    <div style={{ height: 34, borderRadius: 14, background: "rgba(255,255,255,0.22)" }} />
                    <div style={{ height: 10, width: "55%", borderRadius: 999, background: "rgba(255,255,255,0.30)", marginTop: 10 }} />
                </div>
                <div style={{ background: "rgba(255,255,255,0.14)", borderRadius: 16, padding: 12 }}>
                    <div style={{ height: 10, width: "62%", borderRadius: 999, background: "rgba(255,255,255,0.45)", marginBottom: 10 }} />
                    <div style={{ height: 60, borderRadius: 14, background: "rgba(255,255,255,0.22)" }} />
                </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {["Design sprint", "Bug fixes", "Team sync", "Release"].map((t, i) => (
                    <div
                        key={t}
                        style={{
                            padding: "10px 12px",
                            borderRadius: 14,
                            background: "rgba(255,255,255,0.14)",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <span
                            style={{
                                height: 9,
                                width: 9,
                                borderRadius: 99,
                                background: ["#FDE68A", "#A7F3D0", "#DDD6FE", "#FED7AA"][i],
                                flexShrink: 0,
                            }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{t}</span>
                        <span style={{ marginLeft: "auto", height: 10, width: 70, borderRadius: 999, background: "rgba(255,255,255,0.20)" }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE (layout updated to match screenshot)
   NOTE: Company/brand name kept as "TaskFlow"
───────────────────────────────────────────────────────────── */

export default function Landing() {
    return (
        <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: "#fff", color: "#0F172A" }}>
            {/* NAV */}
            <nav
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 50,
                    background: "rgba(255,255,255,0.92)",
                    borderBottom: "1px solid #EEF2F7",
                    backdropFilter: "blur(12px)",
                }}
            >
                <div
                    style={{
                        maxWidth: 1120,
                        margin: "0 auto",
                        padding: "0 22px",
                        height: 72,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 20,
                    }}
                >
                    {/* Logo (dot + brand like screenshot) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span style={{ height: 10, width: 10, borderRadius: 999, background: "#F43F5E" }} />
                        <span style={{ fontWeight: 950, fontSize: 16, letterSpacing: "-0.02em" }}>TaskFlow</span>
                    </div>

                    {/* Links */}
                    <div className="hidden md:flex" style={{ display: "flex", alignItems: "center", gap: 24 }}>
                        {["Features", "Benefits", "Integrations", "Pricing"].map((l) => (
                            <a
                                key={l}
                                href={`#${l.toLowerCase()}`}
                                style={{ fontSize: 13, fontWeight: 800, color: "#64748B", textDecoration: "none" }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "#0F172A")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
                            >
                                {l}
                            </a>
                        ))}
                    </div>

                    {/* Action: Login pill (screenshot style) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <Link href="/login">
                            <a
                                style={{
                                    height: 36,
                                    padding: "0 14px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    borderRadius: 999,
                                    border: "1px solid #E2E8F0",
                                    textDecoration: "none",
                                    color: "#0F172A",
                                    fontWeight: 900,
                                    fontSize: 13,
                                    background: "#fff",
                                }}
                            >
                                Login
                            </a>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* HERO */}
            <section style={{ padding: "64px 0 20px" }}>
                <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 18px", textAlign: "center" }}>
                    <h1
                        style={{
                            fontSize: "clamp(34px, 5.4vw, 58px)",
                            fontWeight: 950,
                            lineHeight: 1.08,
                            letterSpacing: "-0.03em",
                            margin: "0 0 14px",
                        }}
                    >
                        Manage Your <span style={{ fontSize: "0.95em" }}>👩‍💻</span> Team&apos;s{" "}
                        <span style={{ position: "relative", display: "inline-block" }}>
                            <span style={{ position: "relative", zIndex: 1 }}>Productivity</span>
                            {/* orange marker underline */}
                            <span
                                style={{
                                    position: "absolute",
                                    left: -6,
                                    right: -6,
                                    bottom: 6,
                                    height: "34%",
                                    background: "rgba(251, 146, 60, 0.55)",
                                    borderRadius: 10,
                                    zIndex: 0,
                                    transform: "rotate(-1deg)",
                                }}
                            />
                        </span>
                    </h1>

                    <p style={{ fontSize: 15, color: "#64748B", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 22px" }}>
                        Plan your tasks with simple boards, calendars and team collaboration — without switching tools.
                    </p>

                    <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                        <Link href="/signup">
                            <a
                                style={{
                                    height: 44,
                                    padding: "0 18px",
                                    borderRadius: 999,
                                    background: "#7C3AED",
                                    color: "#fff",
                                    fontWeight: 950,
                                    fontSize: 13,
                                    textDecoration: "none",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    boxShadow: "0 10px 26px rgba(124,58,237,0.26)",
                                }}
                            >
                                Try For Free <ArrowRight style={{ height: 16, width: 16 }} />
                            </a>
                        </Link>

                        <a
                            href="#"
                            style={{
                                height: 44,
                                padding: "0 16px",
                                borderRadius: 999,
                                background: "#fff",
                                border: "1px solid #E2E8F0",
                                color: "#0F172A",
                                fontWeight: 950,
                                fontSize: 13,
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <span
                                style={{
                                    height: 26,
                                    width: 26,
                                    borderRadius: 999,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "#F1F5F9",
                                }}
                            >
                                <Play style={{ height: 12, width: 12, color: "#7C3AED", fill: "#7C3AED", marginLeft: 2 }} />
                            </span>
                            Watch demo
                        </a>
                    </div>

                    <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 800 }}>No credit card required · Free plan forever</p>
                </div>

                <div style={{ marginTop: 28 }}>
                    <HeroDashboard />
                </div>
            </section>

            {/* LOGOS STRIP */}
            <section style={{ padding: "26px 0 10px" }}>
                <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 18px", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap", opacity: 0.85 }}>
                        {[
                            { name: "Notion", dot: "#111827" },
                            { name: "Google", dot: "#60A5FA" },
                            { name: "Trello", dot: "#3B82F6" },
                            { name: "Slack", dot: "#A78BFA" },
                            { name: "Outlook", dot: "#2563EB" },
                        ].map((x) => (
                            <div key={x.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ height: 10, width: 10, borderRadius: 3, background: x.dot }} />
                                <span style={{ fontWeight: 950, color: "#94A3B8", fontSize: 13 }}>{x.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section id="features" style={{ padding: "56px 0 20px" }}>
                <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 18px" }}>
                    <div style={{ textAlign: "center", marginBottom: 28 }}>
                        <div style={{ fontSize: 12, fontWeight: 950, color: "#7C3AED", marginBottom: 10 }}>The features</div>
                        <div style={{ fontSize: "clamp(22px, 3.4vw, 34px)", fontWeight: 950, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                            Both familiar and new.
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                        {featureCards.map(({ icon: Icon, title, desc, bg, dot }) => (
                            <div
                                key={title}
                                style={{
                                    background: bg,
                                    borderRadius: 22,
                                    padding: 18,
                                    border: "1px solid rgba(15,23,42,0.06)",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                    <div
                                        style={{
                                            height: 32,
                                            width: 32,
                                            borderRadius: 12,
                                            background: dot,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            boxShadow: "0 10px 20px rgba(15,23,42,0.10)",
                                        }}
                                    >
                                        <Icon style={{ height: 16, width: 16, color: "#fff" }} />
                                    </div>
                                    <div style={{ fontWeight: 950, letterSpacing: "-0.01em" }}>{title}</div>
                                </div>

                                <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 12 }}>{desc}</div>

                                <MiniFeatureMock />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* TRUST TAGLINE + CTA */}
            <section style={{ padding: "44px 0 18px" }}>
                <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 18px", textAlign: "center" }}>
                    <div style={{ fontSize: "clamp(22px, 3.6vw, 36px)", fontWeight: 950, letterSpacing: "-0.02em" }}>
                        A task manager you can
                        <br />
                        trust for teams
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <Link href="/signup">
                            <a
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    height: 44,
                                    padding: "0 18px",
                                    borderRadius: 999,
                                    background: "#7C3AED",
                                    color: "#fff",
                                    textDecoration: "none",
                                    fontWeight: 950,
                                    fontSize: 13,
                                    boxShadow: "0 10px 26px rgba(124,58,237,0.22)",
                                }}
                            >
                                Get Started <ArrowRight style={{ height: 16, width: 16 }} />
                            </a>
                        </Link>
                    </div>
                </div>
            </section>

            {/* BANDS (rounded blocks like screenshot) */}
            <section id="benefits" style={{ padding: "28px 0 10px" }}>
                <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 18px", display: "flex", flexDirection: "column", gap: 18 }}>
                    {bigFeatures.map(({ badge, title, desc, bullets, bgColor, flip }) => (
                        <div
                            key={badge}
                            style={{
                                background: bgColor,
                                borderRadius: 26,
                                padding: "26px 22px",
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 18,
                                    flexWrap: "wrap",
                                    flexDirection: flip ? ("row-reverse" as const) : ("row" as const),
                                }}
                            >
                                {/* text */}
                                <div style={{ flex: 1, minWidth: 260, color: "#fff" }}>
                                    <div
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 8,
                                            padding: "6px 12px",
                                            borderRadius: 999,
                                            background: "rgba(255,255,255,0.18)",
                                            border: "1px solid rgba(255,255,255,0.22)",
                                            fontSize: 11,
                                            fontWeight: 950,
                                            letterSpacing: "0.08em",
                                            textTransform: "uppercase",
                                            marginBottom: 14,
                                        }}
                                    >
                                        {badge}
                                    </div>

                                    <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: "-0.02em", lineHeight: 1.15, whiteSpace: "pre-line" }}>{title}</div>
                                    <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.75, color: "rgba(255,255,255,0.85)", maxWidth: 520 }}>{desc}</div>

                                    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                                        {bullets.map((x) => (
                                            <div key={x} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                                <span
                                                    style={{
                                                        height: 22,
                                                        width: 22,
                                                        borderRadius: 999,
                                                        background: "rgba(255,255,255,0.22)",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        flexShrink: 0,
                                                        marginTop: 1,
                                                    }}
                                                >
                                                    <CheckCircle2 style={{ height: 14, width: 14, color: "#fff" }} />
                                                </span>
                                                <span style={{ fontSize: 13, fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{x}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ marginTop: 18 }}>
                                        <Link href="/signup">
                                            <a
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    height: 42,
                                                    padding: "0 16px",
                                                    borderRadius: 999,
                                                    background: "#fff",
                                                    color: "#0F172A",
                                                    textDecoration: "none",
                                                    fontWeight: 950,
                                                    fontSize: 13,
                                                }}
                                            >
                                                Get started <ArrowRight style={{ height: 16, width: 16 }} />
                                            </a>
                                        </Link>
                                    </div>
                                </div>

                                {/* mock */}
                                <div style={{ flex: 1, minWidth: 260, display: "flex", justifyContent: flip ? "flex-start" : "flex-end" }}>
                                    <BandMockup accent={bgColor} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* PRICING */}
            <section id="pricing" style={{ padding: "56px 0 24px" }}>
                <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 18px" }}>
                    <div style={{ textAlign: "center", marginBottom: 24 }}>
                        <div style={{ fontSize: 12, fontWeight: 950, color: "#7C3AED", marginBottom: 10 }}>Pricing</div>
                        <div style={{ fontSize: "clamp(22px, 3.6vw, 36px)", fontWeight: 950, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                            Choose a plan that fits
                            <br />
                            your team.
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                        {plans.map(({ name, price, period, desc, cta, highlight, features }) => (
                            <div
                                key={name}
                                style={{
                                    borderRadius: 22,
                                    padding: 18,
                                    border: highlight ? "2px solid #FDE047" : "1px solid #EEF2F7",
                                    background: highlight ? "#FEF9C3" : "#fff",
                                    position: "relative",
                                    boxShadow: highlight ? "0 16px 44px rgba(234,179,8,0.22)" : "0 10px 28px rgba(15, 23, 42, 0.06)",
                                }}
                            >
                                {highlight && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: -12,
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            background: "#7C3AED",
                                            color: "#fff",
                                            fontSize: 11,
                                            fontWeight: 950,
                                            padding: "6px 14px",
                                            borderRadius: 999,
                                            whiteSpace: "nowrap",
                                            boxShadow: "0 10px 24px rgba(124,58,237,0.22)",
                                        }}
                                    >
                                        Most popular
                                    </div>
                                )}

                                <div style={{ fontSize: 12, fontWeight: 950, color: "#0F172A", marginBottom: 10 }}>{name}</div>
                                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                                    <div style={{ fontSize: 34, fontWeight: 950, letterSpacing: "-0.03em" }}>{price}</div>
                                    <div style={{ fontSize: 12, color: "#64748B", fontWeight: 900 }}>{period}</div>
                                </div>

                                <div style={{ marginTop: 6, fontSize: 13, color: "#64748B", fontWeight: 800 }}>{desc}</div>

                                <div style={{ marginTop: 14 }}>
                                    <Link href={name === "Enterprise" ? "/contact" : "/signup"}>
                                        <a
                                            style={{
                                                height: 42,
                                                width: "100%",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                borderRadius: 999,
                                                textDecoration: "none",
                                                fontWeight: 950,
                                                fontSize: 13,
                                                background: highlight ? "#7C3AED" : "#fff",
                                                color: highlight ? "#fff" : "#0F172A",
                                                border: highlight ? "none" : "1px solid #E2E8F0",
                                                boxShadow: highlight ? "0 12px 28px rgba(124,58,237,0.20)" : "none",
                                            }}
                                        >
                                            {cta}
                                        </a>
                                    </Link>
                                </div>

                                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                                    {features.map((f) => (
                                        <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <CheckCircle2 style={{ height: 16, width: 16, color: highlight ? "#7C3AED" : "#10B981" }} />
                                            <div style={{ fontSize: 13, color: "#475569", fontWeight: 850 }}>{f}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* TESTIMONIALS */}
            <section style={{ padding: "44px 0 22px" }}>
                <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 18px" }}>
                    <div style={{ textAlign: "center", marginBottom: 18 }}>
                        <div style={{ fontSize: 12, fontWeight: 950, color: "#7C3AED", marginBottom: 10 }}>Testimonials</div>
                        <div style={{ fontSize: "clamp(22px, 3.4vw, 34px)", fontWeight: 950, letterSpacing: "-0.02em" }}>Loved by product people</div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                        {testimonials.map(({ name, role, avatar, color, text }) => (
                            <div
                                key={name}
                                style={{
                                    borderRadius: 20,
                                    border: "1px solid #EEF2F7",
                                    background: "#fff",
                                    padding: 16,
                                    boxShadow: "0 10px 26px rgba(15, 23, 42, 0.06)",
                                }}
                            >
                                <Stars />
                                <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.75, color: "#475569" }}>“{text}”</div>

                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F5F9", display: "flex", gap: 10, alignItems: "center" }}>
                                    <div
                                        style={{
                                            height: 34,
                                            width: 34,
                                            borderRadius: 999,
                                            background: color,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#fff",
                                            fontWeight: 950,
                                            fontSize: 12,
                                        }}
                                    >
                                        {avatar}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 950, fontSize: 13 }}>{name}</div>
                                        <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 900 }}>{role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ textAlign: "center", marginTop: 18 }}>
                        <Link href="/signup">
                            <a
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    height: 44,
                                    padding: "0 18px",
                                    borderRadius: 999,
                                    background: "#fff",
                                    border: "1px solid #E2E8F0",
                                    color: "#0F172A",
                                    textDecoration: "none",
                                    fontWeight: 950,
                                    fontSize: 13,
                                }}
                            >
                                Try For Free <ArrowRight style={{ height: 16, width: 16 }} />
                            </a>
                        </Link>
                    </div>
                </div>
            </section>

            {/* FOOTER (light like screenshot) */}
            <footer style={{ padding: "44px 0 28px", borderTop: "1px solid #EEF2F7", background: "#fff" }}>
                <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 18px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 18, alignItems: "start" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ height: 10, width: 10, borderRadius: 999, background: "#F43F5E" }} />
                                <span style={{ fontWeight: 950 }}>TaskFlow</span>
                            </div>
                            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7, color: "#64748B", maxWidth: 320 }}>
                                Organize team work with a calm, focused task manager.
                            </div>
                        </div>

                        {Object.entries(footerLinks).map(([group, links]) => (
                            <div key={group}>
                                <div style={{ fontSize: 12, fontWeight: 950, color: "#0F172A", marginBottom: 10 }}>{group}</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {links.map((l) => (
                                        <a
                                            key={l}
                                            href="#"
                                            style={{
                                                fontSize: 13,
                                                color: "#64748B",
                                                textDecoration: "none",
                                                fontWeight: 900,
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.color = "#0F172A")}
                                            onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
                                        >
                                            {l}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div
                        style={{
                            marginTop: 18,
                            paddingTop: 16,
                            borderTop: "1px solid #EEF2F7",
                            display: "flex",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 10,
                            alignItems: "center",
                        }}
                    >
                        <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 900 }}>© {new Date().getFullYear()} TaskFlow</div>
                        <Link href="/signup">
                            <a
                                style={{
                                    height: 36,
                                    padding: "0 14px",
                                    borderRadius: 999,
                                    background: "#7C3AED",
                                    color: "#fff",
                                    textDecoration: "none",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    fontWeight: 950,
                                    fontSize: 12,
                                    boxShadow: "0 10px 24px rgba(124,58,237,0.18)",
                                }}
                            >
                                Get started <ArrowRight style={{ height: 14, width: 14 }} />
                            </a>
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
