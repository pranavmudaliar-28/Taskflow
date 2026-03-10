import { storage } from "../server/storage";
import { authStorage } from "../server/replit_integrations/auth/storage";
import { WebhookService } from "../server/services/webhookService";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { UserMongo, OrganizationMongo, OrganizationMemberMongo } from "../shared/mongodb-schema";
import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

// Set DNS servers to Google's to avoid local DNS issues with Atlas
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

async function testInviteAutomation() {
    console.log("--- Starting Invitation Automation Test ---");

    try {
        // 1. Setup mock environment
        process.env.NODE_ENV = "development";
        process.env.N8N_TEST_WEBHOOK_URL = "https://httpbin.org/post"; // Use httpbin for testing

        // Connect to MongoDB if not already connected
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI!);
            console.log("Connected to MongoDB");
        }

        // 2. Create a test organization
        const admin = await UserMongo.findOne({ role: "admin" });
        if (!admin) {
            console.error("No admin user found to perform test");
            return;
        }

        const org = await OrganizationMongo.create({
            name: "Test Automation Org",
            ownerId: admin._id.toString()
        });
        console.log(`Created test organization: ${org.name} (${org._id})`);

        const testEmail = `test-invite-${crypto.randomBytes(4).toString("hex")}@example.com`;
        console.log(`Testing with email: ${testEmail}`);

        // 3. Simulate the Invite Logic (logic from routes.ts)
        let user = await UserMongo.findOne({ email: testEmail });
        let tempPassword = "";

        if (!user) {
            tempPassword = crypto.randomBytes(4).toString("hex").toUpperCase();
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            console.log(`Creating new user with temp password: ${tempPassword}`);
            user = await UserMongo.create({
                email: testEmail,
                password: hashedPassword,
                firstName: testEmail.split("@")[0],
                lastName: "",
                onboardingStep: "completed",
                role: "member",
                plan: "free",
                mustChangePassword: true
            });
        }

        // Add to organization
        const membership = await OrganizationMemberMongo.create({
            organizationId: org._id.toString(),
            userId: user._id.toString(),
            role: "member"
        });
        console.log(`Added user to organization: ${membership._id}`);

        // Trigger webhook
        const webhookTriggered = await WebhookService.triggerInviteWebhook({
            email: testEmail,
            name: user.firstName || testEmail.split("@")[0],
            tempPassword: tempPassword || "(Already an account holder)",
            invitedBy: admin.email || "Admin",
            organization: org.name || "TaskFlow",
            loginUrl: "http://localhost:5003/login"
        });

        if (webhookTriggered) {
            console.log("SUCCESS: n8n Webhook Triggered successfully!");
        } else {
            console.error("FAILED: n8n Webhook Trigger failed.");
        }

        // 4. Cleanup
        await OrganizationMemberMongo.deleteOne({ _id: membership._id });
        await UserMongo.deleteOne({ _id: user._id });
        await OrganizationMongo.deleteOne({ _id: org._id });
        console.log("Cleanup complete.");

    } catch (error) {
        console.error("Test failed with error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
}

testInviteAutomation();
