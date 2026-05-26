# BrandArmor Machine Learning And AI Roadmap

This document applies the K-Dense Machine Learning and AI category to BrandArmor: deep learning, reinforcement learning, time series analysis, model interpretability, and Bayesian methods.

The roadmap is intentionally staged. BrandArmor should earn ML complexity through data, not start with it.

## Stage 0: Deterministic Baseline

Current foundation:

- product baselines
- listing evidence
- OCR artifacts
- regulatory checks
- visual adapter placeholder
- deterministic scoring
- LLM judge with evidence citations
- review labels
- evaluation metrics

Goal:
Make the baseline strong enough that ML improvements are measurable.

Required dataset:

- at least 200 labeled skincare/cosmetics listing cases before operational accuracy claims
- balanced legitimate, likely counterfeit, gray-market, expired/unsafe, and insufficient-evidence cases
- explicit source metadata and reviewer notes

## Stage 1: Deep Learning For Vision

Use after enough reference images and suspect screenshots exist.

Candidate approaches:

- SigLIP or CLIP embeddings for product/package similarity
- DINOv2-style self-supervised embeddings for packaging layout
- OCR plus image embeddings for multimodal evidence
- nearest-neighbor retrieval against official assets

Outputs:

- similarity score
- nearest official references
- visual mismatch reasons
- uncertainty or inconclusive status

Do not output:

- counterfeit confirmation
- legal conclusion
- claim of exact product identity without review

Evaluation:

- top-K retrieval accuracy
- false visual mismatch rate on legitimate listings
- recall on known suspicious cases
- reviewer usefulness score

## Stage 2: Transformers For Text And Evidence Extraction

Use for:

- multilingual listing normalization
- Indonesian marketplace slang extraction
- packaging claim extraction
- OCR cleanup
- seller policy classification
- report drafting with citations

Guardrails:

- output structured fields
- cite source evidence IDs
- keep raw OCR and raw listing text
- mark low-confidence extraction

Evaluation:

- field extraction precision/recall
- hallucinated field rate
- missing-evidence detection rate
- reviewer correction rate

## Stage 3: Time Series Analysis

Use for behavior over time:

- seller price drift
- repeated suspicious listings
- marketplace burst detection
- post-review recurrence
- enforcement response delay
- brand risk trend

Candidate methods:

- simple rolling windows first
- anomaly detection on price and volume
- seasonal baselines
- TimesFM or other forecasting only after simple baselines are measured

Outputs:

- seller risk trajectory
- marketplace watch alerts
- trend confidence
- top changed signals

Avoid:

- treating one-time anomaly as proof
- alert fatigue from uncalibrated thresholds

## Stage 4: Interpretability

BrandArmor risk explanations must be inspectable.

Use:

- feature contribution tables for deterministic scoring
- SHAP-style explanations if tree/ML models are introduced
- evidence-to-feature traceability
- threshold comparison views

Reviewer-facing questions:

- Why was this listing routed?
- Which evidence changed the score?
- What would lower the risk?
- Which evidence is missing?
- Is the model relying too heavily on price, seller, or OCR terms?

## Stage 5: Bayesian Methods

Use Bayesian reasoning to represent uncertainty as evidence arrives.

Examples:

- prior risk by seller or marketplace category
- likelihood update from BPOM mismatch
- likelihood update from unauthorized seller
- likelihood update from visual mismatch
- confidence intervals around precision and recall

Outputs:

- posterior risk band
- uncertainty interval
- "needs more evidence" decision when posterior uncertainty is high

Why this matters:
BrandArmor should not pretend certainty when the evidence is partial.

## Stage 6: Reinforcement Learning Or Bandits

Do not use RL for enforcement decisions.

Possible safe uses later:

- active learning: which case should reviewers label next?
- evidence collection policy: OCR first, BPOM first, or visual first?
- contextual bandit for review queue ordering
- budget allocation across provider calls

Reward signals:

- reviewer-confirmed useful routing
- reduced review burden
- faster time to decision
- lower false-positive rate

Forbidden reward signals:

- number of takedowns
- number of high-risk labels
- model confidence alone

Goodhart risk:
If takedowns become the reward, the system will learn to accuse more, not to be more correct.

## Dataset Contract

Every labeled case should include:

- listing snapshot
- marketplace and seller
- product baseline
- price and currency
- OCR artifact
- regulatory check
- visual evidence or explicit missing status
- deterministic score
- judge assessment
- human review label
- reviewer notes
- final limitation notes

## Model Release Gate

No ML model should become default unless:

- it beats the deterministic baseline on the target metric
- it does not increase false positives beyond tolerance
- it has failure analysis
- it has a rollback path
- its output is explainable to reviewers
- it is labeled correctly in the UI

