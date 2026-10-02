const assert = require('node:assert/strict');
const fs = require('node:fs');
const postcss = require('postcss'); // CSS parser provided by Vite.
const ts = require('typescript');

const files = fs.readdirSync('src/styles', {recursive:true})
  .filter(file => file.endsWith('.css')).map(file => file.replaceAll('\\', '/'));
const entry = fs.readFileSync('src/styles.css', 'utf8');
const imports = [...entry.matchAll(/@import '\.\/styles\/([^']+)';/g)].map(match => match[1]);
assert.deepEqual([...imports].sort(), [...files].sort(), 'Import every stylesheet exactly once');
for (const file of files) {
  const root = postcss.parse(fs.readFileSync(`src/styles/${file}`, 'utf8'));
  if (file.startsWith('shared/')) continue;
  const owner = file.replace(/\.css$/, '');
  const expected = owner === 'login' || owner === 'admin/shared'
    ? ':where(html[data-style-area="admin"])'
    : owner === 'store/shared'
      ? ':where(html[data-style-area="store"])'
      : `:where(html[data-style-screen="${owner.replace('/', '-')}"])`;
  const unscoped = [];
  root.walkRules(rule => {
    for (const selector of rule.selectors) {
      if (!selector.startsWith(expected) && !selector.startsWith(`html${expected}`)) unscoped.push(selector);
    }
  });
  assert.deepEqual(unscoped, [], `${file}: each selector must use its owning scope`);
}
const exportsObject = {};
const code = ts.transpileModule(fs.readFileSync('src/styles/routeScope.ts', 'utf8'), {
  compilerOptions: {module:ts.ModuleKind.CommonJS},
}).outputText;
new Function('exports', code)(exportsObject);
const {styleScope} = exportsObject;
for (const [path, screen] of Object.entries({
  '/':'store-home', '/shop':'store-shop', '/products/example':'store-product',
  '/cart':'store-cart', '/checkout':'store-checkout', '/order-confirmation':'store-confirmation',
  '/search':'store-search', '/about':'store-about', '/contact':'store-contact', '/faq':'store-faq',
  '/privacy':'store-legal', '/terms':'store-legal', '/under-construction':'store-construction',
  '/login':'login', '/admin':'admin-dashboard', '/admin/':'admin-dashboard',
  '/admin/production':'admin-operations', '/admin/deliveries':'admin-operations',
  '/admin/payments':'admin-operations', '/shipping':'store-content',
})) {
  assert.equal(styleScope(path).screen, screen, path);
  assert.equal(styleScope(path).area, screen.startsWith('admin-') || screen === 'login' ? 'admin' : 'store');
}
for (const screen of ['categories','products','inventory','resources','designs','orders','customers','inbox','users','audit','website','reports','settings']) {
  assert.equal(styleScope(`/admin/${screen}`).screen, `admin-${screen}`);
  assert.equal(styleScope(`/admin/${screen}/`).screen, `admin-${screen}`);
  assert.ok(files.includes(`admin/${screen}.css`));
}
console.log(`PASS: ${files.length} stylesheet imports, screen/area guards, and public/admin route mappings.`);
