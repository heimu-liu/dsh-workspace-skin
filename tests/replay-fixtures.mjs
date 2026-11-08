// Integration fixtures enter the actual DSH SessionStore and projection registry.
// No direct calls into the implementation under test.
import {writeFile} from 'node:fs/promises';
export async function verifyReplay(ctx,output){
  const cases=[];
  const stamp=Date.parse('2026-11-07T00:30:00+08:00');
  const usage={inputTokens:1000000,cacheReadTokens:1000000,outputTokens:500000};
  const header=model=>({type:'request/header',data:{header:{config:{provider:'deepseek-official',model}},reason:'initial'}});
  const start={type:'step/start',data:{turn:1,step:1}};
  const sample=(data={})=>({type:'assistant/attempt',data:{turn:1,step:1,stream:[{type:'chunk',chunk:{type:'usage',usage}}],...data}});
  const retry={type:'llm/retry-started',data:{turn:1,step:1}};
  function check(name,events,expected,time=stamp){
    const session=ctx.sessions.create('skin-replay-'+name,{meta:{cwd:process.env.DSH_TEST_WORKSPACE??'/private/tmp/dsh-skin-test-workspace'},seed:events.map((e,seq)=>({...e,seq,time:time+seq}))});
    const value=ctx.sessionProjections.snapshot(session).values.workspaceSkinCost;
    const pass=Object.entries(expected).every(([k,v])=>Math.abs(value?.[k]-v)<1e-7);
    cases.push({name,expected,actual:value,pass});
  }
  check('cache-and-output',[header('deepseek-flash'),start,sample()],{low:3.02,high:3.02,priced:1,missing:0});
  check('settlement-replacement',[header('deepseek-flash'),start,sample(),sample()],{low:3.02,priced:1});
  check('paid-retry',[header('deepseek-flash'),start,sample(),retry,sample()],{low:6.04,priced:2});
  check('mixed-models',[header('deepseek-flash'),start,sample(),{type:'step/start',data:{turn:1,step:2}},header('deepseek-v4-pro'),sample({step:2})],{low:14.42,priced:2});
  check('unknown-model',[header('unknown'),start,sample()],{low:0,priced:0,missing:1});
  check('missing-usage',[header('deepseek-flash'),start,sample({stream:[]})],{low:0,priced:0,missing:1});
  check('before-price-snapshot',[header('deepseek-flash'),start,sample()],{priced:0,missing:1},Date.parse('2026-11-05T12:00:00+08:00'));
  check('expired-price-snapshot',[header('deepseek-flash'),start,sample()],{priced:0,missing:1},Date.parse('2026-12-07T12:00:00+08:00'));
  check('potential-peak',[header('deepseek-flash'),start,sample()],{low:3.02,high:6.04},Date.parse('2026-11-06T10:00:00+08:00'));
  check('missing-route',[start,sample()],{priced:0,missing:1});
  await writeFile(output,JSON.stringify({kind:'native DSH SessionStore + projection replay integration',cases,pass:cases.every(x=>x.pass)},null,2)+'\n');
}
