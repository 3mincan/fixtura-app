# DECISIONS.md

# Architecture Decisions

## Decision 001

Title:

React Native over Godot

Reason:

The application is simulation-driven rather than graphics-driven.

Outcome:

Use React Native + Expo.

Status:

Accepted

---

## Decision 002

Title:

Simulation Engine Before UI

Reason:

The simulation engine is the core product value.

Outcome:

Build simulation first.

Status:

Accepted

---

## Decision 003

Title:

No Backend For MVP

Reason:

The entire tournament can run locally.

Outcome:

Use SQLite only.

Status:

Accepted

---

## Decision 004

Title:

Seeded Simulations

Reason:

Reproducibility is required for testing and future sharing.

Outcome:

All simulations support optional seeds.

Status:

Accepted

---

## Decision 005

Title:

No Gambling Terminology

Reason:

The product is a prediction game, not a betting product.

Outcome:

Avoid betting language across the application.

Status:

Accepted

---

## Decision 006

Title:

User Predicts Only One Team

Reason:

Reduces complexity and increases immersion.

Outcome:

Users only predict matches involving their selected country.

Status:

Accepted

---

## Decision 007

Title:

Simulation Logic Must Be UI Independent

Reason:

Allows testing and future platform flexibility.

Outcome:

Simulation code cannot import React Native code.

Status:

Accepted

---

## Decision 008

Title:

Replayability Over Feature Count

Reason:

The product succeeds when users replay tournaments.

Outcome:

Prioritise replayability before adding new features.

Status:

Accepted

---

## Decision 009

Title:

Local-First Architecture

Reason:

Offline functionality improves usability and reduces cost.

Outcome:

Store tournament progress locally.

Status:

Accepted

---

## Decision 010

Title:

Keep MVP Small

Reason:

World Cup timing is more important than feature completeness.

Outcome:

Focus on tournament simulation only.

Status:

Accepted
