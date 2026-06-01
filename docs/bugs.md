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

### Chat input placeholder overlaps the format bar
**Effort:** Low · **Status:** Open · UI
In the Lexical chat input, the placeholder text ("Type a prompt or / for commands…") **overlaps/collides with the formatting toolbar** (reference screenshot 2026-05-31). Fix the layering/positioning so placeholder and toolbar don't render on top of each other.

---

## Batch captured 2026-06-01

### macOS window title bar overlaps header UI
**Effort:** Low–Medium · **Status:** Open · UI
The **macOS window title bar overlaps/crushes header elements** — reserve the traffic-light/title-bar zone (e.g. `titleBarStyle: 'hiddenInset'` + safe-area padding) so nothing renders under it. *(The "no-scroll, fully-in-window" part — fixed header/body/footer shell, only inner panes scroll — is **done** via the app-shell restructure.)*
