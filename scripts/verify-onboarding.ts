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
    const email = `test_email_${Date.now()}@example.com`;

    try {
        console.log('1. Registering user...');
        await client.post('/api/auth/register', {
            email,
            password: 'password123',
            firstName: 'Email',
            lastName: 'Tester'
        });

        console.log('\n2. Selecting free plan...');
        await client.post('/api/stripe/create-checkout-session', { plan: 'free' });

        console.log('\n3. Setting up organization with invitations...');
        const orgRes = await client.post('/api/onboarding/setup-organization', {
            name: 'Email Test Org',
            email: 'contact@emailtest.com',
            address: '456 Email Ave',
            invitations: ['invitee1@example.com', 'invitee2@example.com']
        });

        console.log('Org ID:', orgRes.data.id);
        console.log('Org Name:', orgRes.data.name);

        const userRes = await client.get('/api/auth/user');
        console.log('Final user state:', userRes.data.onboardingStep);

        if (userRes.data.onboardingStep !== 'completed') {
            throw new Error(`Expected "completed", got "${userRes.data.onboardingStep}"`);
        }

        console.log('\nVerification SUCCESSFUL!');
        console.log('Check the server console output for "📧 ORGANIZATION INVITATION EMAIL" logs.');
    } catch (error: any) {
        console.error('\nVerification FAILED!');
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Status:', error.response.status);
        } else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}

verify();
