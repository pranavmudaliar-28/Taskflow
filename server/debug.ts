
import { db } from "./db";
import { users, organizations, organizationMembers, organizationInvitations } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Debugging Organization State...");

    const email = "manish@yopmail.com";

    // 1. Find the user
    const userRes = await db.select().from(users).where(eq(users.email, email));
    const user = userRes[0];
    console.log(`\n1. User '${email}':`, user);

    if (!user) {
        console.log("User not found!");
        // Check for invitation anyway
        const allInvites = await db.select().from(organizationInvitations).where(eq(organizationInvitations.email, email));
        console.log("\nInvites for this email:", allInvites);
        process.exit(0);
    }

    // 2. Find memberships
    const memberships = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, user.id));
    console.log("\n2. Memberships for user:", memberships);

    if (memberships.length > 0) {
        const orgId = memberships[0].organizationId;

        // 3. Check invitations for this org
        const invitations = await db.select().from(organizationInvitations).where(eq(organizationInvitations.organizationId, orgId));
        console.log(`\n3. ALL Invitations for Org ${orgId}:`);
        invitations.forEach(inv => {
            console.log(`- Email: ${inv.email}, Status: ${inv.status}, Token: ${inv.token}`);
        });

        // 4. Check all members of this org
        const members = await db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, orgId));
        console.log(`\n4. Members fetched via DB query (${orgId}):`);

        for (const m of members) {
            const u = await db.select().from(users).where(eq(users.id, m.userId));
            console.log(`- Member ID: ${m.id}, UserID: ${m.userId}, Role: ${m.role}, Name: ${u[0]?.firstName} ${u[0]?.lastName}, Email: ${u[0]?.email}`);
        }
    }

    process.exit(0);
}

main().catch(console.error);
