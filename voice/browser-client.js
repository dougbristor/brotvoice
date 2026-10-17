// Lazy dedicated worker. Cancellation terminates active synthesis immediately.
export class BrowserRenderer {
 constructor(onState){this.onState=onState;this.pending=new Map();this.serial=0;this.worker=null;}
 reset(error=new DOMException('Cancelled','AbortError')){
  this.worker?.terminate();this.worker=null;
  for(const job of this.pending.values()){job.cleanup();job.reject(error);}this.pending.clear();
 }
 request(operation,text,settings,signal){
  if(signal?.aborted)return Promise.reject(new DOMException('Cancelled','AbortError'));
  if(!this.worker){
   this.worker=new Worker(new URL('./browser-worker.js',import.meta.url),{type:'module'});
   this.worker.onerror=event=>{event.preventDefault();this.reset(Error(event.message||'The browser voice could not start.'));};
   this.worker.onmessage=({data})=>{
    const job=this.pending.get(data.id);if(!job)return;
    if(data.state){this.onState?.(data.state);return;}
    this.pending.delete(data.id);job.cleanup();
    if(data.error)job.reject(Error(data.error));else job.resolve(data);
   };
  }
  return new Promise((resolve,reject)=>{
   const id=++this.serial,abort=()=>this.reset();
   signal?.addEventListener('abort',abort,{once:true});
   this.pending.set(id,{resolve,reject,cleanup:()=>signal?.removeEventListener('abort',abort)});
   this.worker.postMessage({id,operation,text,settings});
  });
 }
}
