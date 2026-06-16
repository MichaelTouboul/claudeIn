import { createTheme } from '@mui/material/styles';
// Registers the `MuiDataGrid` slot on the MUI theme's `components` map (module
// augmentation) so the DataGrid styleOverrides below are type-checked.
import type {} from '@mui/x-data-grid/themeAugmentation';

/**
 * MUI dark theme bridged to the app's design tokens — the ONE place the design
 * system allows a 3rd-party-library theme bridge (see src/CLAUDE.md "Interactive
 * block exception"). Shared by BOTH table surfaces (chat `TableBlock` + panel
 * `TableTab`) so they look identical.
 *
 * MUI cannot read CSS custom properties at theme-creation time, so these hex
 * values are duplicated from `src/index.css`. KEEP IN SYNC with index.css if a
 * token ever changes:
 *   background.default = --color-surface-0  #14161b
 *   background.paper   = --color-surface-1  #1d2027
 *   surface-2 (header) = --color-surface-2  #23272f
 *   surface-3 (hover)  = --color-surface-3  #2b2f39
 *   text.primary       = --color-fg          #eef1f6
 *   text.secondary     = --color-fg-muted    #b3bccb
 *   text.tertiary      = --color-fg-subtle   #8b93a3
 *   primary.main       = --color-accent      #818cf8 (indigo)
 *   divider            = --color-border       #2b2f39
 *   divider-subtle     = --color-border-subtle #181b21
 */
const SURFACE_0 = '#14161b';
const SURFACE_1 = '#1d2027';
const SURFACE_2 = '#23272f';
const SURFACE_3 = '#2b2f39';
const FG = '#eef1f6';
const FG_MUTED = '#b3bccb';
const FG_SUBTLE = '#8b93a3';
const ACCENT = '#818cf8';
const BORDER = '#2b2f39';
const BORDER_SUBTLE = '#181b21';
/** Even-row zebra: a faint wash of the app background over the panel surface. */
const ZEBRA = 'rgba(20, 22, 27, 0.45)';

export const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: SURFACE_0, paper: SURFACE_1 },
    text: { primary: FG, secondary: FG_MUTED },
    primary: { main: ACCENT },
    divider: BORDER,
  },
  typography: {
    fontFamily: "'Geist Variable', 'Geist', system-ui, sans-serif",
    fontSize: 13.5,
  },
  components: {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 0,
          color: FG_MUTED,
          '--DataGrid-rowBorderColor': BORDER_SUBTLE,
        },
        // Header: surface-2 band, uppercase token-styled labels, sort caret in accent.
        columnHeaders: { borderBottom: `1px solid ${BORDER}` },
        columnHeader: {
          backgroundColor: SURFACE_2,
          '&:focus, &:focus-within': { outline: 'none' },
        },
        columnHeaderTitle: {
          fontFamily: "'Geist Variable', 'Geist', system-ui, sans-serif",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: FG_SUBTLE,
        },
        iconButtonContainer: { '& .MuiSvgIcon-root': { color: ACCENT } },
        sortIcon: { color: ACCENT },
        menuIconButton: { color: FG_SUBTLE },
        // Rows: zebra striping + hover lift, hairline separators.
        cell: {
          borderBottom: `1px solid ${BORDER_SUBTLE}`,
          padding: '0 14px',
          '&:focus, &:focus-within': { outline: 'none' },
        },
        row: {
          '&:nth-of-type(even)': { backgroundColor: ZEBRA },
          '&:hover, &:nth-of-type(even):hover': { backgroundColor: SURFACE_3 },
        },
        footerContainer: { borderTop: `1px solid ${BORDER}` },
        columnSeparator: { color: BORDER_SUBTLE },
      },
    },
  },
});
