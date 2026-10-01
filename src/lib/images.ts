export async function uploadResponsiveImage(storage:any,bucket:string,path:string,file:File){
 const {error}=await storage.from(bucket).upload(path,file,{contentType:file.type||undefined,cacheControl:'31536000'});
 if(error)return{error,url:''};
 return{error:null,url:storage.from(bucket).getPublicUrl(path).data.publicUrl};
}

export async function removeResponsiveImage(storage:any,bucket:string,originalPath:string){
 return storage.from(bucket).remove([originalPath]);
}
