import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Zap, Lock } from "lucide-react";
import type { Project } from "@shared/schema";

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
}

const FREE_PLAN_PROJECT_LIMIT = 3;

export function CreateProjectDialog({ open, onClose, organizationId }: CreateProjectDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);

  // Read existing projects from cache (already fetched by AppRouter)
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  // Determine if user has hit the free plan limit
  const plan = user?.plan || "free";
  const projectCount = projects?.length ?? 0;
  const isAtFreeLimit = plan === "free" && projectCount >= FREE_PLAN_PROJECT_LIMIT;

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/projects", {
        name,
        description: description || undefined,
        organizationId,
        isPrivate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Project created successfully" });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create project",
        description: error?.message || "Please try again",
        variant: "destructive"
      });
    },
  });

  const handleClose = () => {
    setName("");
    setDescription("");
    setIsPrivate(true);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createProjectMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        {isAtFreeLimit ? (
          /* ── Upgrade Prompt ──────────────────────────────────────────────── */
          <>
            <DialogHeader>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-950 mx-auto mb-2">
                <Lock className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <DialogTitle className="text-center">Project Limit Reached</DialogTitle>
              <DialogDescription className="text-center">
                You've used all <strong>{FREE_PLAN_PROJECT_LIMIT} projects</strong> included in the Free plan.
                Upgrade to <strong>Pro</strong> or <strong>Team</strong> for unlimited projects.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-2">
              <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 p-3 text-sm text-violet-700 dark:text-violet-300 flex items-start gap-2">
                <Zap className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Pro plan — <strong>$29/mo</strong> — Unlimited projects, advanced analytics &amp; priority support.</span>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Link href="/billing" onClick={handleClose}>
                <Button className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90" data-testid="button-upgrade-from-limit">
                  <Zap className="h-4 w-4 mr-1.5" />
                  Upgrade Now
                </Button>
              </Link>
              <Button type="button" variant="ghost" className="w-full" onClick={handleClose}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* ── Create Project Form ─────────────────────────────────────────── */
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a project to organize your team's tasks and track progress.
                {plan === "free" && (
                  <span className="block mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Free plan: {projectCount} / {FREE_PLAN_PROJECT_LIMIT} projects used
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter project name..."
                  autoFocus
                  data-testid="input-project-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this project about?"
                  className="resize-none"
                  rows={3}
                  data-testid="input-project-description"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="private">Private Project</Label>
                  <p className="text-xs text-muted-foreground">
                    Only invited members can view and access
                  </p>
                </div>
                <Switch
                  id="private"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                  data-testid="switch-project-private"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || createProjectMutation.isPending}
                data-testid="button-create-project-submit"
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
