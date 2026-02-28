import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, baseURL: "http://localhost:5000", validateStatus: () => true }));

async function testFlow() {
    const userEmail = `newuser${Date.now()}@example.com`;
    console.log("1. Registering new user...");
    const regRes = await client.post("/api/register", {
        email: userEmail,
        password: "password123",
        firstName: "Test",
        lastName: "User"
    });
    console.log("Register response:", regRes.data);

    console.log("2. Fetching user state...");
    const userRes1 = await client.get("/api/auth/user");
    console.log("User state 1:", userRes1.data.onboardingStep);

    console.log("3. Hitting /api/onboarding/complete...");
    const completeRes = await client.post("/api/onboarding/complete");
    console.log("Complete response:", completeRes.data);

    console.log("4. Fetching user state AGAIN...");
    const userRes2 = await client.get("/api/auth/user");
    console.log("User state 2:", userRes2.data.onboardingStep);

    if (userRes1.data.onboardingStep === "plan" && userRes2.data.onboardingStep === "completed") {
        console.log("SUCCESS! User state updates correctly.");
    } else {
        console.log("FAILED! User state did NOT update correctly.");
    }
}

testFlow().catch(console.error);
