import { type ComponentType } from 'react';

import { type PanelTab,PanelTabKind } from '@/store/usePanelStore';

import { TableTab } from './TableTab/TableTab';

/** kind → body component. Add a PanelTabKind value + an entry here to extend the panel. */
export const TAB_BODY: Record<PanelTabKind, ComponentType<{ tab: PanelTab }>> = {
  [PanelTabKind.Table]: TableTab,
};
