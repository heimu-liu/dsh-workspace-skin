import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {redact} from './redact-log.cjs';
// Buffer subprocess output before sanitizing: secrets can span stream chunks.
function runSync(file,args,options={}){
 const output=execFileSync(file,args,{...options,stdio:'pipe'});
 if(output.length)console.log(redact(output.toString()));
}
async function main(){
const project=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const root=await mkdtemp('/private/tmp/dsh-skin-verify-');
const home=path.join(root,'home'),workspace=path.join(root,'workspace'),control=path.join(root,'control.json');
let runtime=process.env.DSH_TEST_RUNTIME;
if(!runtime){runSync('python3',[path.join(project,'scripts/extract-runtime.py'),root]);runtime=path.join(root,'dsh');}
let host=path.join(project,'src/host.js');
if(process.env.DSH_TEST_PACKAGE){
 const prefix=path.join(root,'package');
 runSync('npm',['install','--prefix',prefix,'--ignore-scripts','--omit=dev','--no-audit','--no-fund','--cache','/private/tmp/dsh-skin-npm-cache',path.resolve(process.env.DSH_TEST_PACKAGE)]);
 host=path.join(prefix,'node_modules/@laishu/dsh-workspace-skin/src/host.js');
}
await mkdir(workspace,{recursive:true});await mkdir(path.join(home,'storages'),{recursive:true});
const id=randomUUID(),date=new Date().toISOString();
await writeFile(path.join(home,'storages/workspace.json'),JSON.stringify({unit:{name:'workspace',version:2},global:{initialized:true,workspaceIds:[id],archivedSessionIds:[],pinnedSessionIds:[],defaultWorkspaceId:id},tables:{workspaces:{[id]:{path:workspace,title:'离线验收工作区',sessionIds:[],createdAt:date,updatedAt:date}}}}));
await writeFile(control,'{}');
const patch=path.join(root,'test.patch.yml');
await writeFile(patch,`- id: llm-deepseek\n  disabled: true\n- id: llm-deepseek-account\n  disabled: true\n- insert:\n    - id: laishu-workspace-skin\n      name: ${JSON.stringify(host)}\n    - id: skin-offline-fixture\n      name: ${JSON.stringify(path.join(project,'tests/native-fixture.mjs'))}\n`);
const env={...process.env,DSH_HOME:home,DSH_TEST_RUNTIME:runtime,DSH_TEST_CONTROL:control,DSH_TEST_WORKSPACE:workspace,DSH_TEST_REPORT:path.join(project,'artifacts/host-replay.json')};
const cli=path.join(runtime,'node_modules/@deepseek-ai/dsh/lib/bin.js');
execFileSync(process.execPath,[cli,'--profile','skin-test','--from-default-profile','web','--help'],{env,stdio:'pipe'});
const server=spawn(process.execPath,[cli,'--profile','skin-test','--patch',patch,'--host','127.0.0.1','--port','0','--no-open'],{env,stdio:['ignore','pipe','pipe']});
let logs='';
server.stdout.on('data',b=>{logs+=b;});server.stderr.on('data',b=>{logs+=b;});
try{
 const url=await new Promise((resolve,reject)=>{
  const timer=setInterval(()=>{const found=logs.match(/dsh web: (http:\/\/[^\s]+)/);if(found){clearInterval(timer);clearTimeout(timeout);resolve(found[1]);}},50);
  const timeout=setTimeout(()=>{clearInterval(timer);reject(new Error('Isolated host startup timed out'));},30000);
  server.once('error',error=>{clearInterval(timer);clearTimeout(timeout);reject(error);});
  server.once('exit',code=>{clearInterval(timer);clearTimeout(timeout);reject(new Error('Isolated host exited: '+code+'\n'+redact(logs)));});
 });
 console.log('Running native E2E in isolated DSH 0.2.2-rc.1');
 const child=spawn(process.execPath,[path.join(project,'tests/e2e.cjs')],{cwd:project,env:{...env,DSH_TEST_URL:url},stdio:['ignore','pipe','pipe']});
 let childLogs='';child.stdout.on('data',b=>childLogs+=b);child.stderr.on('data',b=>childLogs+=b);
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 console.log(redact(childLogs));
 if(code!==0)throw new Error('Browser acceptance failed');
 const replay=JSON.parse(await readFile(env.DSH_TEST_REPORT,'utf8'));
 if(!replay.pass)throw new Error('Native log replay failed');
 console.log(`Passed ${replay.cases.length} native replay cases. Reports: artifacts/`);
}finally{
 server.kill('SIGINT');
 if(server.exitCode===null&&server.signalCode===null)await new Promise(resolve=>{const timer=setTimeout(()=>{server.kill('SIGKILL');resolve();},5000);server.once('exit',()=>{clearTimeout(timer);resolve();});});
 console.log('Isolated runtime stopped; temporary evidence retained locally.');
}
}
main().catch(error=>{console.error(redact(error.stack||error));process.exitCode=1;});
