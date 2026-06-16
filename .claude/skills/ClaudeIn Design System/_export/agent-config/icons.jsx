/* ClaudeIn UI-kit icons — inline SVGs in the Lucide idiom (24 grid, 1.75 stroke,
 * round caps/joins), exposed on window.ClaudeInIcons. In production the app uses
 * lucide-react; these faithful inlines keep the kits dependency-free. */
(function () {
  const Ico = (p) => (
    <svg width={p.s || 16} height={p.s || 16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={p.sw || 1.75} strokeLinecap="round" strokeLinejoin="round"
      style={p.style} aria-hidden="true">{p.children}</svg>
  );
  const I = {
    IconPlus: (p) => <Ico {...p}><path d="M12 5v14M5 12h14" /></Ico>,
    IconSearch: (p) => <Ico {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></Ico>,
    IconFolder: (p) => <Ico {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Ico>,
    IconGitBranch: (p) => <Ico {...p}><circle cx="6" cy="6" r="2.4" /><circle cx="6" cy="18" r="2.4" /><circle cx="18" cy="7" r="2.4" /><path d="M6 8.4v7.2M18 9.4c0 4-3.5 4.6-6 4.6" /></Ico>,
    IconSparkles: (p) => <Ico {...p}><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" /><path d="M18 15l.7 1.8L20.5 17.5 18.7 18.2 18 20l-.7-1.8L15.5 17.5 17.3 16.8z" /></Ico>,
    IconUser: (p) => <Ico {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></Ico>,
    IconChevron: (p) => <Ico {...p}><path d="m9 6 6 6-6 6" /></Ico>,
    IconChevronDown: (p) => <Ico {...p}><path d="m6 9 6 6 6-6" /></Ico>,
    IconWand: (p) => <Ico {...p}><path d="M15 4V2M15 10V8M11 6H9M21 6h-2" /><path d="M5 19 17 7l-2-2L3 17z" /></Ico>,
    IconSend: (p) => <Ico {...p}><path d="M5 12 20 5l-5 15-3.5-6.5z" /><path d="m11.5 13.5 8.5-8.5" /></Ico>,
    IconPaperclip: (p) => <Ico {...p}><path d="M20 11.5 12 19a4.5 4.5 0 0 1-6.4-6.4l8-8a3 3 0 0 1 4.3 4.3l-7.8 7.8a1.5 1.5 0 0 1-2.2-2.1l7-7" /></Ico>,
    IconX: (p) => <Ico {...p}><path d="M6 6l12 12M18 6 6 18" /></Ico>,
    IconCheck: (p) => <Ico {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Ico>,
    IconActivity: (p) => <Ico {...p}><path d="M3 12h4l2.5-7 5 14 2.5-7h4" /></Ico>,
    IconTerminal: (p) => <Ico {...p}><path d="m5 8 4 4-4 4M12 16h7" /></Ico>,
    IconMessage: (p) => <Ico {...p}><path d="M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z" /></Ico>,
    IconHome: (p) => <Ico {...p}><path d="M3 10.5 12 4l9 6.5" /><path d="M5.5 9.3V20h13V9.3" /></Ico>,
    IconSettings: (p) => <Ico {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M3 12h2.5M18.5 12H21M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></Ico>,
    IconPlug: (p) => <Ico {...p}><path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5" /></Ico>,
    IconBoxes: (p) => <Ico {...p}><path d="M12 3 5 6.5v6L12 16l7-3.5v-6z" /><path d="M5 12.5 12 16v5M19 12.5 12 16" /></Ico>,
    IconShield: (p) => <Ico {...p}><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z" /></Ico>,
    IconWrench: (p) => <Ico {...p}><path d="M15 7a4 4 0 0 1-5.2 5.2L5 17l2 2 4.8-4.8A4 4 0 0 0 17 9z" /></Ico>,
    IconBot: (p) => <Ico {...p}><rect x="5" y="8" width="14" height="10" rx="2.5" /><path d="M12 8V5M9 13h.01M15 13h.01M3 12v2M21 12v2" /></Ico>,
    IconBrain: (p) => <Ico {...p}><path d="M9 5a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 5 12a2.5 2.5 0 0 0 1.5 4.5A2.5 2.5 0 0 0 9 19a2 2 0 0 0 3-1.7V6.7A2 2 0 0 0 9 5zM15 5a2.5 2.5 0 0 1 2.5 2.5A2.5 2.5 0 0 1 19 12a2.5 2.5 0 0 1-1.5 4.5A2.5 2.5 0 0 1 15 19a2 2 0 0 1-3-1.7" /></Ico>,
    IconCommand: (p) => <Ico {...p}><path d="M9 6a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v10a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2z" /></Ico>,
    IconArrowLeft: (p) => <Ico {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Ico>,
    IconCopy: (p) => <Ico {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></Ico>,
    IconClock: (p) => <Ico {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 1.5" /></Ico>,
    IconDatabase: (p) => <Ico {...p}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3 3 7 3s7-1.3 7-3" /></Ico>,
    IconZap: (p) => <Ico {...p}><path d="M13 3 5 13h6l-1 8 8-10h-6z" /></Ico>,
    IconHash: (p) => <Ico {...p}><path d="M9 3 7 21M17 3l-2 18M4 9h16M3 15h16" /></Ico>,
    IconDot: (p) => <Ico {...p}><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /></Ico>,
    IconMore: (p) => <Ico {...p}><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /></Ico>,
    IconLock: (p) => <Ico {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Ico>,
    IconFile: (p) => <Ico {...p}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></Ico>,
  };
  window.ClaudeInIcons = I;
})();
