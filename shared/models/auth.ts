import { z } from "zod";

// Zod schema matching the expected User shape
export const userSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email(),
  password: z.string().optional(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  profileImageUrl: z.string().optional().nullable(),
  role: z.string().default("member"), // 'admin', 'member' 
  plan: z.string().default("free"), // 'free', 'pro', 'team'
  stripeCustomerId: z.string().optional().nullable(),
  onboardingStep: z.string().default("plan"), // 'plan', 'organization', 'completed'
  seeded: z.boolean().default(false),
  mustChangePassword: z.boolean().default(false).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type UpsertUser = z.infer<typeof userSchema>;
export type User = z.infer<typeof userSchema> & { isAdmin?: boolean };
