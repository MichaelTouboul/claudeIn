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

### Chat input placeholder overlaps the format bar
**Effort:** Low · **Status:** Open · UI
In the Lexical chat input, the placeholder text ("Type a prompt or / for commands…") **overlaps/collides with the formatting toolbar** (reference screenshot 2026-05-31). Fix the layering/positioning so placeholder and toolbar don't render on top of each other.

---

## Batch captured 2026-06-01

### App must fit the window cleanly (no scroll; mac title bar overlap)
**Effort:** Medium · **Status:** Open · UI
The app must render **fully inside the window**, like Cursor — the user should **never have to scroll** to reveal the header or footer; the shell should be a fixed full-height layout (header / body / footer) with only inner panes scrolling. Also: the **macOS window title bar overlaps/crushes header UI elements** — reserve the traffic-light/title-bar zone (e.g. `titleBarStyle: 'hiddenInset'` + safe-area padding) so nothing renders under it. Pairs with the component-restructure chore (App shell) and the Footer feature.
