import { db } from "./db";
import { projects, tasks, projectMembers, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";

export async function seedDatabase(userId: string) {
  try {
    // Initialize user's workspace (creates org if needed)
    const org = await storage.initializeUserWorkspace(userId);

    // Check if user has already been seeded (prevents re-seeding after deletion)
    const user = await storage.getUser(userId);
    if (user?.seeded) {
      return;
    }

    console.log(`Seeding database for user ${userId}...`);

    // Create sample projects for this user - DISABLED as per user request
    // Users start with empty workspace

    // Mark user as seeded so we don't re-seed after they delete everything
    await db.update(users).set({ seeded: true }).where(eq(users.id, userId));

    console.log(`User workspace initialized for user ${userId}!`);
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
