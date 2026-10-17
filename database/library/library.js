/**
 * PromptForge launch library — the single source of truth for demo content.
 *
 * `node database/library/build.js` turns this file into the SQL migrations in
 * database/migrations/ (002–006). Nothing here touches a database by itself.
 *
 * Conventions
 *  - Placeholders are written {{snake_case}}.
 *  - In `content`, a line starting with "@v2 " (or "@v3 ") was ADDED in that version.
 *    The build creates version 1 without those lines, then version 2 (and 3) with them,
 *    so the version history and "changes" view show real differences.
 *  - ASCII only (no smart quotes/emoji) so the SQL imports cleanly on any Windows terminal.
 *  - Engagement (likes, ratings, comments, follows) generated from this file is SEEDED
 *    DEMONSTRATION ACTIVITY between demo accounts, not genuine endorsements.
 */

const DEMO_DOMAIN = 'demo.promptforge.test';

/** Hrishikesh's real account must be REGISTERED through the website first; it is never created here. */
const ADMIN_EMAIL = 'hrishikeshkhanna17@gmail.com';

const PEOPLE = {
  H: { name: 'Hrishikesh Khanna', email: ADMIN_EMAIL, real: true },
  S: { name: 'Saksham Arora', email: `saksham.arora@${DEMO_DOMAIN}`, bio: 'Demo account. Member of the PromptForge project team.' },
  A: { name: 'Aryan Shresth', email: `aryan.shresth@${DEMO_DOMAIN}`, bio: 'Demo account. Member of the PromptForge project team.' },
  D: { name: 'Dhruv Gangrade', email: `dhruv.gangrade@${DEMO_DOMAIN}`, bio: 'Demo account for the PromptForge presentation.' },
  P: { name: 'Pranav Ranjith', email: `pranav.ranjith@${DEMO_DOMAIN}`, bio: 'Demo account for the PromptForge presentation.' },
  V: { name: 'Devansh Lingala', email: `devansh.lingala@${DEMO_DOMAIN}`, bio: 'Demo account for the PromptForge presentation.' }
};

const CATEGORIES = [
  { name: 'Study & Exams', description: 'Turn lecture material into notes, practice questions, flashcards and clear explanations.', renamedFrom: 'Academic & Research' },
  { name: 'Assignments & Projects', description: 'Plan, review and present your own project work without inventing results.' },
  { name: 'Coding & Development', description: 'Debug, review, test and build software, from React components to Node.js APIs.', renamedFrom: 'Software Engineering' },
  { name: 'Data Analysis & SQL', description: 'Write and understand SQL, explain database schemas and work with data.' },
  { name: 'Cybersecurity & Labs', description: 'Learn security concepts and document work in labs you are authorised to use.' },
  { name: 'Photo & Image', description: 'Reusable editing looks, style descriptions and image-generation briefs.' },
  { name: 'Content Creation & Social Media', description: 'Captions, short-video scripts, thumbnails and content planning.', renamedFrom: 'Marketing & Sales' },
  { name: 'Gaming', description: 'Spoiler-safe help with stories and missions, and settings for your hardware.' },
  { name: 'Communication & Career', description: 'Emails, posts and interview practice that keep your real facts intact.' },
  { name: 'Planning & Productivity', description: 'Turn messy notes, syllabi and to-do lists into realistic plans.' }
];

/** "Suggested model" rows. Model-agnostic on purpose: no prompt claims to be tested on a specific product. */
const MODELS = [
  { name: 'Any chat model', provider: 'Model-agnostic' },
  { name: 'Any model with file upload', provider: 'Model-agnostic' },
  { name: 'Any image-editing model', provider: 'Model-agnostic' },
  { name: 'Any image-generation model', provider: 'Model-agnostic' }
];
const M = { chat: 'Any chat model', file: 'Any model with file upload', edit: 'Any image-editing model', gen: 'Any image-generation model' };

/** Existing seed tags renamed in place (same meaning), so their prompt links are kept. */
const TAG_RENAMES = [
  ['summarization', 'summary'],
  ['unit-testing', 'testing'],
  ['sql-generator', 'sql']
];

const PROMPTS = [
  // ------------------------------------------------------------------ Study & Exams
  {
    key: 'open-book-notes',
    author: 'H',
    category: 'Study & Exams',
    model: M.file,
    tags: ['open-book', 'summary', 'needs-pdf', 'needs-slides', 'exam-prep'],
    daysAgo: 140,
    title: 'Open-book exam notes from lecture slides or PDF',
    description: 'Turns the official slides or PDF for a few modules into printed notes you can search quickly during an open-book exam, with page references and an index.',
    v2Notes: 'Added the [CHECK] rule after it filled a gap with an invented formula, and an A-Z index.',
    content: `I'm preparing printed notes for an open-book exam: {{exam_name}} in {{subject}}. The attached file(s) are the official lecture material for {{modules}}.

Make notes I can search quickly under exam pressure:
- Follow the order of the material. One numbered heading per topic (1, 1.1, 1.2 ...).
- Under each topic: a 2-3 line plain-English explanation, every definition word for word, every formula with what each symbol means, and any diagram described in one line with its slide or page number.
- After each formula, one short worked example only if the material contains one.
- Mark an item with * only when the material emphasises it (repeated, boxed, or labelled important).
@v2 - End with an A-Z index of key terms and their slide or page numbers.

Use only the attached material.
@v2 If something is unclear or missing, write "[CHECK: ...]" instead of filling the gap.
Aim for about {{target_pages}} printed pages.`
  },
  {
    key: 'question-bank',
    author: 'S',
    category: 'Study & Exams',
    model: M.file,
    tags: ['question-bank', 'exam-prep', 'needs-pdf'],
    daysAgo: 118,
    title: 'Exam-pattern question bank with worked answers',
    description: 'Practice questions in the same pattern as your paper, each with a model answer sized to its marks and the page it comes from.',
    content: `Using only the attached material for {{subject}} ({{topics}}), write practice questions in the style of my exam.

Exam pattern: {{exam_pattern}}
Difficulty mix: {{difficulty_mix}}

For each question give:
- The question and its marks
- A model answer sized to the marks (short answers in 3-4 lines; long answers with headings, a described diagram and a conclusion)
- The slide or page it comes from
- One common mistake students make on it

Do not repeat a concept until every listed topic has been covered once.`
  },
  {
    key: 'flashcards',
    author: 'D',
    category: 'Study & Exams',
    model: M.file,
    tags: ['flashcards', 'exam-prep', 'needs-pdf'],
    daysAgo: 64,
    title: 'Flashcards and a one-page formula sheet',
    description: 'One-fact-per-card flashcards plus a formula sheet, also given as "front;back" lines you can import into a flashcard app.',
    content: `From the attached material on {{topic}}, make:
1. {{card_count}} flashcards as a two-column table: Front | Back. Front is one question or term; Back is an answer under 25 words. One fact per card. Include every definition and formula.
2. A one-page formula sheet: formula, meaning of each symbol, units, and when to use it.

Then list the flashcards again as plain text, one per line as "front;back", so I can import them into a flashcard app.
Use only the attached material and mark anything uncertain with [CHECK].`
  },
  {
    key: 'explain-twice',
    author: 'D',
    category: 'Study & Exams',
    model: M.chat,
    tags: ['explanation', 'exam-prep'],
    daysAgo: 21,
    title: 'Explain it twice: simple, then exam-ready',
    description: 'First a jargon-free explanation with an analogy, then a proper answer for the marks you need, then three quick questions to check you understood.',
    content: `Explain {{concept}} from {{subject}}.

Part 1 - Simple: explain it to a friend who missed every lecture. One everyday analogy, no jargon, at most 120 words.
Part 2 - Exam-ready: a {{marks}}-mark answer with correct technical terms: definition, key points in order, a diagram described in words if one is usually expected, and a one-line conclusion.
Part 3 - Check me: ask me 3 short questions, one at a time, and wait for my answer before asking the next.

What I currently think it means (may be wrong): {{my_understanding}}`
  },

  // ------------------------------------------------------------------ Assignments & Projects
  {
    key: 'report-outline',
    author: 'S',
    category: 'Assignments & Projects',
    model: M.chat,
    tags: ['report-writing', 'planning'],
    daysAgo: 102,
    title: 'Project brief to report outline (no invented results)',
    description: 'Builds a report structure from your brief and what your team has actually done, and flags every section the brief asks for that you have not covered yet.',
    content: `My project brief or assignment instructions:
{{brief}}

What my team has actually built or done so far:
{{our_work}}

Create a report outline that matches the brief:
- Section headings in the order the brief expects (use its exact section names if it gives them).
- Under each heading, 2-4 bullet points on what that section should contain, drawn from our real work.
- Where the brief asks for something we have not done, write "GAP: ..." so I can see what is missing. Do not invent results, data, screenshots or citations.
- A suggested word count per section for a total of {{word_limit}} words.
- A final checklist of every deliverable the brief mentions (files, diagrams, formats, deadline).`
  },
  {
    key: 'viva-prep',
    author: 'H',
    category: 'Assignments & Projects',
    model: M.file,
    tags: ['viva', 'explanation', 'needs-code'],
    daysAgo: 45,
    title: 'Viva prep: understand and defend your own project',
    description: 'Explains your project from your own files at three levels of detail, predicts evaluator questions, then quizzes you one question at a time.',
    v2Notes: 'Added the file-by-file walkthrough of the main feature.',
    v3Notes: 'Added the rule to say when a likely question is not covered by my files.',
    content: `I have a viva / project review for {{project_name}}. I will paste or attach the project description, key code files and report.

Help me understand my own project well enough to explain it confidently:
- Explain it three ways: a 30-second pitch, a 2-minute walkthrough, and a technical explanation of the architecture.
@v2 - Walk through the main flow ({{main_feature}}) file by file, naming the actual functions involved.
- List 15 questions an evaluator is likely to ask (design choices, limitations, alternatives, improvements), from easy to hard.
- Then quiz me: one question at a time; wait for my answer; tell me what was right, what was missing and how to say it better.

Only describe what is actually in my files.
@v3 If a likely question is not covered by them, tell me so I can learn it instead of guessing.`
  },
  {
    key: 'speaking-script',
    author: 'H',
    category: 'Assignments & Projects',
    model: M.file,
    tags: ['presentation', 'needs-slides'],
    daysAgo: 12,
    title: 'Slides to a natural speaking script, with evaluator Q&A',
    description: 'Per-slide spoken script with timings and transitions for each team member, plus likely evaluator questions answered only from your slides.',
    content: `Turn the attached slides into a speaking script for a {{duration_minutes}}-minute presentation to {{audience}}. Speakers and their slides: {{speakers}}.

- For each slide: what to say in natural spoken English (short sentences; do not read the bullets aloud), a transition line to the next slide, and approximate seconds.
- Keep the total within {{duration_minutes}} minutes at about 130 words per minute.
- Mark one line per slide as "if I forget everything else, say this".
- Then: 10 likely questions from {{audience}} with short, honest answers based only on the slides. Flag any question the slides cannot answer.`
  },
  {
    key: 'rubric-review',
    author: 'S',
    category: 'Assignments & Projects',
    model: M.chat,
    tags: ['review', 'report-writing'],
    daysAgo: 33,
    title: 'Check my draft against the rubric (feedback, not a rewrite)',
    description: 'A strict evaluator-style review that quotes your draft against each rubric criterion and lists the most valuable fixes, without writing anything for you.',
    content: `Act as a strict but fair evaluator. Review my draft against the rubric. Do not rewrite the draft and do not add content I have not written.

Rubric:
{{rubric}}

Draft:
{{draft}}

Give me:
1. A table: Criterion | Likely score / out of | Evidence from my draft (quote it) | What is missing
2. The 5 most valuable fixes in priority order, each pointing to the exact place in my draft
3. Sentences that are confusing, with a short note on why
4. Citation and formatting problems against {{citation_style}}
5. Any claim that sounds unsupported, so I can check it against my actual results`
  },

  // ------------------------------------------------------------------ Coding & Development
  {
    key: 'react-debug',
    author: 'A',
    category: 'Coding & Development',
    model: M.chat,
    tags: ['react', 'debugging', 'needs-code'],
    daysAgo: 96,
    title: 'React debugging assistant',
    description: 'For components that render wrong, loop, or lose state. Gives the likely cause with the exact line, the smallest fix, and how to confirm it.',
    v2Notes: 'Asks for the smallest fix first and how to confirm it, instead of a full rewrite.',
    content: `Help me debug a React problem. Do not rewrite unrelated code.

What I expected: {{expected}}
What actually happens: {{actual}}
Error or console warning (exact text): {{error_message}}
Component code and any hooks or context it uses:
{{code}}
React version and setup: {{react_setup}}

In your answer:
- Say what is going wrong, in plain English (2-3 lines).
- Give the most likely cause, pointing to the exact line. Check stale closures, missing or wrong dependency arrays, state updated during render, keys in lists, and mutated state.
@v2 - Give the smallest fix, as changed lines only.
@v2 - Say how to confirm it is fixed (what to look for in the UI or React DevTools).
- If you are not sure, ask for the one extra piece of information that would settle it.`
  },
  {
    key: 'node-api-debug',
    author: 'A',
    category: 'Coding & Development',
    model: M.chat,
    tags: ['nodejs', 'debugging', 'needs-code'],
    daysAgo: 27,
    title: 'Node.js / Express API debugging',
    description: 'Works through a failing endpoint using the real request, response, server log and route code, and separates likely causes from guesses.',
    content: `Help me debug an Express API endpoint.

Endpoint: {{method}} {{route}}
Request I send (headers and body): {{request}}
Response I get (status and body): {{response}}
Server log / stack trace:
{{server_log}}
Route, middleware and controller code:
{{code}}
Database: {{database}}

1. Explain the error in plain English.
2. List the likely causes in order, with the evidence for each (for example: middleware order, missing await, unhandled promise, wrong status code, SQL error, CORS, body not parsed).
3. Give the smallest fix for the most likely cause, as changed lines only.
4. Give one curl or Postman request that proves it works.
Label anything not supported by the code or logs as a guess.`
  },
  {
    key: 'code-review-tests',
    author: 'A',
    category: 'Coding & Development',
    model: M.chat,
    tags: ['review', 'testing', 'needs-code'],
    daysAgo: 75,
    title: 'Pull-request style code review with test cases',
    description: 'Bugs and security issues first, only the readability changes that matter, then a table of test cases and the tests themselves.',
    content: `Review this {{language_or_framework}} code the way a senior developer reviews a pull request.

What it is for: {{purpose}}
Code:
{{code}}

Report in this order, most important first:
1. Bugs and incorrect behaviour (line and minimal fix)
2. Security issues (unvalidated input, SQL injection, secrets in code, missing authorisation)
3. Performance problems that matter at {{expected_scale}}
4. Readability: only the 3 changes with the biggest payoff
5. Test cases as a table (input | expected result | why this case matters), covering normal, edge and failure cases. Then write them using {{test_framework}}.

Do not restyle code that is already fine.`
  },
  {
    key: 'portfolio-page',
    author: 'V',
    category: 'Coding & Development',
    model: M.chat,
    tags: ['frontend', 'portfolio'],
    daysAgo: 58,
    title: 'Landing page or portfolio generator from your real details',
    description: 'A single responsive HTML and CSS page built only from the projects and skills you provide, with accessible markup and no placeholder testimonials.',
    content: `Build a single-page {{page_type}} (for example a personal portfolio or a project landing page) as one HTML file with embedded CSS. No frameworks.

Content (use only this, do not invent achievements, numbers or testimonials):
- Name / project name: {{name}}
- One-line description: {{tagline}}
- Sections and their content: {{sections}}
- Links: {{links}}

Design:
- Look and feel: {{style}}
- Colours: {{colours}}
- Must work well on a phone (360px wide) and a laptop.
- Accessible: real headings in order, alt text, visible keyboard focus, good contrast.

After the code, list anything I should replace (images, links) and how to publish it on GitHub Pages.`
  },
  {
    key: 'screenshot-to-ui',
    author: 'A',
    category: 'Coding & Development',
    model: M.file,
    tags: ['frontend', 'react', 'needs-image'],
    daysAgo: 9,
    title: 'Screenshot to UI implementation',
    description: 'Describes a screenshot or mockup precisely first, then builds it as a component in your stack, and lists what it had to guess.',
    content: `The attached image is a screenshot or mockup of a UI I want to build.

Stack: {{stack}} (for example React + Tailwind)
Screen size it should target: {{target_screen}}

1. First describe the layout in words: sections, alignment, spacing, colours (approximate hex), font sizes and every interactive element. I will confirm before you write code if anything is unclear.
2. Then implement it as {{component_name}}, using semantic HTML and accessible labels.
3. Make it responsive down to 360px wide.
4. List everything you had to guess (exact colours, fonts, icons, hover states) so I can check it against the design.`
  },

  // ------------------------------------------------------------------ Data Analysis & SQL
  {
    key: 'sql-generator',
    author: 'A',
    category: 'Data Analysis & SQL',
    model: M.chat,
    tags: ['sql', 'explanation'],
    daysAgo: 110,
    title: 'SQL query writer and explainer for your schema',
    description: 'Writes the query for a question in plain words, explains each clause, and points out the indexes and edge cases that matter.',
    v2Notes: 'Added a check for NULLs and duplicate rows from joins, and an index suggestion.',
    content: `Database: {{database_engine}}
Schema (CREATE TABLE statements or a table list with columns and keys):
{{schema}}

Question I want answered: {{question}}

- Write the SQL query. Use only tables and columns from the schema.
- Explain it clause by clause (FROM/JOIN, WHERE, GROUP BY, HAVING, ORDER BY) in plain English.
@v2 - Point out where NULLs or one-to-many joins could give wrong counts, and how the query avoids that.
@v2 - Suggest one index that would help and explain why.
- Show the expected shape of the result (column names and one example row).`
  },
  {
    key: 'dbms-schema-explainer',
    author: 'H',
    category: 'Data Analysis & SQL',
    model: M.chat,
    tags: ['dbms', 'sql', 'viva'],
    daysAgo: 6,
    title: 'Explain a database schema for a DBMS viva',
    description: 'Tables, keys, relationships, ON DELETE behaviour, normal forms, indexes and example joins and transactions for any schema you paste.',
    content: `Here is a database schema (SQL DDL or a table list):
{{schema}}

Explain it for a DBMS viva:
1. Each table in one line: what it stores and its primary key.
2. Every relationship: type (1:1, 1:N, M:N), the foreign key, and what ON DELETE does to related rows.
3. Is it in 3NF? Show any partial or transitive dependency with the exact columns.
4. Which indexes help which queries, plus one index you would add and why.
5. One INNER JOIN, one LEFT JOIN with GROUP BY, and one transaction that must be atomic in this schema, with the SQL.
6. Five viva questions about this schema, with short answers.`
  },

  // ------------------------------------------------------------------ Cybersecurity & Labs
  {
    key: 'tryhackme-explainer',
    author: 'D',
    category: 'Cybersecurity & Labs',
    model: M.chat,
    tags: ['tryhackme', 'authorised-lab', 'explanation'],
    daysAgo: 88,
    title: 'Explain a TryHackMe (or other authorised lab) concept',
    description: 'Explains the concept or tool behind a lab task, how defenders detect it, and checks your understanding, staying inside the lab environment.',
    content: `I am learning in an authorised training environment ({{platform_and_room}}). Explain {{concept_or_tool}}.

1. What it is and what problem it solves, in plain language.
2. How it works step by step, with a simple diagram described in text.
3. How it is used for this lab task only: {{task_text}}. Show the typical command or setting and explain each flag.
4. How defenders detect or prevent it.
5. Three quick questions to check I understood.

Keep everything inside the lab environment I described. Do not give steps for systems I do not own or have permission to test.`
  },
  {
    key: 'log-findings',
    author: 'D',
    category: 'Cybersecurity & Labs',
    model: M.chat,
    tags: ['log-analysis', 'authorised-lab'],
    daysAgo: 16,
    title: 'Interpret logs and write up lab findings',
    description: 'Explains the important log lines, builds a timeline, ranks possible causes with evidence and drafts a short findings section for your lab report.',
    content: `These logs come from {{system}} in my own lab or a system I am authorised to investigate.

{{logs}}

Context: {{what_happened}}

1. Explain what the important lines mean in plain language (quote each one).
2. A timeline table: Time | Event | Source | Why it matters.
3. Possible causes ranked by likelihood, with the evidence for each and what would rule it out.
4. Next checks to run.
5. A short write-up for my lab report: Summary, Evidence, Impact, Recommendation.

Only state what the logs support; label everything else as a hypothesis.`
  },
  {
    key: 'defensive-investigation',
    author: 'D',
    category: 'Cybersecurity & Labs',
    model: M.chat,
    tags: ['blue-team', 'explanation'],
    daysAgo: 52,
    title: 'Security concept, from the defender\'s side',
    description: 'Explains an attack technique or security concept in terms of what it looks like in logs and alerts, and how to investigate and prevent it.',
    content: `Explain {{security_concept}} from a defender's point of view, for someone at {{my_level}} level.

1. What it is, in two or three plain sentences.
2. What it looks like in practice: which logs, alerts or network traffic show it, with an example of each.
3. A step-by-step investigation checklist for a suspected case.
4. Prevention and hardening measures, most effective first.
5. Two common misunderstandings about it.

Do not include instructions for attacking real systems.`
  },

  // ------------------------------------------------------------------ Photo & Image
  {
    key: 'consistent-photo-look',
    author: 'P',
    category: 'Photo & Image',
    model: M.edit,
    tags: ['photo-editing', 'colour-grade', 'needs-image'],
    daysAgo: 81,
    title: 'Apply one consistent look to any photo (keeps the person unchanged)',
    description: 'Save your favourite colour grade and lighting once, then apply it to photo after photo without the tool changing anyone\'s face or body.',
    v2Notes: 'Added the identity rule after an edit changed a face.',
    content: `Edit the attached photo.
@v2 Keep the person's face, body shape, skin texture and expression exactly as they are; do not beautify, slim or change age.
Keep the original framing unless I say otherwise.

Look to apply: {{look}}
Lighting change: {{lighting_change}}
Background change: {{background_change}}
Avoid: {{avoid}}
Output: same aspect ratio as the original.

@v2 If any instruction would change the person's identity, skip that instruction and tell me which one.`
  },
  {
    key: 'reference-to-prompt',
    author: 'P',
    category: 'Photo & Image',
    model: M.file,
    tags: ['photo-editing', 'needs-image'],
    daysAgo: 40,
    title: 'Turn a reference photo into a reusable style prompt',
    description: 'Describes the look of a reference image in concrete terms, then writes a short editing prompt with slots that you can save and reuse.',
    content: `Study the attached reference image. I want to reproduce its look on other photos, not copy its content.

Describe the style under these headings, using concrete, observable terms (no vague words like "aesthetic" or "vibe"):
1. Colour palette and grade (shadows, mid-tones, highlights, saturation, white balance)
2. Lighting (direction, hardness, contrast, time of day it suggests)
3. Lens and camera feel (focal length impression, depth of field, grain, sharpness)
4. Composition habits (framing, subject placement, negative space)
5. Mood, in one sentence

Then write ONE reusable editing prompt, under 120 words, that applies this style to a new photo. Mark the parts I will change each time as {{subject}}, {{setting}} and {{aspect_ratio}}. Do not name photographers, brands or films.`
  },
  {
    key: 'image-brief-builder',
    author: 'P',
    category: 'Photo & Image',
    model: M.gen,
    tags: ['image-generation'],
    daysAgo: 24,
    title: 'Image-generation brief with slots',
    description: 'A structured brief so results stop varying wildly: subject, outfit, setting, lighting, camera, mood and aspect ratio as separate fields.',
    content: `Create an image.
Subject: {{subject}}
Outfit / appearance: {{outfit}}
Setting: {{setting}}
Time and lighting: {{lighting}}
Camera: {{camera}}
Colour and mood: {{mood}}
Aspect ratio: {{aspect_ratio}}
Must include: {{must_include}}
Must avoid: text in the image, watermarks, distorted hands, {{avoid}}
Style: photographic and realistic unless I write otherwise here: {{style_override}}`
  },

  // ------------------------------------------------------------------ Content Creation & Social Media
  {
    key: 'instagram-carousel',
    author: 'S',
    category: 'Content Creation & Social Media',
    model: M.chat,
    tags: ['instagram'],
    daysAgo: 70,
    title: 'Instagram caption and carousel outline',
    description: 'A carousel broken into slides with one idea each, plus three caption options in your voice and a short hashtag set, without exaggerated claims.',
    content: `Topic of the post: {{topic}}
Account and audience: {{account_and_audience}}
Goal of the post: {{goal}}
My voice: {{voice}}
Facts and points I want included: {{points}}

1. A {{slide_count}}-slide carousel outline: for each slide, the on-slide text (max 15 words) and a short visual idea. Slide 1 must make people swipe; the last slide has one clear call to action.
2. Three caption options (short, medium, story-style) in my voice.
3. Up to 8 relevant hashtags, mixing broad and niche.
Do not make claims I did not give you.`
  },
  {
    key: 'short-video-script',
    author: 'P',
    category: 'Content Creation & Social Media',
    model: M.chat,
    tags: ['short-video', 'instagram', 'youtube'],
    daysAgo: 30,
    title: 'Reels / YouTube Shorts script with shot list',
    description: 'A hook in the first seconds, a beat-by-beat script with on-screen text and shots, timed to your target length.',
    content: `Write a script for a {{length_seconds}}-second vertical video (Reels / YouTube Shorts) about {{topic}} for {{audience}}.

- Hook in the first 2 seconds: give 3 options.
- Then a beat-by-beat table: Time | What I say | On-screen text | Shot / B-roll.
- Keep sentences short and spoken, at about 2.5 words per second.
- End with this call to action: {{call_to_action}}.
- Note what I need to film or record before editing.

My filming setup: {{setup}}`
  },
  {
    key: 'thumbnail-concept',
    author: 'P',
    category: 'Content Creation & Social Media',
    model: M.chat,
    tags: ['youtube'],
    daysAgo: 14,
    title: 'YouTube thumbnail concepts that match the video',
    description: 'Three thumbnail concepts with layout, text and expression that accurately reflect the video, plus title pairings.',
    content: `Video title (working): {{video_title}}
What actually happens in the video: {{video_summary}}
Channel style: {{channel_style}}

Give me 3 thumbnail concepts. For each:
- Layout (what is on the left, right, background)
- Text on the thumbnail (max 4 words)
- Facial expression or main object
- Colour contrast idea
- Why it would make the right viewer click

Each concept must honestly represent the video (no clickbait that the video does not deliver). Suggest one title that pairs with each.`
  },
  {
    key: 'content-calendar',
    author: 'S',
    category: 'Content Creation & Social Media',
    model: M.chat,
    tags: ['content-planning', 'instagram'],
    daysAgo: 4,
    title: 'Content calendar and brand voice guide',
    description: 'A short voice guide from examples of how you actually write, then a realistic posting calendar that fits the time you have.',
    content: `I post about {{niche}} on {{platforms}}. I can realistically spend {{hours_per_week}} hours a week.

Examples of posts I have written (for my voice):
{{example_posts}}

1. A brand voice guide in 6 bullet points: tone, words I use, words I avoid, sentence length, emoji use, and what my audience gets from me.
2. A {{weeks}}-week content calendar as a table: Week | Day | Platform | Format | Topic | One-line hook.
3. Mix formats, and repeat formats that are cheap for me to make.
4. Flag any week where the plan would not fit in my available hours.`
  },

  // ------------------------------------------------------------------ Gaming
  {
    key: 'spoiler-free-story',
    author: 'V',
    category: 'Gaming',
    model: M.chat,
    tags: ['no-spoilers', 'explanation'],
    daysAgo: 36,
    title: 'Spoiler-free story or mission explainer',
    description: 'Answers a question about a story moment or mission using only what you have already played, and refuses to hint at anything later.',
    content: `I am playing {{game}}. I have just finished {{last_completed_mission}}. Choices I made: {{choices}}.

My question: {{question}}

Rules:
- Use only events up to my current progress. Do not mention, hint at or foreshadow anything later. No "this will matter later".
- If the real answer is revealed later in the game, say only: "That gets answered later - keep playing."
- For mission help, give the objective and hints first; give the full solution only if I write "full solution".
- If you are not sure where something falls in the story, say so instead of risking a spoiler.`
  },
  {
    key: 'graphics-settings',
    author: 'V',
    category: 'Gaming',
    model: M.chat,
    tags: ['pc-settings'],
    daysAgo: 19,
    title: 'Graphics settings for my hardware and target FPS',
    description: 'Setting-by-setting recommendations with visual impact and performance cost, what to lower first, and laptop-specific checks.',
    v2Notes: 'Added the note to verify recommendations after game patches.',
    content: `Recommend graphics settings for {{game}}.
GPU: {{gpu}} | CPU: {{cpu}} | RAM: {{ram}} | Laptop or desktop: {{device_type}}
Display: {{resolution}} at {{refresh_rate}} Hz | Target: {{target_fps}} FPS | Priority: {{priority}}

1. A table: Setting | Recommended value | Visual impact (low/med/high) | Performance cost (low/med/high) | Note
2. Which upscaling or frame-generation option to use, if my GPU and the game support it, and the trade-off.
3. The 3 settings to lower first if I am still below target.
4. Laptop checks (power mode, charger connected, dedicated GPU in use, drivers) if I am on a laptop.
@v2 Your knowledge may be older than recent game patches: tell me which recommendations to verify in-game.`
  },

  // ------------------------------------------------------------------ Communication & Career
  {
    key: 'rewrite-message',
    author: 'V',
    category: 'Communication & Career',
    model: M.chat,
    tags: ['rewriting', 'email', 'linkedin'],
    daysAgo: 85,
    title: 'Rewrite my email or post (keep every fact as I wrote it)',
    description: 'Makes an email, LinkedIn post or sponsorship message clearer and better structured without upgrading your role or adding achievements.',
    content: `Improve this {{message_type}} (email, LinkedIn post, sponsorship pitch, or message to a professor).

Draft:
{{draft}}

Audience: {{audience}}
Goal: {{goal}}
Tone: {{tone}}
Length limit: {{length_limit}}

Keep every fact, number and claim as I wrote it. Do not upgrade my role, invent results or add achievements. No emojis or hashtags unless I ask.
Give me: the improved version, then a list of what you changed and why, then one alternative opening line.`
  },
  {
    key: 'mock-interview',
    author: 'V',
    category: 'Communication & Career',
    model: M.chat,
    tags: ['placements'],
    daysAgo: 7,
    title: 'Mock interview from a job or internship description',
    description: 'Runs a realistic interview one question at a time based on the role and your real resume, then gives specific feedback on each answer.',
    content: `Run a mock interview for this role.

Job / internship description:
{{job_description}}

My resume or background (real details only):
{{resume}}

Interview type: {{interview_type}} (for example technical, HR, or mixed)

Rules:
- Ask one question at a time and wait for my answer.
- Mix questions from the description with questions about my own projects.
- After each answer: what was strong, what was missing, and a better way to say it using only my real experience.
- After {{question_count}} questions, give an overall summary and the three things to practise first.`
  },

  // ------------------------------------------------------------------ Planning & Productivity
  {
    key: 'messy-notes-plan',
    author: 'H',
    category: 'Planning & Productivity',
    model: M.chat,
    tags: ['planning'],
    daysAgo: 55,
    title: 'Messy notes or a syllabus into a realistic plan',
    description: 'Turns rough notes, a meeting transcript or a syllabus into decisions, tasks with owners, and a day-by-day schedule that fits the time you actually have.',
    content: `Turn this into a clear plan.

Input (rough notes, meeting transcript, syllabus or task list):
{{input}}

Deadline: {{deadline}}
Time I actually have: {{available_time}}
People involved: {{people}}

1. Decisions already made (from the input only).
2. Tasks: Task | Owner | Estimate | Due | Depends on.
3. A day-by-day schedule that fits my real available time, with a buffer before the deadline. If it does not fit, say so and tell me what to cut.
4. A short checklist for today.
Do not add tasks the input does not imply; put suggestions in a separate "Optional" list.`
  },
  {
    key: 'standup-summary-draft',
    author: 'S',
    category: 'Planning & Productivity',
    model: M.chat,
    tags: ['planning'],
    daysAgo: 2,
    status: 'draft',
    title: 'Weekly project stand-up summary',
    description: 'Draft: turns each member\'s update into a short summary for the project group.',
    content: `Here are this week's updates from each team member:
{{updates}}

Write a short stand-up summary for our group chat:
- Done this week (one line per person)
- Planned for next week
- Blockers, and who can help with each
Keep it under 150 words.`
  }
];

/**
 * Seeded demo comments (shown as normal comments; documented as demo activity).
 * `by` is a person key, `prompt` a prompt key, `daysAfter` days after the prompt was created.
 */
const COMMENTS = [
  { prompt: 'open-book-notes', by: 'S', daysAfter: 6, text: 'The [CHECK] markers saved me. It flagged two formulas that were only half on the slides, so I looked them up in the textbook before printing.' },
  { prompt: 'open-book-notes', by: 'D', daysAfter: 20, text: 'Used it for three OS modules. The index with slide numbers is the part that actually helps during the exam.' },
  { prompt: 'question-bank', by: 'A', daysAfter: 9, text: 'Putting the exact exam pattern in made the long answers the right length. Earlier they were way too long for the marks.' },
  { prompt: 'viva-prep', by: 'A', daysAfter: 3, text: 'The one-question-at-a-time quiz is what made this useful. It caught that I could not explain why we used transactions.' },
  { prompt: 'viva-prep', by: 'S', daysAfter: 10, text: 'Ran it on our own project files. Good that it says when a question is not covered instead of making something up.' },
  { prompt: 'react-debug', by: 'V', daysAfter: 12, text: 'It pointed straight at a missing dependency in my useEffect. The "smallest fix" ordering is better than getting a whole rewritten component.' },
  { prompt: 'node-api-debug', by: 'D', daysAfter: 4, text: 'Turned out to be middleware order: express.json() was registered after the router. The evidence list made it obvious.' },
  { prompt: 'sql-generator', by: 'H', daysAfter: 15, text: 'The note about one-to-many joins inflating counts is exactly the fan-out problem we fixed in our analytics queries.' },
  { prompt: 'dbms-schema-explainer', by: 'S', daysAfter: 2, text: 'Tried it on the PromptForge schema. It explained ON DELETE RESTRICT on prompt_versions better than my notes did.' },
  { prompt: 'tryhackme-explainer', by: 'A', daysAfter: 11, text: 'Clear explanation of the nmap flags for the room, and the defender section helped me answer the follow-up questions.' },
  { prompt: 'consistent-photo-look', by: 'V', daysAfter: 8, text: 'Kept the same look across a whole set of trip photos. Saving the look text once is the whole point.' },
  { prompt: 'reference-to-prompt', by: 'S', daysAfter: 5, text: 'Good for describing a look in words. I saved the generated prompt as my own template afterwards.' },
  { prompt: 'graphics-settings', by: 'D', daysAfter: 3, text: 'Helpful table. As the prompt says, two settings had changed names after a patch, so check in-game.' },
  { prompt: 'rewrite-message', by: 'P', daysAfter: 14, text: 'Used it for an email to a professor. It kept my points and just made it shorter and more polite.' },
  { prompt: 'spoiler-free-story', by: 'P', daysAfter: 6, text: 'It actually refused to hint at a later chapter, which is what I wanted.' }
];

/** Who follows whom (person keys). */
const FOLLOWS = [
  ['S', 'H'], ['A', 'H'], ['D', 'H'], ['P', 'H'], ['V', 'H'],
  ['H', 'S'], ['H', 'A'], ['A', 'S'], ['S', 'A'], ['D', 'A'],
  ['V', 'P'], ['S', 'P'], ['P', 'D'], ['A', 'D'], ['D', 'V']
];

module.exports = { DEMO_DOMAIN, ADMIN_EMAIL, PEOPLE, CATEGORIES, MODELS, TAG_RENAMES, PROMPTS, COMMENTS, FOLLOWS };
