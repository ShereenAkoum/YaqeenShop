const fs = require('node:fs');
const postcss = require('postcss');
const ts = require('typescript');

// Scan every source string, including className props, selector queries, conditional
// fragments, and template literals. Retain runtime-generated class prefixes.
const tokens = new Set(['lucide']);
const prefixes = new Set(['lucide-']);
for (const file of fs.readdirSync('src', {recursive:true}).filter(file => /\.(tsx?|jsx?)$/.test(file))) {
  const source = ts.createSourceFile(file, fs.readFileSync(`src/${file}`, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      for (const token of node.text.match(/[A-Za-z_][\w-]*/g) || []) {
        tokens.add(token);
        if (token.endsWith('-')) prefixes.add(token);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
for (const file of ['index.html', ...fs.readdirSync('public',{recursive:true}).filter(file=>file.endsWith('.html')).map(file=>`public/${file}`)]) {
  for (const token of fs.readFileSync(file,'utf8').match(/[A-Za-z_][\w-]*/g) || []) tokens.add(token);
}
function used(className) {
  return tokens.has(className) || [...prefixes].some(prefix => className.startsWith(prefix));
}
// Only absent classes required outside functional pseudo-classes prove a selector
// impossible. :not(), :is(), :where(), :has() and attribute strings are preserved.
function requiredClasses(selector) {
  // Escaped identifiers need a full CSS selector parser; retain them unchanged.
  if(selector.includes('\\'))return [];
  const classes = [];
  let depth = 0, brackets = 0, quote = '';
  for (let index = 0; index < selector.length; index++) {
    const char = selector[index];
    if (char === '\\') {index++;continue;}
    if (quote) {if(char === quote)quote='';continue;}
    if(char === '"' || char === "'") {quote=char;continue;}
    if(char === '(')depth++;
    else if(char === ')')depth--;
    else if(char === '[')brackets++;
    else if(char === ']')brackets--;
    else if(char === '.' && !depth && !brackets) {
      const match=selector.slice(index+1).match(/^[A-Za-z_][\w-]*/);
      if(match) {classes.push(match[0]);index+=match[0].length;}
    }
  }
  return classes;
}
if(process.argv.includes('--self-test')) {
  const assert=require('node:assert/strict');
  assert.deepEqual(requiredClasses('.live .unused:hover'),['live','unused']);
  assert.deepEqual(requiredClasses('.live:not(.unused)'),['live']);
  assert.deepEqual(requiredClasses('.live:is(.unused,.active)'),['live']);
  assert.deepEqual(requiredClasses('.live:where(.unused):has(.missing)'),['live']);
  assert.deepEqual(requiredClasses('[data-label=".unused"] .live'),['live']);
  assert.deepEqual(requiredClasses('.unused\\-suffix .live'),[]);
  assert.ok(used('status-awaiting-payment'));
  assert.ok(used('production-stage-custom'));
  assert.ok(used('lucide-generated-icon'));
  console.log('PASS: selector negations/alternatives, attributes, escaped identifiers, and dynamic class prefixes are retained.');
  process.exit(0);
}
const apply = process.argv.includes('--write');
const report = [];
let total = 0, removed = 0, beforeBytes = 0, afterBytes = 0;
const roots = new Map();
for (const file of fs.readdirSync('src/styles',{recursive:true}).filter(file=>file.endsWith('.css'))) {
  const filename=`src/styles/${file}`;
  const original=fs.readFileSync(filename,'utf8');
  beforeBytes+=Buffer.byteLength(original);
  const root=postcss.parse(original);
  root.walkRules(rule=>{
    if(rule.parent.type === 'atrule' && rule.parent.name.endsWith('keyframes'))return;
    const keep=[];
    for(const selector of rule.selectors) {
      total++;
      const missing=requiredClasses(selector).filter(className=>!used(className));
      if(missing.length) {removed++;report.push({file:file.replaceAll('\\','/'),selector,missing});}
      else keep.push(selector);
    }
    if(keep.length === rule.selectors.length)return;
    if(keep.length)rule.selector=keep.join(',\n');
    else rule.remove();
  });
  root.walkAtRules(rule=>{if(rule.nodes && !rule.nodes.length)rule.remove();});
  roots.set(filename,{root,original});
}
const animations = new Set();
for(const {root} of roots.values())root.walkDecls(/^(?:-webkit-)?animation(?:-name)?$/,decl=>{
  for(const token of decl.value.match(/[A-Za-z_][\w-]*/g) || [])animations.add(token);
});
const removedAnimations=[];
for(const [filename,{root,original}] of roots) {
  root.walkAtRules(/keyframes$/,rule=>{if(!animations.has(rule.params) && !tokens.has(rule.params)){removedAnimations.push(rule.params);rule.remove();}});
  const result=root.toString();
  afterBytes+=Buffer.byteLength(result);
  if(apply && result!==original)fs.writeFileSync(filename,result);
}
const summary={mode:apply?'write':'audit',totalSelectors:total,removedSelectors:removed,unusedClasses:[...new Set(report.flatMap(item=>item.missing))].sort(),removedAnimations,bytesSaved:beforeBytes-afterBytes,dynamicPrefixes:[...prefixes].sort()};
console.log(JSON.stringify(summary,null,2));
if(process.env.CSS_AUDIT_REPORT)fs.writeFileSync(process.env.CSS_AUDIT_REPORT,JSON.stringify({summary,selectors:report},null,2));
