
import "dotenv/config";
import { storage } from "./storage";
import { generateSlug } from "./slug-utils";
import { db } from "./db";
import { projects } from "@shared/schema";
import { eq } from "drizzle-orm";

async function runMigrations() {
    console.log("Starting slug backfill migration...");

    // Get all projects
    const allProjects = await db.select().from(projects);

    for (const project of allProjects) {
        if (!project.slug) {
            let slug = generateSlug(project.name);

            // Ensure uniqueness
            let uniqueSlug = slug;
            let counter = 1;
            while (true) {
                const existing = await db.select().from(projects).where(eq(projects.slug, uniqueSlug));
                if (existing.length === 0) break;
                uniqueSlug = `${slug}-${counter}`;
                counter++;
            }

            console.log(`Updating project "${project.name}" (${project.id}) with slug: ${uniqueSlug}`);
            await storage.updateProject(project.id, { slug: uniqueSlug });
        }
    }

    console.log("Slug backfill migration completed.");
    process.exit(0);
}

runMigrations().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
