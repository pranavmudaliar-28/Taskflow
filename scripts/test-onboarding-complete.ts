
import { storage } from "../server/storage";
import { createServer } from "http";
import express from "express";
import { setupAuth } from "../server/auth";
import { registerRoutes } from "../server/routes";
import request from "supertest";

async function main() {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    const server = createServer(app);
    await setupAuth(app);
    registerRoutes(app);

    // 1. Create a user
    const email = `test_complete_${Date.now()}@example.com`;
    const password = "password123";

    console.log("Registering user:", email);
    const agent = request.agent(app);

    await agent
        .post("/api/auth/register")
        .send({ email, password, firstName: "Test", lastName: "User" })
        .expect(201);

    // 2. Check initial state
    let user = await storage.getUserByEmail(email);
    console.log("Initial onboarding step:", user?.onboardingStep);
    if (user?.onboardingStep === "completed") {
        console.error("User shouldn't be completed yet!");
        process.exit(1);
    }

    // 3. Call complete endpoint
    console.log("Calling POST /api/onboarding/complete...");
    await agent
        .post("/api/onboarding/complete")
        .expect(200)
        .expect({ success: true });

    // 4. Verify state
    user = await storage.getUserByEmail(email);
    console.log("Final onboarding step:", user?.onboardingStep);

    if (user?.onboardingStep !== "completed") {
        console.error("Failed to update onboarding step!");
        process.exit(1);
    }

    console.log("Verification SUCCESS!");
    process.exit(0);
}

main().catch(console.error);
