import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
    iconClassName?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
    iconClassName,
}: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in", className)}>
            <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/20 text-muted-foreground/30 mb-5 relative", iconClassName)}>
                <Icon className="h-8 w-8" />
                <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl -z-10 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1.5">{title}</h3>
            <p className="text-sm text-muted-foreground/60 max-w-[280px] leading-relaxed mx-auto mb-6">
                {description}
            </p>
            {action && (
                <Button
                    variant="outline"
                    onClick={action.onClick}
                    className="rounded-xl px-6 border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all font-bold text-[11px] uppercase tracking-widest"
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
}
