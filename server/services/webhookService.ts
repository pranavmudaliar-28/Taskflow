export class WebhookService {
    private static getWebhookUrl(): string {
        return process.env.NODE_ENV === "production"
            ? process.env.N8N_PROD_WEBHOOK_URL || ""
            : process.env.N8N_TEST_WEBHOOK_URL || "";
    }

    static async triggerInviteWebhook(data: {
        email: string;
        name: string;
        tempPassword: string;
        invitedBy: string;
        organization: string;
        loginUrl: string;
    }): Promise<boolean> {
        const url = this.getWebhookUrl();
        if (!url) {
            console.warn("[WebhookService] No n8n webhook URL configured for current environment");
            return false;
        }

        try {
            console.log(`[WebhookService] Triggering n8n webhook for ${data.email}...`);
            console.log(`[WebhookService] Webhook URL: ${url}`);
            console.log(`[WebhookService] Payload:`, JSON.stringify(data, null, 2));

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => "No error body");
                throw new Error(`n8n webhook responded with status: ${response.status}. Body: ${errorText}`);
            }

            console.log(`[WebhookService] n8n webhook triggered successfully for ${data.email}`);
            return true;
        } catch (error) {
            console.error("[WebhookService] Failed to trigger n8n webhook:", error);
            return false;
        }
    }
}
