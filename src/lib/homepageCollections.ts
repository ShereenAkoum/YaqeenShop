export type HomepageSelection = 'new_arrival' | 'collection' | 'bestseller';
export const homepageCollections = [
 {id:'new-arrivals',type:'products',selection:'new_arrival',enabled:true,heading:'New arrivals',subheading:'JUST ADDED',body:'Fresh reminders for meaningful moments.',cta_text:'Explore new arrivals',cta_url:'/shop'},
 {id:'collection',type:'products',selection:'collection',enabled:true,heading:'Explore the collection',subheading:'THE COLLECTION',body:'Meaningful reminders for your everyday.',cta_text:'Shop all products',cta_url:'/shop'},
 {id:'bestsellers',type:'products',selection:'bestseller',enabled:true,heading:'Bestsellers',subheading:'CUSTOMER FAVOURITES',body:'The pieces people come back to.',cta_text:'Discover favourites',cta_url:'/shop'},
] as const;
export function collectionFilters(selection:HomepageSelection,enabled:readonly string[]=['new_arrival','bestseller','collection']):Record<string,boolean>{
 const filters:Record<string,boolean>={};
 if(selection==='new_arrival')filters.new_arrival=true;
 if(selection==='bestseller'){filters.bestseller=true;if(enabled.includes('new_arrival'))filters.new_arrival=false;}
 if(selection==='collection'){filters.featured=true;if(enabled.includes('new_arrival'))filters.new_arrival=false;if(enabled.includes('bestseller'))filters.bestseller=false;}
 return filters;
}
