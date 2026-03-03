import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, ChevronDown, ChevronUp, X, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AiSummaryCardProps {
    channelId: string;
    onClose: () => void;
}

export function AiSummaryCard({ channelId, onClose }: AiSummaryCardProps) {
    const [expanded, setExpanded] = useState(true);

    const { data: existingSummary, isLoading } = useQuery<any>({
        queryKey: [`/api/channels/${channelId}/ai-summary`],
        retry: false,
    });

    const generateMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/ai/summarize-channel", { channelId });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || err.message || "Failed");
            }
            return res.json();
        },
    });

    const summary = generateMutation.data || existingSummary;
    const isGenerating = generateMutation.isPending;
    const error = generateMutation.error as Error | null;

    return (
        <div className="mx-4 my-2 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-semibold text-violet-300">AI Channel Summary</span>
                    {summary?.cached && (
                        <span className="text-[10px] bg-violet-500/20 text-violet-300 rounded-full px-1.5 py-0.5">
                            Cached
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => generateMutation.mutate()}
                        disabled={isGenerating}
                        title="Regenerate summary"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setExpanded((e) => !e)}
                    >
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4">
                    {isLoading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Loading...
                        </div>
                    )}

                    {!isLoading && !summary && !isGenerating && (
                        <div className="flex flex-col items-start gap-2">
                            <p className="text-xs text-muted-foreground">
                                No summary yet. Generate one to get an AI overview of this channel.
                            </p>
                            <Button
                                size="sm"
                                className="h-7 text-xs bg-violet-600 hover:bg-violet-700"
                                onClick={() => generateMutation.mutate()}
                            >
                                <Sparkles className="w-3 h-3 mr-1" />
                                Generate Summary
                            </Button>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="flex items-center gap-2 text-xs text-violet-300 animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Generating summary...
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-rose-400">{error.message}</p>
                    )}

                    {summary?.summary && !isGenerating && (
                        <p className="text-sm text-foreground leading-relaxed">{summary.summary}</p>
                    )}

                    {summary?.generatedAt && (
                        <p className="text-[10px] text-muted-foreground mt-2">
                            Generated {new Date(summary.generatedAt).toLocaleString()}
                            {summary.messageCount && ` · Based on ${summary.messageCount} messages`}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
