/* @ds-bundle: {"format":3,"namespace":"ClaudeInDesignSystem_25db6c","components":[{"name":"Avatar","sourcePath":"components/display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"Kbd","sourcePath":"components/display/Kbd.jsx"},{"name":"StatusDot","sourcePath":"components/display/StatusDot.jsx"},{"name":"Tag","sourcePath":"components/display/Tag.jsx"},{"name":"Banner","sourcePath":"components/feedback/Banner.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/ProgressBar.jsx"},{"name":"Spinner","sourcePath":"components/feedback/Spinner.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"SegmentedControl","sourcePath":"components/navigation/SegmentedControl.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"Dialog","sourcePath":"components/overlay/Dialog.jsx"},{"name":"Menu","sourcePath":"components/overlay/Menu.jsx"}],"sourceHashes":{"components/display/Avatar.jsx":"3894541e1b66","components/display/Badge.jsx":"ec2abe1c9508","components/display/Card.jsx":"19d2962a1cf7","components/display/Kbd.jsx":"88c8e406d6af","components/display/StatusDot.jsx":"44d62a453219","components/display/Tag.jsx":"6970312e8a68","components/feedback/Banner.jsx":"4c5525bac209","components/feedback/EmptyState.jsx":"a0a912829a03","components/feedback/ProgressBar.jsx":"8ca9f0476c96","components/feedback/Spinner.jsx":"ecda51fce5f2","components/feedback/Tooltip.jsx":"1ab0c6d43288","components/forms/Button.jsx":"f9c1d28e0a49","components/forms/Checkbox.jsx":"71a9cea85937","components/forms/IconButton.jsx":"0a3e4d5ebc17","components/forms/Input.jsx":"b95cf33077d9","components/forms/Select.jsx":"33113d5174b8","components/forms/Switch.jsx":"b807b7b5eb25","components/forms/Textarea.jsx":"7f47d2bb78f1","components/lib/useInteractive.js":"d2d492ed2961","components/navigation/SegmentedControl.jsx":"75418ef67273","components/navigation/Tabs.jsx":"08ec73a128ba","components/overlay/Dialog.jsx":"fbe98ef3d8f3","components/overlay/Menu.jsx":"6992fce950b6","ui_kits/customize/icons.jsx":"3c1d0b508b11","ui_kits/dashboard/icons.jsx":"3c1d0b508b11","ui_kits/home/icons.jsx":"3c1d0b508b11","ui_kits/onboarding/icons.jsx":"3c1d0b508b11"},"inlinedExternals":[],"unexposedExports":[{"name":"useInteractive","sourcePath":"components/lib/useInteractive.js"}]} */

(() => {

const __ds_ns = (window.ClaudeInDesignSystem_25db6c = window.ClaudeInDesignSystem_25db6c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/display/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  xs: 20,
  sm: 26,
  md: 32,
  lg: 40
};
const AGENT_HUES = {
  cyan: 'var(--agent-cyan)',
  blue: 'var(--agent-blue)',
  green: 'var(--agent-green)',
  yellow: 'var(--agent-yellow)',
  orange: 'var(--agent-orange)',
  red: 'var(--agent-red)',
  purple: 'var(--agent-purple)',
  pink: 'var(--agent-pink)'
};
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Identity avatar. Renders `src` image when present, otherwise tinted initials.
 * `hue` accepts an agent color name to tint the fallback.
 */
function Avatar({
  name = '',
  src = null,
  size = 'md',
  hue = 'blue',
  square = false,
  style = {},
  ...props
}) {
  const px = SIZES[size] || SIZES.md;
  const tint = AGENT_HUES[hue] || AGENT_HUES.blue;
  return /*#__PURE__*/React.createElement("span", _extends({}, props, {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: px,
      height: px,
      flexShrink: 0,
      borderRadius: square ? 'var(--radius-md)' : '50%',
      overflow: 'hidden',
      background: src ? 'var(--surface-3)' : `color-mix(in srgb, ${tint} 18%, var(--surface-2))`,
      border: `1px solid ${src ? 'var(--border)' : `color-mix(in srgb, ${tint} 30%, transparent)`}`,
      color: tint,
      fontFamily: 'var(--font-mono)',
      fontSize: Math.round(px * 0.38),
      fontWeight: 'var(--weight-semibold)',
      ...style
    }
  }), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials(name));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  neutral: {
    fg: 'var(--text-secondary)',
    bg: 'var(--surface-3)',
    border: 'var(--border)'
  },
  accent: {
    fg: 'var(--accent-text)',
    bg: 'var(--accent-subtle)',
    border: 'var(--accent-border)'
  },
  success: {
    fg: 'var(--success)',
    bg: 'var(--success-subtle)',
    border: 'color-mix(in srgb, var(--success) 30%, transparent)'
  },
  warning: {
    fg: 'var(--warning)',
    bg: 'var(--warning-subtle)',
    border: 'color-mix(in srgb, var(--warning) 30%, transparent)'
  },
  danger: {
    fg: 'var(--danger)',
    bg: 'var(--danger-subtle)',
    border: 'color-mix(in srgb, var(--danger) 30%, transparent)'
  },
  info: {
    fg: 'var(--info)',
    bg: 'var(--info-subtle)',
    border: 'color-mix(in srgb, var(--info) 30%, transparent)'
  },
  history: {
    fg: 'var(--history)',
    bg: 'var(--history-subtle)',
    border: 'color-mix(in srgb, var(--history) 30%, transparent)'
  }
};

/**
 * Small status / category label. `mono` (default) renders in Geist Mono for
 * machine-ish values (counts, statuses, types); set `mono={false}` for words.
 */
function Badge({
  tone = 'neutral',
  shape = 'rounded',
  mono = true,
  dot = false,
  style = {},
  children,
  ...props
}) {
  const t = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({}, props, {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '2px 8px',
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-medium)',
      lineHeight: 'var(--leading-xs)',
      letterSpacing: '0.01em',
      color: t.fg,
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: shape === 'pill' ? 'var(--radius-pill)' : 'var(--radius-sm)',
      whiteSpace: 'nowrap',
      ...style
    }
  }), dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: t.fg,
      flexShrink: 0
    }
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Kbd.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Keyboard key cap, e.g. <Kbd>⌘</Kbd> <Kbd>K</Kbd>. Renders small mono glyphs
 * on a raised cap.
 */
function Kbd({
  style = {},
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("kbd", _extends({}, props, {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--text-secondary)',
      background: 'var(--surface-3)',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-xs)',
      boxShadow: '0 1px 0 var(--border-strong)',
      lineHeight: 1,
      ...style
    }
  }), children);
}
Object.assign(__ds_scope, { Kbd });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Kbd.jsx", error: String((e && e.message) || e) }); }

// components/display/StatusDot.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  xs: 6,
  sm: 8,
  md: 10
};
const STATUS_COLOR = {
  live: 'var(--status-live)',
  idle: 'var(--status-idle)',
  error: 'var(--status-error)',
  warning: 'var(--warning)',
  info: 'var(--info)'
};

/**
 * A small state indicator dot. `status` maps to a semantic color; `pulse`
 * animates it (use for live/running). Override with `color` for agent hues.
 */
function StatusDot({
  status = 'idle',
  size = 'sm',
  pulse = false,
  color = null,
  style = {},
  ...props
}) {
  const px = SIZES[size] || SIZES.sm;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: pulse ? 'ci-pulse' : undefined
  }, props, {
    style: {
      display: 'inline-block',
      width: px,
      height: px,
      flexShrink: 0,
      borderRadius: '50%',
      background: color || STATUS_COLOR[status] || STATUS_COLOR.idle,
      ...style
    }
  }));
}
Object.assign(__ds_scope, { StatusDot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/StatusDot.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Banner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  info: {
    fg: 'var(--info)',
    bg: 'var(--info-subtle)',
    border: 'color-mix(in srgb, var(--info) 35%, transparent)'
  },
  success: {
    fg: 'var(--success)',
    bg: 'var(--success-subtle)',
    border: 'color-mix(in srgb, var(--success) 35%, transparent)'
  },
  warning: {
    fg: 'var(--warning)',
    bg: 'var(--warning-subtle)',
    border: 'color-mix(in srgb, var(--warning) 35%, transparent)'
  },
  danger: {
    fg: 'var(--danger)',
    bg: 'var(--danger-subtle)',
    border: 'color-mix(in srgb, var(--danger) 35%, transparent)'
  },
  neutral: {
    fg: 'var(--text-secondary)',
    bg: 'var(--surface-2)',
    border: 'var(--border)'
  }
};

/**
 * Inline contextual message — info / success / warning / danger / neutral.
 * Pass an `icon` node and optional `action` (e.g. a Button) on the right.
 */
function Banner({
  tone = 'info',
  icon = null,
  title = null,
  action = null,
  style = {},
  children,
  ...props
}) {
  const t = TONES[tone] || TONES.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: tone === 'danger' || tone === 'warning' ? 'alert' : 'status'
  }, props, {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-4)',
      borderRadius: 'var(--radius-md)',
      background: t.bg,
      border: `1px solid ${t.border}`,
      color: 'var(--text-secondary)',
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--leading-base)',
      ...style
    }
  }), icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.fg,
      display: 'flex',
      flexShrink: 0,
      marginTop: '1px'
    }
  }, icon) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-primary)',
      fontWeight: 'var(--weight-semibold)',
      marginBottom: children ? '2px' : 0
    }
  }, title) : null, children), action ? /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0
    }
  }, action) : null);
}
Object.assign(__ds_scope, { Banner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Banner.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Centered empty / zero-state block: optional icon, a title, supporting copy,
 * and an optional action row. Used for empty lists and first-run panels.
 */
function EmptyState({
  icon = null,
  title,
  description = null,
  action = null,
  style = {},
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({}, props, {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-10) var(--space-6)',
      ...style
    }
  }), icon ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 48,
      height: 48,
      borderRadius: 'var(--radius-lg)',
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      color: 'var(--text-tertiary)'
    }
  }, icon) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-primary)',
      fontSize: 'var(--text-md)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, title), description ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-tertiary)',
      fontSize: 'var(--text-base)',
      maxWidth: '38ch',
      lineHeight: 'var(--leading-base)'
    }
  }, description) : null, action ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-2)'
    }
  }, action) : null);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Linear progress bar. Omit `value` (or pass null) for an indeterminate bar.
 */
function ProgressBar({
  value = null,
  height = 6,
  color = 'var(--accent-solid)',
  style = {},
  ...props
}) {
  const indeterminate = value === null || value === undefined;
  const pct = indeterminate ? 0 : Math.max(0, Math.min(100, value));
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "progressbar",
    "aria-valuenow": indeterminate ? undefined : pct,
    "aria-valuemin": 0,
    "aria-valuemax": 100
  }, props, {
    style: {
      position: 'relative',
      width: '100%',
      height,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-inset)',
      overflow: 'hidden',
      ...style
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: indeterminate ? 'ci-progress-indeterminate' : undefined,
    style: {
      position: indeterminate ? 'absolute' : 'static',
      height: '100%',
      width: indeterminate ? '60%' : `${pct}%`,
      transformOrigin: 'left',
      borderRadius: 'var(--radius-pill)',
      background: color,
      transition: indeterminate ? 'none' : 'width var(--duration-base) var(--ease-standard)',
      ...(indeterminate ? {
        animation: 'ci-progress-indeterminate 1.4s ease-in-out infinite'
      } : {})
    }
  }));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Spinner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Indeterminate loading spinner. Inherits color from `color` prop (defaults to
 * the accent), sized in px. Uses the shipped `.ci-spin` keyframe.
 */
function Spinner({
  size = 16,
  color = 'var(--accent-text)',
  thickness = 2,
  style = {},
  ...props
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    role: "status",
    "aria-label": "Loading"
  }, props, {
    className: `ci-spin ${props.className || ''}`,
    style: {
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      border: `${thickness}px solid color-mix(in srgb, ${color} 28%, transparent)`,
      borderTopColor: color,
      boxSizing: 'border-box',
      ...style
    }
  }));
}
Object.assign(__ds_scope, { Spinner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Spinner.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
const {
  useState
} = React;
/**
 * Lightweight hover/focus tooltip. Wraps a single trigger child and shows
 * `label` on a floating chip. CSS-free positioning via absolute placement.
 */
function Tooltip({
  label,
  side = 'top',
  children,
  style = {}
}) {
  const [open, setOpen] = useState(false);
  const pos = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px'
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: '8px'
    },
    left: {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: '8px'
    },
    right: {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: '8px'
    }
  }[side];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    },
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false)
  }, children, open ? /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    className: "ci-fade-in",
    style: {
      position: 'absolute',
      zIndex: 60,
      whiteSpace: 'nowrap',
      padding: '5px 9px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--surface-3)',
      border: '1px solid var(--border)',
      color: 'var(--text-primary)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-medium)',
      boxShadow: 'var(--shadow-popover)',
      pointerEvents: 'none',
      ...pos,
      ...style
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/lib/useInteractive.js
try { (() => {
const {
  useState
} = React;
/**
 * Tiny interaction-state helper used across the primitives. The design system
 * styles everything with inline CSS-var tokens, so hover / active / focus
 * states are tracked in React (matching the source app's convention) rather
 * than relying on consumer-side CSS that may not ship with the component.
 */
function useInteractive() {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const [focus, setFocus] = useState(false);
  const bind = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false)
  };
  return {
    hover,
    active,
    focus,
    bind
  };
}
Object.assign(__ds_scope, { useInteractive });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/lib/useInteractive.js", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Surface container. `interactive` adds hover lift + pointer; `padding`
 * accepts a spacing token number (maps to --space-N) or a CSS value.
 */
function Card({
  interactive = false,
  selected = false,
  padding = 'var(--space-4)',
  as = 'div',
  style = {},
  children,
  ...props
}) {
  const {
    hover,
    bind
  } = __ds_scope.useInteractive();
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({}, interactive ? bind : {}, props, {
    style: {
      background: 'var(--surface-2)',
      border: `1px solid ${selected ? 'var(--accent-border)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding,
      boxShadow: interactive && hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
      transform: interactive && hover ? 'translateY(-1px)' : 'none',
      cursor: interactive ? 'pointer' : 'default',
      transition: 'transform var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
      ...style
    }
  }), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Removable / selectable chip — for filters, attachments, selected items.
 * Pass `onRemove` to show an × affordance; `selected` for the active state.
 */
function Tag({
  selected = false,
  onRemove = null,
  leadingIcon = null,
  style = {},
  children,
  ...props
}) {
  const {
    hover,
    bind
  } = __ds_scope.useInteractive();
  return /*#__PURE__*/React.createElement("span", _extends({}, bind, props, {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      height: 24,
      padding: '0 8px',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      color: selected ? 'var(--accent-text)' : 'var(--text-secondary)',
      background: selected ? 'var(--accent-subtle)' : hover ? 'var(--surface-3)' : 'var(--surface-2)',
      border: `1px solid ${selected ? 'var(--accent-border)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)',
      whiteSpace: 'nowrap',
      transition: 'background var(--duration-fast) var(--ease-standard)',
      ...style
    }
  }), leadingIcon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexShrink: 0
    }
  }, leadingIcon) : null, children, onRemove ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Remove",
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    },
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 14,
      height: 14,
      marginRight: -2,
      padding: 0,
      border: 'none',
      background: 'transparent',
      color: 'var(--text-tertiary)',
      cursor: 'pointer',
      borderRadius: 'var(--radius-xs)',
      fontSize: 13,
      lineHeight: 1
    }
  }, "\xD7") : null);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    height: 'var(--control-sm)',
    padding: '0 10px',
    fontSize: 'var(--text-sm)',
    gap: '6px',
    radius: 'var(--radius-sm)'
  },
  md: {
    height: 'var(--control-md)',
    padding: '0 14px',
    fontSize: 'var(--text-base)',
    gap: '8px',
    radius: 'var(--radius-md)'
  },
  lg: {
    height: 'var(--control-lg)',
    padding: '0 20px',
    fontSize: 'var(--text-md)',
    gap: '8px',
    radius: 'var(--radius-md)'
  }
};
function intentStyle(intent, hover, active) {
  switch (intent) {
    case 'primary':
      return {
        background: active ? 'var(--accent-active)' : 'var(--accent-solid)',
        color: 'var(--text-on-accent)',
        border: '1px solid transparent',
        filter: hover && !active ? 'brightness(1.08)' : 'none'
      };
    case 'secondary':
      return {
        background: hover ? 'var(--surface-3)' : 'var(--surface-2)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-strong)'
      };
    case 'outline':
      return {
        background: hover ? 'var(--surface-2)' : 'transparent',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-strong)'
      };
    case 'danger':
      return {
        background: hover ? 'var(--danger-subtle)' : 'transparent',
        color: 'var(--danger)',
        border: '1px solid transparent'
      };
    case 'danger-solid':
      return {
        background: 'var(--danger-solid)',
        color: 'var(--white)',
        border: '1px solid transparent',
        filter: hover ? 'brightness(1.07)' : 'none'
      };
    case 'ghost':
    default:
      return {
        background: hover ? 'var(--surface-2)' : 'transparent',
        color: hover ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: '1px solid transparent'
      };
  }
}

/**
 * The primary action control. Calm indigo fill for the main action, quieter
 * secondary/ghost/outline treatments, and red danger variants.
 */
function Button({
  intent = 'secondary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  style = {},
  children,
  ...props
}) {
  const {
    hover,
    active,
    focus,
    bind
  } = __ds_scope.useInteractive();
  const s = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: isDisabled
  }, bind, props, {
    style: {
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      fontFamily: 'var(--font-sans)',
      fontSize: s.fontSize,
      fontWeight: 'var(--weight-medium)',
      lineHeight: 1,
      borderRadius: s.radius,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.5 : 1,
      whiteSpace: 'nowrap',
      transition: 'background var(--duration-fast) var(--ease-standard), filter var(--duration-fast) var(--ease-standard)',
      outline: focus ? '2px solid var(--focus-ring)' : '2px solid transparent',
      outlineOffset: '2px',
      ...intentStyle(intent, hover, active),
      ...style
    }
  }), loading ? /*#__PURE__*/React.createElement(__ds_scope.Spinner, {
    size: size === 'lg' ? 16 : 14
  }) : leftIcon, children, !loading ? rightIcon : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Checkbox with a label. Controlled via `checked` / `onChange`. Supports an
 * `indeterminate` visual state.
 */
function Checkbox({
  checked = false,
  indeterminate = false,
  disabled = false,
  label = null,
  id,
  style = {},
  onChange,
  ...props
}) {
  const {
    hover,
    focus,
    bind
  } = __ds_scope.useInteractive();
  const on = checked || indeterminate;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'var(--text-primary)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", _extends({}, bind, {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 18,
      height: 18,
      flexShrink: 0,
      borderRadius: 'var(--radius-xs)',
      background: on ? 'var(--accent-solid)' : 'var(--surface-inset)',
      border: `1px solid ${on ? 'var(--accent-solid)' : hover ? 'var(--neutral-500)' : 'var(--border-strong)'}`,
      boxShadow: focus ? '0 0 0 3px var(--accent-subtle)' : 'none',
      transition: 'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
      color: 'var(--white)'
    }
  }), /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    id: id,
    checked: checked,
    disabled: disabled,
    onChange: onChange
  }, props, {
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  })), indeterminate ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 2,
      background: 'var(--white)',
      borderRadius: 1
    }
  }) : checked ? /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 6.2 L5 8.5 L9.5 3.5",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })) : null), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    box: 'var(--control-sm)',
    radius: 'var(--radius-sm)'
  },
  md: {
    box: 'var(--control-md)',
    radius: 'var(--radius-md)'
  },
  lg: {
    box: 'var(--control-lg)',
    radius: 'var(--radius-md)'
  }
};

/**
 * Square, icon-only button. Same intent vocabulary as Button but sized to a
 * single glyph. Always pass an `aria-label`.
 */
function IconButton({
  intent = 'ghost',
  size = 'md',
  active: pressed = false,
  disabled = false,
  style = {},
  children,
  ...props
}) {
  const {
    hover,
    focus,
    bind
  } = __ds_scope.useInteractive();
  const s = SIZES[size] || SIZES.md;
  let bg = 'transparent';
  let color = 'var(--text-secondary)';
  let border = '1px solid transparent';
  if (intent === 'primary') {
    bg = 'var(--accent-solid)';
    color = 'var(--text-on-accent)';
  } else if (intent === 'outline') {
    border = '1px solid var(--border-strong)';
    color = 'var(--text-primary)';
    if (hover) bg = 'var(--surface-2)';
  } else {
    if (pressed) {
      bg = 'var(--accent-subtle)';
      color = 'var(--accent-text)';
    } else if (hover) {
      bg = 'var(--surface-2)';
      color = 'var(--text-primary)';
    }
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled
  }, bind, props, {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: s.box,
      height: s.box,
      padding: 0,
      borderRadius: s.radius,
      background: bg,
      color,
      border,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)',
      outline: focus ? '2px solid var(--focus-ring)' : '2px solid transparent',
      outlineOffset: '2px',
      ...style
    }
  }), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    height: 'var(--control-sm)',
    fontSize: 'var(--text-sm)',
    padding: '0 10px'
  },
  md: {
    height: 'var(--control-md)',
    fontSize: 'var(--text-base)',
    padding: '0 12px'
  },
  lg: {
    height: 'var(--control-lg)',
    fontSize: 'var(--text-md)',
    padding: '0 14px'
  }
};

/**
 * Single-line text field. Pass `leadingIcon` / `trailingIcon` for adornments,
 * `invalid` for the error state, and `mono` to render the value in Geist Mono
 * (paths, IDs, tokens).
 */
function Input({
  size = 'md',
  invalid = false,
  leadingIcon = null,
  trailingIcon = null,
  mono = false,
  disabled = false,
  style = {},
  ...props
}) {
  const {
    hover,
    focus,
    bind
  } = __ds_scope.useInteractive();
  const s = SIZES[size] || SIZES.md;
  let borderColor = 'var(--border-strong)';
  if (invalid) borderColor = 'var(--danger)';else if (focus) borderColor = 'var(--accent)';else if (hover) borderColor = 'var(--neutral-500)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      height: s.height,
      padding: s.padding,
      background: 'var(--surface-inset)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focus ? '0 0 0 3px var(--accent-subtle)' : 'none',
      opacity: disabled ? 0.5 : 1,
      transition: 'border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
      ...style
    }
  }, leadingIcon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      color: 'var(--text-tertiary)',
      flexShrink: 0
    }
  }, leadingIcon) : null, /*#__PURE__*/React.createElement("input", _extends({
    disabled: disabled
  }, bind, props, {
    style: {
      flex: 1,
      minWidth: 0,
      height: '100%',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: 'var(--text-primary)',
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: s.fontSize
    }
  })), trailingIcon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      color: 'var(--text-tertiary)',
      flexShrink: 0
    }
  }, trailingIcon) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    height: 'var(--control-sm)',
    fontSize: 'var(--text-sm)'
  },
  md: {
    height: 'var(--control-md)',
    fontSize: 'var(--text-base)'
  },
  lg: {
    height: 'var(--control-lg)',
    fontSize: 'var(--text-md)'
  }
};

/**
 * Native select styled to match the design system, with a custom chevron.
 * Pass `options` as `{ value, label }[]` or provide `<option>` children.
 */
function Select({
  size = 'md',
  invalid = false,
  options = null,
  disabled = false,
  style = {},
  children,
  ...props
}) {
  const {
    hover,
    focus,
    bind
  } = __ds_scope.useInteractive();
  const s = SIZES[size] || SIZES.md;
  let borderColor = 'var(--border-strong)';
  if (invalid) borderColor = 'var(--danger)';else if (focus) borderColor = 'var(--accent)';else if (hover) borderColor = 'var(--neutral-500)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      width: style.width || 'auto'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    disabled: disabled
  }, bind, props, {
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '100%',
      height: s.height,
      padding: '0 32px 0 12px',
      background: 'var(--surface-inset)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focus ? '0 0 0 3px var(--accent-subtle)' : 'none',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      fontSize: s.fontSize,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      outline: 'none',
      transition: 'border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
      ...style
    }
  }), options ? options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label)) : children), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      right: 11,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: 'var(--text-tertiary)',
      fontSize: 10,
      lineHeight: 1
    }
  }, "\u25BE"));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * On/off toggle switch. Controlled via `checked` / `onChange`. Optional inline
 * `label` rendered after the track.
 */
function Switch({
  checked = false,
  disabled = false,
  label = null,
  id,
  onChange,
  style = {},
  ...props
}) {
  const {
    focus,
    bind
  } = __ds_scope.useInteractive();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'var(--text-primary)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", _extends({}, bind, {
    style: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      width: 36,
      height: 20,
      flexShrink: 0,
      borderRadius: 'var(--radius-pill)',
      background: checked ? 'var(--accent-solid)' : 'var(--surface-3)',
      border: `1px solid ${checked ? 'var(--accent-solid)' : 'var(--border-strong)'}`,
      boxShadow: focus ? '0 0 0 3px var(--accent-subtle)' : 'none',
      transition: 'background var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard)'
    }
  }), /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    id: id,
    checked: checked,
    disabled: disabled,
    onChange: onChange
  }, props, {
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: checked ? 18 : 2,
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: 'var(--white)',
      boxShadow: 'var(--shadow-xs)',
      transition: 'left var(--duration-base) var(--ease-out)'
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Multi-line text field. Same border/focus language as Input. Use `mono` for
 * code/prompt entry.
 */
function Textarea({
  invalid = false,
  mono = false,
  rows = 4,
  disabled = false,
  style = {},
  ...props
}) {
  const {
    hover,
    focus,
    bind
  } = __ds_scope.useInteractive();
  let borderColor = 'var(--border-strong)';
  if (invalid) borderColor = 'var(--danger)';else if (focus) borderColor = 'var(--accent)';else if (hover) borderColor = 'var(--neutral-500)';
  return /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    disabled: disabled
  }, bind, props, {
    style: {
      display: 'block',
      width: '100%',
      padding: 'var(--space-3)',
      background: 'var(--surface-inset)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focus ? '0 0 0 3px var(--accent-subtle)' : 'none',
      color: 'var(--text-primary)',
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--leading-base)',
      resize: 'vertical',
      outline: 'none',
      opacity: disabled ? 0.5 : 1,
      transition: 'border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
      ...style
    }
  }));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SegmentedControl.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Compact segmented control for 2–4 mutually exclusive options (view modes,
 * filters). `options` is `{ value, label, icon? }[]`.
 */
function SegmentedControl({
  options = [],
  value,
  onChange,
  size = 'md',
  style = {},
  ...props
}) {
  const h = size === 'sm' ? 28 : 34;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "radiogroup"
  }, props, {
    style: {
      display: 'inline-flex',
      padding: 3,
      gap: 2,
      background: 'var(--surface-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      ...style
    }
  }), options.map(o => {
    const active = o.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      type: "button",
      role: "radio",
      "aria-checked": active,
      onClick: () => onChange(o.value),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: h,
        padding: '0 12px',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        background: active ? 'var(--surface-3)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-medium)',
        cursor: 'pointer',
        boxShadow: active ? 'var(--shadow-xs)' : 'none',
        transition: 'background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)'
      }
    }, o.icon ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex'
      }
    }, o.icon) : null, o.label);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TabButton({
  tab,
  active,
  onSelect
}) {
  const {
    hover,
    bind
  } = __ds_scope.useInteractive();
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "tab",
    "aria-selected": active,
    onClick: () => onSelect(tab.value)
  }, bind, {
    style: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '7px',
      height: 38,
      padding: '0 4px',
      marginBottom: -1,
      border: 'none',
      background: 'transparent',
      color: active ? 'var(--text-primary)' : hover ? 'var(--text-secondary)' : 'var(--text-tertiary)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-medium)',
      cursor: 'pointer',
      borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
      transition: 'color var(--duration-fast) var(--ease-standard)'
    }
  }), tab.icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex'
    }
  }, tab.icon) : null, tab.label, tab.count !== undefined && tab.count !== null ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xs)',
      color: active ? 'var(--accent-text)' : 'var(--text-tertiary)',
      background: active ? 'var(--accent-subtle)' : 'var(--surface-3)',
      borderRadius: 'var(--radius-pill)',
      padding: '1px 6px'
    }
  }, tab.count) : null);
}

/**
 * Underline tab bar. `tabs` is `{ value, label, icon?, count? }[]`; controlled
 * via `value` / `onChange`.
 */
function Tabs({
  tabs = [],
  value,
  onChange,
  style = {},
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist"
  }, props, {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 'var(--space-5)',
      borderBottom: '1px solid var(--border)',
      ...style
    }
  }), tabs.map(tab => /*#__PURE__*/React.createElement(TabButton, {
    key: tab.value,
    tab: tab,
    active: tab.value === value,
    onSelect: onChange
  })));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Dialog.jsx
try { (() => {
const {
  useEffect
} = React;
/**
 * Modal dialog with a scrim. `variant` is 'center' (default) or 'drawer-right'.
 * Renders nothing when `open` is false. Closes on Esc and scrim click.
 */
function Dialog({
  open,
  onClose,
  title = null,
  description = null,
  variant = 'center',
  width = 440,
  footer = null,
  children,
  style = {}
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const isDrawer = variant === 'drawer-right';
  const panel = {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--surface-1)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-dialog)',
    ...(isDrawer ? {
      width,
      maxWidth: '92vw',
      height: '100%',
      borderRadius: 0,
      borderRight: 'none',
      borderTop: 'none',
      borderBottom: 'none'
    } : {
      width,
      maxWidth: '92vw',
      maxHeight: '88vh',
      borderRadius: 'var(--radius-lg)'
    }),
    ...style
  };
  return /*#__PURE__*/React.createElement("div", {
    onMouseDown: e => {
      if (e.target === e.currentTarget) onClose?.();
    },
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: isDrawer ? 'stretch' : 'center',
      justifyContent: isDrawer ? 'flex-end' : 'center',
      padding: isDrawer ? 0 : 'var(--space-6)',
      background: 'var(--surface-overlay)',
      backdropFilter: 'blur(2px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": typeof title === 'string' ? title : undefined,
    className: "ci-fade-in",
    style: panel
  }, title || onClose ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      padding: 'var(--space-5) var(--space-5) var(--space-4)',
      borderBottom: title ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", null, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-lg)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, title) : null, description ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      color: 'var(--text-tertiary)',
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--leading-base)'
    }
  }, description) : null), onClose ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    "aria-label": "Close",
    size: "sm",
    onClick: onClose,
    style: {
      marginTop: -2,
      marginRight: -4
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3.5 3.5 L10.5 10.5 M10.5 3.5 L3.5 10.5",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }))) : null) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-5)',
      overflowY: 'auto',
      flex: 1
    }
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 'var(--space-2)',
      padding: 'var(--space-4) var(--space-5)',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, footer) : null));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Menu.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect,
  useRef,
  useState
} = React;
function MenuItem({
  item,
  onClose
}) {
  const {
    hover,
    bind
  } = __ds_scope.useInteractive();
  if (item.separator) {
    return /*#__PURE__*/React.createElement("div", {
      role: "separator",
      style: {
        height: 1,
        margin: '4px 0',
        background: 'var(--border-subtle)'
      }
    });
  }
  const danger = item.tone === 'danger';
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "menuitem",
    disabled: item.disabled,
    onClick: () => {
      item.onSelect?.();
      onClose();
    }
  }, bind, {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      width: '100%',
      height: 32,
      padding: '0 10px',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      background: hover && !item.disabled ? danger ? 'var(--danger-subtle)' : 'var(--surface-3)' : 'transparent',
      color: item.disabled ? 'var(--text-disabled)' : danger ? 'var(--danger)' : 'var(--text-secondary)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      textAlign: 'left',
      cursor: item.disabled ? 'not-allowed' : 'pointer',
      whiteSpace: 'nowrap'
    }
  }), item.icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexShrink: 0
    }
  }, item.icon) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), item.shortcut ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-tertiary)'
    }
  }, item.shortcut) : null);
}

/**
 * Dropdown menu. Provide a `trigger` node and `items`
 * (`{ label, icon?, shortcut?, tone?, onSelect, disabled?, separator? }[]`).
 * Manages its own open state and closes on outside click / Esc.
 */
function Menu({
  trigger,
  items = [],
  align = 'start',
  style = {}
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = e => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => setOpen(v => !v),
    style: {
      display: 'inline-flex'
    }
  }, trigger), open ? /*#__PURE__*/React.createElement("div", {
    role: "menu",
    className: "ci-fade-in",
    style: {
      position: 'absolute',
      top: '100%',
      [align === 'end' ? 'right' : 'left']: 0,
      marginTop: 6,
      zIndex: 80,
      minWidth: 180,
      padding: 4,
      background: 'var(--surface-3)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-popover)',
      ...style
    }
  }, items.map((item, i) => /*#__PURE__*/React.createElement(MenuItem, {
    key: item.label ? `${item.label}` : `sep-${i}`,
    item: item,
    onClose: () => setOpen(false)
  }))) : null);
}
Object.assign(__ds_scope, { Menu });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Menu.jsx", error: String((e && e.message) || e) }); }

// ui_kits/customize/icons.jsx
try { (() => {
/* ClaudeIn UI-kit icons — inline SVGs in the Lucide idiom (24 grid, 1.75 stroke,
 * round caps/joins), exposed on window.ClaudeInIcons. In production the app uses
 * lucide-react; these faithful inlines keep the kits dependency-free. */
(function () {
  const Ico = p => /*#__PURE__*/React.createElement("svg", {
    width: p.s || 16,
    height: p.s || 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p.sw || 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: p.style,
    "aria-hidden": "true"
  }, p.children);
  const I = {
    IconPlus: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 5v14M5 12h14"
    })),
    IconSearch: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "7"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m20 20-3.2-3.2"
    })),
    IconFolder: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    })),
    IconGitBranch: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "6",
      r: "2.4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "18",
      r: "2.4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "18",
      cy: "7",
      r: "2.4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 8.4v7.2M18 9.4c0 4-3.5 4.6-6 4.6"
    })),
    IconSparkles: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18 15l.7 1.8L20.5 17.5 18.7 18.2 18 20l-.7-1.8L15.5 17.5 17.3 16.8z"
    })),
    IconUser: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "8",
      r: "3.6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5.5 20a6.5 6.5 0 0 1 13 0"
    })),
    IconChevron: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m9 6 6 6-6 6"
    })),
    IconChevronDown: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m6 9 6 6 6-6"
    })),
    IconWand: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M15 4V2M15 10V8M11 6H9M21 6h-2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 19 17 7l-2-2L3 17z"
    })),
    IconSend: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M5 12 20 5l-5 15-3.5-6.5z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m11.5 13.5 8.5-8.5"
    })),
    IconPaperclip: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M20 11.5 12 19a4.5 4.5 0 0 1-6.4-6.4l8-8a3 3 0 0 1 4.3 4.3l-7.8 7.8a1.5 1.5 0 0 1-2.2-2.1l7-7"
    })),
    IconX: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M6 6l12 12M18 6 6 18"
    })),
    IconCheck: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m5 12.5 4.5 4.5L19 7.5"
    })),
    IconActivity: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M3 12h4l2.5-7 5 14 2.5-7h4"
    })),
    IconTerminal: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m5 8 4 4-4 4M12 16h7"
    })),
    IconMessage: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z"
    })),
    IconHome: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M3 10.5 12 4l9 6.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5.5 9.3V20h13V9.3"
    })),
    IconSettings: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 3v2.5M12 18.5V21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M3 12h2.5M18.5 12H21M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"
    })),
    IconPlug: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5"
    })),
    IconBoxes: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 3 5 6.5v6L12 16l7-3.5v-6z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 12.5 12 16v5M19 12.5 12 16"
    })),
    IconShield: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"
    })),
    IconWrench: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M15 7a4 4 0 0 1-5.2 5.2L5 17l2 2 4.8-4.8A4 4 0 0 0 17 9z"
    })),
    IconBot: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
      x: "5",
      y: "8",
      width: "14",
      height: "10",
      rx: "2.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 8V5M9 13h.01M15 13h.01M3 12v2M21 12v2"
    })),
    IconBrain: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 5a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 5 12a2.5 2.5 0 0 0 1.5 4.5A2.5 2.5 0 0 0 9 19a2 2 0 0 0 3-1.7V6.7A2 2 0 0 0 9 5zM15 5a2.5 2.5 0 0 1 2.5 2.5A2.5 2.5 0 0 1 19 12a2.5 2.5 0 0 1-1.5 4.5A2.5 2.5 0 0 1 15 19a2 2 0 0 1-3-1.7"
    })),
    IconCommand: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 6a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v10a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2z"
    })),
    IconArrowLeft: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M19 12H5M11 6l-6 6 6 6"
    })),
    IconCopy: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
      x: "9",
      y: "9",
      width: "11",
      height: "11",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 15V6a2 2 0 0 1 2-2h9"
    })),
    IconClock: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 8v4.5l3 1.5"
    })),
    IconDatabase: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("ellipse", {
      cx: "12",
      cy: "6",
      rx: "7",
      ry: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3 3 7 3s7-1.3 7-3"
    })),
    IconZap: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M13 3 5 13h6l-1 8 8-10h-6z"
    })),
    IconHash: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 3 7 21M17 3l-2 18M4 9h16M3 15h16"
    })),
    IconDot: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "2.5",
      fill: "currentColor",
      stroke: "none"
    })),
    IconMore: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "5",
      cy: "12",
      r: "1.4",
      fill: "currentColor",
      stroke: "none"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "1.4",
      fill: "currentColor",
      stroke: "none"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "19",
      cy: "12",
      r: "1.4",
      fill: "currentColor",
      stroke: "none"
    })),
    IconLock: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
      x: "5",
      y: "11",
      width: "14",
      height: "9",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 11V8a4 4 0 0 1 8 0v3"
    })),
    IconFile: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M7 3h7l4 4v14H7z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 3v4h4"
    }))
  };
  window.ClaudeInIcons = I;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/customize/icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/icons.jsx
try { (() => {
/* ClaudeIn UI-kit icons — inline SVGs in the Lucide idiom (24 grid, 1.75 stroke,
 * round caps/joins), exposed on window.ClaudeInIcons. In production the app uses
 * lucide-react; these faithful inlines keep the kits dependency-free. */
(function () {
  const Ico = p => /*#__PURE__*/React.createElement("svg", {
    width: p.s || 16,
    height: p.s || 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p.sw || 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: p.style,
    "aria-hidden": "true"
  }, p.children);
  const I = {
    IconPlus: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 5v14M5 12h14"
    })),
    IconSearch: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "7"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m20 20-3.2-3.2"
    })),
    IconFolder: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    })),
    IconGitBranch: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "6",
      r: "2.4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "18",
      r: "2.4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "18",
      cy: "7",
      r: "2.4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 8.4v7.2M18 9.4c0 4-3.5 4.6-6 4.6"
    })),
    IconSparkles: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18 15l.7 1.8L20.5 17.5 18.7 18.2 18 20l-.7-1.8L15.5 17.5 17.3 16.8z"
    })),
    IconUser: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "8",
      r: "3.6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5.5 20a6.5 6.5 0 0 1 13 0"
    })),
    IconChevron: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m9 6 6 6-6 6"
    })),
    IconChevronDown: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m6 9 6 6 6-6"
    })),
    IconWand: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M15 4V2M15 10V8M11 6H9M21 6h-2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 19 17 7l-2-2L3 17z"
    })),
    IconSend: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M5 12 20 5l-5 15-3.5-6.5z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m11.5 13.5 8.5-8.5"
    })),
    IconPaperclip: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M20 11.5 12 19a4.5 4.5 0 0 1-6.4-6.4l8-8a3 3 0 0 1 4.3 4.3l-7.8 7.8a1.5 1.5 0 0 1-2.2-2.1l7-7"
    })),
    IconX: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M6 6l12 12M18 6 6 18"
    })),
    IconCheck: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m5 12.5 4.5 4.5L19 7.5"
    })),
    IconActivity: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M3 12h4l2.5-7 5 14 2.5-7h4"
    })),
    IconTerminal: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m5 8 4 4-4 4M12 16h7"
    })),
    IconMessage: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z"
    })),
    IconHome: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M3 10.5 12 4l9 6.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5.5 9.3V20h13V9.3"
    })),
    IconSettings: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 3v2.5M12 18.5V21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M3 12h2.5M18.5 12H21M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"
    })),
    IconPlug: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5"
    })),
    IconBoxes: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 3 5 6.5v6L12 16l7-3.5v-6z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 12.5 12 16v5M19 12.5 12 16"
    })),
    IconShield: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"
    })),
    IconWrench: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M15 7a4 4 0 0 1-5.2 5.2L5 17l2 2 4.8-4.8A4 4 0 0 0 17 9z"
    })),
    IconBot: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
      x: "5",
      y: "8",
      width: "14",
      height: "10",
      rx: "2.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 8V5M9 13h.01M15 13h.01M3 12v2M21 12v2"
    })),
    IconBrain: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 5a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 5 12a2.5 2.5 0 0 0 1.5 4.5A2.5 2.5 0 0 0 9 19a2 2 0 0 0 3-1.7V6.7A2 2 0 0 0 9 5zM15 5a2.5 2.5 0 0 1 2.5 2.5A2.5 2.5 0 0 1 19 12a2.5 2.5 0 0 1-1.5 4.5A2.5 2.5 0 0 1 15 19a2 2 0 0 1-3-1.7"
    })),
    IconCommand: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 6a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v10a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2z"
    })),
    IconArrowLeft: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M19 12H5M11 6l-6 6 6 6"
    })),
    IconCopy: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
      x: "9",
      y: "9",
      width: "11",
      height: "11",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 15V6a2 2 0 0 1 2-2h9"
    })),
    IconClock: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 8v4.5l3 1.5"
    })),
    IconDatabase: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("ellipse", {
      cx: "12",
      cy: "6",
      rx: "7",
      ry: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3 3 7 3s7-1.3 7-3"
    })),
    IconZap: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M13 3 5 13h6l-1 8 8-10h-6z"
    })),
    IconHash: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 3 7 21M17 3l-2 18M4 9h16M3 15h16"
    })),
    IconDot: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "2.5",
      fill: "currentColor",
      stroke: "none"
    })),
    IconMore: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "5",
      cy: "12",
      r: "1.4",
      fill: "currentColor",
      stroke: "none"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "1.4",
      fill: "currentColor",
      stroke: "none"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "19",
      cy: "12",
      r: "1.4",
      fill: "currentColor",
      stroke: "none"
    })),
    IconLock: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
      x: "5",
      y: "11",
      width: "14",
      height: "9",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 11V8a4 4 0 0 1 8 0v3"
    })),
    IconFile: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M7 3h7l4 4v14H7z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 3v4h4"
    }))
  };
  window.ClaudeInIcons = I;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/home/icons.jsx
try { (() => {
/* ClaudeIn UI-kit icons — inline SVGs in the Lucide idiom (24 grid, 1.75 stroke,
 * round caps/joins), exposed on window.ClaudeInIcons. In production the app uses
 * lucide-react; these faithful inlines keep the kits dependency-free. */
(function () {
  const Ico = p => /*#__PURE__*/React.createElement("svg", {
    width: p.s || 16,
    height: p.s || 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p.sw || 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: p.style,
    "aria-hidden": "true"
  }, p.children);
  const I = {
    IconPlus: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 5v14M5 12h14"
    })),
    IconSearch: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "7"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m20 20-3.2-3.2"
    })),
    IconFolder: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    })),
    IconGitBranch: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "6",
      r: "2.4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "18",
      r: "2.4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "18",
      cy: "7",
      r: "2.4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 8.4v7.2M18 9.4c0 4-3.5 4.6-6 4.6"
    })),
    IconSparkles: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18 15l.7 1.8L20.5 17.5 18.7 18.2 18 20l-.7-1.8L15.5 17.5 17.3 16.8z"
    })),
    IconUser: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "8",
      r: "3.6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5.5 20a6.5 6.5 0 0 1 13 0"
    })),
    IconChevron: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m9 6 6 6-6 6"
    })),
    IconChevronDown: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m6 9 6 6 6-6"
    })),
    IconWand: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M15 4V2M15 10V8M11 6H9M21 6h-2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 19 17 7l-2-2L3 17z"
    })),
    IconSend: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M5 12 20 5l-5 15-3.5-6.5z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m11.5 13.5 8.5-8.5"
    })),
    IconPaperclip: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M20 11.5 12 19a4.5 4.5 0 0 1-6.4-6.4l8-8a3 3 0 0 1 4.3 4.3l-7.8 7.8a1.5 1.5 0 0 1-2.2-2.1l7-7"
    })),
    IconX: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M6 6l12 12M18 6 6 18"
    })),
    IconCheck: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m5 12.5 4.5 4.5L19 7.5"
    })),
    IconActivity: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M3 12h4l2.5-7 5 14 2.5-7h4"
    })),
    IconTerminal: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m5 8 4 4-4 4M12 16h7"
    })),
    IconMessage: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z"
    })),
    IconHome: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M3 10.5 12 4l9 6.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5.5 9.3V20h13V9.3"
    })),
    IconSettings: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 3v2.5M12 18.5V21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M3 12h2.5M18.5 12H21M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"
    })),
    IconPlug: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5"
    })),
    IconBoxes: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 3 5 6.5v6L12 16l7-3.5v-6z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 12.5 12 16v5M19 12.5 12 16"
    })),
    IconShield: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"
    })),
    IconWrench: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M15 7a4 4 0 0 1-5.2 5.2L5 17l2 2 4.8-4.8A4 4 0 0 0 17 9z"
    })),
    IconBot: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
      x: "5",
      y: "8",
      width: "14",
      height: "10",
      rx: "2.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 8V5M9 13h.01M15 13h.01M3 12v2M21 12v2"
    })),
    IconBrain: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 5a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 5 12a2.5 2.5 0 0 0 1.5 4.5A2.5 2.5 0 0 0 9 19a2 2 0 0 0 3-1.7V6.7A2 2 0 0 0 9 5zM15 5a2.5 2.5 0 0 1 2.5 2.5A2.5 2.5 0 0 1 19 12a2.5 2.5 0 0 1-1.5 4.5A2.5 2.5 0 0 1 15 19a2 2 0 0 1-3-1.7"
    })),
    IconCommand: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 6a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v10a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2z"
    })),
    IconArrowLeft: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M19 12H5M11 6l-6 6 6 6"
    })),
    IconCopy: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
      x: "9",
      y: "9",
      width: "11",
      height: "11",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 15V6a2 2 0 0 1 2-2h9"
    })),
    IconClock: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 8v4.5l3 1.5"
    })),
    IconDatabase: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("ellipse", {
      cx: "12",
      cy: "6",
      rx: "7",
      ry: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3 3 7 3s7-1.3 7-3"
    })),
    IconZap: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M13 3 5 13h6l-1 8 8-10h-6z"
    })),
    IconHash: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 3 7 21M17 3l-2 18M4 9h16M3 15h16"
    })),
    IconDot: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "2.5",
      fill: "currentColor",
      stroke: "none"
    })),
    IconMore: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "5",
      cy: "12",
      r: "1.4",
      fill: "currentColor",
      stroke: "none"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "1.4",
      fill: "currentColor",
      stroke: "none"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "19",
      cy: "12",
      r: "1.4",
      fill: "currentColor",
      stroke: "none"
    })),
    IconLock: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
      x: "5",
      y: "11",
      width: "14",
      height: "9",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 11V8a4 4 0 0 1 8 0v3"
    })),
    IconFile: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M7 3h7l4 4v14H7z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 3v4h4"
    }))
  };
  window.ClaudeInIcons = I;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/home/icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/onboarding/icons.jsx
try { (() => {
/* ClaudeIn UI-kit icons — inline SVGs in the Lucide idiom (24 grid, 1.75 stroke,
 * round caps/joins), exposed on window.ClaudeInIcons. In production the app uses
 * lucide-react; these faithful inlines keep the kits dependency-free. */
(function () {
  const Ico = p => /*#__PURE__*/React.createElement("svg", {
    width: p.s || 16,
    height: p.s || 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p.sw || 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: p.style,
    "aria-hidden": "true"
  }, p.children);
  const I = {
    IconPlus: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 5v14M5 12h14"
    })),
    IconSearch: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "7"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m20 20-3.2-3.2"
    })),
    IconFolder: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    })),
    IconGitBranch: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "6",
      r: "2.4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "18",
      r: "2.4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "18",
      cy: "7",
      r: "2.4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 8.4v7.2M18 9.4c0 4-3.5 4.6-6 4.6"
    })),
    IconSparkles: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18 15l.7 1.8L20.5 17.5 18.7 18.2 18 20l-.7-1.8L15.5 17.5 17.3 16.8z"
    })),
    IconUser: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "8",
      r: "3.6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5.5 20a6.5 6.5 0 0 1 13 0"
    })),
    IconChevron: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m9 6 6 6-6 6"
    })),
    IconChevronDown: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m6 9 6 6 6-6"
    })),
    IconWand: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M15 4V2M15 10V8M11 6H9M21 6h-2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 19 17 7l-2-2L3 17z"
    })),
    IconSend: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M5 12 20 5l-5 15-3.5-6.5z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m11.5 13.5 8.5-8.5"
    })),
    IconPaperclip: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M20 11.5 12 19a4.5 4.5 0 0 1-6.4-6.4l8-8a3 3 0 0 1 4.3 4.3l-7.8 7.8a1.5 1.5 0 0 1-2.2-2.1l7-7"
    })),
    IconX: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M6 6l12 12M18 6 6 18"
    })),
    IconCheck: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m5 12.5 4.5 4.5L19 7.5"
    })),
    IconActivity: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M3 12h4l2.5-7 5 14 2.5-7h4"
    })),
    IconTerminal: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "m5 8 4 4-4 4M12 16h7"
    })),
    IconMessage: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z"
    })),
    IconHome: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M3 10.5 12 4l9 6.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5.5 9.3V20h13V9.3"
    })),
    IconSettings: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 3v2.5M12 18.5V21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M3 12h2.5M18.5 12H21M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"
    })),
    IconPlug: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5"
    })),
    IconBoxes: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 3 5 6.5v6L12 16l7-3.5v-6z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 12.5 12 16v5M19 12.5 12 16"
    })),
    IconShield: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"
    })),
    IconWrench: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M15 7a4 4 0 0 1-5.2 5.2L5 17l2 2 4.8-4.8A4 4 0 0 0 17 9z"
    })),
    IconBot: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
      x: "5",
      y: "8",
      width: "14",
      height: "10",
      rx: "2.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 8V5M9 13h.01M15 13h.01M3 12v2M21 12v2"
    })),
    IconBrain: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 5a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 5 12a2.5 2.5 0 0 0 1.5 4.5A2.5 2.5 0 0 0 9 19a2 2 0 0 0 3-1.7V6.7A2 2 0 0 0 9 5zM15 5a2.5 2.5 0 0 1 2.5 2.5A2.5 2.5 0 0 1 19 12a2.5 2.5 0 0 1-1.5 4.5A2.5 2.5 0 0 1 15 19a2 2 0 0 1-3-1.7"
    })),
    IconCommand: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 6a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v10a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2z"
    })),
    IconArrowLeft: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M19 12H5M11 6l-6 6 6 6"
    })),
    IconCopy: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
      x: "9",
      y: "9",
      width: "11",
      height: "11",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 15V6a2 2 0 0 1 2-2h9"
    })),
    IconClock: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 8v4.5l3 1.5"
    })),
    IconDatabase: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("ellipse", {
      cx: "12",
      cy: "6",
      rx: "7",
      ry: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3 3 7 3s7-1.3 7-3"
    })),
    IconZap: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M13 3 5 13h6l-1 8 8-10h-6z"
    })),
    IconHash: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M9 3 7 21M17 3l-2 18M4 9h16M3 15h16"
    })),
    IconDot: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "2.5",
      fill: "currentColor",
      stroke: "none"
    })),
    IconMore: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
      cx: "5",
      cy: "12",
      r: "1.4",
      fill: "currentColor",
      stroke: "none"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "1.4",
      fill: "currentColor",
      stroke: "none"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "19",
      cy: "12",
      r: "1.4",
      fill: "currentColor",
      stroke: "none"
    })),
    IconLock: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
      x: "5",
      y: "11",
      width: "14",
      height: "9",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 11V8a4 4 0 0 1 8 0v3"
    })),
    IconFile: p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
      d: "M7 3h7l4 4v14H7z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 3v4h4"
    }))
  };
  window.ClaudeInIcons = I;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/onboarding/icons.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Kbd = __ds_scope.Kbd;

__ds_ns.StatusDot = __ds_scope.StatusDot;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Banner = __ds_scope.Banner;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Spinner = __ds_scope.Spinner;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Menu = __ds_scope.Menu;

})();
