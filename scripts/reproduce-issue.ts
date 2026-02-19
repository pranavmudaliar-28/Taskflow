
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const API_URL = "http://localhost:5000";
const jar = new CookieJar();
const client = wrapper(axios.create({
    baseURL: API_URL,
    jar,
    withCredentials: true
}));

async function verify() {
    // Generate unique emails
    const inviterEmail = `lead_${Date.now()}@example.com`;
    const memberEmail = `member_${Date.now()}@example.com`;

    try {
        console.log('1. Registering Team Lead...');
        const leadRes = await client.post('/api/auth/register', {
            email: inviterEmail,
            password: 'password123',
            firstName: 'Team',
            lastName: 'Lead'
        });

        // Setup Org
        console.log('2. Setting up Org...');
        await client.post('/api/stripe/create-checkout-session', { plan: 'team' });
        const orgRes = await client.post('/api/onboarding/setup-organization', {
            name: 'Debug Org',
            invitations: []
        });
        const orgId = orgRes.data.id;

        // Invite Member
        console.log('3. Inviting Member...');
        const inviteRes = await client.post(`/api/organizations/${orgId}/invite`, {
            email: memberEmail,
            role: 'member'
        });
        const token = inviteRes.data.token;
        console.log('Invitation Token:', token);

        // Verify Pending Invitation exists
        const pendingRes = await client.get(`/api/organizations/${orgId}/invitations`);
        console.log('Pending Invitations (Before):', pendingRes.data.length);

        // Logout Lead
        await client.post('/api/auth/logout');
        await jar.removeAllCookies();

        // Register Member (Auto-accept)
        console.log('4. Registering Member (Auto-accept)...');
        const memberRes = await client.post('/api/auth/register', {
            email: memberEmail,
            password: 'password123',
            firstName: 'New',
            lastName: 'Member'
        });

        // Verify Member State
        console.log('Member ID:', memberRes.data.id);

        // Login as Lead again to check Org state
        await client.post('/api/auth/logout');
        await jar.removeAllCookies();

        console.log('5. Logging in as Lead to check state...');
        await client.post('/api/auth/login', {
            email: inviterEmail,
            password: 'password123'
        });

        // Check Members
        const membersRes = await client.get(`/api/organizations/${orgId}/members`);
        console.log('\n--- Members List ---');
        console.log(JSON.stringify(membersRes.data, null, 2));

        // Check Invitations
        const pendingAfterRes = await client.get(`/api/organizations/${orgId}/invitations`);
        console.log('\n--- Pending Invitations (After) ---');
        console.log(JSON.stringify(pendingAfterRes.data, null, 2));

        const acceptedMember = membersRes.data.find((m: any) => m.user.email === memberEmail);
        const pendingInvite = pendingAfterRes.data.find((i: any) => i.email === memberEmail);

        if (!acceptedMember) {
            console.error('\nFAIL: Member not found in organization list!');
        } else {
            console.log('\nPASS: Member found in organization list.');
            if (!acceptedMember.user.firstName) {
                console.error('FAIL: Member details (name) missing!');
            } else {
                console.log('PASS: Member details present.');
            }
        }

        if (pendingInvite) {
            console.error('\nFAIL: Invitation still shows as pending!');
        } else {
            console.log('\nPASS: Invitation removed from pending list.');
        }

    } catch (error: any) {
        console.error('\nTest FAILED:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

verify();
