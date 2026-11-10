import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const require=createRequire('C:/Users/guanl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
await context.grantPermissions(['notifications'],{origin:new URL(process.env.SMARTSTEP_TEST_URL || 'http://127.0.0.1:5174').origin});
await context.addInitScript(()=>{window.__systemAlerts=[];if('ServiceWorkerRegistration' in window)ServiceWorkerRegistration.prototype.showNotification=async function(title,options){window.__systemAlerts.push({title,options});};});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
let mode='neutral';
await page.route('https://smartstep-gps.guanleyang007.workers.dev/v2/**',async route=>{
 const data={device_id:'shoe_001',source:'wifi',zone_id:'TR62_inside',zone_name:'TR62 教室内',wifi_status:'confirmed',wifi_confirmed_at:Date.now(),wifi_age_ms:0,recorded_at:Date.now(),received_at:Date.now(),stale:false};
 if(mode==='garage')Object.assign(data,{zone_id:'Garage_EEE',zone_name:'Garage EEE'});
 if(['canteen','held'].includes(mode))Object.assign(data,{zone_id:'Canteen_B_South_Spine',zone_name:'Canteen B South Spine'});
 if(mode==='held')Object.assign(data,{wifi_status:'held',wifi_confirmed_at:Date.now()-30000,wifi_age_ms:30000});
 if(['gps','outside','lte'].includes(mode))Object.assign(data,{source:mode==='lte'?'lte':'gps',latitude:mode==='outside'?1.343:1.341917,longitude:103.680252,pdop:2,accuracy_m:550});
 if(mode==='stale')Object.assign(data,{zone_id:'Garage_EEE',zone_name:'Garage EEE',recorded_at:Date.now()-180000,received_at:Date.now()-180000,stale:true});
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
});
const systemCount=()=>page.evaluate(()=>window.__systemAlerts.length);
async function closeToast(){const button=page.getByRole('button',{name:'关闭危险区提醒',exact:true});if(await button.count())await button.click();}
async function query(next){mode=next;await Promise.all([page.waitForResponse(r=>r.url().includes('/v2/')&&r.status()===200),page.getByRole('button',{name:'刷新当前位置',exact:true}).click()]);}
try{
 await page.goto((process.env.SMARTSTEP_TEST_URL || 'http://127.0.0.1:5174/smartstep_v2/'));
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByLabel('查看凭证',{exact:true}).fill('r'.repeat(64));await page.getByRole('button',{name:'连接我的 SmartStep'}).click();await page.getByText('设备数据已连接',{exact:true}).waitFor();
 await page.getByRole('button',{name:'通知',exact:true}).click();await page.getByRole('button',{name:'开启系统提醒',exact:true}).click();await page.getByText('已开启页面运行期间的系统提醒。',{exact:true}).waitFor();
 await page.getByRole('button',{name:'首页',exact:true}).click();assert.equal(await page.getByLabel('危险区状态',{exact:true}).count(),0);
 mode='garage';await page.getByRole('alert').filter({hasText:'已进入 Garage EEE'}).waitFor();assert.equal(await page.getByLabel('危险区状态',{exact:true}).count(),1);
 await page.waitForFunction(()=>window.__systemAlerts.length===1);await closeToast();await page.waitForTimeout(4300);assert.equal(await systemCount(),1);
 await query('held');await page.getByText('暂未匹配到新位置，保留上次确认的室内位置。',{exact:true}).waitFor();assert.equal(await systemCount(),1);
 await query('canteen');await page.getByRole('alert').filter({hasText:'已进入 Canteen B South Spine'}).waitFor();await page.waitForFunction(()=>window.__systemAlerts.length===2);
 await page.screenshot({path:'../../outputs/SmartStep-danger-indoor-mobile.png',fullPage:true});await closeToast();
 await query('gps');await page.getByRole('alert').filter({hasText:'已进入 室外危险区'}).waitFor();await page.locator('.danger-geofence').waitFor();await page.waitForFunction(()=>window.__systemAlerts.length===3);
 await closeToast();await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>document.querySelector("main > .min-h-dvh").getBoundingClientRect().left>=75);await page.screenshot({path:'../../outputs/SmartStep-danger-outdoor-desktop.png',fullPage:true});
 await query('outside');await page.getByLabel('危险区状态',{exact:true}).waitFor({state:'detached'});
 await query('gps');await page.getByRole('alert').filter({hasText:'已进入 室外危险区'}).waitFor();await page.waitForFunction(()=>window.__systemAlerts.length===4);await closeToast();
 await query('lte');await page.getByText('范围半径约 550 米',{exact:true}).waitFor();assert.equal(await page.getByLabel('危险区状态',{exact:true}).count(),0);assert.equal(await systemCount(),4);
 await query('stale');await page.getByText('最后已知位置，当前数据已过期或连接中断。',{exact:true}).waitFor();assert.equal(await systemCount(),4);
 await page.getByRole('button',{name:'通知',exact:true}).click();assert.equal(await page.getByRole('button').filter({hasText:/已进入/}).count(),4);
 await page.getByRole('button',{name:'全部已读',exact:true}).click();assert.equal(await page.getByText('未读',{exact:true}).count(),0);
 await page.screenshot({path:'../../outputs/SmartStep-danger-alerts-desktop.png',fullPage:true});
 await page.reload();await page.getByRole('button',{name:'通知',exact:true}).click();assert.equal(await page.getByRole('button').filter({hasText:/已进入/}).count(),4);
 assert.deepEqual(errors,[]);console.log('PASS danger badges, two indoor zones, outdoor map, permission/worker notification dispatch, deduplication, held/stale/LTE suppression, reentry and persisted read history.');
 const denied=await browser.newContext({viewport:{width:390,height:844}});await denied.addInitScript(()=>{Notification.requestPermission=async()=>'denied';});const deniedPage=await denied.newPage();
 await deniedPage.goto((process.env.SMARTSTEP_TEST_URL || 'http://127.0.0.1:5174/smartstep_v2/'));await deniedPage.getByRole('button',{name:'通知',exact:true}).click();await deniedPage.getByRole('button',{name:'开启系统提醒',exact:true}).click();await deniedPage.getByText('系统提醒未获允许，请在浏览器设置中修改。',{exact:true}).waitFor();await denied.close();
 console.log('PASS denied system permission keeps in-app alerts available.');
}catch(error){console.log((await page.locator("body").innerText()).slice(0,2200));console.log(errors);throw error;}finally{await browser.close();}
