
import { db } from "../server/db";
import { projects, tasks } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    try {
        console.log("Fetching projects directly from DB...");
        const allProjects = await db.select().from(projects);
        console.log("Projects found:", allProjects.length);
        allProjects.forEach(p => console.log(`Project: ${p.name} (ID: ${p.id}, OrgID: ${p.organizationId})`));

        const loopProject = allProjects.find(p => p.name === 'loop' || p.slug === 'loop');

        if (loopProject) {
            console.log(`\nFound 'loop' project with ID: ${loopProject.id}`);
            const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, loopProject.id));
            console.log(`Tasks for 'loop' project: ${projectTasks.length}`);
            projectTasks.forEach(t => console.log(`- ${t.title} (ID: ${t.id}, ProjectID: ${t.projectId})`));

            // Check type of ID
            console.log(`Type of Project ID: ${typeof loopProject.id}`);
            console.log(`Type of Task ProjectID: ${typeof projectTasks[0]?.projectId}`);
        } else {
            console.log("Could not find project 'loop'");
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

main().catch(console.error);
