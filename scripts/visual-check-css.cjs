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
const widths = (process.env.VISUAL_CHECK_WIDTHS || '1440,390').split(',').map(Number);
if (widths.some(width => !Number.isInteger(width) || width <= 0)) throw new Error('VISUAL_CHECK_WIDTHS must contain positive integer widths.');
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
  permissions.push('deliveries.edit','payments.edit');
  const imports = Object.entries(modules).map(([screen,[file,exportName]])=>`import {${exportName} as ${screen}} from '../src/admin/${file}';`).join('\n');
  const moduleMap = `{${Object.keys(modules).join(',')}}`;
  fs.writeFileSync(fixtureFiles[0], '<html><body><div id="root"></div><script type="module" src="/scripts/css-visual-fixture.tsx"></script></body></html>');
  fs.writeFileSync(fixtureFiles[1], `import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router-dom';import '../src/styles.css';import {styleScope} from '../src/styles/routeScope';\n${imports}\nconst screen=new URLSearchParams(location.search).get('screen')||'dashboard';const components:any=${moduleMap};const Component=components[screen];const scope=styleScope('/admin/'+(screen==='dashboard'?'':screen));document.documentElement.dataset.styleArea=scope.area;document.documentElement.dataset.styleScreen=scope.screen;createRoot(document.getElementById('root')!).render(<BrowserRouter><div className="admin"><aside className="sidebar"><div className="brand">YAQEEN</div><nav><a href="#">Dashboard</a><a href="#">Products</a></nav></aside><div className="admin-main"><main id="main"><div className="admin-route-content"><Component permissions={${JSON.stringify(permissions)}} kind={screen==='payments'?'payments':'deliveries'}/></div></main></div></div></BrowserRouter>);`);
}
const properties = ['display','position','width','min-width','max-width','box-sizing','height','margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left','gap','grid-template-columns','flex-direction','flex-basis','flex-grow','flex-shrink','align-items','justify-content','font-family','font-size','font-weight','line-height','letter-spacing','color','background-color','border-top-width','border-top-color','border-radius','overflow-x','overflow-y','z-index','object-fit','opacity','transform'];
let activeBrowser;
async function capture(page) {
  // Flush layout so auto margins reflect the current React state and stylesheet.
  await page.evaluate(()=>document.body.getBoundingClientRect());
  return page.evaluate(properties => [...document.querySelectorAll('body *')]
    .filter(element => !['SCRIPT','STYLE','LINK'].includes(element.tagName))
    .map(element => {
      const style = getComputedStyle(element);
      const bounds=element.getBoundingClientRect();
      return {element:element.tagName.toLowerCase() + (element.className && typeof element.className === 'string' ? '.' + element.className.trim().replace(/\s+/g,'.') : ''), bounds:[bounds.x,bounds.y,bounds.width,bounds.height], values:properties.map(prop => style.getPropertyValue(prop))};
    }), properties);
}
(async () => {
  const engine = process.env.VISUAL_CHECK_BROWSER || 'chromium';
  const browser = await playwright[engine].launch({headless:true});
  activeBrowser = browser;
  const results = [];
  const routes = process.env.VISUAL_CHECK_ROUTES?.split(',') || (adminFixtures ? Object.keys(modules).flatMap(screen=>[screen,...(['categories','products','inventory','resources','designs','orders','customers','users'].includes(screen)?[screen+'-dialog']:[])]) : ['/','/shop','/cart','/checkout','/order-confirmation','/search','/contact','/faq','/privacy','/terms','/under-construction','/login','/missing-page']);
  if(!adminFixtures && process.env.VISUAL_CHECK_PRODUCT === '1') {
    const discovery = await browser.newPage();
    await discovery.goto(origin+'/shop',{waitUntil:'networkidle'});
    const product=discovery.locator('a[href*="/products/"]').first();
    await product.waitFor({timeout:15000});
    const href=await product.getAttribute('href');
    routes.push(href.replace(new URL(origin).pathname,''));
    await discovery.close();
  }
  for (const width of widths) {
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
        if(process.env.VISUAL_CHECK_USERS==='1') {
          if(url.pathname.endsWith('/profiles')) data=[{id:'fixture-staff',full_name:'Fixture Staff',username:'fixture.staff',email:'fixture@example.com',phone:'+96112345678',active:true}];
          if(url.pathname.endsWith('/roles')) data=[{id:'fixture-role',name:'Order manager',is_owner:false,role_permissions:[{permission_key:'orders.view'},{permission_key:'orders.edit'}]}];
          if(url.pathname.endsWith('/permissions')) data=['products','inventory','orders','production','designs','customers','deliveries','payments','website','media','users','reports','audit','settings'].flatMap(module=>['view','edit'].map(action=>({key:module+'.'+action,label:action==='view'?'View':'Edit'})));
          if(url.pathname.endsWith('/user_roles')) data=[{user_id:'fixture-staff',role_id:'fixture-role'}];
        }
        if(process.env.VISUAL_CHECK_SETTINGS==='1') {
          if(url.pathname.endsWith('/site_settings')) data=[{key:'website',value:{site_name:'YAQEEN',site_tagline:'A more meaningful life',email:'fixture@example.com',phone:'+96112345678',whatsapp:'+96112345678',shipping_payment:'Delivery and pickup are available.'}},{key:'commerce',value:{delivery_fee:5,cod_enabled:true,whish_enabled:true,pickup_enabled:true}}];
          if(url.pathname.includes('/storage/v1/object/list/website-media')) data=[{id:'fixture-media',name:'media-1-homepage.png',metadata:{mimetype:'image/png'},user_metadata:{label:'Homepage image'}}];
          if(url.pathname.includes('/storage/v1/object/public/website-media/')) {
            await route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="92" height="78"><rect width="92" height="78" fill="#637052"/></svg>'});return;
          }
        }
        if(process.env.VISUAL_CHECK_RESOURCES==='1' && url.pathname.endsWith('/business_resources')) data=[{id:'fixture-resource',name:'Acrylic printing materials',quantity:12,unit_price:4.5,notes:'Shared materials for custom products.',created_at:'2026-01-01T00:00:00Z'}];
        if(process.env.VISUAL_CHECK_PRODUCTS==='1') {
          const product={id:'fixture-product',title:'Saved product fixture',sku:'PRD-001',price:20,status:'Active',featured:true,bestseller:false,new_arrival:false,description:'A custom printed product.',stock_allocation:5,category_id:null,design_id:null,inventory_item_id:null};
          if(url.pathname.endsWith('/products')) data=url.searchParams.has('id')?product:[product];
          if(url.pathname.endsWith('/product_variants')) data=[{id:'fixture-variant',product_id:product.id,sku:'VAR-001',color:'Olive',active:true,price_override:22,stock_allocation:3}];
        }
        if (process.env.VISUAL_CHECK_ORDERS === '1') {
          const item={id:'fixture-item',product_id:'fixture-product',variant_id:null,title:'Custom printed item',sku:'ORD-SKU',color:'Olive',quantity:2,unit_price:20};
          const order={id:'fixture-order',number:'ORD-001',customer_name:'Fixture Customer',phone:'12345678',email:'fixture@example.com',address:'Fixture Street',city:'Beirut',instructions:'Call on arrival',notes:'Private staff notes',subtotal:40,delivery_fee:5,discount:2,total:43,currency:'USD',status:'Preparing',source:'Website',created_at:'2026-01-01T00:00:00Z',order_items:[item],order_status_history:['Order Received','Preparing'].map((status,index)=>({id:`history-${index}`,status,created_at:`2026-01-0${index+1}T00:00:00Z`})),production_jobs:[{id:'job',production_status_history:['New Order','Design','QC'].map((stage,index)=>({id:`stage-${index}`,stage,created_at:`2026-01-0${index+1}T00:00:00Z`}))}]};
          if(url.pathname.endsWith('/orders')) data=url.searchParams.has('id')?order:[order];
          if(url.pathname.endsWith('/order_items')) data=[item];
          if(url.pathname.endsWith('/products') && process.env.VISUAL_CHECK_PRODUCTS!=='1') data=[{id:'fixture-product',title:item.title,sku:item.sku,price:20,status:'Active',product_variants:[]}];
        }
        if (process.env.VISUAL_CHECK_OPERATIONS === '1') {
          if(url.pathname.endsWith('/production_board')) data=['New Order','QC','Completed'].map((stage,index)=>({id:`fixture-job-${index}`,stage,order_number:'OPS-001',title:'Custom printed item',quantity:2,customer_name:'Fixture Customer',payment_status:['Pending','Paid','Failed'][index],sku:'OPS-SKU',inventory_visible:true,inventory_item_id:'fixture-stock',inventory_title:'Printing stock',inventory_sku:'STOCK-001',inventory_quantity:12,created_at:'2026-01-01T00:00:00Z'}));
          if(/\/(deliveries|payments)$/.test(url.pathname)) data=[{id:'fixture-fulfillment',status:'Pending',amount:42,courier:'Fixture driver',reference:'OPS-REF',notes:'Handle with care.\nDelivery instructions.',created_at:'2026-01-01T00:00:00Z',orders:{number:'OPS-001',customer_name:'Fixture Customer',phone:'12345678',address:'Fixture Street',city:'Beirut'}}];
        }
        if(url.pathname.endsWith('/dashboard_stats')) data={new_orders:0,to_print:0,ready_to_pack:0,out_for_delivery:0,revenue:0,low_stock:0};
        if(url.pathname.endsWith('/sales_report')) data={summary:{},products:[],designs:[],payments:[],production:[],delivery:[]};
        if(url.pathname.endsWith('/sales_report') && process.env.VISUAL_CHECK_REPORTS==='1') data={summary:{orders:12,sales:240,average_order:20},products:Array.from({length:12},(_,index)=>({title:`Printed product ${index+1}`,quantity:index+2,sales:40})),designs:[{code:'DES-001',title:'Saved design',quantity:8}],payments:[{status:'Paid',amount:240,records:12}],production:[{stage:'QC',jobs:5}],delivery:[{status:'Delivered',deliveries:9}]};
        if(url.pathname.endsWith('/website_documents')) data=['navigation','footer','homepage','contact','faq'].map(key=>({id:key,key,title:key,draft:{},published:{}}));
        if(url.pathname.endsWith('/website_documents') && process.env.VISUAL_CHECK_WEBSITE==='1') data=['navigation','footer','homepage','contact','faq','privacy','terms'].map(key=>({id:key,key,title:key,draft:{heading:'Website content fixture',body:'Meaningful pieces for everyday life.',links:[{label:'Shop',url:'/shop'}],faqs:[{question:'How can I order?',answer:'Choose a product and continue to checkout.'}],values:[{number:'01',title:'Faith and meaning',description:'Thoughtful designs for everyday life.'}]},published:{},published_at:'2026-01-01T00:00:00Z'}));
        if (process.env.VISUAL_CHECK_SAVED_DESIGNS === '1') {
          const assets = ['pdf','image','url'].map((asset_type,index)=>({id:`fixture-asset-${index}`,design_id:'fixture-design',title:`Saved ${asset_type} reference`,asset_type,path:null,url:asset_type==='url'?'https://example.com/design-reference':null,created_at:'2026-01-01T00:00:00Z'}));
          const design = {id:'fixture-design',name:'Saved design fixture',code:'DES-FIXTURE',created_at:'2026-01-01T00:00:00Z',design_assets:assets};
          if(url.pathname.endsWith('/designs')) data = url.searchParams.has('id') ? design : [design];
          if(url.pathname.endsWith('/design_assets')) data = assets;
        }
        if (process.env.VISUAL_CHECK_SAVED_MESSAGES === '1' && url.pathname.endsWith('/contact_messages')) {
          data = [{id:'fixture-message',full_name:'Saved message fixture',email:'fixture@example.com',created_at:'2026-01-01T00:00:00Z',message:process.env.VISUAL_CHECK_MESSAGE_LONG==='1' ? ('A longer customer message with paragraphs and a reference: '+ 'long-reference-'.repeat(30)+'\n\n').repeat(12) : 'Please tell me more about this collection.\nThank you.'}];
        }
        if (process.env.VISUAL_CHECK_SAVED_INVENTORY === '1' && url.pathname.endsWith('/inventory_items')) {
          data = [{id:'fixture-inventory',sku:'INV-FIXTURE',title:'Saved inventory fixture',quantity:12,received_quantity:30,low_stock_threshold:5,image_url:null}];
        }
        await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','content-range':'0-0/0'},body:JSON.stringify(data)});
      });
    }
    // External fonts remain the same for both stylesheets. No forms are submitted.
    for (const route of routes) {
      const errors = [];
      const onError = error => errors.push(error.message);
      page.on('pageerror', onError);
      const screen=route.startsWith('website-')?'website':route.replace(/-(?:dialog|edit|view|adjust|list|delete|commerce|media|mediaadd|roles|roleadd|roleedit)$/,'');
      const target=adminFixtures?new URL(origin).origin+'/css-visual-fixture.html?screen='+screen:origin+route;
      await page.goto(target, {waitUntil:'networkidle', timeout:45000});
      await page.locator('.brand-loader').first().waitFor({state:'hidden',timeout:15000}).catch(()=>{});
      if(adminFixtures && route.startsWith('website-')) {
        const key=route.slice('website-'.length);
        await page.locator('.website-doc-card').filter({has:page.getByRole('heading',{name:key==='navigation'?'Nav Bar':key,exact:true})}).locator('[data-tooltip="Edit"]').click();
        await page.locator('.website-editor').waitFor({state:'visible'});
        if(process.env.VISUAL_CHECK_WEBSITE_NESTED==='1' && ['faq'].includes(key)) {
          if(key==='homepage') await page.locator('.homepage-section-card').last().evaluate(el=>el.open=true);
          if(process.env.VISUAL_CHECK_WEBSITE_NESTED_EDIT==='1') await page.locator('.faq-row-actions [data-tooltip="Edit"]').first().click();
          else await page.getByRole('button',{name:key==='faq'?'Add question':'Add value',exact:true}).click();
          await page.locator('.faq-popup-form').waitFor({state:'visible'});
        }
      }
      if(adminFixtures && /^users-(roles|roleadd|roleedit)$/.test(route)) {
        await page.getByRole('tab',{name:'Roles & permissions',exact:true}).click();
        if(route==='users-roleadd') await page.getByRole('button',{name:'Add role',exact:true}).click();
        if(route==='users-roleedit') await page.locator('.role-card .icon-button').first().click();
        if(route!=='users-roles' && process.env.VISUAL_CHECK_USER_PERMISSIONS==='1') {
          await page.locator('.permission-select-all').first().click();
          await page.waitForFunction(()=>document.querySelector('.permission-select-all input')?.checked);
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        }
      }
      if(adminFixtures && route==='users-edit') await page.getByRole('button',{name:'Edit staff',exact:true}).click();
      if(adminFixtures && /^settings-(commerce|media|mediaadd)$/.test(route)) {
        await page.getByRole('tab',{name:route==='settings-commerce'?'Commerce':'Media',exact:true}).click();
        if(route==='settings-mediaadd') await page.getByRole('button',{name:'+ Add',exact:true}).click();
      }
      if(adminFixtures && /^resources-(view|edit|delete)$/.test(route)) {
        await page.locator(`[data-tooltip="${route.endsWith('-edit')?'Edit':route.endsWith('-delete')?'Delete':'View'}"]`).first().click();
        await page.locator('.modal').first().waitFor({state:'visible'});
      }
      if(adminFixtures && /^products-(view|edit)$/.test(route)) {
        await page.locator(`[data-tooltip="${route.endsWith('-edit')?'Edit':'View'}"]`).first().click();
        await page.locator('.product-details-shell').waitFor({state:'visible'});
        await page.locator('.brand-loader').first().waitFor({state:'hidden',timeout:15000}).catch(()=>{});
        if(process.env.VISUAL_CHECK_PRODUCT_VARIANT==='1') {
          await page.getByRole('button',{name:'Add variant',exact:true}).click();
          await page.locator('.modern-nested-form').waitFor({state:'visible'});
        }
      }
      if(adminFixtures && /^orders-(view|edit)$/.test(route)) {
        await page.locator(`[data-tooltip="${route.endsWith('-edit')?'Edit':'View'}"]`).first().click();
        await page.locator(route.endsWith('-edit')?'.order-edit-modern':'.order-detail').waitFor({state:'visible'});
      }
      if(adminFixtures && route==='production-list') await page.getByRole('button',{name:'List',exact:true}).click();
      if(adminFixtures && /^(deliveries|payments)-(edit|view)$/.test(route)) {
        await page.locator(`[data-tooltip="${route.endsWith('-edit')?'Edit':'View'}"]`).first().click();
        await page.locator(route.endsWith('-edit')?'.fulfillment-form':'.fulfillment-detail').waitFor({state:'visible'});
      }
      if (adminFixtures && /^inventory-(view|adjust)$/.test(route)) {
        if(process.env.VISUAL_CHECK_SAVED_INVENTORY !== '1') throw new Error('Inventory detail checks require VISUAL_CHECK_SAVED_INVENTORY=1');
        await page.locator(`[data-tooltip="${route.endsWith('-view')?'View':'Adjust stock'}"]`).first().click();
        await page.locator(route.endsWith('-view')?'.inventory-view-modern':'.inventory-adjust-form').waitFor({state:'visible'});
      }
      if (adminFixtures && route === 'inbox-view') {
        if(process.env.VISUAL_CHECK_SAVED_MESSAGES !== '1') throw new Error('Message detail checks require VISUAL_CHECK_SAVED_MESSAGES=1');
        await page.getByRole('button',{name:'View message from Saved message fixture'}).click();
        await page.locator('.message-detail').waitFor({state:'visible'});
      }
      if (adminFixtures && /^designs-(edit|view)$/.test(route)) {
        if(process.env.VISUAL_CHECK_SAVED_DESIGNS !== '1') throw new Error('Saved design checks require VISUAL_CHECK_SAVED_DESIGNS=1');
        await page.locator(`[data-tooltip="${route.endsWith('-edit')?'Edit':'View'}"]`).first().click();
        await page.locator('.design-editor-modern').waitFor({state:'visible'});
        await page.locator('.design-editor-modern .design-existing').nth(3).waitFor({state:'visible'});
      }
      if (adminFixtures && route === 'inbox' && process.env.VISUAL_CHECK_INBOX_NEWSLETTER === '1') {
        const tab = page.getByRole('tab', {name:/Newsletter/i});
        await tab.click();
        await page.waitForFunction(() => [...document.querySelectorAll('[role="tab"]')].some(tab => tab.textContent?.includes('Newsletter') && tab.getAttribute('aria-selected') === 'true'));
      }
      if (process.env.VISUAL_CHECK_STORE_CHROME === '1') {
        for (const summary of await page.locator('.yaqeen-footer .footer-group summary').all()) {
          await summary.click();
        }
        if (width <= 760) {
          await page.locator('.mobile-menu-button').click();
          await page.locator('.mobile-nav-drawer').waitFor({state:'visible'});
        }
      }
      if (route === '/search' && process.env.VISUAL_CHECK_SEARCH_QUERY) {
        await Promise.all([
          page.waitForResponse(response => response.url().includes('/rest/v1/products') && response.request().method() === 'GET'),
          page.locator('.store-search input').fill(process.env.VISUAL_CHECK_SEARCH_QUERY),
        ]);
        await page.locator('.store-empty').waitFor({state:'hidden'});
      }
      if (route === '/faq' && process.env.VISUAL_CHECK_FAQ_OPEN === '1') {
        const question = page.locator('.modern-faq summary').first();
        await question.click();
        await page.waitForFunction(() => document.querySelector('.modern-faq')?.hasAttribute('open'));
      }
      const validationField = route === '/contact' ? process.env.VISUAL_CHECK_CONTACT_FIELD : route === '/checkout' ? process.env.VISUAL_CHECK_CHECKOUT_FIELD : null;
      if (validationField) {
        if (!['input', 'textarea'].includes(validationField)) throw new Error('Validation field must be input or textarea.');
        // Exercise error/focus styling locally without submitting either form.
        const form = route === '/contact' ? '.contact-form-modern' : '.checkout-fields';
        const control = page.locator(`${form} ${validationField}`).first();
        await control.evaluate(element => element.setAttribute('aria-invalid', 'true'));
        await control.focus();
      }
      if (route === '/' && process.env.VISUAL_CHECK_HOME_VARIANTS === '1') {
        // Exercise optional CMS layouts using local DOM copies; no CMS records are changed.
        await page.evaluate(() => {
          const home = document.querySelector('.home-redesign');
          const products = home?.querySelector('.home-products');
          if (!home || !products) throw new Error('Homepage product fixture is unavailable');
          const newArrivals = products.cloneNode(true);
          newArrivals.classList.add('home-new-arrivals');
          home.append(newArrivals);
          const variants = document.createElement('div');
          variants.innerHTML = '<section class="home-cms-banner"><div class="container"><p class="eyebrow">Banner</p><h2>Meaningful reminders</h2><p>Homepage CMS banner preview.</p><a class="button" href="#">Browse</a></div></section><section class="container home-cms-newsletter"><div><p class="eyebrow">Newsletter</p><h2>Stay connected</h2><p>Homepage newsletter preview.</p></div><form class="newsletter-signup"><div class="newsletter-field"><input type="email" placeholder="Email address"><button class="button" type="button">Subscribe</button></div><span class="newsletter-success">Thank you</span><span class="newsletter-error">Try again</span></form></section>';
          home.append(...variants.children);
        });
      }
      if(adminFixtures && route.endsWith('-dialog')) {
        const button=page.getByRole('button',{name:/add|new|create/i}).first();
        await button.click();
        await page.locator('.modal').first().waitFor({state:'visible'});
      }
      await page.evaluate(() => document.fonts.ready);
      if(adminFixtures && /^orders-(dialog|edit)$/.test(route) && process.env.VISUAL_CHECK_ORDER_ITEM === '1') {
        await page.getByRole('button',{name:'Add item',exact:true}).click();
        await page.locator('.modern-nested-form').waitFor({state:'visible'});
      }
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
        const sameBounds=record.bounds.every((value,i)=>value===expected[index].bounds[i]);
        properties.forEach((prop,i) => {if(record.values[i] !== expected[index].values[i] && !(prop.startsWith('margin-') && sameBounds)) changes[prop] = {refactor:record.values[i],main:expected[index].values[i]};});
        if(!sameBounds) changes.bounds={refactor:record.bounds,main:expected[index].bounds};
        if(Object.keys(changes).length) differences.push({element:record.element,changes});
      });
      const allowedHomeColors = process.env.VISUAL_CHECK_ALLOW_HOME_COLORS === '1' && route === '/';
      const unexpectedDifferences = differences.filter(item => !allowedHomeColors || Object.keys(item.changes).some(property => !['color','background-color','border-top-color'].includes(property)));
      results.push({width,route,scope,errors,differences,unexpectedDifferences});
      fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(results,null,2));
      console.log(`${width} ${route}: ${differences.length} differing elements${allowedHomeColors ? ` (${unexpectedDifferences.length} unexpected)` : ''}; ${errors.length} runtime errors; overflow=${scope.overflow}`);
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
  if(results.some(result=>result.errors.length || result.unexpectedDifferences.length))process.exitCode=1;
})().catch(error => {console.error(error.message);process.exitCode = 1;}).finally(async()=>{
  if(activeBrowser)await activeBrowser.close();
  if(adminFixtures)for(const file of fixtureFiles)if(fs.existsSync(file))fs.unlinkSync(file);
});
