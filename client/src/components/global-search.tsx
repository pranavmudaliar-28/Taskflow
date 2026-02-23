import * as React from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Search,
    LayoutDashboard,
    ListTodo,
    Clock,
    BarChart3,
    Settings,
    FolderKanban,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import type { Task, Project } from "@shared/schema";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
    const [open, setOpen] = React.useState(false);
    const [, setLocation] = useLocation();

    const { data: projects } = useQuery<Project[]>({
        queryKey: ["/api/projects"],
    });

    const { data: tasks } = useQuery<Task[]>({
        queryKey: ["/api/tasks/recent"],
    });

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="group relative flex h-9 w-full items-center justify-start rounded-xl border border-border/50 bg-card/60 px-3 text-xs text-muted-foreground transition-all hover:bg-card hover:border-primary/30 sm:w-64 md:w-80"
            >
                <Search className="mr-2 h-3.5 w-3.5" />
                <span className="inline-flex">Search workspace...</span>
                <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted/60 px-1.5 font-mono text-[10px] font-bold text-muted-foreground/40 sm:flex">
                    <span className="text-[10px]">⌘</span>K
                </kbd>
            </button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <div className="border-b border-border/50 p-1">
                    <CommandInput placeholder="Search tasks, projects, or commands..." />
                </div>
                <CommandList className="scrollbar-premium">
                    <CommandEmpty className="py-12 text-center">
                        <div className="flex flex-col items-center">
                            <Search className="h-8 w-8 text-muted-foreground/20 mb-4" />
                            <p className="text-sm font-semibold text-foreground">No matches found</p>
                            <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
                        </div>
                    </CommandEmpty>

                    <CommandGroup heading="Navigation">
                        <CommandItem onSelect={() => runCommand(() => setLocation("/dashboard"))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => setLocation("/tasks"))}>
                            <ListTodo className="mr-2 h-4 w-4" />
                            <span>All Tasks</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => setLocation("/time-tracking"))}>
                            <Clock className="mr-2 h-4 w-4" />
                            <span>Time Tracking</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => setLocation("/analytics"))}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            <span>Analytics</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    {projects && projects.length > 0 && (
                        <CommandGroup heading="Recent Projects">
                            {projects.slice(0, 5).map((project) => (
                                <CommandItem
                                    key={project.id}
                                    onSelect={() => runCommand(() => setLocation(`/projects/${project.slug || project.id}`))}
                                >
                                    <FolderKanban className="mr-2 h-4 w-4 text-primary/60" />
                                    <span>{project.name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    <CommandSeparator />

                    {tasks && tasks.length > 0 && (
                        <CommandGroup heading="Recent Tasks">
                            {tasks.slice(0, 8).map((task) => (
                                <CommandItem
                                    key={task.id}
                                    onSelect={() => runCommand(() => setLocation(`/tasks/${task.id}`))}
                                >
                                    {task.status === "done" ? (
                                        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                                    ) : (
                                        <AlertCircle className="mr-2 h-4 w-4 text-primary/60" />
                                    )}
                                    <div className="flex flex-col">
                                        <span className="font-medium">{task.title}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                            {task.status.replace("_", " ")}
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    <CommandSeparator />

                    <CommandGroup heading="Settings">
                        <CommandItem onSelect={() => runCommand(() => setLocation("/settings"))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>General Settings</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
