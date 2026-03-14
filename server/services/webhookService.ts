import { logger } from "../utils/logger";

interface InviteWebhookData {
    email: string;
    name: string;
    tempPassword?: string;
    invitedBy: string;
    organization: string;
    loginUrl: string;
}

export class WebhookService {
    /**
     * Trigger the n8n webhook for a new member invitation
     */
    static async triggerInviteWebhook(data: InviteWebhookData): Promise<boolean> {
        const isProd = process.env.NODE_ENV === "production";
        const webhookUrl = isProd
            ? process.env.N8N_PROD_WEBHOOK_URL
            : process.env.N8N_TEST_WEBHOOK_URL;

        if (!webhookUrl) {
            logger.warn("[WebhookService] No webhook URL configured for current environment", {
                env: process.env.NODE_ENV,
                isProd
            });
            return false;
        }

        try {
            logger.info("[WebhookService] Triggering invite webhook", {
                url: webhookUrl,
                email: data.email,
                org: data.organization,
                env: process.env.NODE_ENV
            });

            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error("[WebhookService] Webhook request failed", {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                    url: webhookUrl
                });
                return false;
            }

            logger.info("[WebhookService] Webhook triggered successfully", {
                status: response.status,
                url: webhookUrl
            });
            return true;
        } catch (error: any) {
            logger.error("[WebhookService] Error triggering webhook", {
                error: error.message,
                stack: error.stack,
                url: webhookUrl
            });
            return false;
        }
    }
}
