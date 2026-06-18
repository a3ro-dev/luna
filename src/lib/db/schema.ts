import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  customType,
  boolean,
  jsonb,
  real,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Postgres `date` column that always returns a "YYYY-MM-DD" string.
 *
 * The Neon serverless HTTP driver returns `date` columns as JavaScript
 * Date objects (e.g. `new Date("2025-01-28T00:00:00")` — no Z suffix,
 * parsed as local midnight).  Every consumer in this codebase expects
 * plain strings, so we convert at the ORM boundary, once and for all.
 */
const pgDate = customType<{ data: string; driverData: string | Date }>({
  dataType() {
    return "date";
  },
  fromDriver(value) {
    if (value instanceof Date) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      const d = String(value.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return String(value);
  },
  toDriver(value) {
    return value;
  },
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  image: text("image"),
  timezone: text("timezone").default("Asia/Kolkata"),
  weekStart: integer("week_start").default(1), // 0=Sun, 1=Mon
  dateOfBirth: pgDate("date_of_birth"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingVersion: integer("onboarding_version").default(0),
  dobEditCount: integer("dob_edit_count").default(0),
  conditions: jsonb("conditions").default([]), // e.g. ["pcos", "endometriosis"]
  perimenoStage: text("perimeno_stage"), // "early" | "late" | "unknown" — only when perimenopause is in conditions
  pushNotificationsEnabled: boolean("push_notifications_enabled").default(
    false,
  ),
  pushSubscription: jsonb("push_subscription"),
  plan: text("plan").default("free"), // "free" | "premium" | "premium+"
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry", {
    withTimezone: true,
  }),
  // Dedicated OTP column — avoids reusing passwordResetToken with an "otp:" prefix
  // which could allow a password-reset token to be used as an OTP or vice versa.
  otpToken: text("otp_token"),
  otpExpiry: timestamp("otp_expiry", { withTimezone: true }),
  consentGiven: boolean("consent_given").default(false),
  consentGivenAt: timestamp("consent_given_at", { withTimezone: true }),
  consentVersion: text("consent_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const cycles = pgTable("cycles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mStart: pgDate("m_start").notNull(),
  mEnd: pgDate("m_end"),
  ovulationDate: pgDate("ovulation_date"),
  cycleLength: integer("cycle_length"), // derived: this.mStart - prev.mStart
  periodLength: integer("period_length"), // derived: mEnd - mStart
  follicularLength: integer("follicular_length"), // derived: ovulation - mEnd
  lutealLength: integer("luteal_length"), // derived: nextStart - ovulation
  isAnomaly: boolean("is_anomaly").default(false), // flagged by skip gate
  notes: jsonb("notes").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const predictionParams = pgTable(
  "prediction_params",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    paramName: text("param_name").notNull(), // cycle_length | period_length | follicular | luteal | alpha
    smoothedValue: real("smoothed_value").notNull(),
    variance: real("variance").notNull().default(0),
    sampleCount: integer("sample_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userParamUnique: unique().on(t.userId, t.paramName),
  }),
);

export const aiTraces = pgTable("ai_traces", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  costUsd: real("cost_usd"),
  latencyMs: integer("latency_ms"),
  feature: text("feature").notNull(), // "chat" | "predict" | "log_parse" | "web_search"
  hasImages: boolean("has_images").default(false),
  hadWebSearch: boolean("had_web_search").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  parts: jsonb("parts").notNull(),
  textContent: text("text_content"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const chatSummaries = pgTable("chat_summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// NOTE: Images are stored as base64 in PostgreSQL. This works for low volume
// but becomes a performance bottleneck at scale. Consider migrating to
// object storage (e.g., Vercel Blob, Cloudflare R2, S3) for production use.
export const uploadedImages = pgTable("uploaded_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  messageId: uuid("message_id"),
  imageData: text("image_data").notNull(), // base64 data URL
  mediaType: text("media_type").notNull(), // e.g. "image/jpeg"
  filename: text("filename"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
