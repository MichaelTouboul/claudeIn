import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest does not enable RTL's auto-cleanup unless `globals` is on; unmount
// between tests so leftover DOM from one case cannot leak into the next.
afterEach(() => {
  cleanup();
});

