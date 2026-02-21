/**
 * stripe.ts — Real Stripe Checkout + Billing Portal + Webhook
 *
 * Dev:  uses sk_test_... keys (Stripe sandbox)
 * Prod: uses sk_live_... keys (based on STRIPE_SECRET_KEY value)
 */

import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { UserMongo } from "../shared/mongodb-schema";
import { isAuthenticated } from "./replit_integrations/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2026-01-28.clover" as any,
});

// ── Plan config ────────────────────────────────────────────────────────────────
export const STRIPE_PLANS = {
    free: { name: "Free", priceId: null, amount: 0 },
    pro: { name: "Pro", priceId: process.env.STRIPE_PRO_PRICE_ID || null, amount: 2900 },
    team: { name: "Team", priceId: process.env.STRIPE_TEAM_PRICE_ID || null, amount: 9900 },
};

// ── Helper: resolve plan from price ID ─────────────────────────────────────────
function getPlanFromPriceId(priceId: string | null | undefined): string {
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
    if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return "team";
    return "free";
}

// ── Helper: find or create Stripe customer ─────────────────────────────────────
async function getOrCreateCustomer(userId: string, email: string, name?: string): Promise<string> {
    const user = await UserMongo.findById(userId);
    if (user?.stripeCustomerId) return user.stripeCustomerId;

    const customer = await stripe.customers.create({
        email,
        name: name || email,
        metadata: { userId },
    });

    await UserMongo.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
    return customer.id;
}

// ── Register routes ────────────────────────────────────────────────────────────
export function registerStripeRoutes(app: Express) {

    // ── 1. Create Checkout Session ──────────────────────────────────────────────
    app.post("/api/stripe/create-checkout-session", async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: "Unauthorized" });

            const { plan, returnTo } = req.body as { plan: string; returnTo?: string };
            if (!plan || plan === "free") {
                return res.status(400).json({ message: "Select a paid plan (pro or team)" });
            }

            const planConfig = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS];
            if (!planConfig?.priceId) {
                return res.status(400).json({
                    message: `Price ID for plan "${plan}" is not configured. Set STRIPE_${plan.toUpperCase()}_PRICE_ID in your .env file.`,
                });
            }

            const userId = user.id || user.claims?.sub;
            const userDoc = await UserMongo.findById(userId);
            if (!userDoc) return res.status(404).json({ message: "User not found" });

            const customerId = await getOrCreateCustomer(
                userId,
                userDoc.email!,
                `${userDoc.firstName || ""} ${userDoc.lastName || ""}`.trim()
            );

            const appUrl =
                process.env.APP_URL ||
                (process.env.NODE_ENV === "production"
                    ? "https://your-domain.com"
                    : `http://localhost:${process.env.PORT || 5002}`);

            // Build success_url based on where the user started checkout from:
            // - "onboarding": return to /onboarding?step=verify so the onboarding
            //   flow can call session-status and then proceed to org creation.
            // - "billing" (default): return to /billing with success params.
            const successUrl = returnTo === "onboarding"
                ? `${appUrl}/onboarding?step=verify&session_id={CHECKOUT_SESSION_ID}&plan=${plan}`
                : `${appUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}&plan=${plan}`;

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ["card"],
                line_items: [{ price: planConfig.priceId, quantity: 1 }],
                success_url: successUrl,
                cancel_url: returnTo === "onboarding"
                    ? `${appUrl}/onboarding?canceled=true`
                    : `${appUrl}/billing?canceled=true`,
                subscription_data: { metadata: { userId, plan } },
                metadata: { userId, plan },
                allow_promotion_codes: true,
            });

            return res.json({ url: session.url });
        } catch (err: any) {
            console.error("[Stripe] create-checkout-session error:", err);
            return res.status(500).json({ message: err.message || "Failed to create checkout session" });
        }
    });

    // ── 2. Create Billing Portal Session ───────────────────────────────────────
    app.post("/api/stripe/create-portal-session", async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: "Unauthorized" });

            const userId = user.id || user.claims?.sub;
            const userDoc = await UserMongo.findById(userId);

            if (!userDoc?.stripeCustomerId) {
                return res.status(400).json({
                    message: "No billing account found. Please subscribe to a plan first.",
                });
            }

            const appUrl =
                process.env.APP_URL ||
                (process.env.NODE_ENV === "production"
                    ? "https://your-domain.com"
                    : `http://localhost:${process.env.PORT || 5002}`);

            const portalSession = await stripe.billingPortal.sessions.create({
                customer: userDoc.stripeCustomerId,
                return_url: `${appUrl}/billing`,
            });

            return res.json({ url: portalSession.url });
        } catch (err: any) {
            console.error("[Stripe] create-portal-session error:", err);
            return res.status(500).json({ message: err.message || "Failed to create portal session" });
        }
    });

    // ── 3. Webhook ─────────────────────────────────────────────────────────────
    // NOTE: /api/stripe/webhook uses express.raw() registered in routes.ts BEFORE this
    app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
        const sig = req.headers["stripe-signature"] as string;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.warn("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set — skipping verification");
            return res.json({ received: true });
        }

        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
        } catch (err: any) {
            console.error("[Stripe Webhook] Signature verification failed:", err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        console.log(`[Stripe Webhook] Received: ${event.type}`);

        try {
            switch (event.type) {
                // ── checkout.session.completed ─────────────────────────────────────────
                case "checkout.session.completed": {
                    const session = event.data.object as Stripe.Checkout.Session;
                    const userId = session.metadata?.userId;
                    const plan = session.metadata?.plan;

                    if (userId && plan) {
                        await UserMongo.findByIdAndUpdate(userId, {
                            plan,
                            stripeCustomerId: session.customer as string,
                            onboardingStep: "completed",
                        });
                        console.log(`[Stripe Webhook] User ${userId} → plan: ${plan}`);
                    }
                    break;
                }

                // ── customer.subscription.updated ──────────────────────────────────────
                case "customer.subscription.updated": {
                    const sub = event.data.object as Stripe.Subscription;
                    const custId = sub.customer as string;
                    const priceId = sub.items.data[0]?.price.id;
                    const plan = getPlanFromPriceId(priceId);

                    if (sub.status === "active" || sub.status === "trialing") {
                        await UserMongo.findOneAndUpdate({ stripeCustomerId: custId }, { plan });
                        console.log(`[Stripe Webhook] Subscription updated → plan: ${plan}`);
                    }
                    break;
                }

                // ── customer.subscription.deleted ──────────────────────────────────────
                case "customer.subscription.deleted": {
                    const sub = event.data.object as Stripe.Subscription;
                    const custId = sub.customer as string;
                    await UserMongo.findOneAndUpdate({ stripeCustomerId: custId }, { plan: "free" });
                    console.log(`[Stripe Webhook] Subscription deleted → plan: free`);
                    break;
                }

                // ── invoice.payment_failed ────────────────────────────────────────────
                case "invoice.payment_failed": {
                    const invoice = event.data.object as Stripe.Invoice;
                    console.warn(`[Stripe Webhook] Payment failed for customer: ${invoice.customer}`);
                    break;
                }

                default:
                    console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
            }
        } catch (handlerErr) {
            console.error("[Stripe Webhook] Handler error:", handlerErr);
        }

        return res.json({ received: true });
    });

    // ── 4. Subscription status ────────────────────────────────────────────────
    app.get("/api/stripe/subscription-status", async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: "Unauthorized" });

            const userId = user.id || user.claims?.sub;
            const userDoc = await UserMongo.findById(userId);

            if (!userDoc?.stripeCustomerId) {
                return res.json({ plan: userDoc?.plan || "free", subscription: null });
            }

            const subs = await stripe.subscriptions.list({
                customer: userDoc.stripeCustomerId,
                status: "active",
                limit: 1,
            });

            const activeSub = subs.data[0] ?? null;
            return res.json({
                plan: userDoc.plan || "free",
                subscription: activeSub
                    ? {
                        id: activeSub.id,
                        status: activeSub.status,
                        cancelAtPeriodEnd: activeSub.cancel_at_period_end,
                    }
                    : null,
            });
        } catch (err: any) {
            console.error("[Stripe] subscription-status error:", err);
            return res.status(500).json({ message: err.message });
        }
    });

    // ── 5. Session Status (for Onboarding) ─────────────────────────────────────
    app.get("/api/stripe/session-status", isAuthenticated, async (req: Request, res: Response) => {
        try {
            const { session_id } = req.query;
            if (!session_id || typeof session_id !== "string") {
                return res.status(400).json({ message: "Missing session ID" });
            }

            // Mock handling
            if (session_id.startsWith("mock_")) {
                const user = (req as any).user;
                const userId = user.id || user.claims?.sub;
                await UserMongo.findByIdAndUpdate(userId, {
                    plan: "pro",
                    onboardingStep: "completed"  // ← was "organization"; that caused redirect back to /onboarding
                });
                return res.json({ status: "success" });
            }

            const session = await stripe.checkout.sessions.retrieve(session_id);

            if (session.payment_status === "paid") {
                const userId = session.metadata?.userId;
                const plan = session.metadata?.plan;

                if (userId) {
                    await UserMongo.findByIdAndUpdate(userId, {
                        plan: plan || "free",
                        // Always mark onboarding as completed — a paid user already
                        // has an org. Setting "organization" here caused App.tsx to
                        // redirect back to /onboarding after Stripe payment.
                        onboardingStep: "completed",
                        stripeCustomerId: session.customer as string
                    });
                    return res.json({ status: "success" });
                }
            }

            return res.json({ status: "pending" });
        } catch (err: any) {
            console.error("[Stripe] session-status error:", err);
            return res.status(500).json({ message: "Failed to verify session" });
        }
    });
}
