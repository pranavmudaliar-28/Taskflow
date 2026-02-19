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
    const email = `fix_test_${Date.now()}@example.com`;

    try {
        console.log('1. Registering user...');
        const registerRes = await client.post('/api/auth/register', {
            email,
            password: 'password123',
            firstName: 'Fix',
            lastName: 'Tester'
        });
        console.log('Initial onboardingStep:', registerRes.data.onboardingStep);
        if (registerRes.data.onboardingStep !== 'plan') {
            throw new Error(`Expected "plan", got "${registerRes.data.onboardingStep}"`);
        }

        console.log('\n2. Selecting Pro plan (testing mock)...');
        const checkoutRes = await client.post('/api/stripe/create-checkout-session', { plan: 'pro' });
        console.log('Checkout URL:', checkoutRes.data.url);
        if (!checkoutRes.data.url.includes('session_id=mock_')) {
            console.warn('Warning: Checkout URL does not look like a mock. If you have real keys, this is fine.');
        }

        console.log('\n3. Verifying (mock) Stripe session...');
        const sessionIdMatch = checkoutRes.data.url.match(/session_id=([^&]+)/);
        const mock = checkoutRes.data.url.includes('mock=true');
        const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

        if (sessionId) {
            const verifyRes = await client.get(`/api/stripe/session-status?session_id=${sessionId}${mock ? '&mock=true' : ''}`);
            console.log('Session status:', verifyRes.data.status);
            if (verifyRes.data.status !== 'success') {
                throw new Error(`Expected session success, got ${verifyRes.data.status}`);
            }
        }

        console.log('\n4. Setting up organization...');
        const orgRes = await client.post('/api/onboarding/setup-organization', {
            name: 'Loop Fix Org',
            email: 'loop@fix.com',
            address: '123 Fix St',
            invitations: []
        });

        console.log('Org set up successfully.');

        const userRes = await client.get('/api/auth/user');
        console.log('Final user state:', userRes.data.onboardingStep);

        if (userRes.data.onboardingStep !== 'completed') {
            throw new Error(`Expected "completed", got "${userRes.data.onboardingStep}"`);
        }

        console.log('\n5. Testing Billing Portal Session...');
        const portalRes = await client.get('/api/stripe/create-portal-session');
        console.log('Portal URL:', portalRes.data.url);
        if (portalRes.data.url !== '/billing-portal-mock') {
            throw new Error(`Expected "/billing-portal-mock", got "${portalRes.data.url}"`);
        }

        console.log('\nVerification SUCCESSFUL!');
    } catch (error: any) {
        console.error('\nVerification FAILED!');
        if (error.response) {
            console.error('Response data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}

verify();
