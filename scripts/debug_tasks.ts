
import { storage } from "../server/storage";

async function main() {
    console.log("Fetching projects...");
    const projects = await storage.getUserProjects(1); // Assuming user 1 for now, or fetch all if possible
    console.log("Projects:", projects.map(p => ({ id: p.id, name: p.name, slug: p.slug })));

    console.log("\nFetching all tasks...");
    // Using a search with no filters to get all tasks
    const result = await storage.searchTasks({ limit: 100 });
    const tasks = result.tasks;

    console.log("Tasks:");
    tasks.forEach(t => {
        console.log(`- ID: ${t.id}, Title: "${t.title}", ProjectID: ${t.projectId}, ParentID: ${t.parentId}`);
    });

    const loopProject = projects.find(p => p.slug === 'loop' || p.name === 'loop');
    if (loopProject) {
        console.log(`\nTasks strictly for Project 'loop' (ID: ${loopProject.id}):`);
        const projectTasks = tasks.filter(t => t.projectId === loopProject.id);
        console.log(projectTasks.length > 0 ? projectTasks.map(t => t.title) : "No tasks found.");
    } else {
        console.log("\nCould not find project 'loop' in the fetched projects.");
    }
}

main().catch(console.error);
