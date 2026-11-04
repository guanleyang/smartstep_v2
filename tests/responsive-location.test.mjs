import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const require=createRequire('C:/Users/guanl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
let state='confirmed',requests=0;const confirmedAt=Date.now();
await page.route('https://smartstep-gps.guanleyang007.workers.dev/v2/**',async route=>{
 requests++;
 const data={device_id:'shoe_001',source:'wifi',zone_name:'TR63 门口',wifi_status:'confirmed',wifi_age_ms:0,wifi_confirmed_at:Date.now(),recorded_at:Date.now(),received_at:Date.now(),stale:false};
 if(state==='held')Object.assign(data,{wifi_status:'held',wifi_age_ms:30000,wifi_confirmed_at:confirmedAt});
 if(state==='new')data.zone_name='TR65 门口';
 if(state==='gps')Object.assign(data,{source:'gps',latitude:1.35,longitude:103.68,pdop:2});
 if(state==='waiting')Object.assign(data,{source:'unavailable',status_reason:'waiting_wifi'});
 if(state==='lte')Object.assign(data,{source:'lte',latitude:1.35,longitude:103.68,accuracy_m:550});
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
});
try{
 await page.goto('http://127.0.0.1:5174/smartstep_v2/');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByLabel('查看凭证',{exact:true}).fill('r'.repeat(64));await page.getByRole('button',{name:'连接我的 SmartStep'}).click();
 await page.getByText('设备数据已连接',{exact:true}).waitFor();await page.getByRole('button',{name:'Home',exact:true}).click();
 await page.getByRole('heading',{name:'TR63 门口',exact:true}).waitFor();
 const before=requests;state='held';await page.getByText('暂未匹配到新位置，保留上次确认的室内位置。',{exact:true}).waitFor({timeout:4500});assert.ok(requests>before);
 assert.ok((await page.getByText(/位置确认时间/).innerText()).includes(new Date(confirmedAt).toLocaleString()));
 await page.screenshot({path:'../../outputs/SmartStep-held-wifi-mobile.png',fullPage:true});
 state='new';await page.getByRole('heading',{name:'TR65 门口',exact:true}).waitFor({timeout:4500});assert.equal(await page.getByText('暂未匹配到新位置，保留上次确认的室内位置。',{exact:true}).count(),0);
 state='gps';await page.locator('.leaflet-container').waitFor({timeout:4500});
 state='waiting';await page.getByText('正在寻找室内位置，连续2分钟未匹配后尝试LTE。',{exact:true}).waitFor({timeout:4500});assert.equal(await page.locator('.leaflet-container').count(),0);
 state='lte';await page.getByText('范围半径约 550 米',{exact:true}).waitFor({timeout:4500});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 console.log('PASS automatic 2s polling, held timestamp, immediate new point display, GPS map, waiting and LTE views.');
}finally{await browser.close();}
