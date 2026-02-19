
import "dotenv/config";

import { db } from "../server/db";
import { users, organizations, organizationMembers, organizationInvitations } from "../shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../server/storage";

async function run() {
    console.log("Checking DB state for manish@yopmail.com...");
    const user = await storage.getUserByEmail("manish@yopmail.com");

    if (user) {
        console.log("User found:", user);
        const orgs = await storage.getOrganizationsByUser(user.id);
        console.log("User's organizations:", orgs);
    } else {
        console.log("User manish@yopmail.com not found in DB.");
    }

    // Get the first organization to try inviting to
    const allOrgs = await db.select().from(organizations).limit(1);
    if (allOrgs.length === 0) {
        console.error("No organizations found to test with.");
        process.exit(1);
    }
    const org = allOrgs[0];
    console.log(`Attempting to invite manish@yopmail.com to org: ${org.name} (${org.id})`);

    try {
        const token = "test-token-" + Date.now();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Simulate what routes.ts does
        const invitation = await storage.createOrganizationInvitation({
            organizationId: org.id,
            email: "manish@yopmail.com",
            role: "member",
            invitedBy: org.ownerId, // Assuming owner invites
            token,
            status: "pending",
            expiresAt,
        });
        console.log("Invitation created successfully:", invitation);
    } catch (error) {
        console.error("Error creating invitation (Simulating 500):", error);
    }

    process.exit(0);
}

run().catch(console.error);
