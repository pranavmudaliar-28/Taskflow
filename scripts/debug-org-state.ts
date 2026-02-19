
import { db } from "../server/db";
import { users, organizations, organizationMembers, organizationInvitations } from "@shared/schema";
import { eq } from "drizzle-orm";

// Mock storage methods to avoid full server setup dependency if possible, 
// or just use direct DB queries for debugging.

async function main() {
    console.log("Debugging Organization State...");

    // 1. Find the user 'manish@yopmail.com'
    const userRes = await db.select().from(users).where(eq(users.email, "manish@yopmail.com"));
    const user = userRes[0];
    console.log("\n1. User 'manish@yopmail.com':");
    console.log(user);

    if (!user) {
        console.log("User not found!");
        process.exit(1);
    }

    // 2. Find memberships for this user
    const memberships = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, user.id));
    console.log("\n2. Memberships for user:");
    console.log(memberships);

    if (memberships.length > 0) {
        const orgId = memberships[0].organizationId;

        // 3. Check invitations for this org
        const invitations = await db.select().from(organizationInvitations).where(eq(organizationInvitations.organizationId, orgId));
        console.log(`\n3. Invitations for Org ${orgId}:`);
        invitations.forEach(inv => {
            console.log(`- Email: ${inv.email}, Status: ${inv.status}, Token: ${inv.token}`);
        });

        // 4. Check all members of this org
        const members = await db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, orgId));

        // Fetch user details for each member
        const memberDetails = [];
        for (const m of members) {
            const u = await db.select().from(users).where(eq(users.id, m.userId));
            memberDetails.push({
                ...m,
                user: u[0]
            });
        }

        console.log(`\n4. Members fetched via DB query (${orgId}):`);
        console.log(memberDetails);
    } else {
        console.log("User is not a member of any organization.");

        // Check if there are any pending invitations for this email
        const allInvites = await db.select().from(organizationInvitations).where(eq(organizationInvitations.email, "manish@yopmail.com"));
        console.log("\nInvites for this email:");
        console.log(allInvites);
    }

    process.exit(0);
}

main().catch(console.error);
