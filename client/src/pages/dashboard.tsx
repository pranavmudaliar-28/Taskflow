import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ListTodo, Plus, Search, Clock, Activity } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Task } from "@shared/schema";

export default function DashboardRedesign() {
  const { user } = useAuth();

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/recent"],
  });

  const todayTasks = tasks?.slice(0, 3) || [];

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur px-6 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Good day, {user?.firstName || "there"}</h1>
            <p className="text-sm text-muted-foreground">Stay focused and keep work moving.</p>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tasks or projects…" className="pl-9" />
            </div>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Today Focus */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold mb-3">Today Focus</h2>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : todayTasks.length > 0 ? (
            <div className="space-y-2">
              {todayTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/40">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{task.title}</span>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tasks for today.</p>
          )}
        </section>

        {/* KPI Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {["Tasks", "Completed", "In Progress", "Overdue"].map(label => (
            <div key={label} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold mt-1">—</p>
            </div>
          ))}
        </section>

        {/* Main Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tasks */}
          <div className="lg:col-span-2 rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Recent Tasks</h2>
            </div>

            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : tasks && tasks.length > 0 ? (
              <div className="divide-y">
                {tasks.slice(0, 6).map(task => (
                  <div key={task.id} className="py-2 flex items-center justify-between">
                    <span className="text-sm">{task.title}</span>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent tasks.</p>
            )}
          </div>

          {/* Activity Feed */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold mb-3">Activity</h2>
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
