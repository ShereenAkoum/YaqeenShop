import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inventoryAllocations,inventoryBalance} from '../src/lib/inventoryFlow.ts';
test('allocation leaves physical stock unchanged; sales reduce physical and remaining allocation together',()=>{
 assert.deepEqual(inventoryBalance(20,[2,2]),{allocated:4,unallocated:16});
 assert.deepEqual(inventoryBalance(18,[0,2]),{allocated:2,unallocated:16});
});
test('includes simple products and retains sold counts after allocations reach zero',()=>{
 const rows=inventoryAllocations([{id:'p',title:'Simple',status:'Draft',inventory_item_id:'i',stock_allocation:2}],
 [{id:'v',inventory_item_id:'i',stock_allocation:0}],
 [{product_id:'p',variant_id:null,sold:3},{product_id:'other',variant_id:'v',sold:2}]);
 assert.equal(rows.length,2);assert.equal(rows[0].sold,2);assert.equal(rows[1].sold,3);
 assert.equal(rows[1].active,false);assert.equal(rows[1].simple,true);
});
