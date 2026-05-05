# Product

## Name
Luna

## Purpose
A soft, supportive menstrual cycle companion that learns your rhythm without making your body feel like a dashboard. Luna combines NLP cycle logging with adaptive predictions and a caring AI companion.

## Users
- Primary: people tracking their own menstrual cycles
- Experience level: beginners to experienced trackers
- Motivation: wanting a calm, personal experience instead of clinical tools
- Time commitment: 30 seconds to log, casual chat when needed

## Register
Product. Design serves the product. Familiar patterns, restrained color, motion conveys state not decoration. The tool disappears into the task.

## Core Jobs
- Log period start/end and related symptoms in natural language
- View next period and ovulation estimates on a visual calendar
- Ask questions about cycle patterns in plain language
- Track cycle statistics and consistency over time
- Manage account preferences and health context

## Aha Moment
The first time a user logs their period by just telling Luna ("my period started today") and gets a prediction back. That's the moment that proves Luna is worth their time. Onboarding exists to get them there fast.

## Non-Goals
- Medical diagnosis or clinical advice
- Wearable integrations or partner sharing (v1)
- Complex feature tours or tutorial modes

## Voice & Tone
Warm, caring, supportive. Simple language, friendly reassurance, no medical claims. Copy is concise and earns its place. No em dashes. The UI copy speaks like a gentle friend, not a form label.

## Brand Feel
Feminine-minimal, soft, airy, and calm. Spacious layouts, delicate typography, blush tones, and gentle contrast. The product should feel like a quiet, beautiful personal space rather than a dashboard. Never clinical, never corporate, never cute.

## Tiered Plans
Everyone gets the same capable model (Grok 4.3). The difference is in how Luna speaks, not how it thinks.

- **Luna (Free)**: Practical, to the point. The friend who says "got it, here's what you need to know."
- **Luna Premium ($5/mo)**: Warm, caring, attentive. Remembers the little things and circles back.
- **Luna Premium+ ($12/mo)**: The softest, most intuitive presence. Holds space, picks up on what's unsaid.

Persona-only differentiation. No model gating, no feature gating, no capability differences. Free users get the same brain. Premium gets a companion who listens differently.

## Key Features

### Cycle Tracking
- NLP logging via chat ("my period started today", "cramps after coffee")
- 10 AI tools: logPeriodStart, logPeriodEnd, logOvulation, addNoteSymptom, fetchRecentCycles, computePredictions, fetchStats, exportData, rememberFact, searchWeb
- Adaptive exponential smoothing with population priors (ACOG data)
- Anomaly detection (cycles > 45 days flagged)
- Cold start blends with population prior until 6+ observations

### Chat
- Session-based conversations with auto-rename
- Dynamic context: recent 20 messages + summary + keyword snippets + Supermemory recall
- OpenUI rendering for structured content (predictions, stats, tables)
- Plain text for conversation and emotional support
- Image upload with 7-day TTL storage
- Web search via HackClub Search API

### Dashboard
- Visual calendar with period, ovulation, follicular, and luteal phases
- Next period and ovulation predictions with countdown
- Cycle statistics (avg cycle, avg period, consistency)
- Recent cycles list with anomaly flags

### Account & Settings
- Profile (name, email)
- Cycle preferences (DOB, timezone, week start, health conditions)
- Password change with forgot-password flow
- Plan display with upgrade path
- Redo onboarding from settings

### Onboarding
3-step experience-first flow:
1. Welcome (personalized greeting)
2. Quick setup (DOB + auto-detected timezone)
3. Your rhythm (tap-based condition selection)

Context over ceremony. Show don't tell. No OTP, no algorithm walkthrough, no feature tours. Collect data when needed, not upfront. Users can revisit from settings anytime.

### Auth & Email
- Credentials-only auth (email + password), JWT strategy
- Welcome email on signup
- Login location notification
- Password reset via email (forgot-password + reset-password pages)
- Subscription request emails (admin notification + subscriber confirmation)
- FROM: noreply@luna.a3ro.dev

## Accessibility
Readable type, clear focus states, sufficient contrast on primary text, prefers-reduced-motion support on all animations. Every interactive element has default, hover, focus, active, and disabled states.

## Success Signals
- Users can log a cycle in under 10 seconds via chat
- Chat responses feel personal and warm
- The UI feels calm on both desktop and mobile
- Onboarding completion rate is high (minimal friction)
- Users return to chat, not just the dashboard

## Anti-References
- Clinical health dashboards with dense data tables
- SaaS apps with navy/blue color schemes
- Apps that gate basic features behind paywalls
- Generic emoji-heavy UIs that feel AI-generated
