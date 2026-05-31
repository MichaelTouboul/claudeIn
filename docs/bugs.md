# Bugs

Known defects to fix. Raw memo — not prioritized. Companion to `docs/feature-requests.md` (features) and `docs/chores.md` (cleanup).

> Effort scale: **Low** (~half day) · **Medium** (~1 day) · **High** (multi-day).

---

## Batch captured 2026-05-31

### Chat agent asks a question after every response
**Effort:** Low · **Status:** Open
The in-app chat agent ends almost every turn with follow-up questions. It's heavy and adds no value. Stop the reflexive "want me to…?" / clarifying-question pattern after each response.

### Cursor focus on a proposed client interaction
**Effort:** Low · **Status:** Open
When the app surfaces a user-interaction prompt (a proposal/choice), the **cursor focus must land on the proposal** automatically, so the user can respond without clicking first.

### Left sidebar doesn't extend to the bottom
**Effort:** Low · **Status:** Open · UI
The left sidebar stops short vertically. It should **fill the full height down to the bottom** of the window.

### Remove "Tree" and "Session"
**Effort:** Low · **Status:** Open
There are "Tree" and "Session" surfaces whose purpose is unclear (user doesn't know what they do). **Remove them** (or clarify, but default = remove).

### Chat input placeholder overlaps the format bar
**Effort:** Low · **Status:** Open · UI
In the Lexical chat input, the placeholder text ("Type a prompt or / for commands…") **overlaps/collides with the formatting toolbar** (reference screenshot 2026-05-31). Fix the layering/positioning so placeholder and toolbar don't render on top of each other.
