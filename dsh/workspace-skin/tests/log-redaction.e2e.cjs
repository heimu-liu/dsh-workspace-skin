// Failure cases: failed navigation includes auth URL + stack paths; browser errors
// contain headers/keys/home paths; startup errors and split output chunks leak too.
// Run real entry points in a disposable copy, never overwrite public fixture reports.
const {mkdtemp,mkdir,cp,symlink,writeFile,readFile,rm}=require('node:fs/promises');
const {spawn}=require('node:child_process');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const project=path.resolve(__dirname,'..');
const marker='synthetic-secret-7cbd8a';
const privatePath='/Users/synthetic-private-user/Private Folder/file.js';
const payload=`Authorization: Bearer ${marker}\napi_key="${marker}"\nCookie: preference=light; session=${marker}\n-----BEGIN PRIVATE KEY-----\n${marker}\n-----END PRIVATE KEY-----\n${privatePath}\nhttps://user:${marker}@example.invalid/?access_token=${marker}&safe=1`;
const run=(file,env)=>new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[file],{env:{...process.env,...env},stdio:['ignore','pipe','pipe']});let output='';
 child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 child.on('error',reject);child.on('close',code=>resolve({code,output}));
});
(async()=>{
 const root=await mkdtemp('/private/tmp/dsh-skin-redaction-');let server;
 try{
  for(const dir of ['tests','scripts','artifacts'])await mkdir(path.join(root,dir));
  await cp(path.join(project,'tests/e2e.cjs'),path.join(root,'tests/e2e.cjs'));
  await cp(path.join(project,'scripts'),path.join(root,'scripts'),{recursive:true});
  await symlink(path.join(project,'node_modules'),path.join(root,'node_modules'));
  const control=path.join(root,'control.json');await writeFile(control,'{}');
  const safe=(text,label)=>{
   assert.ok(!text.includes(marker),label+': synthetic credential escaped redaction');
   assert.ok(!text.includes('synthetic-private-user'),label+': home identity escaped redaction');
   assert.ok(!text.includes(root)&&!text.includes(project),label+': absolute execution path escaped redaction');
  };
  server=http.createServer((req,res)=>{
   if(req.url.startsWith('/broken')){req.socket.destroy();return;}
   res.setHeader('Content-Type','text/html');res.end(`<script>console.error(${JSON.stringify(payload)});setTimeout(()=>{throw new Error(${JSON.stringify(payload)})},0)</script>`);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const scenario of ['broken','browser-errors']){
   const result=await run(path.join(root,'tests/e2e.cjs'),{DSH_TEST_CONTROL:control,DSH_TEST_URL:`${base}/${scenario}?token=${marker}`});
   assert.notEqual(result.code,0,'fixture must fail');
   const report=await readFile(path.join(root,'artifacts/e2e.json'),'utf8');
   safe(report,scenario+' report');safe(result.output,scenario+' console');
   assert.ok(report.includes('failure'),'diagnostic status preserved');
   if(scenario==='browser-errors')assert.ok(JSON.parse(report).errors.length>=2,'both browser error channels exercised');
  }
  const runtime=path.join(root,'runtime'),cli=path.join(runtime,'node_modules/@deepseek-ai/dsh/lib/bin.js');
  await mkdir(path.dirname(cli),{recursive:true});
  for(const scenario of ['setup','server']){
   await writeFile(cli,`if(${JSON.stringify(scenario)}==='setup'||!process.argv.includes('--help')){process.stderr.write(${JSON.stringify(payload.slice(0,30))});setTimeout(()=>{process.stderr.write(${JSON.stringify(payload.slice(30))});process.exit(1)},20)}`);
   const result=await run(path.join(root,'scripts/verify-native.mjs'),{DSH_TEST_RUNTIME:runtime});
   assert.notEqual(result.code,0,'host fixture must fail');safe(result.output,scenario+' console');
   assert.ok(result.output.includes('Error'),'failure diagnostic preserved');
  }
  console.log('PASS: navigation, browser console/page errors, setup and host exit logs are redacted.');
 }finally{if(server)await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
