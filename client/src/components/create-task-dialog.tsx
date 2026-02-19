import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { User, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { User as UserType } from "@shared/models/auth";
import type { Milestone, Project } from "@shared/schema";

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  initialStatus?: string;
  initialMilestone?: string;
  parentId?: string;
  members?: UserType[];
  projects?: Project[];
  onSuccess?: (createdTask: any) => void;
}

export function CreateTaskDialog({ open, onClose, projectId, initialStatus = "todo", initialMilestone, parentId, members = [], projects = [], onSuccess }: CreateTaskDialogProps) {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [status, setStatus] = useState<string>(initialStatus);
  const [assigneeId, setAssigneeId] = useState<string>("unassigned");
  const [startDate, setStartDate] = useState<Date>();
  const [deliveryRole, setDeliveryRole] = useState("");
  const [milestone, setMilestone] = useState(initialMilestone || "");
  const [reviewerId, setReviewerId] = useState<string>("unassigned");
  const [testerId, setTesterId] = useState<string>("unassigned");

  const { data: milestones } = useQuery<Milestone[]>({
    queryKey: ["/api/projects", selectedProjectId, "milestones"],
    enabled: !!selectedProjectId,
  });

  // Effect to update state when props change
  useEffect(() => {
    if (open) {
      if (initialMilestone && initialMilestone !== "no-milestone") {
        setMilestone(initialMilestone);
      } else {
        setMilestone("");
      }
      if (initialStatus) setStatus(initialStatus);
    }
    if (initialStatus) setStatus(initialStatus);
    if (projectId) setSelectedProjectId(projectId);
  }, [open, initialMilestone, initialStatus, projectId]);

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/tasks", {
        title,
        description: description || undefined,
        projectId: selectedProjectId,
        priority,
        status,
        assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
        reviewerId: reviewerId === "unassigned" ? undefined : reviewerId,
        testerId: testerId === "unassigned" ? undefined : testerId,
        startDate: startDate ? startDate.toISOString() : undefined,
        deliveryRole: deliveryRole || undefined,
        milestoneId: milestone || undefined,
        parentId,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/search"] });
      toast({
        title: "Task created",
        description: "Task has been created successfully.",
      });
      onSuccess?.(data);
      handleClose(); // Use handleClose to reset state and call onClose
    },
    onError: (error) => {
      toast({
        title: "Failed to create task",
        description: error.message || "An unknown error occurred",
        variant: "destructive"
      });
    },
  });

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setStatus("todo");
    setAssigneeId("unassigned");
    setReviewerId("unassigned");
    setTesterId("unassigned");
    setStartDate(undefined);
    setDeliveryRole("");
    setMilestone("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createTaskMutation.mutate();
  };

  const getInitials = (member: UserType) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
    }
    return member.email?.[0].toUpperCase() || "?";
  };

  const getMemberName = (member: UserType) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName} ${member.lastName}`;
    }
    return member.email || "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!parentId && projects.length > 0 && (
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Milestone</Label>
              <Select value={milestone} onValueChange={setMilestone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select milestone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-milestone">No Milestone</SelectItem>
                  {milestones?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title..."
                autoFocus
                data-testid="input-task-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                className="resize-none"
                rows={3}
                data-testid="input-task-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger data-testid="select-task-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${s.color}`} />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${p.color}`} />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger data-testid="select-task-assignee">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Unassigned
                      </div>
                    </SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.profileImageUrl || undefined} />
                            <AvatarFallback className="text-[10px]">{getInitials(member)}</AvatarFallback>
                          </Avatar>
                          {getMemberName(member)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reviewer</Label>
                <Select value={reviewerId} onValueChange={setReviewerId}>
                  <SelectTrigger data-testid="select-task-reviewer">
                    <SelectValue placeholder="Select reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Unassigned
                      </div>
                    </SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.profileImageUrl || undefined} />
                            <AvatarFallback className="text-[10px]">{getInitials(member)}</AvatarFallback>
                          </Avatar>
                          {getMemberName(member)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tester</Label>
                <Select value={testerId} onValueChange={setTesterId}>
                  <SelectTrigger data-testid="select-task-tester">
                    <SelectValue placeholder="Select tester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Unassigned
                      </div>
                    </SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.profileImageUrl || undefined} />
                            <AvatarFallback className="text-[10px]">{getInitials(member)}</AvatarFallback>
                          </Avatar>
                          {getMemberName(member)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || createTaskMutation.isPending}
              data-testid="button-create-task-submit"
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
