const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {redact,sanitize}=require('../scripts/redact-log.cjs');
const out=path.join(__dirname,'../artifacts');
const control=process.env.DSH_TEST_CONTROL;
(async()=>{
 if(!process.env.DSH_TEST_URL||!control?.startsWith('/private/tmp/dsh-skin-'))throw new Error('Use the isolated fixture runtime');
 const browser=await chromium.launch({headless:true,executablePath:process.env.PREVIEW_CHROMIUM});
 const checks=[],errors=[];let page;
 const note=(name,details={})=>checks.push({name,pass:true,...details});
 const setControl=v=>fs.writeFile(control,JSON.stringify(v));
 try{
  await setControl({});
  page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
  page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(redact(e.message)));
  page.on('console',m=>{if(m.type()==='error')errors.push(redact(m.text()).slice(0,500));});
  await page.goto(process.env.DSH_TEST_URL);
  await page.locator('.dsh-ws-finance').waitFor();
  if(await page.getByRole('button',{name:'Continue',exact:true}).count())await page.getByRole('button',{name:'Continue',exact:true}).click();
  const choose=async(index,model='Flash')=>{
   await page.getByRole('button',{name:/^Select model/}).click();
   await page.getByRole('menuitem',{name:/^Model/}).click();
   await page.getByRole('menuitemradio',{name:model+' 测试模型',exact:true}).nth(index).click();
  };
  const waitCost=async expected=>page.waitForFunction(v=>document.querySelector('[data-ws-cost]')?.textContent===v,expected);
  const waitBalance=async expected=>page.waitForFunction(v=>document.querySelector('[data-ws-balance]')?.textContent===v,expected);
  const send=async text=>{await page.locator('[data-composer-input]').fill(text);await page.getByRole('button',{name:'Send message',exact:true}).click();};
  const settings=async()=>{await page.getByRole('button',{name:'Account menu',exact:true}).click();await page.getByRole('menuitem',{name:/^Settings/}).click();await page.getByText('General',{exact:true}).click();await page.getByLabel('启用皮肤',{exact:true}).waitFor();};
  const closeSettings=async()=>page.getByRole('button',{name:'Close',exact:true}).click();
  await choose(0);await waitBalance('¥128.60 · 赠金 ¥2.00');await waitCost('¥0.00');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base')),'#f3f1e9');
  note('native-load-and-selected-account-balance');
  await send('帮我整理今天的工作。');await waitCost('¥3.02');note('native-offline-turn-updates-cost');
  await choose(0,'Pro');await waitCost('¥3.02');await send('继续整理下一项。');await waitCost('¥14.42');note('mixed-model-historical-cost-not-repriced');
  const motionSample=()=>page.locator('.dsh-ws-bamboo [data-ws-sway]').evaluateAll(nodes=>nodes.map(el=>({kind:el.dataset.wsSway,transform:getComputedStyle(el).transform,state:getComputedStyle(el).animationPlayState,name:getComputedStyle(el).animationName})));
  await page.locator('.dsh-ws-bamboo').waitFor();
  assert.equal(await page.locator('[data-conversation-content] > .dsh-ws-bamboo').count(),1);
  assert.equal(await page.locator('.dsh-ws-bamboo').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  const motionBefore=await motionSample();await page.screenshot({path:path.join(out,'bamboo-motion-before.png')});
  await page.waitForTimeout(1500);
  const motionAfter=await motionSample();await page.screenshot({path:path.join(out,'bamboo-motion-after.png')});
  for(const kind of ['stem','branch','leaf'])assert.ok(motionBefore.some((item,i)=>item.kind===kind&&item.transform!==motionAfter[i].transform),kind+' must move independently');
  assert.ok(new Set(motionAfter.filter(x=>x.kind==='branch').map(x=>x.transform)).size>1);
  await fs.writeFile(path.join(out,'bamboo-motion.json'),JSON.stringify({intervalMs:1500,before:motionBefore,after:motionAfter},null,2));
  note('layered-bamboo-stems-branches-leaves-move');
  await page.getByRole('button',{name:'暂停竹影',exact:true}).click();
  // CSS pause is committed on the next animation frame; wait for its ready promise.
  await page.locator('.dsh-ws-bamboo').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(animation=>animation.ready)));
  const paused=await motionSample();assert.ok(paused.every(x=>x.state==='paused'));
  await page.waitForTimeout(500);assert.deepEqual(await motionSample(),paused);note('pause-freezes-all-bamboo-layers');
  await page.reload();await waitCost('¥14.42');await page.getByRole('button',{name:'播放竹影',exact:true}).waitFor();note('session-projection-and-motion-restored-after-reload');
  await page.getByRole('button',{name:'播放竹影',exact:true}).click();
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.ok((await motionSample()).every(x=>x.name==='none'));
  assert.equal(await page.getByRole('button',{name:'暂停竹影',exact:true}).isVisible(),false);
  await page.emulateMedia({reducedMotion:'no-preference'});note('system-reduced-motion');
  await choose(2);await waitBalance('暂未支持');await send('离线未知来源测试。');await waitCost('¥14.42');await page.getByText('部分模型估算',{exact:true}).waitFor();
  await page.getByText('部分模型估算',{exact:true}).click();await page.getByText(/已计 2 次；1 次/).waitFor();await page.getByText('部分模型估算',{exact:true}).click();note('unknown-provider-excluded-and-disclosed');
  await choose(0);await waitBalance('¥128.60 · 赠金 ¥2.00');await setControl({failed:true});await page.getByRole('button',{name:'刷新余额',exact:true}).click();await waitBalance('暂不可用');
  await setControl({balance:'73.21'});await page.getByRole('button',{name:'刷新余额',exact:true}).click();await waitBalance('¥73.21 · 赠金 ¥2.00');note('failed-balance-cleared-and-refresh-recovers');
  await setControl({delay:1800,balance:'999.00'});await page.getByRole('button',{name:'刷新余额',exact:true}).click();await choose(1);await waitBalance('暂未支持');await page.waitForTimeout(2100);await waitBalance('暂未支持');note('late-account-result-not-shown-for-api-source');
  await setControl({signedOut:true});await choose(0);await waitBalance('暂不可用');note('signed-out-balance-is-not-zero');
  await setControl({});await page.getByRole('button',{name:'刷新余额',exact:true}).click();await waitBalance('¥128.60 · 赠金 ¥2.00');
  await settings();await page.getByRole('button',{name:'Dark',exact:true}).click();await closeSettings();
  await page.waitForFunction(()=>getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base')==='#202821');
  await page.screenshot({path:path.join(out,'native-dark.png')});note('native-dark-palette');
  await settings();await page.getByRole('button',{name:'Light',exact:true}).click();await page.getByRole('button',{name:'恢复默认外观',exact:true}).click();
  assert.equal(await page.locator('body').getAttribute('data-ws-skin'),null);assert.equal(await page.locator('.dsh-ws-finance').count(),0);assert.equal(await page.locator('.dsh-ws-bamboo').count(),0);note('restore-default-removes-skin-and-fees');
  await page.getByLabel('启用皮肤',{exact:true}).check();await page.getByLabel('淡竹影背景',{exact:true}).uncheck();
  assert.equal(await page.locator('body').getAttribute('data-ws-bamboo'),null);await page.getByLabel('淡竹影背景',{exact:true}).check();await closeSettings();
  for(const [width,height,name] of [[1440,960,'native-desktop.png'],[1024,900,'native-1024.png'],[390,844,'native-mobile.png']]){
   await page.setViewportSize({width,height});await page.waitForTimeout(600);
   if(width<760&&await page.getByRole('button',{name:'Collapse sidebar',exact:true}).isVisible()){await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();await page.waitForTimeout(400);}
   const layout=await page.evaluate(()=>{const el=document.querySelector('.dsh-ws-finance'),f=el.getBoundingClientRect(),b=document.querySelector('.dsh-ws-bamboo').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,feeWidth:f.width,feeHeight:f.height,feeRight:f.right,width:innerWidth,bambooRight:b.right,background:getComputedStyle(el).backgroundColor,bambooColor:getComputedStyle(document.querySelector('.dsh-ws-bamboo')).color};});
   assert.equal(layout.overflow,false);assert.ok(layout.feeRight<=width+1);
   if(width===1440){assert.ok(layout.feeHeight<=38);assert.ok(layout.feeWidth<500);assert.ok(Math.abs(layout.bambooRight-layout.feeRight)<40);assert.equal(layout.background,'rgba(228, 239, 226, 0.48)');assert.equal(layout.bambooColor,'rgb(35, 136, 71)');}
   await page.screenshot({path:path.join(out,name),fullPage:true});note('viewport-'+width,layout);
  }
  assert.deepEqual(errors,[]);note('no-browser-errors');
 }catch(e){checks.push({name:'failure',pass:false,error:redact(e.stack)});if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});process.exitCode=1;}
 finally{await setControl({});await browser.close();await fs.writeFile(path.join(out,'e2e.json'),JSON.stringify(sanitize({runtime:'DSH 0.2.2-rc.1, isolated native Web UI',fixture:'offline model and fake account only; no paid calls',checks,errors,pass:checks.every(c=>c.pass)}),null,2)+'\n');console.log(JSON.stringify(sanitize({checks,errors}),null,2));}
})().catch(e=>{console.error(redact(e.stack||e));process.exitCode=1;});
