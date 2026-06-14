/** True when running on macOS. Guards mac-only UI (e.g. title-bar traffic-light safe zone). */
export const isMac = window.api?.platform === 'darwin';
