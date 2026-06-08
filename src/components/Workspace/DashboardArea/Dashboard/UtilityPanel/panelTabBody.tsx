import { type ComponentType } from 'react';

import { type PanelTab, PanelTabKind } from '@/store/usePanelStore';

import { CodeTab } from './CodeTab/CodeTab';
import { TableTab } from './TableTab/TableTab';
import { TextTab } from './TextTab/TextTab';

/** kind → body component. Add a PanelTabKind value + an entry here to extend the panel. */
export const TAB_BODY: Record<PanelTabKind, ComponentType<{ tab: PanelTab }>> = {
  [PanelTabKind.Table]: TableTab,
  [PanelTabKind.Code]: CodeTab,
  [PanelTabKind.Text]: TextTab,
};
