# Question bank format

This document describes the files that **lia** (the exam trainer) reads. One file is one course.
It is written for people and for LLMs: if you ask an LLM to create a bank, give it this whole
file together with your lecture material.

Format version: **1**

## Checklist for generating a bank

1. Output **one JSON document** that follows the structure below. No comments, no trailing commas.
2. Every question has a unique, stable `id` in kebab-case (see [IDs](#ids)).
3. Every question's `topic` is listed in the top-level `topics` array.
4. Use each question type where it fits, not just multiple choice (see [Choosing a type](#choosing-a-question-type)).
5. Cite the source of every question in `source`, e.g. `"Lecture 4, slide 12"`.
6. Write an `explanation` that teaches: why the answer is right, and the idea behind it.
7. In JSON strings, escape backslashes and quotes: LaTeX `\frac` becomes `"\\frac"`, a line break becomes `\n`.
8. Images are only possible in a `.zip` bank (see [Images](#images-and-zip-banks)).

## File types

- **`.json`**: the bank itself. Use this when there are no images.
- **`.zip`**: the JSON file plus an `images/` folder next to it.

Add a bank by dropping the file into the app window or into the `subjects/` folder of the app.

## Top-level structure

```json
{
  "format": "lia-bank",
  "formatVersion": 1,
  "course": {
    "id": "algorithms",
    "name": "Algorithms & Data Structures",
    "version": "1.0",
    "emoji": "🌳",
    "color": "mint",
    "language": "en"
  },
  "topics": ["Complexity", "Sorting", "Graphs"],
  "questions": []
}
```

| Field             | Required | Description                                                                                             |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `format`          | yes      | Always `"lia-bank"`.                                                                                    |
| `formatVersion`   | yes      | Always `1` for this version of the format.                                                              |
| `course.id`       | yes      | Stable id of the course, kebab-case. Progress belongs to this id, so never change it.                   |
| `course.name`     | yes      | Display name.                                                                                           |
| `course.version`  | yes      | Version of the bank, any string or number, e.g. `"1.0"` or `"2026-05-10"`. Increase it on every update. |
| `course.emoji`    | no       | One emoji shown on the course card.                                                                     |
| `course.color`    | no       | Card colour: `peach`, `mint`, `sky`, `lavender`, `lemon` or `rose`.                                     |
| `course.language` | no       | Language of the content as a code like `"en"` or `"de"`. Used for hyphenation and screen readers.       |
| `topics`          | yes      | Topic names, in the order they are taught. At least one.                                                |
| `questions`       | yes      | The questions, at least one.                                                                            |

Unknown fields are rejected, so a typo like `"explaination"` is reported instead of silently ignored.

## Fields of every question

| Field         | Required | Description                                                                                                       |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Unique within the bank, stable forever. See [IDs](#ids).                                                          |
| `topic`       | yes      | One of the names in `topics`.                                                                                     |
| `type`        | yes      | `single_choice`, `multiple_choice`, `flashcard`, `cloze` or `free_text`.                                          |
| `difficulty`  | yes      | `1` recall, `2` understanding and applying, `3` transfer or multi-step reasoning.                                 |
| `tags`        | no       | Short lowercase keywords, e.g. `["quicksort", "complexity"]`.                                                     |
| `explanation` | yes      | Shown after answering. Optional only for `flashcard`, where the back is the answer.                               |
| `source`      | no       | Where the content comes from, e.g. `"Lecture 4, slide 12"` or `"Exercise sheet 3, task 2"`. Strongly recommended. |

All text fields (prompts, options, answers, explanations, key points) support
[Markdown, math and code](#text-formatting).

## Question types

### `single_choice`

Exactly one option is correct. Options are shuffled when shown.

| Field     | Description                                                                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prompt`  | The question.                                                                                                                                                                 |
| `options` | 2 to 8 options: `{ "text": "...", "correct": true or false, "why": "..." }`. `why` is optional and explains why that option is wrong (or right). It is shown after answering. |

Scoring: 1 if the correct option is chosen, else 0.

```json
{
  "id": "sorting-quicksort-average",
  "topic": "Sorting",
  "type": "single_choice",
  "difficulty": 1,
  "tags": ["quicksort"],
  "source": "Lecture 4, slide 12",
  "prompt": "What is the average-case running time of Quicksort on $n$ elements?",
  "options": [
    { "text": "$O(n \\log n)$", "correct": true },
    {
      "text": "$O(n^2)$",
      "correct": false,
      "why": "That is the worst case, e.g. when the pivot is always the smallest element."
    },
    {
      "text": "$O(n)$",
      "correct": false,
      "why": "Comparison-based sorting needs $\\Omega(n \\log n)$ comparisons on average."
    },
    { "text": "$O(\\log n)$", "correct": false, "why": "Every element has to be examined at least once." }
  ],
  "explanation": "With a random pivot the expected recursion depth is $O(\\log n)$, and each level does $O(n)$ work."
}
```

### `multiple_choice`

One or more options are correct. Same fields as `single_choice`. The app tells the learner to
choose all that apply.

Scoring: the share of options judged correctly (ticked if correct, left empty if wrong). The answer
only counts as correct if every option is judged correctly.

```json
{
  "id": "sorting-stable-algorithms",
  "topic": "Sorting",
  "type": "multiple_choice",
  "difficulty": 2,
  "source": "Lecture 4, slide 30",
  "prompt": "Which of these sorting algorithms are **stable** in their standard implementation?",
  "options": [
    { "text": "Merge sort", "correct": true },
    { "text": "Insertion sort", "correct": true },
    { "text": "Quicksort", "correct": false, "why": "Partitioning can move an element past an equal one." },
    { "text": "Heapsort", "correct": false, "why": "Building and emptying the heap reorders equal keys." }
  ],
  "explanation": "A sort is stable if elements with equal keys keep their relative order."
}
```

### `flashcard`

The learner sees the front, flips the card and rates themselves: again, hard, good or easy.

| Field   | Description                   |
| ------- | ----------------------------- |
| `front` | Question side. Keep it short. |
| `back`  | Answer side.                  |

`explanation` is optional here. Scoring: again 0, hard 0.5, good and easy 1. Only "again" counts
as wrong.

```json
{
  "id": "hashing-load-factor",
  "topic": "Hashing",
  "type": "flashcard",
  "difficulty": 1,
  "source": "Lecture 9, slide 12",
  "front": "What is the load factor $\\alpha$ of a hash table?",
  "back": "$\\alpha = n / m$, the number of stored keys $n$ divided by the number of buckets $m$."
}
```

### `cloze`

Fill in the blanks, in prose or in code.

| Field    | Description                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------- |
| `text`   | Text with the markers `{{1}}`, `{{2}}`, ... where the blanks go.                                  |
| `blanks` | One entry per marker, in marker order: `blanks[0]` is `{{1}}`, `blanks[1]` is `{{2}}`, and so on. |

Each blank is `{ "answers": [...], "ignoreCase": true, "ignoreWhitespace": true }`:

- `answers`: all accepted answers. The first one is shown as the solution.
- `ignoreCase` (default `false`): `Heap` and `heap` count as the same.
- `ignoreWhitespace` (default `false`): all spaces are ignored, so `i+1` matches `i + 1`.
- Leading and trailing spaces are always ignored, and runs of spaces count as one.

Rules:

- Every marker from `{{1}}` up to the number of blanks appears **exactly once**.
- Markers work in normal text, in `inline code` and inside fenced code blocks.
- Markers do **not** work inside math (`$...$`). Put the blank outside the formula instead.
- For prose, set `ignoreCase: true` unless case matters. For code, keep the default (case-sensitive)
  and consider `ignoreWhitespace: true` for expressions.
- Blank out the key term, not filler words. One to three blanks per question is best.

Scoring: the share of blanks filled correctly; correct only if all are.

````json
{
  "id": "graphs-bfs-code-cloze",
  "topic": "Graphs",
  "type": "cloze",
  "difficulty": 2,
  "source": "Exercise sheet 6, task 2",
  "text": "Complete the breadth-first search.\n\n```python\ndef bfs(graph, start):\n    visited = {start}\n    queue = deque([start])\n    while queue:\n        node = queue.{{1}}()\n        for neighbor in graph[node]:\n            if neighbor not in {{2}}:\n                visited.add(neighbor)\n                queue.append(neighbor)\n    return visited\n```",
  "blanks": [{ "answers": ["popleft"] }, { "answers": ["visited"] }],
  "explanation": "BFS takes vertices from the **front** of the queue (`popleft`)."
}
````

### `free_text`

The learner writes an answer, then sees the model answer and ticks which key points they covered.

| Field         | Description                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------- |
| `prompt`      | The question.                                                                               |
| `modelAnswer` | A complete, exam-quality answer.                                                            |
| `keyPoints`   | The points a good answer must contain, usually 3 to 6. Each should be checkable on its own. |

Scoring: the share of ticked key points. It counts as correct from 75 %.

```json
{
  "id": "graphs-bfs-vs-dfs",
  "topic": "Graphs",
  "type": "free_text",
  "difficulty": 2,
  "source": "Lecture 6, slides 20-24",
  "prompt": "Compare BFS and DFS: which data structure does each one use, and name one problem each one is well suited for.",
  "modelAnswer": "BFS uses a **queue** and visits vertices in order of their distance from the start, so it finds shortest paths in unweighted graphs. DFS uses a **stack** (or recursion) and goes as deep as possible first, which suits topological sorting and cycle detection.",
  "keyPoints": [
    "BFS uses a queue",
    "DFS uses a stack or recursion",
    "BFS finds shortest paths in unweighted graphs",
    "DFS suits e.g. topological sorting or cycle detection"
  ],
  "explanation": "Both run in $O(V + E)$ with an adjacency list."
}
```

## Text formatting

All text fields are Markdown (GitHub flavour): `**bold**`, `*italic*`, lists, tables, `inline code`,
links and block quotes. Raw HTML is not rendered.

**Math** uses LaTeX with KaTeX: `$...$` inline, `$$...$$` as a block. In JSON every backslash is
doubled: write `"$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$"`.

**Code blocks** use fences with a language name, written as `\n` line breaks in JSON:

````
```java
int x = 42;
```
````

Highlighted languages: `python`, `java`, `c`, `cpp`, `csharp`, `javascript`, `typescript`, `sql`,
`bash` (or `sh`), `haskell`, `prolog`, `rust`, `go`, `kotlin`, `json`, `yaml`, `html`, `xml`, `css`,
`latex`, `asm`. Other languages are shown without colours.

## Images and .zip banks

Images need a `.zip` bank. Put the JSON file and an `images/` folder side by side:

```
search-trees.zip
├── search-trees.json
└── images/
    ├── bst.svg
    └── avl-rotation.png
```

Reference an image with Markdown, relative to the zip: `![Binary search tree with root 8](images/bst.svg)`.
The alt text in the brackets describes the image for screen readers; always write one.

- Supported: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`.
- Use file names without spaces.
- Only images from the bank's `images/` folder work; web URLs are rejected (the app is offline).
- Diagrams are shown on a light background in both themes, so dark lines on a transparent
  background work well.
- It does not matter whether the zip contains the files directly or inside one top-level folder.

To create the zip, select the JSON file and the `images/` folder and compress them
(Windows: right click, "Compress to ZIP file"; macOS: right click, "Compress"; Linux:
`zip -r search-trees.zip search-trees.json images`).

## IDs

Progress is stored per question `id`. Updating a bank keeps all progress as long as the ids stay the same.

- Format: lowercase letters, digits and single `-`, `_` or `.` separators.
- Scheme: `<topic>-<concept>`, e.g. `sorting-quicksort-average`, `graphs-dijkstra-negative-weights`.
  Add a number only when two questions test the same concept: `sorting-merge-cloze-2`.
- Never change the id of an existing question, even when you fix a typo in it.
- Give a question a **new** id when its meaning changes, so old progress does not count for a different question.
- Never reuse the id of a deleted question.

## Choosing a question type

| Type              | Good for                                                      |
| ----------------- | ------------------------------------------------------------- |
| `flashcard`       | Definitions, terms, formulas, facts you must know by heart.   |
| `single_choice`   | Distinguishing a concept from similar ones, typical mistakes. |
| `multiple_choice` | Properties, "which of these statements are true".             |
| `cloze`           | Key terms in a definition, and missing lines in code.         |
| `free_text`       | Explanations, comparisons, proofs, "why" questions.           |

## Writing good questions

- **One concept per question.** If you need "and" in the question, consider two questions.
- **Plausible distractors.** Wrong options should be mistakes a student could really make: the
  worst case instead of the average case, a similar algorithm, a sign error, an off-by-one.
  Avoid joke options and "all of the above" or "none of the above" (options are shuffled).
- **Similar option lengths.** The correct option should not stand out by being the longest or most precise.
- **Explain wrong options** with `why`, especially for common misconceptions.
- **No trick questions.** Test understanding, not reading carefulness. Avoid double negatives.
- **Self-contained.** Each question must make sense on its own, without "as in the previous question".
- **Match the lecture.** Use the notation, names and definitions of the course material, and cite
  the slide or exercise in `source`.
- **Mix the difficulty.** Roughly 40 % level 1, 40 % level 2, 20 % level 3.
- **Explanations teach.** Say why the answer is right and connect it to the underlying idea. One to
  three sentences is usually enough.
- **Key points are atomic.** Each key point of a `free_text` question is one fact the learner can tick or not.

## Updating a bank

1. Keep `course.id` and all existing question ids unchanged.
2. Fix or add questions; add new topics to `topics`.
3. Increase `course.version`.
4. Add the new file to the app. It replaces the old version of the course and keeps the progress.

## What the app checks

A bank that breaks one of these rules is not loaded. The app lists the problems, each with the
question number, its id and the field, for example:

```
Question 4 (id "sort-03"), options: exactly one option must have "correct": true (use multiple_choice for more)
```

- valid JSON, correct `format` and `formatVersion`
- all required fields present, no unknown fields, no empty texts
- unique question ids, valid id format, `topic` listed in `topics`, `difficulty` 1 to 3
- `single_choice`: exactly one correct option; `multiple_choice`: at least one; 2 to 8 options
- `cloze`: every marker `{{1}}` to `{{n}}` exactly once for `n` blanks
- every referenced image exists in the zip's `images/` folder

Paste the error list back into the LLM chat to get a fixed file.

## Prompt template

Attach this file and your lecture material (slides, script, exercise sheets), then use for example:

```
Read QUESTION_FORMAT.md and create a question bank for the course "<name>" from the attached
material. Course id: "<id>". Cover every topic of the material with about <N> questions in total,
using all five question types where they fit. Cite the slide or page in "source" for every
question. Output only the JSON file.
```

For an update: "Here is the current bank and new material. Add questions for the new material,
keep all existing ids unchanged and increase course.version."

The example banks `subjects/example.json` and `subjects/example-images.zip` show every question type.
