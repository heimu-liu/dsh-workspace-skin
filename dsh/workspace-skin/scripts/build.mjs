import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { bambooSvg } from '../src/bamboo.mjs';
const root = new URL('../', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const source = await readFile(new URL('src/client.cjs', root), 'utf8');
const css = await readFile(new URL('src/skin.css', root), 'utf8');
await mkdir(new URL('lib/', root), {recursive:true});
await writeFile(new URL('lib/client.js', root), `window.__ModuleLoader__.load({id:${JSON.stringify(pkg.name)},factory:(require)=>{\nconst module={exports:{}};const exports=module.exports;\nconst PLUGIN_ID=${JSON.stringify(pkg.name)};\nconst CSS=${JSON.stringify(css)};\nconst BAMBOO_SVG=${JSON.stringify(bambooSvg)};\n${source}\nreturn module.exports;\n}});\n`);
console.log('Built native DSH client bundle');
