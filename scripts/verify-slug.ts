
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

const BASE_URL = 'http://localhost:5002'; // Using port 5002 as confirmed

async function verify() {
    try {
        // 1. Register/Login
        const email = `test.slug.${Date.now()}@example.com`;
        console.log(`Registering user: ${email}...`);
        await client.post(`${BASE_URL}/api/auth/register`, {
            email,
            password: 'password123',
            firstName: 'Test',
            lastName: 'Slug',
        });
        console.log('User registered and logged in.');

        // 2. Create Project
        const projectName = "Slug Test Project";
        console.log(`Creating project: "${projectName}"...`);
        const createRes = await client.post(`${BASE_URL}/api/projects`, {
            name: projectName,
            description: "Testing slugs",
        });

        const project = createRes.data;
        console.log('Project created:', project);

        if (project.slug !== 'slug-test-project') {
            throw new Error(`Expected slug 'slug-test-project', got '${project.slug}'`);
        }

        // 3. Fetch by Slug
        console.log(`Fetching project by slug: ${project.slug}...`);
        const slugRes = await client.get(`${BASE_URL}/api/projects/${project.slug}`);
        if (slugRes.data.id !== project.id) {
            throw new Error(`Fetched project ID mismatch. Expected ${project.id}, got ${slugRes.data.id}`);
        }
        console.log('Successfully fetched by slug.');

        // 4. Fetch by ID
        console.log(`Fetching project by ID: ${project.id}...`);
        const idRes = await client.get(`${BASE_URL}/api/projects/${project.id}`);
        if (idRes.data.slug !== project.slug) {
            throw new Error(`Fetched project slug mismatch. Expected ${project.slug}, got ${idRes.data.slug}`);
        }
        console.log('Successfully fetched by ID.');

        console.log('VERIFICATION SUCCESSFUL');
    } catch (error: any) {
        console.error('Verification failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        process.exit(1);
    }
}

verify();
