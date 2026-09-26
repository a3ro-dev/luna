# What Luna can tell you about your cycle

**Release:** 0.11.1 · **Reviewed:** 24 September 2026

Luna lets you log periods and symptoms in chat and review them on a calendar. It uses your period starts to estimate when the next one might begin. It is a record-keeping and forecasting tool, not a medical device or a way to diagnose a condition.

## Layouts for each plan

Free opens with a calendar-led dashboard: the Today card, the calendar, quick logging and the ovulation estimate. Premium's dashboard is a summary that circles back: after the Today card and quick logging, it shows notes you wrote around this same cycle day in earlier cycles, what's ahead, and a small chart of recent cycle lengths with a one-line summary. Premium+ opens like a two-page journal: a large dial with one sentence drawn from your logs, and "This cycle", your notes with the estimated next window labelled as an estimate. Chat and settings follow the same plan layouts as before (a session rail for Premium, cycle context beside chat and two-column settings for Premium+). Smaller screens stack these areas in the same reading order, so the same information stays available.

Luna can be light or dark. The dark mode is soft rather than black, with a night palette for each plan, and it follows your device unless you pick Light or Dark in Settings or on the front page. The choice is stored only in your browser.

The three layouts use the same account records, forecast calculation, chat tools, and settings controls. Luna reads the saved account plan to choose a layout. The subscription request form described below does not change that saved plan or activate Premium access.

## Reading a forecast

Once you have logged a period start, Luna can show a central next-start date and a *likely window*. The window is designed to contain 80% of next starts **if the model's assumptions fit**. We have not shown that it covers 80% of real users' next periods. With few logs, the window draws heavily on population data and is wider. As usable history accumulates, your own pattern has more influence.

The dashboard now labels logged dates separately from estimated dates. It also shows how many previous intervals informed the forecast and how many were set aside. No logged start means no personal next-start date. [How the calculation works](./luna-technical.md)

A short gap could be spotting or a duplicate log; a long gap could be a genuinely long cycle or a missed entry. Luna cannot tell which from dates alone. It keeps the record but may set the gap aside when calculating the next window. Repeated long gaps can count as part of a pattern. If a new start has not been logged by the expected window, the original forecast remains visible. While today is inside that window, Luna can also show a remaining window conditioned on no start being recorded yet. Once a period is later than Luna's usual range for you, Luna now also shows where it is likely to start if it hasn't started yet. That later window deliberately allows for the chance that a period went unlogged, so it is wide. It was chosen because it gave honest ranges in testing on simulated data, not because it makes the date sharper.

## Pattern check

The dashboard and chat can compare your last six months with widely used clinical reference ranges (FIGO): cycles of 24--38 days, bleeding of 8 days or less, and cycle lengths that stay within about a week of each other. Each item shows as typical, outside the range, or "needs more data". It is a summary to help you notice a pattern, not a diagnosis. One unusual cycle is common; a pattern that keeps showing up is worth mentioning to a clinician. It is switched off on hormonal contraception, where bleeds follow the method rather than a natural cycle.

## Ovulation and conditions

An ovulation date that you logged is a record. An ovulation date calculated by Luna is only a calendar estimate. The inspected database contained **no logged ovulation dates**, so there is no evidence here about the accuracy of those estimates. Luna withholds them for profiles where calendar timing is especially unsuitable, including PCOS/PCOD, irregular cycles, thyroid conditions, hormonal contraception, and late perimenopause.

Earlier code assigned precise cycle averages to some conditions without a defensible measured distribution. The current model removes those values. It uses broader starting ranges for some profiles, but those settings are still design assumptions. In particular, a single hormonal-contraception setting cannot represent pills, IUDs, implants, and injections. [Evidence and limits](./references.md)

## Changes to records and chat

Cycle writes now check calendar dates and reject overlapping bleeding ranges, duplicate starts, reversed dates, dates in the future, and bleeding spans above the app's 15-day input limit. An invalid import is rejected before any of its rows are inserted. If an edit moves a recorded ovulation date outside its cycle, Luna clears that date. Deleting or importing cycles and changing condition settings recalculates dependent values.

Setup now ends by asking, optionally, when your last period started, so the first dashboard visit already has a starting estimate. The timezone list covers every zone your browser knows, and early and late perimenopause are a single choice that sets the matching stage. You can log a period start or end from the dashboard in one tap ("it started today", "it ended today", or another day), without opening chat. These buttons use the same checks as chat. If a new period comes much later than your usual rhythm, Luna asks once whether you had one in between that didn't get logged, and suggests a likely date. A single missed log can make a forecast look far less certain than it is, so answering helps, but it is always optional. Chat and dashboard use the same forecast service. Chat confirmations are tied to completed database writes, and stored chat messages retain their structured parts when a stream ends. A reply now finishes and is saved even if you close the app or lose signal mid-answer, and reopening the chat picks it up where it is; Stop saves what was said so far. A message sent while Luna is replying waits and sends when she finishes. This reduces the chance of chat and the calendar telling different stories about the same records.

The landing page's Premium buttons now open a request form. It collects an email address and optional name; sending it requests a personal follow-up. It does not charge a card or activate a paid plan. The password reset page gives the same public response whether an account exists, so it does not reveal registered addresses. For an existing account, the server schedules a reset email with a one-hour link.

## What has been checked

A read-only profile on 24 September 2026 found 25 cycle rows across five users. Only four users had retrospective forecast targets, and none had a logged ovulation date. Many entries were added long after the dates they describe. The database also lacks old profile values and a record of forecasts at the time they were issued. These limits rule out a credible live accuracy estimate from this snapshot.

The automated tests cover date handling, invalid writes, unusual intervals, sparse histories, and leakage from later cycle records. A simulator with 400 users produced lower average error and wider, better-covering intervals for the new model than for the old one. That tells us the implementation behaves as expected *in the simulator*. The simulator was built using assumptions similar to the model, so the numbers do not show that predictions improved for real people. [Evaluation details](./research-notes.md)

## What remains unknown

- How often the likely window contains the next period for real users, including people with irregular cycles.
- Whether the new model beats a simple personal median or rolling mean in prospective use.
- Whether calendar ovulation estimates agree with suitable observations.
- How treatment changes, pregnancy, postpartum status, or contraceptive method should affect a forecast.

Luna has not been clinically validated. If your records or cycle changes concern you, check the dates you entered and seek qualified medical advice rather than treating the forecast as a diagnosis.
