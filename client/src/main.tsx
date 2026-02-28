import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import App from "./App";
import "./index.css";

console.log("[Debug] Stripe Key:", import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? "Present" : "MISSING");

// Startup Validation
const requiredEnvVars = ["VITE_STRIPE_PUBLISHABLE_KEY"];
const missingVars = requiredEnvVars.filter(key => !import.meta.env[key]);

if (missingVars.length > 0) {
    console.error(`[Fatal] Missing critical environment variables: ${missingVars.join(", ")}`);
    // Render a minimal error screen if critical config is missing
    createRoot(document.getElementById("root")!).render(
        <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
            <h1 style={{ color: '#dc2626' }}>Configuration Error</h1>
            <p>The following environment variables are missing: <strong>{missingVars.join(", ")}</strong></p>
            <p style={{ color: '#666' }}>Please check your <code>.env</code> file and restart the server.</p>
        </div>
    );
} else {
    createRoot(document.getElementById("root")!).render(
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    );
}
