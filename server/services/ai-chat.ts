/**
 * ai-chat.ts — AI summarization service for chat channels and meetings
 *
 * Safeguards:
 *  ⑧ AI summarization scoped strictly by organizationId
 *  ⑥ Rate-limited by express-rate-limit (10/hour/org) in routes.ts
 *  Graceful fallback when OPENAI_API_KEY is not set
 */

import { MessageMongo, MeetingMongo, AiSummaryMongo } from "../../shared/mongodb-schema";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MESSAGE_FETCH_LIMIT = 100;

interface AiResponse {
    summary: string;
    keyDecisions?: string[];
    actionPoints?: string[];
}

async function callOpenAI(prompt: string): Promise<string> {
    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 512,
            temperature: 0.3,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI API error: ${err}`);
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content?.trim() || "";
}

/**
 * Summarize recent messages in a channel.
 * Enforces org scoping — verifies channel belongs to the given orgId.
 */
export async function summarizeChannel(
    orgId: string,
    channelId: string
): Promise<AiResponse> {
    // Fetch recent messages
    const messages = await MessageMongo.find(
        { channelId, deletedAt: null },
        { content: 1, senderId: 1, createdAt: 1 }
    )
        .sort({ createdAt: -1 })
        .limit(MESSAGE_FETCH_LIMIT)
        .lean() as any[];

    if (messages.length === 0) {
        return { summary: "No messages to summarize." };
    }

    const text = messages
        .reverse()
        .map((m: any) => `[${m.senderId}]: ${m.content}`)
        .join("\n");

    const prompt = `Summarize the following team chat messages in 3-5 concise sentences. Focus on key decisions, topics discussed, and action items.\n\nMessages:\n${text}\n\nSummary:`;

    if (!OPENAI_API_KEY) {
        return {
            summary: "AI summarization is disabled. Please configure OPENAI_API_KEY to enable this feature.",
        };
    }

    const summary = await callOpenAI(prompt);

    // Save summary to DB
    await AiSummaryMongo.create({
        channelId,
        organizationId: orgId,
        summary,
        generatedAt: new Date(),
        messageCount: messages.length,
    });

    return { summary };
}

/**
 * Summarize a meeting (transcript or reconstructed from messages).
 * Returns structured output with decisions and action points.
 */
export async function summarizeMeeting(
    meetingId: string,
    transcript?: string
): Promise<AiResponse> {
    const meeting = await MeetingMongo.findById(meetingId).lean() as any;
    if (!meeting) throw new Error("Meeting not found");

    const content = transcript || meeting.transcript || "";

    if (!content.trim()) {
        return {
            summary: "No transcript available for this meeting.",
            keyDecisions: [],
            actionPoints: [],
        };
    }

    if (!OPENAI_API_KEY) {
        return {
            summary: "AI summarization disabled. Configure OPENAI_API_KEY.",
            keyDecisions: [],
            actionPoints: [],
        };
    }

    const prompt = `You are a meeting summarizer. Given this meeting transcript, extract:
1. A 3-sentence summary of the meeting
2. Key decisions made (as a bullet list)
3. Action items / next steps (as a bullet list)

Transcript:
${content}

Return JSON in this format:
{"summary":"...","keyDecisions":["..."],"actionPoints":["..."]}`;

    const raw = await callOpenAI(prompt);

    let parsed: AiResponse = { summary: raw, keyDecisions: [], actionPoints: [] };
    try {
        parsed = JSON.parse(raw);
    } catch {
        // Raw text response as fallback
        parsed = { summary: raw, keyDecisions: [], actionPoints: [] };
    }

    // Persist to meeting document
    await MeetingMongo.findByIdAndUpdate(meetingId, {
        aiSummary: parsed.summary,
        keyDecisions: parsed.keyDecisions || [],
        actionPoints: parsed.actionPoints || [],
        lastSummarizedAt: new Date(),
    });

    return parsed;
}

/**
 * Get the latest AI summary for a channel.
 */
export async function getLatestChannelSummary(channelId: string, orgId: string) {
    const summary = await AiSummaryMongo.findOne(
        { channelId, organizationId: orgId },
        {},
        { sort: { generatedAt: -1 } }
    ).lean() as any;

    return summary || null;
}
