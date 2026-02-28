import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
    User,
    Settings,
    ShieldCheck,
    Palette,
    Globe,
    Bell,
    Layout,
    Zap,
    Building2,
    CheckCircle2
} from "lucide-react";

interface SettingsLayoutProps {
    children: React.ReactNode;
}

const settingsNavItems = [
    {
        label: "Personal",
        items: [
            { href: "/settings/profile", label: "My Profile", icon: User },
            { href: "/settings/notifications", label: "Notifications", icon: Bell },
            { href: "/settings/appearance", label: "Appearance", icon: Palette },
        ]
    },
    {
        label: "Workspace (Workspace Name)",
        items: [
            { href: "/settings/workspace", label: "General", icon: Building2 },
            { href: "/settings/statuses", label: "Statuses", icon: CheckCircle2 },
            { href: "/settings/hierarchy", label: "Hierarchy", icon: Layout },
            { href: "/settings/clickapps", label: "ClickApps", icon: Zap },
            { href: "/settings/localization", label: "Localization", icon: Globe },
            { href: "/settings/security", label: "Security & Permissions", icon: ShieldCheck },
        ]
    }
];

export function SettingsLayout({ children }: SettingsLayoutProps) {
    const [location] = useLocation();

    return (
        <div className="flex flex-col md:flex-row h-full min-h-[calc(100vh-3.5rem)]">
            {/* Settings Sidebar */}
            <aside className="w-full md:w-64 border-r border-border bg-background/50 backdrop-blur-sm shrink-0">
                <div className="p-4 border-b border-border">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Settings className="h-5 w-5 text-violet-600" />
                        Settings
                    </h2>
                </div>
                <nav className="p-2 space-y-6">
                    {settingsNavItems.map((group) => (
                        <div key={group.label} className="space-y-1">
                            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                {group.label}
                            </h3>
                            {group.items.map((item) => {
                                const isActive = location === item.href;
                                return (
                                    <Link key={item.href} href={item.href}>
                                        <span
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                                                isActive
                                                    ? "bg-violet-600/10 text-violet-600 shadow-sm"
                                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                            )}
                                        >
                                            <item.icon className={cn("h-4 w-4", isActive ? "text-violet-600" : "")} />
                                            {item.label}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Settings Content */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
