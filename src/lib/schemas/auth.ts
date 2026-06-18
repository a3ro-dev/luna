import { z } from "zod";

/** Registration schema — enforces email format, password length cap */
export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128), // Cap at 128 to prevent bcrypt DoS
  name: z.string().max(100).optional(),
});

/** Password reset request schema */
export const forgotPasswordSchema = z.object({
  email: z.string().email().max(255),
});

/** Password reset schema */
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6).max(128),
});

/** Profile update schema — all fields optional */
export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  timezone: z.string().max(100).optional(),
  conditions: z.array(
    z.enum([
      "pcos",
      "pcod",
      "endometriosis",
      "thyroid",
      "hormonal_bc",
      "irregular",
      "perimenopause",
      "perimenopause_early",
      "perimenopause_late",
      "none",
    ])
  ).max(20).optional(),
  perimenoStage: z.enum(["early", "late", "unknown"]).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  pushNotificationsEnabled: z.boolean().optional(),
  weekStart: z.number().int().min(0).max(6).optional(),
  passwordChange: z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6).max(128),
    })
    .optional(),
});

/** Onboarding schema */
export const onboardingSchema = z.object({
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  timezone: z.string().max(100).optional(),
  conditions: z.array(
    z.enum([
      "pcos",
      "pcod",
      "endometriosis",
      "thyroid",
      "hormonal_bc",
      "irregular",
      "perimenopause",
      "perimenopause_early",
      "perimenopause_late",
      "none",
    ])
  ).max(20).optional(),
  perimenoStage: z.enum(["early", "late", "unknown"]).optional(),
  pushNotificationsEnabled: z.boolean().optional(),
  consentGiven: z.boolean().optional(),
  consentVersion: z.string().optional(),
});
