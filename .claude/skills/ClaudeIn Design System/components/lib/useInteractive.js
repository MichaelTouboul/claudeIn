import { useState } from 'react';

/**
 * Tiny interaction-state helper used across the primitives. The design system
 * styles everything with inline CSS-var tokens, so hover / active / focus
 * states are tracked in React (matching the source app's convention) rather
 * than relying on consumer-side CSS that may not ship with the component.
 */
export function useInteractive() {
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
    onBlur: () => setFocus(false),
  };

  return { hover, active, focus, bind };
}
