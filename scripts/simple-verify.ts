
const BASE_URL = 'http://localhost:5003';

async function verify() {
    try {
        console.log('Registering...');
        const email = `test.slug.${Date.now()}@example.com`;
        const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password123',
                firstName: 'Test',
                lastName: 'Slug'
            })
        });

        if (!regRes.ok) {
            const text = await regRes.text();
            throw new Error(`Registration failed: ${regRes.status} ${text}`);
        }

        const cookie = regRes.headers.get('set-cookie');
        console.log('Registered. Cookie:', cookie);

        const headers = {
            'Content-Type': 'application/json',
            'Cookie': cookie || ''
        };

        console.log('Creating project...');
        const createRes = await fetch(`${BASE_URL}/api/projects`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: 'Simple Verification Project',
                description: 'Test'
            })
        });

        if (!createRes.ok) {
            const text = await createRes.text();
            throw new Error(`Create project failed: ${createRes.status} ${text}`);
        }

        const project = await createRes.json();
        console.log('Project created:', project);

        if (project.slug === 'simple-verification-project') {
            console.log('Slug verified in creation!');
        } else {
            console.error('Slug mismatch:', project.slug);
        }

        console.log('Fetching by slug...');
        const getRes = await fetch(`${BASE_URL}/api/projects/${project.slug}`, { headers });
        if (!getRes.ok) {
            const text = await getRes.text();
            throw new Error(`Get by slug failed: ${getRes.status} ${text}`);
        }
        const fetched = await getRes.json();
        console.log('Fetched project:', fetched.id);

        console.log('SUCCESS');

    } catch (err) {
        console.error(err);
    }
}

verify();
