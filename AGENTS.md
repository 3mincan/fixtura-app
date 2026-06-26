# AGENTS.md

# Fixtura Agent Instructions

## Project Summary

Fixtura is a mobile football prediction and tournament simulation game.

The user selects a World Cup team and predicts only that team's matches.

All other matches are simulated by a probability-based football engine.

The goal is to create realistic tournament scenarios rather than random score generation.

The tournament must progress naturally from:

- Group Stage
- Round of 32
- Round of 16
- Quarter Finals
- Semi Finals
- Third Place Match
- Final

The experience should feel like:

> Pick your country. Predict your journey. Watch the rest of the World Cup unfold.

---

# Agent Behaviour

## Think Before Coding

Never assume requirements.

Before implementing:

- State assumptions explicitly.
- Surface ambiguity instead of guessing.
- Present alternative approaches when they exist.
- Prefer clarification over incorrect implementation.
- Push back against unnecessary complexity.

If something is unclear:

1. Stop.
2. Explain what is unclear.
3. Ask a focused question.

Do not silently choose an interpretation.

---

## Simplicity First

Prefer the smallest solution that satisfies the requirement.

Rules:

- No speculative features.
- No premature abstractions.
- No unnecessary configuration.
- No future-proofing unless explicitly requested.
- No architecture for problems that do not yet exist.

Before writing code ask:

- Can this be implemented with fewer files?
- Can this be implemented with fewer abstractions?
- Would a senior engineer consider this over-engineered?

If yes, simplify.

---

## Surgical Changes

When modifying existing code:

- Change only what is necessary.
- Do not refactor unrelated areas.
- Do not reformat unrelated files.
- Do not remove unrelated dead code.
- Match existing project style.

Allowed cleanup:

- Imports made unused by your changes.
- Variables made unused by your changes.
- Functions made unused by your changes.

Everything else requires explicit approval.

---

## Goal Driven Execution

Convert requests into verifiable outcomes.

Example:

Task: Fix group standings bug

Plan:

1. Reproduce bug
   Verify: failing test exists

2. Fix standings calculation
   Verify: test passes

3. Run affected test suite
   Verify: no regressions

Never stop at implementation.

Always verify.

---

# Product Principles

## Simulation First

Priority order:

1. Simulation Accuracy
2. Tournament Logic
3. Replayability
4. User Experience
5. Visual Polish

If visuals conflict with realism, choose realism.

---

## MVP Protection Rule

Before implementing any feature ask:

- Does this improve replayability?
- Does this improve simulation realism?
- Does this help the user complete a tournament?

If all answers are no:

Do not build it.

---

## No Gambling Rule

Allowed terms:

- prediction
- simulation
- scenario
- tournament path
- probability

Forbidden terms:

- odds
- wager
- bet
- stake
- payout
- gambling

---

# Architecture Rules

## Simulation Engine Independence

Simulation code must never depend on UI code.

Allowed:

UI → Simulation Engine

Forbidden:

Simulation Engine → React Native Components

All simulation logic must remain portable and testable.

---

## Seeded Determinism

All simulations should optionally support seeds.

Example:

simulateTournament({
seed: "worldcup2026"
})

Using the same seed must always generate the same tournament.

Benefits:

- testing
- debugging
- reproducibility
- future sharing functionality

---

## Tech Stack

Use:

- React Native
- Expo
- TypeScript
- Expo Router
- Zustand
- Expo SQLite
- NativeWind
- React Native Reanimated

Do not introduce a backend until required.

---

## State Management

Recommended stores:

/src/store

- tournamentStore.ts
- predictionStore.ts
- simulationStore.ts

Keep simulation logic outside Zustand.

---

## Folder Structure

/src

/app
/components
/data
/simulation
/store
/db
/types
/utils
/theme

---

## Simulation Rules

The simulation engine is the most important system in the application.

Use structured team ratings.

Example:

type TeamRating = {
id: string;
name: string;
group: string;
overall: number;
attack: number;
defence: number;
form: number;
}

Consider:

- overall rating
- attack vs defence
- recent form
- randomness
- tournament pressure
- football realism

Common scores:

- 0-0
- 1-0
- 1-1
- 2-1
- 2-0

Rare scores:

- 5-2
- 6-1

Extremely rare:

- 8-0
- 9-7

---

## Group Stage Rules

Standings:

1. Points
2. Goal Difference
3. Goals Scored
4. Head-to-Head

Points:

- Win = 3
- Draw = 1
- Loss = 0

---

## Knockout Rules

Knockout matches cannot end in a draw.

If tied:

1. Extra Time
2. Penalties

Penalties should slightly favour stronger teams while remaining unpredictable.

---

## User Prediction Rules

The user predicts only matches involving their chosen country.

All other matches are simulated.

Results should be revealed gradually to create immersion.

---

## Success Criteria

A successful MVP allows users to:

1. Select a country.
2. Predict that country's matches.
3. Simulate the rest of the tournament.
4. Reach a realistic knockout stage.
5. Complete the tournament.
6. Replay with another country.

Replayability is more important than feature count.
