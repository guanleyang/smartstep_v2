import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/guanl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
let mode='legacy';const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://smartstep-gps.guanleyang007.workers.dev/v2/**',async route=>{
 if(mode==='401'){await route.fulfill({status:401,body:'{}'});return;}
 const data={device_id:'shoe_001',source:'wifi',zone_name:"Gly's Room",recorded_at:Date.now(),received_at:Date.now(),stale:false};
 if(mode!=='legacy')Object.assign(data,{battery_percent:0,battery_voltage_v:3.612,battery_current_ma:mode==='gps'?53.3:mode==='idle'?0:-125.6,diagnostics:{uptime_ms:120000,previous_upload_http:715,previous_upload_error:'http_status',wifi_scan_count:0}});
 if(mode==='stale'){data.recorded_at-=180000;data.received_at-=180000;data.stale=true;}
 if(mode==='gps'){data.source='gps';data.latitude=1.35;data.longitude=103.68;data.pdop=2.1;}
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
});
try{
 await page.goto(process.env.STATUS_TEST_URL||'http://127.0.0.1:5174/smartstep_v2/');
 await page.getByRole('button',{name:'远程状态',exact:true}).click();
 const panel=page.getByRole('region',{name:'远程状态',exact:true});
 await panel.getByText('尚未连接',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Go back',exact:true}).click();
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByLabel('查看凭证',{exact:true}).fill('r'.repeat(64));
 await page.getByRole('button',{name:'连接我的 SmartStep'}).click();
 await page.getByText('设备数据已连接',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Home',exact:true}).click();
 await page.getByRole('button',{name:'远程状态',exact:true}).click();
 await panel.getByText("Gly's Room",{exact:true}).waitFor();
 assert.ok(await panel.getByText('未上报',{exact:true}).count()>=4);
 async function refresh(next){mode=next;await panel.getByRole('button',{name:'刷新状态',exact:true}).click();}
 await refresh('telemetry');await panel.getByText('3.612 V',{exact:true}).waitFor();await panel.getByText('0.0%',{exact:true}).waitFor();await panel.getByText('715',{exact:true}).waitFor();await panel.getByText('0 个',{exact:true}).waitFor();
 await panel.getByText('-125.6 mA',{exact:true}).waitFor();await panel.getByText('净充电',{exact:true}).waitFor();
 await refresh('idle');await panel.getByText('0.0 mA',{exact:true}).waitFor();await panel.getByText('净电流接近零',{exact:true}).waitFor();
 await refresh('gps');await panel.getByText('GPS',{exact:true}).waitFor();await panel.getByText('2.10',{exact:true}).waitFor();
 await panel.getByText('+53.3 mA',{exact:true}).waitFor();await panel.getByText('净放电',{exact:true}).waitFor();
 await refresh('stale');await panel.getByText(/超过2分钟未收到新数据/).waitFor();
 await panel.getByText('上次上报 · 净充电',{exact:true}).waitFor();
 await refresh('401');await panel.getByRole('alert').filter({hasText:'查看凭证不正确'}).waitFor();assert.equal(await panel.getByText('3.612 V',{exact:true}).count(),1);
 await refresh('telemetry');await panel.getByText('设备数据已连接',{exact:true}).waitFor();
 assert.equal(await panel.getByRole('alert').count(),0);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'../../outputs/SmartStep-remote-status-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'../../outputs/SmartStep-remote-status-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS legacy/empty, telemetry zero values, GPS PDOP, stale data, read error, recovery, responsive layout.');
}finally{await browser.close();}
