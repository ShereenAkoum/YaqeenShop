import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionFilters } from '../src/lib/homepageCollections.ts';
const selections=['new_arrival','bestseller','collection'];
const matches=(product,filters)=>Object.entries(filters).every(([key,value])=>product[key]===value);
test('products appear in only their highest priority enabled collection',()=>{
 for(let mask=0;mask<8;mask++){
  const product={new_arrival:Boolean(mask&1),bestseller:Boolean(mask&2),featured:Boolean(mask&4)};
  const actual=selections.filter(selection=>matches(product,collectionFilters(selection)));
  const expected=product.new_arrival?['new_arrival']:product.bestseller?['bestseller']:product.featured?['collection']:[];
  assert.deepEqual(actual,expected,JSON.stringify(product));
 }
});
test('hiding a higher priority section releases its products to remaining groups',()=>{
 const product={new_arrival:true,bestseller:true,featured:true};
 assert.equal(matches(product,collectionFilters('bestseller',['bestseller','collection'])),true);
 assert.equal(matches(product,collectionFilters('collection',['collection'])),true);
 assert.equal(matches(product,collectionFilters('collection',['new_arrival','collection'])),false);
});
test('unflagged products are not featured on the homepage',()=>{
 const product={new_arrival:false,bestseller:false,featured:false};
 assert.deepEqual(selections.filter(selection=>matches(product,collectionFilters(selection))),[]);
});
