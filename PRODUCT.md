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

## Core jobs
- Log period start/end and related symptoms in natural language
- View next period and ovulation estimates on a visual calendar
- Ask questions about cycle patterns in plain language
- Track cycle statistics and consistency over time
- Manage account preferences and health context

## Aha moment
The first time a user logs their period by just telling Luna ("my period started today") and gets a prediction back. That's the moment that proves Luna is worth their time. Onboarding exists to get them there fast.

## Non-goals
- Medical diagnosis or clinical advice
- Wearable integrations or partner sharing (v1)
- Complex feature tours or tutorial modes

## Voice and tone
Warm, caring, supportive. Simple language, friendly reassurance, no medical claims. Copy is concise and earns its place. No em dashes. The UI copy speaks like a gentle friend, not a form label.

## Brand feel
Feminine-minimal, soft, airy, calm. Spacious layouts, delicate typography, blush tones, gentle contrast. The product should feel like a quiet personal space, not a dashboard. Never clinical, never corporate, and definitely not cute.

## Tiered plans
Everyone gets the same capable model (Grok 4.3), cycle data, and tools. Each plan has its own interface layout and a different conversational tone.

| Plan | Price | Personality | Interface |
|---|---|---|---|
| Luna | Free | Practical, to the point. The friend who says "got it, here's what you need to know." | Focused, calendar-first dashboard and direct chat. |
| Luna Premium | $5/mo | Warm, caring, attentive. Remembers the little things and circles back. | Guided dashboard, session rail, and sectioned settings. |
| Luna Premium+ | $12/mo | The softest, most intuitive presence. Holds space, picks up on what's unsaid. | Spacious dashboard, cycle context beside chat, and wider settings layout. |

Layout and persona differentiation. No model gating, no feature gating, no capability differences. Free users get the same brain, predictions, and tools.

## Features

### Cycle tracking
- NLP logging via chat ("my period started today", "cramps after coffee")
- 10 AI tools: logPeriodStart, logPeriodEnd, logOvulation, addNoteSymptom, fetchRecentCycles, computePredictions, fetchStats, exportData, rememberFact, searchWeb
- `forecast-v2.0.0`: a posterior-predictive next-start estimate with a central 80% likely window
- A log-scale cycle model with cautious population starting values and up to 12 usable personal intervals
- Short-gap and isolated-long-gap rules that preserve uncertain records while keeping them out of a forecast when appropriate
- Calendar ovulation estimates withheld for profiles where date-based timing is especially unsuitable

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

### Account and settings
- Profile (name, email)
- Cycle preferences (DOB, timezone, week start, health conditions)
- Password change with forgot-password flow
- Plan display with an upgrade path; the landing-page form requests follow-up and does not activate a plan
- Redo onboarding from settings

### Onboarding
3-step experience-first flow:
1. Welcome (personalized greeting)
2. Quick setup (DOB + auto-detected timezone)
3. Your rhythm (tap-based condition selection)

Context over ceremony. Show don't tell. No OTP, no algorithm walkthrough, no feature tours. Collect data when needed, not upfront. Users can revisit from settings anytime.

### Auth and email
- Credentials-only auth (email + password), JWT strategy
- Welcome email on signup
- Login location notification
- Password reset via email (forgot-password + reset-password pages)
- Subscription request emails (admin notification + subscriber confirmation)
- FROM: noreply@luna.a3ro.dev

## Accessibility
Readable type, clear focus states, sufficient contrast on primary text, prefers-reduced-motion support on all animations. Every interactive element has default, hover, focus, active, and disabled states.

## Success signals
- Users can log a cycle in under 10 seconds via chat
- Chat responses feel personal and warm
- The UI feels calm on both desktop and mobile
- Onboarding completion rate is high (minimal friction)
- Users return to chat, not just the dashboard

## Anti-references
- Clinical health dashboards with dense data tables
- SaaS apps with navy/blue color schemes
- Apps that gate basic features behind paywalls
- Generic emoji-heavy UIs that feel AI-generated
