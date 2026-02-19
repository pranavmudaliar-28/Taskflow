
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const API_URL = "http://localhost:5001";
const ADMIN_EMAIL = `admin_${Date.now()}@example.com`;
const MEMBER_EMAIL = `member_${Date.now()}@example.com`;
const PASSWORD = 'password123';

async function createClient() {
    const jar = new CookieJar();
    return wrapper(axios.create({
        baseURL: API_URL,
        jar,
        withCredentials: true,
        validateStatus: () => true // Don't throw on error status
    }));
}

async function verify() {
    try {
        console.log('1. Registering Admin user...');
        const adminClient = await createClient();
        let res = await adminClient.post('/api/auth/register', {
            email: ADMIN_EMAIL,
            password: PASSWORD,
            firstName: 'Admin',
            lastName: 'User'
        });

        if (res.status !== 201 && res.status !== 200) {
            throw new Error(`Failed to register admin: ${res.status} ${JSON.stringify(res.data)}`);
        }
        console.log('Admin registered. Ensuring workspace init...');

        // Initialize workspace for admin (makes them admin of their own org)
        res = await adminClient.post('/api/onboarding/setup-organization', {
            orgName: "Admin Corp",
            size: "1-10",
            role: "Founder"
        });
        if (res.status !== 200) {
            // Try fetching orgs, maybe lazy init
            res = await adminClient.get('/api/organizations');
        }

        console.log('2. Verifying Admin subscription access...');
        res = await adminClient.post('/api/stripe/mock-swap-plan', { plan: 'pro' });
        if (res.status === 200) {
            console.log('PASS: Admin allowed to manage subscription.');
        } else {
            console.error('FAIL: Admin denied subscription access!', res.status, res.data);
        }

        console.log('3. Registering Member user...');
        const memberClient = await createClient();
        res = await memberClient.post('/api/auth/register', {
            email: MEMBER_EMAIL,
            password: PASSWORD,
            firstName: 'Member',
            lastName: 'User'
        });

        // DO NOT setup organization for Member. They have NO orgs initially.
        // If they have no orgs, they are not an admin of any org.

        console.log('4. Verifying Member subscription access (expecting 403)...');
        res = await memberClient.post('/api/stripe/mock-swap-plan', { plan: 'pro' });

        if (res.status === 403) {
            console.log('PASS: Member denied subscription access (403 Forbidden).');
        } else {
            console.error(`FAIL: Member access check failed. Status: ${res.status}`, res.data);
        }

    } catch (error: any) {
        console.error('Test FAILED:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

verify();
