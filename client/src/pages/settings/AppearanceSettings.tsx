import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Sun, Moon, Laptop, Palette, Layout, Type } from "lucide-react";

export default function AppearanceSettings() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Appearance</h2>
                <p className="text-muted-foreground mt-1">Customize how TaskFlow looks and feels on your device.</p>
            </div>

            <div className="space-y-6">
                <div className="space-y-4">
                    <Label className="text-lg font-bold flex items-center gap-2">
                        <Palette className="h-5 w-5 text-violet-600" />
                        Interface Theme
                    </Label>
                    <RadioGroup
                        defaultValue={theme}
                        onValueChange={(v) => setTheme(v as any)}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                    >
                        {[
                            { value: "light", label: "Light", icon: Sun, desc: "Classic clean look" },
                            { value: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
                            { value: "system", label: "System", icon: Laptop, desc: "Match your OS" },
                        ].map((item) => (
                            <label
                                key={item.value}
                                className={cn(
                                    "relative flex flex-col gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all hover:bg-accent/50",
                                    theme === item.value
                                        ? "border-violet-600 bg-violet-600/5 ring-4 ring-violet-600/10"
                                        : "border-border bg-card"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center",
                                        theme === item.value ? "bg-violet-600 text-white" : "bg-accent text-muted-foreground"
                                    )}>
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <RadioGroupItem value={item.value} className="sr-only" />
                                    {theme === item.value && (
                                        <div className="h-2 w-2 rounded-full bg-violet-600 animate-pulse" />
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-sm">{item.label}</p>
                                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                                </div>
                            </label>
                        ))}
                    </RadioGroup>
                </div>

                <div className="space-y-4 pt-4">
                    <Label className="text-lg font-bold flex items-center gap-2">
                        <Layout className="h-5 w-5 text-violet-600" />
                        Layout Density
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-card rounded-2xl border border-border flex items-center justify-between hover:bg-accent/30 transition-colors cursor-pointer">
                            <div className="space-y-1">
                                <p className="font-bold text-sm">Comfortable</p>
                                <p className="text-xs text-muted-foreground">Spaced out for better readability</p>
                            </div>
                            <div className="h-5 w-5 rounded-full border-2 border-violet-600 flex items-center justify-center">
                                <div className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                            </div>
                        </div>
                        <div className="p-4 bg-card rounded-2xl border border-border flex items-center justify-between hover:bg-accent/30 transition-colors cursor-pointer opacity-60">
                            <div className="space-y-1">
                                <p className="font-bold text-sm">Compact (Coming Soon)</p>
                                <p className="text-xs text-muted-foreground">Maximize information on screen</p>
                            </div>
                            <div className="h-5 w-5 rounded-full border-2 border-border" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <Label className="text-lg font-bold flex items-center gap-2">
                        <Type className="h-5 w-5 text-violet-600" />
                        Accessibility
                    </Label>
                    <div className="p-5 bg-card rounded-2xl border border-border space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">Reduce Motion</p>
                                <p className="text-xs text-muted-foreground">Minimize animations and transitions</p>
                            </div>
                            <div className="h-5 w-10 bg-accent rounded-full relative">
                                <div className="absolute left-1 top-1 h-3 w-3 bg-white rounded-full shadow-sm" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">High Contrast</p>
                                <p className="text-xs text-muted-foreground">Increase contrast for better accessibility</p>
                            </div>
                            <div className="h-5 w-10 bg-accent rounded-full relative">
                                <div className="absolute left-1 top-1 h-3 w-3 bg-white rounded-full shadow-sm" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
