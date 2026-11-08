// Prices verified 2026-11-06. No retroactive guess outside this bounded snapshot.
export const PRICE_SOURCE = 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/';
export const PRICE_FROM = Date.parse('2026-11-06T00:00:00+08:00');
export const PRICE_UNTIL = Date.parse('2026-12-06T00:00:00+08:00');
const FLASH = new Set(['deepseek-flash','deepseek-v4-flash','deepseek-v4-flash-vision-exp']);
const OFFICIAL = new Set(['deepseek-official','deepseek-account']);
export const initialCost = () => ({low:0,high:0,priced:0,missing:0,route:null,started:0,last:null});

function rateFor(route, time) {
  if (!route || !OFFICIAL.has(route.provider) || time < PRICE_FROM || time >= PRICE_UNTIL) return null;
  const rate = FLASH.has(route.model) ? [1,0.02,4] : route.model === 'deepseek-v4-pro' ? [4.5,0.15,13.5] : null;
  if (!rate) return null;
  // During potential peak hours holidays are unknown: report a range, never assert a tariff.
  const beijing = new Date(time + 8*3600_000);
  const day=beijing.getUTCDay(), hour=beijing.getUTCHours();
  const possiblePeak=day>=1&&day<=5&&((hour>=9&&hour<12)||(hour>=14&&hour<18));
  return {rate, multiplier:possiblePeak?2:1};
}
function usageOf(event) {
  if (event.data.usage) return event.data.usage;
  const records=event.data.stream??[];
  for(let i=records.length-1;i>=0;i--) if(records[i].type==='chunk'&&records[i].chunk?.type==='usage') return records[i].chunk.usage;
  return null;
}
function charge(route,time,usage) {
  const rates=rateFor(route,time);
  const unknown={low:0,high:0,priced:0,missing:1};
  if(!rates||!usage) return unknown;
  const buckets=[usage.inputTokens,usage.cacheReadTokens??0,usage.outputTokens,usage.cacheWriteTokens??0];
  if(buckets.some(x=>!Number.isSafeInteger(x)||x<0)||buckets[3]!==0) return unknown;
  const low=(buckets[0]*rates.rate[0]+buckets[1]*rates.rate[1]+buckets[2]*rates.rate[2])/1e6;
  return {low,high:low*rates.multiplier,priced:1,missing:0};
}
export function foldCost(state,event) {
  const d=event.data??{};
  if(event.type==='request/header') {
    const c=d.header?.config;
    return {...state,route:c?.provider&&c?.model?{provider:c.provider,model:c.model}:null};
  }
  if(event.type==='request/context') return {...state,route:d.provider&&d.model?{provider:d.provider,model:d.model}:null};
  if(event.type==='step/start'||event.type==='llm/retry-started') return {...state,started:event.time,last:null};
  if(event.type!=='assistant/message'&&event.type!=='assistant/attempt') return state;
  const source=d.message?.source;
  const route=source?.provider&&source?.model?source:state.route;
  const next=charge(route,state.started||event.time,usageOf(event));
  const same=state.last?.turn===d.turn&&state.last?.step===d.step;
  const previous=same?state.last:null;
  const result={...state,last:{turn:d.turn??0,step:d.step??0,...next}};
  for(const key of ['low','high','priced','missing']) result[key]=Math.max(0,state[key]-(previous?.[key]??0)+next[key]);
  return result;
}
export const costView = state => ({low:state.low,high:state.high,priced:state.priced,missing:state.missing,priceFrom:PRICE_FROM,priceUntil:PRICE_UNTIL});
