
import "dotenv/config";
import { db } from "../server/db";
import { users, organizations, organizationMembers, organizationInvitations } from "../shared/schema";
import { eq, like, or } from "drizzle-orm";

async function run() {
    console.log("Searching for user 'jitendra'...");
    const foundUsers = await db.select().from(users).where(
        or(
            like(users.firstName, "%jitendra%"),
            like(users.email, "%jitendra%")
        )
    );

    console.log(`Found ${foundUsers.length} users.`);

    for (const user of foundUsers) {
        console.log(`\nUser: ${user.firstName} ${user.lastName} (${user.email}) ID: ${user.id}`);

        const members = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, user.id));
        console.log(`  Memberships: ${members.length}`);

        for (const member of members) {
            console.log(`  - Org ID: ${member.organizationId}, Role: ${member.role}`);
            const org = await db.query.organizations.findFirst({
                where: eq(organizations.id, member.organizationId)
            });
            console.log(`    Org Name: ${org?.name}`);

            const invites = await db.select().from(organizationInvitations).where(eq(organizationInvitations.organizationId, member.organizationId));
            console.log(`    Existing Invites: ${invites.length}`);
            invites.forEach(inv => console.log(`      - ${inv.email} (${inv.status})`));
        }
    }

    process.exit(0);
}

run().catch(console.error);
