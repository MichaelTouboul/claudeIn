Primary action control — indigo `primary` for the one main action per view, quieter `secondary`/`ghost`/`outline`/`danger` for the rest.

```jsx
<Button intent="primary" size="md" leftIcon={<PlusIcon />}>New session</Button>
<Button intent="secondary">Cancel</Button>
<Button intent="ghost" size="sm">Skip</Button>
<Button intent="danger">Delete</Button>
<Button intent="primary" loading>Saving…</Button>
```

Intents: `primary` (indigo fill, white text), `secondary` (bordered surface), `outline`, `ghost` (transparent), `danger` (red text), `danger-solid` (red fill). Sizes: `sm` 28px · `md` 36px · `lg` 44px. Pass `fullWidth` to stretch, `loading` to show a spinner.
