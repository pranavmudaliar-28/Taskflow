import { Plus, Search, Timer, Users, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface QuickActionBarProps {
    onCreateTask: () => void;
    onStartTimer: () => void;
    onInviteTeam: () => void;
}

export function QuickActionBar({
    onCreateTask,
    onStartTimer,
    onInviteTeam,
}: QuickActionBarProps) {
    return (
        <div className="flex items-center gap-1.5 px-2 py-1.5 glass-panel-blur border-border/40 bg-card/40 rounded-2xl shadow-premium animate-fade-in transition-all hover:bg-card/60">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onCreateTask}
                        className="h-9 w-9 text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-all rounded-xl group"
                    >
                        <Plus className="h-[18px] w-[18px] group-hover:rotate-90 transition-transform duration-300" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="glass-panel border-border/50 bg-background/90 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">Create Mission Objective</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onStartTimer}
                        className="h-9 w-9 text-muted-foreground/60 hover:text-amber-500 hover:bg-amber-500/10 transition-all rounded-xl group"
                    >
                        <Timer className="h-[18px] w-[18px] group-hover:scale-110 transition-transform duration-300" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="glass-panel border-border/50 bg-background/90 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">Initialize Telemetry</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onInviteTeam}
                        className="h-9 w-9 text-muted-foreground/60 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all rounded-xl group"
                    >
                        <Users className="h-[18px] w-[18px] group-hover:scale-110 transition-transform duration-300" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="glass-panel border-border/50 bg-background/90 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">Deploy Personnel</TooltipContent>
            </Tooltip>
        </div>
    );
}
