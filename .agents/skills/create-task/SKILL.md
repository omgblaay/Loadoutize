---
name: create-task
description: Create an actionable repository task as a Markdown file from a feature request, bug report, maintenance goal, or implementation idea. Use when the user asks to create, write, define, or document a new task; do not implement the task unless separately requested.
---

# Create Task

Turn the user's request into a durable task specification that another contributor can implement without relying on hidden conversation context. Create the Markdown file, but do not implement the described work unless the user explicitly asks for both.

## Understand the task

- Preserve the user's stated outcome, constraints, terminology, and priorities.
- Inspect the minimum relevant repository context needed to make the task accurate: project documentation, nearby code, configuration, tests, and existing task files.
- Distinguish verified repository facts from proposed behavior. Do not invent product decisions, technical constraints, or acceptance criteria that materially change the request.
- Ask a concise question only when a missing decision would substantially change scope or expected behavior. Otherwise record a bounded assumption or an open question in the task.

## Choose the file

Honor an explicit destination or filename. Otherwise follow the repository's existing task-document convention, preferring an established `tasks/`, `docs/tasks/`, `plans/`, or `Plans/` directory in that order when one exists. If no convention exists, create `tasks/`.

Use a short lowercase kebab-case filename derived from the outcome, ending in `.md`. Do not overwrite an existing task file unless the user requested an update; choose a clear alternative name or ask when identity matters.

## Write an actionable specification

Use only the sections that add useful information, normally:

```markdown
# Task title

## Objective

## Context

## Requirements

## Out of scope

## Acceptance criteria

## Verification

## Open questions
```

The task must:

- describe the desired observable outcome rather than prescribing incidental implementation details;
- include concrete functional and non-functional requirements supported by the request;
- identify relevant files, components, routes, schemas, or interfaces when repository inspection confirms them;
- make boundaries explicit so adjacent work is not accidentally absorbed;
- express acceptance criteria as independently verifiable checklist items;
- specify proportionate verification, including important failure and boundary cases;
- include open questions only when they remain genuinely unresolved.

Keep the document concise relative to the work. Omit empty sections and boilerplate. Use links or repository-relative paths instead of copying large blocks of existing documentation.

## Finish

Review the Markdown for internal consistency and confirm the file is visible in the working tree. Report the created path and summarize the task's scope and any recorded assumptions or open questions.
