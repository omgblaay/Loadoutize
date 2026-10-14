---
name: review-task
description: Review completed or in-progress task work against the original request, acceptance criteria, repository conventions, and verification evidence. Use when the user asks to review, audit, check, validate, or assess a task or implementation; do not use for ordinary implementation unless a distinct review is requested.
---

# Review Task

Review the work as an independent evaluator. Identify concrete defects, regressions, missing requirements, unsafe behavior, and meaningful verification gaps. Do not modify the implementation unless the user also asks for fixes.

## Establish the review target

- Recover the task requirements from the conversation, linked issue or plan, and relevant repository documentation. Treat explicit acceptance criteria as authoritative.
- Determine the actual change set before judging it. Prefer a user-specified commit, branch, or diff range. Otherwise inspect tracked and untracked working-tree changes and recent commits relevant to the task.
- Separate reviewed changes from unrelated or pre-existing work. Do not attribute unrelated changes to the task author.
- Include non-code deliverables when the task concerns configuration, migrations, documentation, assets, or operational behavior.

## Evaluate the work

Trace each requirement to observable implementation and verification evidence. Focus on:

- incorrect behavior and unhandled boundary cases;
- regressions in adjacent flows and public interfaces;
- security, privacy, authorization, data-integrity, and destructive-operation risks;
- incomplete acceptance criteria or scope drift;
- mismatches between code, schema, configuration, and documentation;
- tests that are missing, ineffective, flaky, or assert the wrong behavior.

Read the surrounding code needed to validate assumptions. Run safe, targeted checks when they materially increase confidence, using the repository's existing commands and tooling. Do not install dependencies, update snapshots, rewrite generated files, access live systems, or perform external mutations merely to complete a review. If a useful check cannot be run safely, state that limitation.

Avoid generic style feedback, speculative concerns without a plausible failure mode, and requests for unrelated refactors. A finding should describe a behavior that can fail, a requirement that is unmet, or a maintenance risk significant enough to act on.

## Report

Lead with findings ordered by severity. For each finding:

1. assign `critical`, `high`, `medium`, or `low` severity;
2. state the defect or unmet requirement directly;
3. explain the user-visible or operational impact and the conditions that trigger it;
4. cite the narrowest relevant file and line;
5. suggest the smallest viable correction when it is not obvious.

After the findings, list any assumptions or unanswered questions that materially affect the verdict, then give a short verification summary. If no actionable findings exist, say so explicitly and mention residual risks or checks that were not possible. Do not bury findings beneath a general summary or praise.
