import { createTheme } from '@mui/material/styles';

/**
 * MUI dark theme bridged to the app's design tokens.
 *
 * MUI cannot read CSS custom properties, so these hex values are duplicated from
 * `src/index.css`. KEEP IN SYNC with index.css if a token ever changes:
 *   background.default = --color-surface-0  #06080c
 *   background.paper   = --color-surface-1  #0a0e14
 *   text.primary       = --color-text-primary  #e2e8f0
 *   text.secondary     = --color-text-secondary #8892a4
 *   primary.main       = --color-accent  #06b6d4 (cyan)
 *   divider            = --color-border  #1e2636
 */
export const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#06080c', paper: '#0a0e14' },
    text: { primary: '#e2e8f0', secondary: '#8892a4' },
    primary: { main: '#06b6d4' },
    divider: '#1e2636',
  },
  typography: {
    fontFamily: "'JetBrains Mono', monospace",
  },
});
