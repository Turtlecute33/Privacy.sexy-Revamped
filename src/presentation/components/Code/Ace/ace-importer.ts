import ace, { Range } from 'ace-builds';

/*
  Following is here because `import 'ace-builds/esm-resolver' imports all unused functionality
  when built with Vite (`npm run build`).
*/

import 'ace-builds/src-noconflict/theme-tomorrow_night';
import 'ace-builds/src-noconflict/mode-batchfile';
import 'ace-builds/src-noconflict/mode-sh';

export default ace;

export { Range as AceRange };
