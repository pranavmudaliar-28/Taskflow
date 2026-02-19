
import "dotenv/config";
import { db } from "../server/db";
import { tasks } from "../shared/schema";
import { eq } from "drizzle-orm";

async function verify() {
    console.log("Verifying Subtasks...");

    // 1. Create a parent task
    const [parent] = await db.insert(tasks).values({
        title: "Test Parent Task",
        // Use a dummy or real ID if constraint exists. 
        // Wait, verification script runs in node, likely with DB connection.
        // I need a valid projectId if FK constraint exists.
        // 'tasks.projectId' doesn't look like it references projects table in schema I saw.
        // Let me check schema again.
        // tasks.projectId DOES NOT have .references(). It just says varchar("project_id").notNull().
        // So any string is fine.
        projectId: "test-project-1",
        status: "todo",
        priority: "medium",
    }).returning();

    console.log("Parent created:", parent.id);

    // 2. Create a child task
    const [child] = await db.insert(tasks).values({
        title: "Test Child Task",
        projectId: "test-project-1",
        parentId: parent.id,
        status: "todo",
    }).returning();

    console.log("Child created:", child.id, "ParentId:", child.parentId);

    if (child.parentId !== parent.id) {
        console.error("FAILED: Child parentId mismatch. Expected", parent.id, "got", child.parentId);
    } else {
        console.log("SUCCESS: Child has correct parentId in DB return.");
    }

    // 3. Fetch task to see if parentId persists in select
    const [fetchedChild] = await db.select().from(tasks).where(eq(tasks.id, child.id));
    console.log("Fetched Child ParentId:", fetchedChild.parentId);

    if (fetchedChild.parentId !== parent.id) {
        console.error("FAILED: Fetched child parentId mismatch.");
    } else {
        console.log("SUCCESS: Fetched child has correct parentId.");
    }

    // Cleanup
    await db.delete(tasks).where(eq(tasks.id, child.id));
    await db.delete(tasks).where(eq(tasks.id, parent.id));
    console.log("Cleanup done.");
    process.exit(0);
}

verify().catch(console.error);
