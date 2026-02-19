import axios from 'axios';

const API_URL = "http://localhost:5001";

async function testRateLimiting() {
    console.log('=== Testing Rate Limiting ===\n');

    try {
        // Test auth rate limiting (5 requests per 15 minutes)
        console.log('1. Testing auth rate limiting (should allow 5, then block)...');
        const authRequests = [];

        for (let i = 1; i <= 7; i++) {
            try {
                const res = await axios.post(`${API_URL}/api/auth/login`, {
                    email: `test${i}@example.com`,
                    password: 'wrongpassword'
                }, {
                    validateStatus: () => true // Don't throw on error status
                });

                console.log(`  Request ${i}: Status ${res.status} - ${res.status === 429 ? 'RATE LIMITED ✓' : res.data.message || 'OK'}`);

                if (res.status === 429) {
                    console.log(`  Rate limit message: ${res.data.message}`);
                    console.log(`  Retry after: ${res.data.retryAfter} seconds`);
                }
            } catch (error: any) {
                console.log(`  Request ${i}: Error - ${error.message}`);
            }

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n2. Testing API rate limiting (should allow 100 requests)...');
        // Test a few API requests
        for (let i = 1; i <= 3; i++) {
            try {
                const res = await axios.get(`${API_URL}/api/user`, {
                    validateStatus: () => true
                });
                console.log(`  API Request ${i}: Status ${res.status}`);
            } catch (error: any) {
                console.log(`  API Request ${i}: Error - ${error.message}`);
            }
        }

        console.log('\n✅ Rate limiting test completed');
    } catch (error: any) {
        console.error('❌ Rate limiting test failed:', error.message);
    }
}

async function testInputSanitization() {
    console.log('\n\n=== Testing Input Sanitization ===\n');

    try {
        // Test XSS prevention
        const xssPayload = {
            email: 'test@example.com<script>alert("xss")</script>',
            password: 'password123',
            firstName: '<img src=x onerror=alert(1)>',
            lastName: 'Test<script>alert("xss")</script>'
        };

        console.log('1. Sending registration with XSS payloads...');
        const res = await axios.post(`${API_URL}/api/auth/register`, xssPayload, {
            validateStatus: () => true
        });

        console.log(`  Status: ${res.status}`);
        if (res.status === 400 || res.status === 500) {
            console.log(`  Response: ${JSON.stringify(res.data)}`);
        }

        console.log('\n✅ Input sanitization test completed');
        console.log('Note: Check server logs to verify inputs were sanitized');
    } catch (error: any) {
        console.error('❌ Input sanitization test failed:', error.message);
    }
}

async function testSecurityHeaders() {
    console.log('\n\n=== Testing Security Headers ===\n');

    try {
        const res = await axios.get(`${API_URL}/api/user`, {
            validateStatus: () => true
        });

        console.log('Security headers present:');
        console.log(`  X-Content-Type-Options: ${res.headers['x-content-type-options'] || 'NOT SET'}`);
        console.log(`  X-Frame-Options: ${res.headers['x-frame-options'] || 'NOT SET'}`);
        console.log(`  X-XSS-Protection: ${res.headers['x-xss-protection'] || 'NOT SET'}`);
        console.log(`  Strict-Transport-Security: ${res.headers['strict-transport-security'] || 'NOT SET'}`);
        console.log(`  Content-Security-Policy: ${res.headers['content-security-policy'] ? 'SET ✓' : 'NOT SET'}`);

        console.log('\n✅ Security headers test completed');
    } catch (error: any) {
        console.error('❌ Security headers test failed:', error.message);
    }
}

async function runAllTests() {
    console.log('🔒 Backend Security Tests\n');
    console.log('Testing server at:', API_URL);
    console.log('='.repeat(50) + '\n');

    await testRateLimiting();
    await testInputSanitization();
    await testSecurityHeaders();

    console.log('\n' + '='.repeat(50));
    console.log('All tests completed!');
    console.log('Check the output above for any failures.');
}

runAllTests();
