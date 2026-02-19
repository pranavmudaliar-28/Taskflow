
import "dotenv/config";
import { db } from "../server/db";
import { users, organizations, organizationMembers, organizationInvitations } from "../shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../server/storage";
import { sendOrganizationInvitationEmail } from "../server/email";

async function run() {
    console.log("Starting route logic reproduction...");

    const emailTarget = "jitendra@yopmail.com";
    console.log(`Searching for user '${emailTarget}'...`);
    const usersFound = await db.select().from(users).where(eq(users.email, emailTarget));

    if (usersFound.length === 0) {
        console.log(`User ${emailTarget} not found!`);
        return;
    }
    const inviter = usersFound[0];
    const inviterId = inviter.id;
    console.log(`Using Inviter: ${inviter.firstName} ${inviter.lastName} (${inviterId})`);

    const memberOrgs = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, inviterId));
    console.log(`User has ${memberOrgs.length} memberships.`);

    for (const member of memberOrgs) {
        const org = await storage.getOrganization(member.organizationId);
        if (!org) continue;

        console.log(`\n--- Attempting invite for Org: ${org.name} (${org.id}) ---`);

        try {
            // Perform strict route logic check
            if (member.role !== "admin" && member.role !== "team_lead") {
                console.log("Skipping, not admin/lead");
                continue;
            }

            const inviteEmail = "manish@yopmail.com"; // Same as user report
            const token = "test-route-token-" + org.id + "-" + Date.now();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            console.log(`Creating invitation for ${inviteEmail}...`);

            // Check for existing pending invites first (just for info)
            const pending = await db.select().from(organizationInvitations).where(eq(organizationInvitations.email, inviteEmail));
            console.log(`Existing pending invites for this email: ${pending.length}`);

            const invitation = await storage.createOrganizationInvitation({
                organizationId: org.id,
                email: inviteEmail,
                role: "Team Lead" as any, // Test "Team Lead" string
                invitedBy: inviterId,
                token,
                status: "pending",
                expiresAt,
            });
            console.log("Invitation created:", invitation);

            const acceptUrl = `http://localhost:5000/accept-invitation?token=${token}`;

            console.log("Sending email...");
            await sendOrganizationInvitationEmail({
                to: inviteEmail,
                organizationName: org.name,
                inviterName: `${inviter.firstName} ${inviter.lastName}`,
                acceptUrl,
                expiresAt,
            });

            console.log("Success!");

        } catch (error) {
            console.error(`Caught error for org ${org.name}:`, error);
        }
    }

    process.exit(0);
}

run().catch(console.error);
