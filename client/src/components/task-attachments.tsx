import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Paperclip, Link as LinkIcon, Trash2, FileText, ExternalLink, Download, Plus } from "lucide-react";
import type { Attachment } from "@shared/schema";
import { format } from "date-fns";

interface TaskAttachmentsProps {
    taskId: string;
}

export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [linkName, setLinkName] = useState("");
    const [linkUrl, setLinkUrl] = useState("");

    const { data: attachments, isLoading } = useQuery<Attachment[]>({
        queryKey: [`/api/tasks/${taskId}/attachments`],
    });

    const createAttachmentMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", `/api/tasks/${taskId}/attachments`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/attachments`] });
            toast({ title: "Attachment added" });
            setIsAddingLink(false);
            setLinkName("");
            setLinkUrl("");
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to add attachment. Please check file size.",
                variant: "destructive"
            });
        }
    });

    const deleteAttachmentMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/attachments/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/attachments`] });
            toast({ title: "Attachment deleted" });
        },
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit file size to 5MB for base64
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Maximum file size is 5MB",
                variant: "destructive"
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            createAttachmentMutation.mutate({
                name: file.name,
                fileData: base64,
                size: file.size,
                type: file.type || "application/octet-stream",
            });
        };
        reader.readAsDataURL(file);

        // Reset input
        e.target.value = '';
    };

    const handleAddLink = () => {
        if (!linkName || !linkUrl) {
            toast({
                title: "Missing information",
                description: "Please provide both name and URL",
                variant: "destructive"
            });
            return;
        }

        let formattedUrl = linkUrl;
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = `https://${formattedUrl}`;
        }

        createAttachmentMutation.mutate({
            name: linkName,
            url: formattedUrl,
            type: "link",
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    Attachments
                </h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsAddingLink(!isAddingLink)}>
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Add Link
                    </Button>
                    <label className="cursor-pointer">
                        <Input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={createAttachmentMutation.isPending}
                        />
                        <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                            <Plus className="h-4 w-4 mr-2" />
                            Upload File
                        </div>
                    </label>
                </div>
            </div>

            {isAddingLink && (
                <div className="p-4 border rounded-md bg-muted/30 space-y-3 animate-in fade-in slide-in-from-top-1">
                    <Input
                        placeholder="Link Name (e.g. Design Doc)"
                        value={linkName}
                        onChange={(e) => setLinkName(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <Input
                            placeholder="https://..."
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                        />
                        <Button onClick={handleAddLink} disabled={createAttachmentMutation.isPending}>
                            Add
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {isLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Loading attachments...</p>
                ) : attachments?.length ? (
                    attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 rounded bg-primary/10 text-primary">
                                    {attachment.type === "link" ? <LinkIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium truncate">{attachment.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {attachment.type === "link" ? "External Link" : `${((attachment.size || 0) / 1024).toFixed(1)} KB`}
                                        {" • "}
                                        {format(new Date(attachment.createdAt!), "MMM d")}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {attachment.type === "link" ? (
                                    <Button variant="ghost" size="icon" asChild>
                                        <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="icon" asChild>
                                        <a href={attachment.url} download={attachment.name}>
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => {
                                        if (confirm("Delete this attachment?")) {
                                            deleteAttachmentMutation.mutate(attachment.id);
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-md border border-dashed">
                        No attachments yet
                    </div>
                )}
            </div>
        </div>
    );
}
