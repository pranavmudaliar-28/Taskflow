import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const jar = new CookieJar();
const client = wrapper(axios.create({
    baseURL: 'http://localhost:5001',
    jar,
    withCredentials: true
}));

async function verify() {
    const inviterEmail = `inviter_${Date.now()}@example.com`;
    const inviteeEmail = `invitee_${Date.now()}@example.com`;

    try {
        console.log('1. Registering Inviter...');
        await client.post('/api/auth/register', {
            email: inviterEmail,
            password: 'password123',
            firstName: 'Inviter',
            lastName: 'User'
        });

        console.log('2. Inviter completing onboarding (mock)...');
        // Mock complete for inviter
        // We need to bypass the plan selection and org setup for the inviter to be able to invite
        // But since we can't easily mock that without steps, let's just use the known steps.

        // Step 1: Select Plan (Free)
        await client.post('/api/stripe/create-checkout-session', { plan: 'free' });

        // Step 2: Create Org
        const orgRes = await client.post('/api/onboarding/setup-organization', {
            name: 'Inviter Org',
            invitations: []
        });
        const orgId = orgRes.data.id;
        console.log('Inviter Org Created:', orgId);

        console.log('3. Inviter inviting Invitee...');
        const inviteRes = await client.post(`/api/organizations/${orgId}/invite`, {
            email: inviteeEmail,
            role: 'member'
        });
        const token = inviteRes.data.token;
        if (!token) throw new Error("No token returned from invite!");

        // Logout Inviter
        await client.post('/api/auth/logout');

        // Clear cookies for new session
        await jar.removeAllCookies();

        console.log('4. Registering Invitee...');
        const registerRes = await client.post('/api/auth/register', {
            email: inviteeEmail,
            password: 'password123',
            firstName: 'Invitee',
            lastName: 'User'
        });

        console.log('Invitee Registered. User Data:', registerRes.data);
        const userId = registerRes.data.id;

        console.log('5. verifying Invitation acceptance (Auto-accepted by register)...');
        // Register auto-accepts pending invites. We don't need to call accept manually.
        // But we should verify we are in the org.

        // Verify org membership
        const orgsRes = await client.get('/api/organizations');
        console.log('Invitee Organizations:', orgsRes.data);
        if (orgsRes.data.length === 0) {
            throw new Error("Invitee not added to organization!");
        }

        // Verify still at plan
        const userResUsingGet = await client.get('/api/auth/user');
        if (userResUsingGet.data.onboardingStep !== "plan") {
            console.log("Warning: User is already completed? Step:", userResUsingGet.data.onboardingStep);
        } else {
            console.log("User correctly at 'plan' step after acceptance.");
        }

        console.log('6. Completing Onboarding (Skip to Dashboard)...');
        await client.post('/api/onboarding/complete');

        // Verify completed
        const finalUserRes = await client.get('/api/auth/user');
        console.log('Final User Step:', finalUserRes.data.onboardingStep);

        if (finalUserRes.data.onboardingStep !== 'completed') {
            throw new Error('Onboarding step not updated to completed!');
        }

        console.log('\nVerification SUCCESSFUL: Full flow verified.');
    } catch (error: any) {
        console.error('\nVerification FAILED!');
        if (error.response) {
            console.error('Response data:', error.response.data);
        } else {
            console.error('Error:', error);
        }
        process.exit(1);
    }
}

verify();
