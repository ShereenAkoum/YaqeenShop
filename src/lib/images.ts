export const RESPONSIVE_WIDTHS=[480,960,1440] as const;

export type ResponsiveVariant={width:number;blob:Blob};

export function isOptimizableImage(file:File){
 return /^image\/(jpeg|png|webp)$/i.test(file.type)&&!file.type.includes('gif');
}

export async function makeResponsiveWebps(file:File):Promise<ResponsiveVariant[]>{
 if(!isOptimizableImage(file)||typeof createImageBitmap==='undefined')return[];
 const bitmap=await createImageBitmap(file);
 try{
  const variants:ResponsiveVariant[]=[];
  for(const width of RESPONSIVE_WIDTHS){
   if(width>=bitmap.width)continue;
   const height=Math.max(1,Math.round(bitmap.height*(width/bitmap.width)));
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d');if(!ctx)continue;
   ctx.drawImage(bitmap,0,0,width,height);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.82));
   if(blob)variants.push({width,blob});
  }
  return variants;
 }finally{bitmap.close()}
}

export function responsivePath(originalPath:string,width:number){
 const dot=originalPath.lastIndexOf('.'),base=dot>originalPath.lastIndexOf('/')?originalPath.slice(0,dot):originalPath;
 return base+'-'+width+'w.webp';
}

export function responsiveUrl(originalUrl:string,width:number){
 try{
  const url=new URL(originalUrl),marker='/object/public/',i=url.pathname.indexOf(marker);
  if(i<0)return'';
  const rest=url.pathname.slice(i+marker.length),slash=rest.indexOf('/');
  if(slash<0)return'';
  const bucket=rest.slice(0,slash),path=decodeURIComponent(rest.slice(slash+1));
  const variant=responsivePath(path,width).split('/').map(encodeURIComponent).join('/');
  url.pathname=url.pathname.slice(0,i+marker.length)+bucket+'/'+variant;
  return url.toString();
 }catch{return''}
}

export function responsiveSrcSet(originalUrl:string){
 return RESPONSIVE_WIDTHS.map(width=>{const url=responsiveUrl(originalUrl,width);return url?url+' '+width+'w':''}).filter(Boolean).join(', ');
}

export async function uploadResponsiveImage(storage:any,bucket:string,path:string,file:File){
 const {error}=await storage.from(bucket).upload(path,file,{contentType:file.type||undefined,cacheControl:'31536000'});
 if(error)return{error,url:''};
 const variants=await makeResponsiveWebps(file);
 for(const variant of variants){
  const result=await storage.from(bucket).upload(responsivePath(path,variant.width),variant.blob,{contentType:'image/webp',cacheControl:'31536000'});
  if(result.error)console.warn('Responsive image upload failed',variant.width,result.error.message);
 }
 return{error:null,url:storage.from(bucket).getPublicUrl(path).data.publicUrl};
}
