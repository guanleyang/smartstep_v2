import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const require=createRequire('C:/Users/guanl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});let source='wifi';const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://smartstep-gps.guanleyang007.workers.dev/v2/**',async route=>{
 const data={device_id:'shoe_001',source,recorded_at:Date.now(),received_at:Date.now(),stale:false};
 if(source==='wifi')data.zone_name="Gly's Room";
 if(['gps','lte'].includes(source)){data.latitude=1.35;data.longitude=103.68;}
 if(source==='lte')data.accuracy_m=550;
 await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
});
try{
 await page.goto((process.env.SMARTSTEP_TEST_URL || 'http://127.0.0.1:5174/smartstep_v2/'));
 assert.equal(await page.getByText('每一步，都在视野之内。').count(),0);
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await page.getByLabel('查看凭证',{exact:true}).fill('r'.repeat(64));
 await page.getByRole('button',{name:'连接我的 SmartStep'}).click();
 await page.getByText('设备数据已连接',{exact:true}).waitFor();
 await page.getByRole('button',{name:'概览',exact:true}).click();
 await page.getByRole('heading',{name:"Gly's Room",exact:true}).waitFor();
 assert.equal(await page.locator('.leaflet-container').count(),0);
 await page.screenshot({path:'../../outputs/SmartStep-original-layout.png',fullPage:true});
 async function query(next){source=next;await page.getByRole('button',{name:'刷新当前位置',exact:true}).click();await page.getByRole('button',{name:'刷新当前位置',exact:true}).waitFor({state:'visible'});}
 await query('gps');await page.locator('.leaflet-container').waitFor();
 await query('lte');await page.getByText('显示半径 200 米',{exact:true}).waitFor();
 await query('wifi');await page.getByRole('heading',{name:"Gly's Room",exact:true}).waitFor();assert.equal(await page.locator('.leaflet-container').count(),0);
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'../../outputs/SmartStep-original-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.getByRole('button',{name:'地图',exact:true}).click();await page.getByRole('heading',{name:'位置',exact:true}).waitFor();
 assert.equal(await page.locator('.leaflet-container').count(),0);
 await page.getByRole('button',{name:'通知',exact:true}).click();await page.getByText('暂无进入危险区的通知。',{exact:true}).waitFor();
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await page.getByRole('button',{name:'断开连接',exact:true}).click();
 assert.equal(await page.getByLabel('查看凭证',{exact:true}).inputValue(),'');
 assert.deepEqual(errors,[]);console.log('PASS original navigation, live connection, GPS/LTE maps, indoor without map, mobile layout, alerts empty, disconnect.');
}catch(e){console.log((await page.locator('body').innerText()).slice(0,2500));throw e;}finally{await browser.close();}
