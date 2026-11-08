// Test-only offline provider and account. Never included in the installable package.
import {verifyReplay} from './replay-fixtures.mjs';
import {pathToFileURL} from 'node:url';
import {readFile} from 'node:fs/promises';
const runtime=process.env.DSH_TEST_RUNTIME;
if(!runtime||!process.env.DSH_HOME?.startsWith('/private/tmp/dsh-skin-'))throw new Error('Fixture requires an isolated DSH_HOME');
const {LlmAdapter}=await import(pathToFileURL(runtime+'/node_modules/@deepseek-ai/dsh-llm/lib/index.js').href);
const controlPath=process.env.DSH_TEST_CONTROL;
async function control(){try{return JSON.parse(await readFile(controlPath,'utf8'));}catch{return {};}}
export const inject=['llm','deepseekAccount','sessions','sessionProjections'];
export function apply(ctx){
  ctx.effect(()=>{const timer=setTimeout(()=>verifyReplay(ctx,process.env.DSH_TEST_REPORT).catch(e=>console.error('Replay fixture failed',e)),700);return()=>clearTimeout(timer);},'fixture: native replay');
  class OfflineAdapter extends LlmAdapter{
    providerInfo(id){return {id,name:id==='deepseek-account'?'测试登录账户':id==='deepseek-official'?'测试 API':'测试未知来源'};}
    async listModels(provider){return ['deepseek-flash','deepseek-v4-pro'].map(id=>({provider,id,name:id==='deepseek-flash'?'Flash 测试模型':'Pro 测试模型',context:{contextWindow:4000000},defaultMaxTokens:8192}));}
    async resolveModel(provider,id){return {provider,id,name:id,context:{contextWindow:4000000},defaultMaxTokens:8192};}
    async *stream(){
      const c=await control();
      yield {type:'block-start',index:0,blockType:'text'};
      yield {type:'text-delta',index:0,text:'竹影只留在对话背景里，费用栏保持紧凑。\n\n这是离线验收回复，没有调用付费模型。'};
      if(!c.missingUsage)yield {type:'usage',usage:{inputTokens:1000000,cacheReadTokens:1000000,outputTokens:500000,totalTokens:2500000}};
      yield {type:'finish',reason:{kind:'stop'}};
    }
  }
  ctx.llm.registerAdapter(['deepseek-official','deepseek-account','offline-other'],new OfflineAdapter());
  const account=ctx.deepseekAccount;
  const originals={getState:account.getState,getBalance:account.getBalance};
  account.getState=async()=>({...await originals.getState.call(account),status:(await control()).signedOut?'signed-out':'credential-stored'});
  account.getBalance=async()=>{const c=await control();if(c.delay)await new Promise(r=>setTimeout(r,c.delay));return c.failed?{status:'failed'}:{status:'ready',value:[{currency:'CNY',balance:c.balance??'128.60'}],bonusWallets:[{currency:'CNY',balance:'2.00'}]};};
  ctx.effect(()=>()=>Object.assign(account,originals),'fixture: restore account methods');
}
