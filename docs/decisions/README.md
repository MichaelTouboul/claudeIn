# Decision journals

One file per `/am-feature` run: `YYYY-MM-DD-<feature-slug>.md`.
Created and appended live by the `/am-feature` command. Each file records the
request, every decision taken at a gate (which playbook rule applied, decided by
auto or user), the files changed, and open follow-ups.

Format:

    # Feature: <name>  ·  am-feature  ·  YYYY-MM-DD
    ## Request / context
    ## Decisions
    ### D1 — <decision> -> <choice>
    - Gate: <playbook> · Rule: <rule> · Decided by: auto|user
    ## Files changed
    ## Open follow-ups
