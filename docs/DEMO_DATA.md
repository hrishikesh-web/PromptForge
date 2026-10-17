# Demo data disclosure

PromptForge ships with demonstration content so every feature and every SQL use case can be shown during the
presentation. This page states exactly what is real and what is seeded.

## Accounts

| Name | Email | Role | Notes |
| :--- | :--- | :--- | :--- |
| Hrishikesh Khanna | hrishikeshkhanna17@gmail.com | ADMIN | Real account. Registered by the owner with their own password; promoted by migration 004. |
| Saksham Arora | saksham.arora@demo.promptforge.test | USER | Demo account (project teammate's name) |
| Aryan Shresth | aryan.shresth@demo.promptforge.test | USER | Demo account (project teammate's name) |
| Dhruv Gangrade | dhruv.gangrade@demo.promptforge.test | USER | Demo account |
| Pranav Ranjith | pranav.ranjith@demo.promptforge.test | USER | Demo account |
| Devansh Lingala | devansh.lingala@demo.promptforge.test | USER | Demo account |

* `.test` is a reserved top-level domain (RFC 2606): these addresses cannot belong to anyone or receive mail.
  No real email address or personal password was invented for these people.
* The demo accounts start **locked** (their password hash is of a random secret that was discarded).
  `npm run demo:passwords` sets one local password chosen by you.
* Their bios say "Demo account". Nothing personal about these people was invented.

## Prompts

31 prompt templates (30 published, 1 draft used to demonstrate draft privacy), written for this project. They are
original templates, not copied from other creators. Authorship is assigned for demonstration purposes. Six prompts have
2-3 versions, showing how a template improved (for example, a rule added after an AI invented a formula).

"Suggested model" values are model-agnostic ("Any chat model", "Any model with file upload", "Any image-editing model",
"Any image-generation model"). No prompt claims to have been tested on a specific product.

## Activity

The likes, bookmarks, ratings, comments, follows and notifications created by migration 006 are **seeded
demonstration activity between demo accounts**, generated reproducibly from `database/library/library.js`.
They are not genuine endorsements. Every `activity_logs` row written by the migrations carries
`"seeded_demo": true` in its JSON metadata, so it can be identified with:

```sql
SELECT * FROM activity_logs WHERE JSON_EXTRACT(metadata, '$.seeded_demo') = TRUE;
```

Rules the seed follows (the same rules the application enforces): nobody likes, rates or comments on their own prompt;
drafts receive no interactions; ratings are 1-5; each user rates a prompt at most once.
