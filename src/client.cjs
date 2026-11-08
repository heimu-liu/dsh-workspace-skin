/* Native DSH 0.2.2-rc.1 client. Built by scripts/build.mjs into the lazy module format. */
const React = require('react');
const {createElement:h,useEffect,useState,useSyncExternalStore} = React;
const EMPTY = {getSnapshot:()=>undefined,subscribe:()=>()=>{}};
const defaults={enabled:true,bamboo:true,motion:true};
const storageKey='laishu.dsh.workspace-skin.v1';
function preferences(){
  try {const saved=JSON.parse(localStorage.getItem(storageKey));return Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,typeof saved?.[k]==='boolean'?saved[k]:v]));} catch{return {...defaults};}
}
function createPreferences(){
  let value=preferences();const listeners=new Set();
  return {getSnapshot:()=>value,subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);},set:patch=>{value={...value,...patch};try{localStorage.setItem(storageKey,JSON.stringify(value));}catch{}for(const f of listeners)f();}};
}
function useFace(face){return useSyncExternalStore(face.subscribe,face.getSnapshot,face.getSnapshot);}
const palette={
  '--dsw-alias-bg-base':['#f3f1e9','#202821'],
  '--dsw-specific-sidebar-fill':['#ebe9e1','#242f27'],
  '--dsw-specific-input-major':['#f8f6f0','#2a352d'],
  '--dsw-specific-selector':['#f8f6f0','#2a352d'],
  '--dsw-specific-bubble':['#e9e9df','#303e34'],
  '--dsw-alias-button-elevated-fill':['#f8f6f0','#2a352d'],
  '--dsw-alias-button-info-fill':['#38624a','#9fbd98'],
  '--dsw-alias-button-info-hover':['#2d523d','#b1cca9'],
  '--dsw-alias-turn-trigger-bg':['#e9e9df','#303e34'],
  '--dsw-alias-turn-trigger-bg-hover':['#e1e5d7','#394a3d'],
  '--dsw-alias-state-business-secondary':['#5b7d62','#86a880'],
  '--dsw-alias-state-business-tertiary':['#dce5d9','#3d5141'],
  '--dsw-alias-bg-layer-1':['#ebe9e1','#242f27'],
  '--dsw-alias-bg-layer-2':['#f8f6f0','#2a352d'],
  '--dsw-alias-bg-layer-3':['#e5ece3','#303e34'],
  '--dsw-alias-bg-module-platform':['#ebe9e1','#242f27'],
  '--dsw-alias-bg-overlay':['#f8f6f0','#2a352d'],
  '--dsw-alias-bg-skeleton':['#e5e7dc','#354239'],
  '--dsw-alias-label-primary':['#28352e','#e5e9de'],
  '--dsw-alias-label-primary-dimmed':['#39483f','#d1d9cd'],
  '--dsw-alias-label-primary-bluish':['#28352e','#e5e9de'],
  '--dsw-alias-label-secondary':['#58665d','#b7c3b6'],
  '--dsw-alias-label-tertiary':['#58665d','#b7c3b6'],
  '--dsw-alias-label-caption':['#626c61','#acb9a9'],
  '--dsw-alias-label-primary-foreground':['#f8f6f0','#202821'],
  '--dsw-alias-border-l1':['#d6d8cc','#3d4c40'],
  '--dsw-alias-border-l2':['#d6d8cc','#3d4c40'],
  '--dsw-alias-border-l3':['#c9cebf','#495b4c'],
  '--dsw-alias-border-l4':['#bdc9b8','#5b6c5c'],
  '--dsw-alias-state-business-primary':['#38624a','#9fbd98'],
  '--dsw-alias-button-primary-fill':['#38624a','#9fbd98'],
  '--dsw-alias-button-primary-hover':['#2d523d','#b1cca9'],
  '--dsw-alias-button-primary-dimmed':['#e5ece3','#344a3a'],
  '--dsw-alias-interactive-bg-hover':['#e5e8dc','#344237'],
  '--dsw-alias-interactive-bg-active':['#dce5d9','#3d5141'],
  '--dsw-alias-interactive-bg-hover-accent':['#dce5d9','#3d5141'],
  '--dsw-alias-settings-card-fill':['#f8f6f0','#2a352d'],
  '--dsw-alias-settings-card-stroke':['#d6d8cc','#3d4c40'],
  '--dsw-specific-menu':['#f8f6f0','#2a352d'],
  '--dsw-menu-surface-fill':['#f8f6f0','#2a352d'],
  '--dsw-focus-ring-color':['#38624a','#9fbd98']
};
const tokens=Object.fromEntries(Object.entries(palette).map(([k,[light,dark]])=>[k,{light,dark}]));
const numeric=x=>typeof x==='string'||typeof x==='number'?Number(x):NaN;
function money(n,currency='CNY'){
  return new Intl.NumberFormat('zh-CN',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
}
function walletsText(wallets){
  if(!Array.isArray(wallets)||wallets.length===0)return null;
  const sums=new Map();
  for(const w of wallets){const value=numeric(w.balance);if(!['CNY','USD'].includes(w.currency)||!Number.isFinite(value))return null;sums.set(w.currency,(sums.get(w.currency)??0)+value);}
  return [...sums].map(([currency,value])=>money(value,currency)).join(' + ');
}
function balanceText(result){
  if(result?.status!=='ready')return null;
  const normal=walletsText(result.value),bonus=walletsText(result.bonusWallets);
  if(!normal&&!bonus)return null;
  return [normal,bonus&&result.bonusWallets.some(w=>numeric(w.balance)!==0)?'赠金 '+bonus:null].filter(Boolean).join(' · ');
}
function costText(value){
  if(!value)return {amount:'统计中…',status:'模型估算'};
  if(value.priced===0&&value.missing>0)return {amount:'暂不可估',status:'数据不完整'};
  const format=n=>n>0&&n<0.01?'< ¥0.01':money(n);
  const amount=Math.abs(value.high-value.low)<0.000001?format(value.low):`${format(value.low)}–${format(value.high)}`;
  return {amount,status:value.missing>0?'部分模型估算':'模型估算'};
}
function Finance({directory,projection,load,readBalance,prefs,accountEpoch}){
  const settings=useFace(prefs),models=useFace(directory),cost=useFace(projection);
  const epoch=useFace(accountEpoch);
  const provider=models?.current?.provider,model=models?.current?.model;
  const source=provider==='deepseek-account'?'DeepSeek 登录账户':provider==='deepseek-official'?'DeepSeek API':models?.groups?.find(g=>g.id===provider)?.name??provider??'尚未选择模型';
  const [balance,setBalance]=useState({provider:null,text:null,loading:false});
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    let active=true,pending=false;
    setBalance({provider,text:null,loading:provider==='deepseek-account'});
    if(!settings.enabled||provider!=='deepseek-account')return()=>{active=false;};
    async function read(){
      if(pending||document.visibilityState==='hidden')return;
      pending=true;
      try{const value=await readBalance();if(active)setBalance({provider,text:balanceText(value),loading:false});}
      catch{if(active)setBalance({provider,text:null,loading:false});}
      finally{pending=false;}
    }
    read();const timer=setInterval(read,60000);
    window.addEventListener('focus',read);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',read);};
  },[provider,model,readBalance,refresh,settings.enabled,epoch]);
  if(!settings.enabled)return null;
  const total=costText(cost);
  const current=balance.provider===provider?balance:null;
  const balanceValue=provider==='deepseek-account'?(current?.loading?'读取中…':current?.text??'暂不可用'):'暂未支持';
  return h('div',{className:'dsh-ws-finance','data-workspace-skin':'finance',role:'group','aria-label':'余额与本对话模型费用'},
    h('span',{className:'dsh-ws-fee',title:source,'aria-label':source+'余额'},h('span',null,'余额'),h('strong',{'data-ws-balance':true},balanceValue)),
    h('span',{className:'dsh-ws-fee'},h('span',null,'本对话累计'),h('strong',{'data-ws-cost':true},total.amount)),
    h('details',{className:'dsh-ws-details'},h('summary',null,total.status),
      h('div',{className:'dsh-ws-detail-body'},
        h('p',null,'扣费来源：'+source),
        h('p',null,'按每次调用的模型与用量估算，包含已记录用量的重试。仅统计主对话模型，不含子任务、压缩、搜索和抓取费用。'),
        h('p',null,'使用 2026-11-06 核查的 DeepSeek API 人民币价格；登录账户也按此单价作参考估算，以实际账单为准。可能处于高峰时段时显示峰谷区间，未判定法定节假日。'),
        h('p',null,cost?`已计 ${cost.priced} 次；${cost.missing} 次缺路由、用量或适用价格。价格快照适用 11 月 6 日至 12 月 5 日，之前及之后的调用不猜价。`:'等待完整会话统计。'),
        h('a',{href:'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',target:'_blank',rel:'noreferrer'},'查看定价来源'))),
    provider==='deepseek-account'?h('button',{type:'button',className:'dsh-ws-icon-button','aria-label':'刷新余额',title:'刷新余额',onClick:()=>setRefresh(x=>x+1)},'↻'):null);
}
function Settings({prefs}){
  const state=useFace(prefs);
  return h('section',{className:'dsh-ws-settings','aria-label':'暖纸与雾绿'},h('h3',null,'暖纸与雾绿'),
    [['enabled','启用皮肤'],['bamboo','淡竹影背景'],['motion','竹影轻缓摇曳']].map(([key,label])=>h('label',{key},h('span',null,label),h('input',{type:'checkbox',checked:state[key],disabled:key!=='enabled'&&!state.enabled,onChange:e=>prefs.set({[key]:e.target.checked})}))),
    h('button',{type:'button',onClick:()=>prefs.set({...defaults,enabled:false})},'恢复默认外观'));
}
function Motion({prefs}){
  const state=useFace(prefs);
  if(!state.enabled||!state.bamboo)return null;
  return h('button',{type:'button',className:'dsh-ws-icon-button dsh-ws-motion',title:state.motion?'暂停竹影':'播放竹影','aria-label':state.motion?'暂停竹影':'播放竹影','aria-pressed':!state.motion,onClick:()=>prefs.set({motion:!state.motion})},state.motion?'Ⅱ':'▷');
}
exports.inject=['theme','slots','sessions','modelDirectories','remote','remote.session'];
exports.apply=function(ctx){
  const prefs=createPreferences();
  let epoch=0;const accountListeners=new Set();
  const accountEpoch={getSnapshot:()=>epoch,subscribe:f=>{accountListeners.add(f);return()=>accountListeners.delete(f);}};
  const changed=()=>{epoch++;for(const f of accountListeners)f();};
  ctx.inject(['remote.account'],scope=>scope.effect(()=>{
    let disposed=false;
    const stream=scope.remote.$stream({name:'workspace-skin-account',open:signal=>scope.remote.account.watch(signal),ended:()=>new Error('Account stream ended')});
    (async()=>{for await(const frame of stream){if(disposed)return;changed();frame.accept();}})().catch(()=>{if(!disposed)changed();});
    return()=>{disposed=true;return stream.dispose();};
  },'workspace-skin: account invalidation'));
  ctx.effect(()=>{
    const style=document.createElement('style');style.dataset.plugin=PLUGIN_ID;style.textContent=CSS;document.head.appendChild(style);
    let release;
    const apply=()=>{
      const p=prefs.getSnapshot();
      if(p.enabled&&!release)release=ctx.theme.overrideTokens(PLUGIN_ID,tokens);
      if(!p.enabled&&release){release();release=undefined;}
      document.body.toggleAttribute('data-ws-skin',p.enabled);
      document.body.toggleAttribute('data-ws-bamboo',p.enabled&&p.bamboo);
      document.body.toggleAttribute('data-ws-motion',p.motion);
    };
    apply();const unsubscribe=prefs.subscribe(apply);
    return()=>{unsubscribe();release?.();style.remove();for(const attr of ['data-ws-skin','data-ws-bamboo','data-ws-motion'])document.body.removeAttribute(attr);};
  },'workspace-skin: palette and background');
  ctx.effect(()=>{
    // Decorative nodes live only inside the stable conversation surface, below its content.
    // Observe route changes so a replaced conversation receives exactly one background.
    const layers=new Map();let frame=0;
    const sync=()=>{
      cancelAnimationFrame(frame);frame=0;const p=prefs.getSnapshot();
      const surfaces=new Set(p.enabled&&p.bamboo?document.querySelectorAll('[data-conversation-content]'):[]);
      for(const [surface,layer] of layers)if(!surfaces.has(surface)||!surface.contains(layer)){layer.remove();layers.delete(surface);}
      for(const surface of surfaces)if(!layers.has(surface)){
        const layer=document.createElement('div');layer.className='dsh-ws-bamboo';layer.setAttribute('aria-hidden','true');layer.inert=true;
        layer.innerHTML=BAMBOO_SVG;surface.appendChild(layer);layers.set(surface,layer);
      }
    };
    const observer=new MutationObserver(records=>{
      if(frame)return;
      const relevant=records.some(r=>r.target.matches?.('[data-conversation-content]')||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches('[data-conversation-content]')||n.querySelector('[data-conversation-content]'))));
      if(relevant)frame=requestAnimationFrame(sync);
    });
    const visibility=()=>document.body.toggleAttribute('data-ws-hidden',document.hidden);
    sync();visibility();observer.observe(document.body,{childList:true,subtree:true});
    const unsubscribe=prefs.subscribe(sync);document.addEventListener('visibilitychange',visibility);
    return()=>{observer.disconnect();cancelAnimationFrame(frame);unsubscribe();document.removeEventListener('visibilitychange',visibility);document.body.removeAttribute('data-ws-hidden');for(const layer of layers.values())layer.remove();layers.clear();};
  },'workspace-skin: layered bamboo');
  const readBalance=async()=>{
    const account=ctx.get('remote.account');
    if(!account)return null;
    const state=await account.getState();
    if(!state.ok||state.value?.status!=='credential-stored')return null;
    const result=await account.getBalance({version:'0.2.2-rc.1',locale:'zh',timezoneOffsetSeconds:-new Date().getTimezoneOffset()*60});
    return result.ok?result.value:null;
  };
  // input.dock is the native, full-width seat ABOVE the input card. composer.dock is inside it.
  ctx.slots.inject('conversation.input.dock',()=>ctx.slots.register({name:'conversation.input.dock',id:PLUGIN_ID,order:90,inject:sessionId=>{
    const directory=ctx.modelDirectories.directoryFor(sessionId);
    const projection=ctx.sessions.binding(sessionId)?.session.projections.faceOf('workspaceSkinCost')??EMPTY;
    return {directory:directory.store,projection,prefs,accountEpoch,readBalance,load:()=>directory.load().catch(()=>{})};
  }},Finance));
  ctx.slots.inject('conversation.session.header.utilities',()=>ctx.slots.register({name:'conversation.session.header.utilities',id:PLUGIN_ID,order:90,inject:()=>({prefs})},Motion));
  ctx.slots.inject('settings.general.item',()=>ctx.slots.register({name:'settings.general.item',id:PLUGIN_ID,order:95,inject:()=>({prefs})},Settings));
};
