const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
let playwright;
try { playwright = require('playwright'); } catch {
  const links = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA,'ms-playwright','.links');
  const installed = links && fs.existsSync(links) ? fs.readdirSync(links).map(file=>fs.readFileSync(path.join(links,file),'utf8').trim()).find(directory=>fs.existsSync(path.join(directory,'package.json'))) : null;
  const module = process.env.PLAYWRIGHT_MODULE || installed;
  if (!module) throw new Error('Install playwright or set PLAYWRIGHT_MODULE to the installed playwright-core directory.');
  playwright = require(module);
}
const origin = process.env.VISUAL_CHECK_URL || 'http://127.0.0.1:5173/YaqeenShop';
const output = process.env.VISUAL_CHECK_OUTPUT || path.join(require('node:os').tmpdir(), 'yaqeen-css-verification');
fs.mkdirSync(output, {recursive:true});
const baselineRef = process.env.VISUAL_CHECK_BASE_REF || 'main';
function readBaseline(file) {
  return execFileSync('git',['show',`${baselineRef}:${file}`],{encoding:'utf8',maxBuffer:10e6});
}
function expandBaseline(file, ancestors = []) {
  if(ancestors.includes(file))throw new Error(`Circular CSS import: ${file}`);
  return readBaseline(file).replace(/@import\s+(['"])([^'"]+)\1\s*;/g,(statement,quote,target)=> {
    if(/^(?:https?:|\/\/)/.test(target))return statement;
    const imported=path.posix.normalize(path.posix.join(path.posix.dirname(file),target));
    return expandBaseline(imported,[...ancestors,file]);
  });
}
// Dependencies' CSS loads before the entry module's CSS. Read the imports from
// the selected revision so comparisons also work after the stylesheet split.
const baselineFiles = ['src/App.tsx','src/main.tsx'].flatMap(file=>[...readBaseline(file).matchAll(/import\s*['"]([^'"]+\.css)['"]/g)].map(match=>path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1]))));
const baseline = baselineFiles.map(file=>expandBaseline(file)).join('\n');
// ID specificity also defeats legacy !important transitions in sidebar rules.
const stable = ':is(#visual-stability-html, html) :is(#visual-stability-body, body) * { animation: none !important; transition: none !important; caret-color: transparent !important; }';
const adminFixtures = process.env.VISUAL_CHECK_ADMIN === '1';
const modules = {
  dashboard:['Dashboard','Dashboard'], categories:['Categories','Categories'], products:['Products','ProductsAdmin'],
  inventory:['Inventory','InventoryAdmin'], resources:['Resources','ResourcesAdmin'], designs:['Designs','DesignsAdmin'],
  orders:['Orders','OrdersAdmin'], customers:['Customers','CustomersAdmin'], production:['Operations','ProductionAdmin'],
  deliveries:['Operations','FulfillmentAdmin'], payments:['Operations','FulfillmentAdmin'], inbox:['Inbox','InboxAdmin'],
  users:['UsersRoles','UsersRoles'], audit:['AuditLog','AuditLog'], website:['Website','WebsiteAdmin'],
  reports:['Reports','Reports'], settings:['Settings','SettingsAdmin'],
};
const fixtureFiles = ['css-visual-fixture.html','scripts/css-visual-fixture.tsx'];
if (adminFixtures) {
  for(const file of fixtureFiles)if(fs.existsSync(file))throw new Error(`Refusing to overwrite existing fixture file: ${file}`);
  const permissions = [...new Set(fs.readdirSync('src/admin').filter(file=>file.endsWith('.tsx')).flatMap(file=>[...fs.readFileSync(`src/admin/${file}`,'utf8').matchAll(/permissions\.includes\('([^']+)'\)/g)].map(match=>match[1])))];
  const imports = Object.entries(modules).map(([screen,[file,exportName]])=>`import {${exportName} as ${screen}} from '../src/admin/${file}';`).join('\n');
  const moduleMap = `{${Object.keys(modules).join(',')}}`;
  fs.writeFileSync(fixtureFiles[0], '<html><body><div id="root"></div><script type="module" src="/scripts/css-visual-fixture.tsx"></script></body></html>');
  fs.writeFileSync(fixtureFiles[1], `import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router-dom';import '../src/styles.css';import {styleScope} from '../src/styles/routeScope';\n${imports}\nconst screen=new URLSearchParams(location.search).get('screen')||'dashboard';const components:any=${moduleMap};const Component=components[screen];const scope=styleScope('/admin/'+(screen==='dashboard'?'':screen));document.documentElement.dataset.styleArea=scope.area;document.documentElement.dataset.styleScreen=scope.screen;createRoot(document.getElementById('root')!).render(<BrowserRouter><div className="admin"><aside className="sidebar"><div className="brand">YAQEEN</div><nav><a href="#">Dashboard</a><a href="#">Products</a></nav></aside><div className="admin-main"><main id="main"><div className="admin-route-content"><Component permissions={${JSON.stringify(permissions)}} kind={screen==='payments'?'payments':'deliveries'}/></div></main></div></div></BrowserRouter>);`);
}
const properties = ['display','position','width','height','margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left','gap','grid-template-columns','flex-direction','align-items','justify-content','font-family','font-size','font-weight','line-height','letter-spacing','color','background-color','border-top-width','border-top-color','border-radius','overflow-x','overflow-y','z-index','object-fit','opacity','transform'];
let activeBrowser;
async function capture(page) {
  return page.evaluate(properties => [...document.querySelectorAll('body *')]
    .filter(element => !['SCRIPT','STYLE','LINK'].includes(element.tagName))
    .map(element => {
      const style = getComputedStyle(element);
      return {element:element.tagName.toLowerCase() + (element.className && typeof element.className === 'string' ? '.' + element.className.trim().replace(/\s+/g,'.') : ''), values:properties.map(prop => style.getPropertyValue(prop))};
    }), properties);
}
(async () => {
  const engine = process.env.VISUAL_CHECK_BROWSER || 'chromium';
  const browser = await playwright[engine].launch({headless:true});
  activeBrowser = browser;
  const results = [];
  const routes = process.env.VISUAL_CHECK_ROUTES?.split(',') || (adminFixtures ? Object.keys(modules).flatMap(screen=>[screen,...(['categories','products','inventory','resources','designs','orders','customers','users'].includes(screen)?[screen+'-dialog']:[])]) : ['/','/shop','/cart','/checkout','/order-confirmation','/search','/about','/contact','/faq','/privacy','/terms','/under-construction','/login','/missing-page']);
  if(!adminFixtures && process.env.VISUAL_CHECK_PRODUCT === '1') {
    const discovery = await browser.newPage();
    await discovery.goto(origin+'/shop',{waitUntil:'networkidle'});
    const product=discovery.locator('a[href*="/products/"]').first();
    await product.waitFor({timeout:15000});
    const href=await product.getAttribute('href');
    routes.push(href.replace(new URL(origin).pathname,''));
    await discovery.close();
  }
  for (const width of [1440,390]) {
    const context = await browser.newContext({viewport:{width,height:900}, deviceScaleFactor:1});
    if(!adminFixtures && process.env.VISUAL_CHECK_CART === '1') {
      await context.addInitScript(()=>{
        const item={cart_id:'visual-fixture',variant_id:null,product_id:'00000000-0000-0000-0000-000000000001',slug:'visual-fixture',title:'Visual test reminder',options:'Green acrylic',image:null,price:10,quantity:2};
        localStorage.setItem('yaqeen-cart',JSON.stringify([item]));
        sessionStorage.setItem('yaqeen-order',JSON.stringify({number:'VISUAL-TEST',total:20,delivery_fee:0,fulfillment_method:'pickup',payment_method:'cash',items:[item]}));
      });
    }
    const page = await context.newPage();
    if(adminFixtures) {
      // Empty local API fixtures prevent any production reads or writes while mounting real screens.
      await page.route('**/*.supabase.co/**',async route=>{
        const url=new URL(route.request().url());
        let data=[];
        if(url.pathname.endsWith('/dashboard_stats')) data={new_orders:0,to_print:0,ready_to_pack:0,out_for_delivery:0,revenue:0,low_stock:0};
        if(url.pathname.endsWith('/sales_report')) data={summary:{},products:[],designs:[],payments:[],production:[],delivery:[]};
        if(url.pathname.endsWith('/website_documents')) data=['navigation','footer','homepage','about','contact','faq'].map(key=>({id:key,key,title:key,draft:{},published:{}}));
        await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','content-range':'0-0/0'},body:JSON.stringify(data)});
      });
    }
    // External fonts remain the same for both stylesheets. No forms are submitted.
    for (const route of routes) {
      const errors = [];
      const onError = error => errors.push(error.message);
      page.on('pageerror', onError);
      const target=adminFixtures?new URL(origin).origin+'/css-visual-fixture.html?screen='+route.replace('-dialog',''):origin+route;
      await page.goto(target, {waitUntil:'networkidle', timeout:45000});
      await page.locator('.brand-loader').first().waitFor({state:'hidden',timeout:15000}).catch(()=>{});
      if(adminFixtures && route.endsWith('-dialog')) {
        const button=page.getByRole('button',{name:/add|new|create/i}).first();
        await button.click();
        await page.locator('.modal').first().waitFor({state:'visible'});
      }
      await page.evaluate(() => document.fonts.ready);
      // Load below-the-fold images before either snapshot so lazy loading cannot skew comparisons.
      await page.evaluate(async () => {
        document.querySelectorAll('img').forEach(image => {image.loading = 'eager';});
        await Promise.all([...document.images].map(image => image.decode().catch(()=>{})));
      });
      await page.addStyleTag({content:stable});
      await page.mouse.move(width-1,899);
      const name = `${width}-${route.replaceAll('/','-') || 'home'}`;
      const scope = await page.evaluate(() => ({area:document.documentElement.dataset.styleArea,screen:document.documentElement.dataset.styleScreen,overflow:document.documentElement.scrollWidth > innerWidth}));
      const actual = await capture(page);
      await page.screenshot({path:path.join(output,`${name}-refactor.png`),fullPage:true});
      await page.evaluate(css => {
        document.querySelectorAll('style,link[rel="stylesheet"]').forEach(element => element.remove());
        const style = document.createElement('style');style.textContent = css;document.head.appendChild(style);
      }, baseline + '\n' + stable);
      await page.evaluate(() => document.fonts.ready);
      const expected = await capture(page);
      await page.screenshot({path:path.join(output,`${name}-main.png`),fullPage:true});
      const differences = [];
      actual.forEach((record,index) => {
        if (!expected[index]) return;
        const changes = {};
        properties.forEach((prop,i) => {if(record.values[i] !== expected[index].values[i]) changes[prop] = {refactor:record.values[i],main:expected[index].values[i]};});
        if(Object.keys(changes).length) differences.push({element:record.element,changes});
      });
      results.push({width,route,scope,errors,differences});
      fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(results,null,2));
      console.log(`${width} ${route}: ${differences.length} differing elements; ${errors.length} runtime errors; overflow=${scope.overflow}`);
      page.off('pageerror', onError);
    }
    await context.close();
  }
  if(!adminFixtures) {
    const page=await browser.newPage();
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.addStyleTag({content:':where(html[data-style-screen="store-home"]) body { --visual-home-scope: active; }'});
    const homeScope=await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--visual-home-scope').trim());
    if(homeScope !== 'active')throw new Error('Home scope did not activate');
    await page.getByRole('link',{name:'Shop',exact:true}).first().click();
    await page.waitForURL('**/shop');
    await page.waitForFunction(()=>document.documentElement.dataset.styleScreen==='store-shop');
    const leaked=await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--visual-home-scope').trim());
    if(leaked)throw new Error('Home CSS scope leaked after navigating to shop');
    console.log('PASS: React Router navigation updates the CSS scope and deactivates home-only styles.');
    await page.close();
  }
  await browser.close();
  activeBrowser = null;
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(results,null,2));
  console.log(`Report and screenshots: ${output}`);
  if(results.some(result=>result.errors.length || result.differences.length))process.exitCode=1;
})().catch(error => {console.error(error.message);process.exitCode = 1;}).finally(async()=>{
  if(activeBrowser)await activeBrowser.close();
  if(adminFixtures)for(const file of fixtureFiles)if(fs.existsSync(file))fs.unlinkSync(file);
});
