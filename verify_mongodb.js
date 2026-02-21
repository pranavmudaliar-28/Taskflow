import axios from 'axios';

async function verify() {
    const baseUrl = 'http://localhost:5002/api';
    try {
        const testUser = {
            email: `test_${Date.now()}@test.com`,
            password: "Password123",
            firstName: "Test",
            lastName: "User"
        };

        console.log("1. Registering user:", testUser.email);
        const registerRes = await axios.post(`${baseUrl}/auth/register`, testUser);
        console.log("Registration successful");

        console.log("\n2. Logging in...");
        const loginRes = await axios.post(`${baseUrl}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        const cookie = loginRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
        console.log("Login successful.");

        console.log("\n3. Getting/Initializing Organization...");
        const orgsRes = await axios.get(`${baseUrl}/organizations`, { headers: { Cookie: cookie } });
        const org = orgsRes.data[0];
        if (!org) throw new Error("No organization found or created");
        console.log("Org available:", org.name, "ID:", org.id);

        console.log("\n4. Creating Project...");
        const projectRes = await axios.post(`${baseUrl}/projects`, {
            name: "Test Project",
            organizationId: org.id,
            description: "Test Description"
        }, { headers: { Cookie: cookie } });
        const project = projectRes.data;
        console.log("Project created:", project.name, "ID:", project.id);

        console.log("\n5. Creating Task...");
        const taskRes = await axios.post(`${baseUrl}/tasks`, {
            title: "Test Task",
            projectId: project.id,
            organizationId: org.id,
            status: "todo",
            priority: "medium"
        }, { headers: { Cookie: cookie } });
        const task = taskRes.data;
        console.log("Task created:", task.title, "Slug:", task.slug, "ID:", task.id);

        console.log("\n6. Verifying Task Persistence...");
        const getTaskRes = await axios.get(`${baseUrl}/tasks/${task.slug}`, { headers: { Cookie: cookie } });
        console.log("Task fetched by slug:", getTaskRes.data.title);

        console.log("\nVerification complete! MongoDB Migration is working perfectly.");
    } catch (error) {
        console.error("Verification failed:", error.response?.data || error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("URL:", error.config.url);
        }
    }
}

verify();
