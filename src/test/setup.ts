import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock environment variables for tests
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");
vi.stubEnv("VITE_SUPABASE_PROJECT_ID", "test-project");
vi.stubEnv("VITE_STRIPE_PUBLISHABLE_KEY", "pk_test_mock");
vi.stubEnv("VITE_DISABLE_SUBSCRIPTIONS", "true");
