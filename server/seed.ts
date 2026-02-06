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

    // Create sample projects for this user
    const projectsData = [
      {
        name: "Website Redesign",
        description: "Complete overhaul of the company website with modern design",
        organizationId: org.id,
        isPrivate: false,
      },
      {
        name: "Mobile App Development",
        description: "Build cross-platform mobile application for customers",
        organizationId: org.id,
        isPrivate: false,
      },
      {
        name: "Marketing Campaign Q1",
        description: "Plan and execute Q1 marketing initiatives",
        organizationId: org.id,
        isPrivate: true,
      },
    ];

    const createdProjects = await db.insert(projects).values(projectsData).returning();

    // Create sample tasks for Website Redesign project
    const websiteProject = createdProjects[0];
    const mobileProject = createdProjects[1];
    const marketingProject = createdProjects[2];

    const websiteTasks = [
      {
        title: "Design homepage mockups",
        description: "Create wireframes and high-fidelity mockups for the new homepage design",
        projectId: websiteProject.id,
        status: "done" as const,
        priority: "high" as const,
        assigneeId: userId,
        order: 1,
      },
      {
        title: "Implement responsive navigation",
        description: "Build a mobile-friendly navigation component with hamburger menu",
        projectId: websiteProject.id,
        status: "in_progress" as const,
        priority: "high" as const,
        assigneeId: userId,
        order: 2,
      },
      {
        title: "Set up analytics tracking",
        description: "Integrate Google Analytics 4 and set up conversion tracking",
        projectId: websiteProject.id,
        status: "todo" as const,
        priority: "medium" as const,
        order: 3,
      },
      {
        title: "Optimize images and assets",
        description: "Compress images, implement lazy loading, and optimize bundle size",
        projectId: websiteProject.id,
        status: "todo" as const,
        priority: "low" as const,
        order: 4,
      },
      {
        title: "Write content for About page",
        description: "Draft copy for the about page including team bios and company history",
        projectId: websiteProject.id,
        status: "in_review" as const,
        priority: "medium" as const,
        assigneeId: userId,
        order: 5,
      },
    ];

    // Create sample tasks for Mobile App project
    const mobileTasks = [
      {
        title: "Set up React Native project",
        description: "Initialize the React Native project with TypeScript and essential dependencies",
        projectId: mobileProject.id,
        status: "done" as const,
        priority: "urgent" as const,
        assigneeId: userId,
        order: 1,
      },
      {
        title: "Design authentication flow",
        description: "Create login, signup, and password reset screens with proper validation",
        projectId: mobileProject.id,
        status: "testing" as const,
        priority: "high" as const,
        assigneeId: userId,
        order: 2,
      },
      {
        title: "Implement push notifications",
        description: "Set up Firebase Cloud Messaging for push notifications",
        projectId: mobileProject.id,
        status: "todo" as const,
        priority: "medium" as const,
        order: 3,
      },
      {
        title: "Build product listing screen",
        description: "Create a scrollable product listing with filtering and sorting options",
        projectId: mobileProject.id,
        status: "in_progress" as const,
        priority: "high" as const,
        assigneeId: userId,
        order: 4,
      },
    ];

    // Create sample tasks for Marketing project
    const marketingTasks = [
      {
        title: "Create social media calendar",
        description: "Plan content schedule for Twitter, LinkedIn, and Instagram",
        projectId: marketingProject.id,
        status: "done" as const,
        priority: "medium" as const,
        assigneeId: userId,
        order: 1,
      },
      {
        title: "Design email newsletter template",
        description: "Create responsive email template for monthly newsletter",
        projectId: marketingProject.id,
        status: "in_progress" as const,
        priority: "high" as const,
        assigneeId: userId,
        order: 2,
      },
      {
        title: "Launch blog post series",
        description: "Write and publish 4 blog posts on industry trends",
        projectId: marketingProject.id,
        status: "todo" as const,
        priority: "medium" as const,
        order: 3,
      },
    ];

    await db.insert(tasks).values([...websiteTasks, ...mobileTasks, ...marketingTasks]);

    // Mark user as seeded so we don't re-seed after they delete everything
    await db.update(users).set({ seeded: true }).where(eq(users.id, userId));

    console.log(`Seed data created successfully for user ${userId}!`);
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
