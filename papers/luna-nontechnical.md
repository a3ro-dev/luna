# Luna: what it does, what changed, and what it still cannot know

**Version:** 0.10.1  
**Date:** 24 September 2026

## Short summary

Luna is a free, open-source menstrual cycle tracker with an AI chat interface. You can record period dates, symptoms, and cycle information in conversation, then view the same records and estimates on a dashboard. Luna is not a medical device, does not diagnose conditions, and has not been clinically validated.

Version 0.10.0 focuses on trust. It makes recorded facts and estimates visibly different, gives a realistic date range instead of a made-up confidence percentage, validates cycle edits and imports before saving them, and makes chat and dashboard use the same calculation.

Version 0.10.1 restores the Premium subscription request form on the landing page. A request asks for an email address and optional name; subscriptions are handled personally, so submitting the form does not start a paid plan or charge a card. Password reset requests for registered accounts schedule an email with a one-hour reset link. The page shows the same response for unknown addresses to avoid revealing which emails have accounts.

## How predictions work now

Luna begins with a broad population starting point and gradually learns a person's typical cycle and variability from usable logged history. It does not assume that every person has a 28-day cycle.

The result has three important parts:

- **Most likely date:** the model's central estimate.
- **Likely window:** an 80% prediction interval for the next cycle under the model. It is not a guarantee.
- **Basis:** how many previous intervals were usable, how many were set aside as uncertain, and which model version made the estimate.

Sparse or variable history produces a wider range. One unusual gap does not automatically become a diagnosis or a genuine long cycle. Luna labels it uncertain and keeps it visible. Repeated long gaps can become part of the personal pattern instead of being discarded forever.

If the expected date has passed, Luna keeps the original forecast and updates the remaining range based on the fact that no new start has been logged. It does not quietly move the expected date forward or declare a period missed.

## Conditions and ovulation

Older versions assigned precise numerical averages to conditions even when the cited research did not supply a defensible mean and standard deviation. For example, an odds ratio for short cycles cannot be converted into an endometriosis cycle-length distribution. The current model removes those unsupported shifts.

When evidence only supports “more variable” or “calendar ovulation may be unreliable,” Luna widens the range or withholds the ovulation estimate. PCOS and PCOD use the same cautious handling because a separate quantitative subtype was not verified. Hormonal contraception is treated cautiously because one setting cannot describe pills, hormonal IUDs, implants, injections, and other regimens.

An ovulation date shown by Luna is a calendar estimate unless the user explicitly logged it. The inspected database had no logged ovulation outcomes, so ovulation accuracy could not be evaluated.

## What was improved

### Safer records

Cycle creation, editing, importing, and deletion now share validation rules. Impossible dates, future dates, reversed ranges, duplicate starts, overlapping bleeding ranges, and bleeding durations above 14 days are rejected before a write. An invalid import is rejected as a set instead of leaving a partially imported history. Editing a cycle clears a saved ovulation date when that date no longer belongs to the edited cycle.

Changing condition or perimenopause-stage settings now recomputes the dependent personal state. Imports and deletes do the same.

### One prediction everywhere

The dashboard and the chat tool now call the same authenticated forecast service. The calendar labels a prediction as a “likely start window,” distinguishes logged from estimated ovulation, and says “not estimated” when an ovulation calculation is unsuitable. With no cycle history, the dashboard does not paint a fake personal forecast.

### More reliable chat

Successful confirmations follow successful database writes. Session updates are scoped to the authenticated user. When a streamed response is interrupted, Luna preserves the complete structured message parts that were actually produced, including tool results, rather than reducing the message to plain text. Deterministic tools calculate dates and database facts; conversational memory does not override them.

## What the database can tell us

A bounded, read-only profile found:

- 10 users and 25 cycle records;
- five users with any cycle records;
- 20 completed start-to-start intervals;
- seven missing end dates, including five latest open records and two historical missing ends;
- zero recorded ovulation dates;
- no duplicate starts, overlaps, future starts, reversed dates, impossible durations, or stored calculation drift;
- 19 intervals between 21 and 35 days and fewer than five between 46 and 90 days;
- only four users with retrospective forecast targets.

Small cells are intentionally reported as “fewer than five” to avoid exposing individuals. No email addresses, password hashes, free-text health notes, chat transcripts, or row-level exports were retrieved for this work.

Seventeen of the 25 rows were entered more than 30 days after their recorded start. That means a historical replay cannot reliably reconstruct what Luna knew on the original date. The database also does not store old profile values or forecasts at issuance.

## What was tested

The automated suite now has 80 passing tests. It covers date boundaries, leap years, timezone invariance, cold starts, uncertainty behavior, long and uncertain logs, ongoing cycles, hormonal-contraception abstention, invalid dates, overlap validation, deterministic replay, and future-data leakage.

A rolling-origin backtest rebuilds each forecast using only the earlier history. It compares the current model with the previous engine, a population-only prediction, the last cycle, expanding and rolling summaries, and simple exponential smoothing.

The live dataset had only four users with targets, below the minimum of five set before evaluation. Luna therefore suppresses every live accuracy number, including model differences. This is an important negative result: the available data cannot establish that the new model is more accurate in real life.

Synthetic stress tests with 400 simulated users did show the intended engineering behavior. On one fixed run, cycle-length MAE moved from 5.83 days in the old engine to 4.89 days in the new one, while 80% interval coverage moved from 42% to 84%. Independent seeds preserved the direction. These numbers describe a simulator whose assumptions overlap with the new model, so they are not evidence of clinical or real-world superiority.

## What remains unknown

1. Whether the new forecasts beat a personal median or rolling mean for real users.
2. Whether the 80% ranges are calibrated across people with different histories and conditions.
3. Whether uncertain long gaps are mostly missed logs or genuine cycles.
4. Whether the model helps users understand their bodies or merely looks more precise.
5. How well calendar ovulation estimates perform against suitable observations.
6. How contraception method, treatment changes, pregnancy, postpartum status, age, and condition changes should alter forecasts.

## Privacy and consent

The current consent screen authorizes use of the application; it does not clearly authorize pooled health-data training. This work therefore did not fit population parameters from the live database. Database analysis was read-only and aggregate. Synthetic fixtures contain no user records.

Prospective forecast logging would make future evaluation more honest, but it adds sensitive retained data. It should be implemented only with explicit purpose, retention, deletion, and consent rules.

## Practical guidance

Use Luna as a record and an estimate, not a medical conclusion. Check that saved dates match what you meant. A wide window is useful information, not a failure. If a cycle change concerns you, seek qualified medical care rather than relying on the app.
