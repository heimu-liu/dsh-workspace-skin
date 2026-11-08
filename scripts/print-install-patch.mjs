import {fileURLToPath} from 'node:url';
const host=fileURLToPath(new URL('../src/host.js',import.meta.url));
console.log('- insert:\n    - id: laishu-workspace-skin\n      name: '+JSON.stringify(host));
