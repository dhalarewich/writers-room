import { findStudioRoot, loadStudio } from '../core/studio.js';
import type { Studio } from '../core/types.js';

export function requireStudio(): Studio {
  const root = findStudioRoot(process.cwd());
  if (!root) {
    console.error('Not inside a studio. Run `wr init <dir> --name "My Studio" --prefix ws` to create one.');
    process.exit(1);
  }
  return loadStudio(root);
}
