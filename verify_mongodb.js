import axios from 'axios';

async function verify() {
    const baseUrl = 'http://localhost:5002/api';
    try {
        console.log("1. Registering user...");
        const registerRes = await axios.post(`${baseUrl}/auth/register`, {
            email: "pranav@test.com",
            password: "Password123",
            firstName: "Pranav",
            lastName: "Mudaliar"
        });
        console.log("Registration successful:", registerRes.data.email);

        console.log("\n2. Logging in...");
        const loginRes = await axios.post(`${baseUrl}/auth/login`, {
            email: "pranav@test.com",
            password: "Password123"
        });
        console.log("Login successful. Received cookie:", loginRes.headers['set-cookie']);

        const cookie = loginRes.headers['set-cookie'];

        console.log("\n3. Creating Organization...");
        const orgRes = await axios.post(`${baseUrl}/organizations`, {
            name: "Test Org"
        }, { headers: { Cookie: cookie } });
        console.log("Org created:", orgRes.data.name, orgRes.data.id);

        console.log("\n4. Creating Project...");
        const projectRes = await axios.post(`${baseUrl}/projects`, {
            name: "Test Project",
            organizationId: orgRes.data.id,
            description: "Test Description"
        }, { headers: { Cookie: cookie } });
        console.log("Project created:", projectRes.data.name, projectRes.data.id);

        console.log("\n5. Creating Task...");
        const taskRes = await axios.post(`${baseUrl}/tasks`, {
            title: "Test Task",
            projectId: projectRes.data.id,
            organizationId: orgRes.data.id,
            status: "todo",
            priority: "medium"
        }, { headers: { Cookie: cookie } });
        console.log("Task created:", taskRes.data.title, "Slug:", taskRes.data.slug);

        console.log("\nVerification complete!");
    } catch (error) {
        console.error("Verification failed:", error.response?.data || error.message);
    }
}

verify();
