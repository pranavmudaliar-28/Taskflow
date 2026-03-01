import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
    iconSize?: number;
    textSize?: string;
    showText?: boolean;
}

export function Logo({ className, iconSize = 34, textSize = "text-lg", showText = true }: LogoProps) {
    return (
        <div className={cn("flex items-center gap-2 flex-shrink-0", className)}>
            <div
                style={{
                    height: iconSize,
                    width: iconSize,
                    borderRadius: Math.max(8, iconSize * 0.28),
                    background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 14px rgba(99,102,241,0.5)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    flexShrink: 0
                }}
            >
                <svg width={Math.max(14, iconSize * 0.55)} height={Math.max(14, iconSize * 0.55)} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="white" stroke="white" strokeWidth="1" strokeLinejoin="round" />
                </svg>
            </div>
            {showText && (
                <span className={cn("font-black tracking-tighter", textSize)} style={{ letterSpacing: "-0.03em", fontWeight: 900 }}>
                    TaskFlow Pro
                </span>
            )}
        </div>
    );
}
