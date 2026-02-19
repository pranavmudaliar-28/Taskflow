
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const API_URL = "http://localhost:5001"; // Port 5001
const jar = new CookieJar();
const client = wrapper(axios.create({
    baseURL: API_URL,
    jar,
    withCredentials: true
}));

async function verify() {
    // Generate unique emails
    const inviterEmail = `lead_verify_${Date.now()}@example.com`;
    const memberEmail = `member_verify_${Date.now()}@example.com`;

    try {
        console.log('1. Registering Team Lead...');
        const leadRes = await client.post('/api/auth/register', {
            email: inviterEmail,
            password: 'password123',
            firstName: 'Verify',
            lastName: 'Lead'
        });

        // Setup Org (Onboarding flow)
        console.log('2. Setting up Org...');
        // Mock Stripe checkout if needed, or just setup org directly if allowed
        // In reproduce-issue, it called stripe/create-checkout-session first. 
        // But setup-organization creates the org.
        const orgRes = await client.post('/api/onboarding/setup-organization', {
            name: 'Verify Org',
            invitations: []
        });
        const orgId = orgRes.data.id;
        console.log(`Org Created: ${orgId}`);

        // Invite Member with "Team Lead" string
        console.log('3. Inviting Member with role "Team Lead"...');
        const inviteRes = await client.post(`/api/organizations/${orgId}/invite`, {
            email: memberEmail,
            role: 'Team Lead' // This caused 500 before fix
        });

        if (inviteRes.status === 200) {
            console.log('PASS: Invite created successfully with "Team Lead" role.');
        } else {
            console.error(`FAIL: Unexpected status code ${inviteRes.status}`);
        }

        const token = inviteRes.data.token;
        console.log('Invitation Token:', token);
        console.log('Normalized Role:', inviteRes.data.role); // Should be 'team_lead'

        if (inviteRes.data.role === 'team_lead') {
            console.log('PASS: Role normalized correctly.');
        } else {
            console.error(`FAIL: Role NOT normalized! Got: ${inviteRes.data.role}`);
        }

    } catch (error: any) {
        console.error('\nTest FAILED:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
            console.error('Response Status:', error.response.status);
        }
    }
}

verify();
