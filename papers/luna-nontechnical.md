# Luna: A Conversational Period Tracker That Adjusts to Your Body

**Author:** Akshat Singh Kushwaha — akshatsingh14372@outlook.com — [a3ro.dev](https://a3ro.dev)

---

## Short Summary

Luna is a free, open-source web app that lets you track your menstrual cycle by chatting with an AI assistant. Instead of tapping through menus and calendars, you type things like "my period started today" or "I'm feeling crampy." The app logs what you say, learns your cycle patterns over time, and predicts when your next period might come. It also adjusts its expectations based on certain health conditions — like PCOS or endometriosis — so it doesn't assume everyone has a textbook 28-day cycle. It is not a medical device, has not been clinically validated, and its predictions should not be used to make health decisions on their own.

---

## What This Project Does

Luna does a handful of things:

1. **Tracks your cycle through conversation.** You type naturally — "period started on March 5," "ovulation today," "bad cramps after coffee" — and the AI logs the information to your cycle history.

2. **Predicts your next period and ovulation.** After it learns enough about your cycles, it estimates when your next one might start, along with a range (confidence interval) showing how certain it is.

3. **Shows your cycle statistics.** Average cycle length, average period length, and how much your cycles vary over time.

4. **Remembers things about you.** If you tell it "I have PCOS" or "I'm on hormonal birth control," it stores that and adjusts its expectations accordingly.

5. **Exports your data.** You can download all your cycle data as a file. You can also import data from other apps (Period Calendar, Clue, Flo, Apple Health, or Luna's own format).

6. **Searches the web.** If you ask a question it can't answer from your data, it can search the web for information.

Here is what it does **not** do:

- It does **not** diagnose medical conditions.
- It does **not** connect to wearable devices (no Apple Watch, Oura Ring, etc.).
- It does **not** share data with a partner or doctor.
- It does **not** replace a healthcare provider's advice.

---

## Why It Matters

Most period trackers on the market share a common assumption: that a "normal" cycle is 28 days long with a 14-day luteal phase. This is an average, not a rule. In reality, only about 13% of cycles fall exactly at 28 days [1]. For people with conditions like PCOS — where cycles can average 40–60 days — a tracker that assumes 28 days will give wrong predictions over and over.

This is not a minor inconvenience. Consistently wrong predictions erode trust. People stop using the app, or worse, they start ignoring their own body's signals because the app told them something different.

Luna attempts to address this by:

- Starting with different baseline expectations depending on your health condition.
- Learning from your actual cycles rather than assuming a fixed pattern.
- Being transparent about its limitations.

It is also open-source (MIT license), which means anyone can inspect how it works, suggest changes, or run their own copy. Most commercial trackers are closed-source — you have to take their word for how they handle your data and make predictions.

---

## How It Works in Simple Terms

### The chat interface

You talk to an AI assistant (powered by a model called Grok 4.3) that understands plain language. The assistant has 10 things it can do:

| What you say | What it does |
|---|---|
| "My period started today" | Logs the start date of your period |
| "My period ended yesterday" | Logs the end date of your period |
| "I think I ovulated today" | Logs your ovulation date |
| "Cramps, bloating, mood swings" | Adds notes and symptoms to your current cycle |
| "Show me my recent cycles" | Displays a table of your recent cycle history |
| "When will my next period be?" | Predicts your next period start date |
| "What are my cycle stats?" | Shows your averages and patterns |
| "Export my data" | Gives you a download link for all your data |
| "Remember that I have PCOS" | Stores that fact for future conversations |
| "What causes cramps?" | Searches the web and shares results |

When the assistant has structured information to show you — like a prediction or a statistics summary — it displays it as a visual card instead of a wall of text.

### The prediction engine

This is the core of the app. Here is how it works, step by step:

**Step 1: Starting assumptions.** When you have no data yet, Luna doesn't just guess 28 days. It uses published research averages as a starting point, and those averages change depending on what health conditions you've told it about:

| Condition | Expected cycle length | Expected period length | Maximum realistic cycle length |
|---|---|---|---|
| General population | 30.3 days | 6.2 days | 45 days |
| PCOS | 51 days | 7 days | 120 days |
| PCOD | 45 days | 6 days | 120 days |
| Endometriosis | 27 days | 7.5 days | 45 days |
| Thyroid disorders | 35 days | 6 days | 90 days |
| Hormonal birth control | 28 days | 4.5 days | 35 days |
| Irregular cycles | 30 days | 5.5 days | 90 days |
| Perimenopause | 45 days | 6 days | 120 days |

The "maximum realistic cycle length" is the cutoff — anything longer than that is treated as a missed log rather than a real cycle.

**Step 2: Learning from your data.** The system uses a method called "adaptive exponential smoothing." In plain terms: it pays more attention to your recent cycles than to older ones, and it adjusts how fast it learns based on how regular your cycles are.

- If your cycles are fairly consistent, it learns slowly and smoothly — small changes don't throw off the prediction.
- If your cycles are all over the place, it learns faster so it can keep up with the changes.

**Step 3: Blending.** When you've only logged 1–5 cycles, the system doesn't fully trust your data yet. It blends your actual cycles with the starting assumptions (the "priors"), gradually shifting weight toward your real data as you log more. Once you have 6 or more cycles, it relies on your data entirely.

**Step 4: Handling weird data.** Two safeguards:

- **Skip gate:** If a cycle is unusually long (e.g., 80 days when your average is 30), the system flags it as "probably a missed log, not a real long cycle" rather than treating it as real data that would throw off predictions.
- **Soft clamping:** If a data point is very far from the expected range (more than 2.5 standard deviations out), the system pulls it partway toward the average rather than either using the extreme value as-is or ignoring it completely. This is a middle-ground approach.

**Step 5: Uncertainty ranges.** The system doesn't just give you a single date. It also gives a range — like "your next period is predicted around April 12, likely between April 8 and April 17." The range is computed using a statistical method called jackknife resampling, which repeatedly recalculates the prediction while leaving out one cycle at a time, to see how much the prediction varies.

### Condition handling

If you tell Luna you have multiple conditions (say, PCOS and endometriosis), it uses the one that tends to cause the most cycle variability, since that's the one most likely to affect predictions. The one exception is hormonal birth control — if you're on it, that always takes priority, because it directly controls your cycle length.

### The memory system

Luna uses a separate service called Supermemory to remember personal facts across conversations. If you say "I have PCOS" in one session and come back a week later, it still knows. This is separate from the cycle data stored in the database.

---

## What Makes It Different

Here is how Luna compares to other popular period trackers:

| Feature | Luna | Clue | Natural Cycles | Flo | drip (open-source) | Typical GitHub tracker |
|---|---|---|---|---|---|---|
| How it predicts | Learns from your cycles, adjusts learning speed | Likely uses probability-based methods (not publicly disclosed) | Uses basal body temperature + statistics | Uses a proprietary neural network | Uses body temperature + rule-based math | Simple average of past cycles |
| Adjusts for health conditions | Yes — 8 conditions with different starting assumptions | Not disclosed | Not disclosed | Not disclosed | No | No |
| Shows uncertainty ranges | Yes | Yes (probability-based) | Yes (risk-based) | Widens the prediction window | No | No |
| Chat-based logging | Yes — you type naturally | No | No | Partial | No | No |
| How it handles the "no data yet" problem | Uses condition-specific research averages | Not disclosed | Relies on temperature tracking | Likely assumes 28 days | Manual setup | Assumes 28 days |
| Clinically validated | No | Partially (some published research) | Yes — FDA-cleared as a contraceptive | No published validation | No | No |
| Open source | Yes (MIT license) | No | No | No | Yes | Varies |
| Handles missing logs | Flags unusually long gaps as likely missed entries | Explicitly models missing data | Takes a conservative approach | Unclear | Doesn't specifically address this | Doesn't address this |

The main things Luna does differently:

1. **Condition-aware starting points.** Most trackers start everyone at the same default. Luna starts with different assumptions for different conditions. This could help — but we don't have evidence yet that it actually does help (more on that below).

2. **Chat-based interface.** Most trackers require you to tap through menus and calendars. Luna lets you type naturally. This could make logging easier — but it also introduces the risk of the AI misunderstanding what you say.

3. **Open source.** You can see exactly how it works, how it stores your data, and how it makes predictions. Most commercial trackers are black boxes.

4. **Adaptive learning rate.** The system learns faster when your cycles are irregular and slower when they're stable. Most trackers use a fixed approach.

---

## What Was Tested

Honestly: not much, and this is a significant gap.

During the development process, several bugs were found and fixed through code review:

| Bug | What was wrong | What was fixed |
|---|---|---|
| Dashboard used a fixed 14-day luteal phase | The main screen ignored the prediction engine's luteal estimate and always assumed 14 days | Dashboard now uses the engine's estimate |
| Dashboard ignored health conditions | Predictions on the main screen always used general-population numbers, even if you said you had PCOS | Dashboard now uses your condition-specific priors |
| Anomaly flags were lost | The system computed whether a cycle looked anomalous, but never saved that flag to the database | Flags are now saved |
| Prediction code mixed two strategies | The variance estimation had confusing code that unintentionally blended two different approaches | Simplified to one clear approach |
| Import didn't update predictions | When you imported cycles from another app, the prediction engine didn't recalculate | Predictions now refresh after import |
| Anomalous cycles lowered learning speed | Flagged anomalies were making the system learn slower, the opposite of what was intended | Anomalies no longer deflate the learning rate |
| Calendar showed overlapping phases | Predicted phases could visually overlap with actual logged data | Display logic was corrected |

These fixes are real improvements, but they were found through code review — not through systematic testing. There are no automated tests, no accuracy benchmarks, and no user studies published.

---

## What We Still Don't Know

This is important. Here is what we cannot currently say about Luna:

1. **How accurate are the predictions?** We have not measured prediction accuracy against real cycle data. We don't know if the predictions are better or worse than simply assuming a 28-day cycle.

2. **Do the condition-specific priors actually help?** It makes intuitive sense that starting with PCOS-appropriate averages would improve predictions for PCOS users. But we have not tested this.

3. **How do people actually use it?** No user studies have been conducted. We don't know if people find the chat interface easier or harder than traditional tap-to-log interfaces.

4. **Does the AI understand dates correctly?** The natural language processing for dates ("my period started last Tuesday") has not been systematically tested.

5. **Are the uncertainty ranges well-calibrated?** When Luna says "likely between April 8 and April 17," does the actual period fall within that range the right percentage of the time? We don't know.

6. **Does the adaptive learning rate help?** The idea of learning faster for irregular cycles and slower for regular ones is reasonable, but we haven't compared it to a fixed learning rate.

7. **How does it perform with very little data?** With only 1–2 cycles logged, predictions are largely driven by the population priors. We don't know how useful this is in practice.

8. **Is the 45-day skip gate threshold right?** For the general population, cycles longer than 45 days are flagged as probably missed logs. But some people genuinely have 46-day cycles. We don't know whether this threshold causes false positives.

9. **Is "most disruptive condition wins" the right rule?** When someone has multiple conditions, Luna uses the one with the highest cycle-length variance. Whether this is clinically appropriate is unknown.

---

## Limitations

### It is not a medical device

Luna is a tracking tool, not a diagnostic tool. It cannot tell you whether your cycles are healthy or unhealthy. It cannot detect pregnancy, fertility windows, or any medical condition. If you have concerns about your cycle, talk to a healthcare provider.

### No clinical validation

Natural Cycles is the only period tracker that has been cleared by the FDA as a contraceptive [2]. Luna has no such validation. Its predictions are statistical estimates, not medical advice.

### The AI can misunderstand you

Chat-based logging is convenient, but it's not perfect. The AI might misinterpret what you say, log the wrong date, or miss information entirely. It's worth checking that what it logged matches what you meant.

### Data privacy considerations

Your data is stored in a PostgreSQL database hosted on Neon, and personal facts are stored in Supermemory. The AI conversations go through a third-party proxy (HackClub AI). While the code is open-source and you can inspect how data is handled, the infrastructure is still managed by third parties. If you need strong privacy guarantees, you would need to self-host.

### Same AI model for all plans

Luna has three pricing tiers (Free, Premium at $5/month, Premium+ at $12/month), but they all use the same AI model (Grok 4.3). The only difference is the tone of the AI's responses — the Free tier is practical and to-the-point, Premium is warmer and more attentive, and Premium+ is the most empathetic. The predictions and capabilities are identical across all tiers.

### No wearable integration

Luna cannot read data from wearable devices. If you track basal body temperature with an Oura Ring or Apple Watch, you'll need to enter that information manually.

### Condition priors are based on published averages, not individual data

The condition-specific starting points (e.g., 51-day cycle for PCOS) come from published research averages. They represent what's typical for a population, not what's true for any specific person. Individual variation within each condition is substantial.

---

## Conclusion

Luna is an honest attempt to make period tracking more adaptable and more accessible. It adjusts its expectations based on your health conditions, learns from your actual cycles, and lets you log information by talking instead of tapping. It is open-source, which means its methods are transparent and inspectable — something that cannot be said for most commercial trackers.

However, it is also an unvalidated attempt. None of its design choices — the condition-specific priors, the adaptive learning rate, the skip gate, the soft clamping — have been tested against real-world cycle data to see if they actually improve predictions. The bugs found during code review suggest that the implementation needed (and received) careful scrutiny, and that more issues may exist.

The comparison with existing trackers is nuanced. Natural Cycles has FDA clearance and a fundamentally different approach (basal body temperature-based). Clue has published some research. Flo has millions of users but no published validation. Open-source trackers like drip exist but lack condition awareness. Luna occupies a unique niche — condition-aware, conversational, open-source — but uniqueness is not the same as effectiveness.

If you use Luna, use it as a tracking tool that gives statistical estimates, not as a source of medical truth. Check that it logged what you meant. Be aware that its predictions are most useful when you have several cycles of data. And if something in your cycle concerns you, talk to a doctor — not to an app.

---

## References

1. Johnson, S., Marriott, L., & Zinaman, M. (2018). The cycle: What we know and don't know about the menstrual cycle. *Journal of Women's Health*, 27(5), 623–633.

2. Natural Cycles. (2018). FDA 510(k) clearance K171817: Natural Cycles — a software application for contraception. U.S. Food and Drug Administration.

3. ACOG Practice Bulletin No. 110. (2010). Noncontraceptive uses of hormonal contraceptives. *Obstetrics & Gynecology*, 115(1), 206–218.

4. Azziz, R., et al. (2006). Positions statement: Criteria for defining polycystic ovary syndrome as a predominantly hyperandrogenic syndrome. *Journal of Clinical Endocrinology & Metabolism*, 91(11), 4237–4245.

5. Harlow, S.D., & Matkowskyj, K.A. (2011). The epidemiology of the menstrual cycle. In *Menstrual Cycle* (pp. 1–22). Academic Press.

6. Münster, K., Schmidt, L., & Helm, P. (1992). Length and variation in the menstrual cycle — a cross-sectional study from a Danish county. *British Journal of Obstetrics and Gynaecology*, 99(5), 422–429.

7. Pierce, M., et al. (2023). drip.: An open-source app for menstrual cycle tracking. *Journal of Open Source Software*, 8(86), 4875.

8. Vrandečić, A., & Wulczyn, E. (2020). Cycle length distribution and variability in a large mobile health cohort. *NPJ Digital Medicine*, 3, 113.

9. Symul, L., et al. (2019). Assessment of menstrual health status and evolution through mobile apps. *NPJ Digital Medicine*, 2, 64.

10. ChatGPT Deep Research. "Menstrual Cycle Statistics by Condition." Internal research document. Provides mean±SD tables for PCOS, PCOD, endometriosis, thyroid, hormonal BC, irregular cycles, and perimenopause. Most values marked "Low" evidence quality.

11. Gemini Deep Research. "Clinical Population Priors and Algorithmic Framework for Adaptive Menstrual Cycle Prediction." Internal research document. Discusses condition-aware modeling and adaptive α parameter tuning. Provides condition-specific priors with varying evidence quality.

12. Perplexity Deep Research. Condition-specific priors with quantitative tables and explicit evidence quality ratings. Internal research document. Highest quality of the three deep research sources. Najmabadi et al. pooled cohort data for general population. Holman 2006 perimenopause data. PCOS from Nutrients 2026 trial and MOS2 cohort.
