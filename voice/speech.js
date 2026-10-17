// Public browser API: plan -> render -> play / stop. The single final buffer is
// used by both playback and WAV export, after the pinned SonicSafe chain.
import {BrowserRenderer} from './browser-client.js';
export const VERSION='brot-speech-0.1.0';
export const DEFAULTS={voice:'warm',quality:'original',rate:1,pitch:-1,character:.55,seed:7,pronunciation:'lot',mode:'brot'};
export const apiBase=`http://${location.hostname==='127.0.0.1'?'127.0.0.1':'localhost'}:8106`;
export const backend=new URLSearchParams(location.search).get('engine')==='python'?'python':'browser';
const decode=base64=>{const s=atob(base64),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return new Float32Array(b.buffer);};
export async function request(path,text,settings,signal){
 let r;try{r=await fetch(apiBase+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,settings}),signal});}
 catch(e){if(e.name==='AbortError')throw e;throw Error('The local voice service is asleep. The saved sound checks still work. Start server.py to speak new text.');}
 const data=await r.json();if(!r.ok)throw Error(data.error||'Rendering failed.');return data;
}
export async function processFinal(samples,sampleRate){
 const ctx=new OfflineAudioContext(1,Math.ceil((samples.length/sampleRate+.25)*44100),44100);
 // Firefox acquires a source's buffer when it is assigned. Fill it first;
 // writing after assignment leaves that source holding the original silence.
 const input=ctx.createBuffer(1,samples.length,sampleRate);input.copyToChannel(samples,0);
 const src=ctx.createBufferSource();src.buffer=input;
 src.connect(SonicSafe.dest(ctx,.3));src.start(0);src.stop(samples.length/sampleRate);
 const buffer=await ctx.startRendering(),a=buffer.getChannelData(0);
 for(let i=0;i<a.length;i++){
  if(!Number.isFinite(a[i])||Math.abs(a[i])>.30001)throw Error('Output validation failed.');
  // Playback is the exact 16-bit PCM exported by wav(), including quantisation.
  a[i]=Math.round(Math.max(-1,Math.min(32767/32768,a[i]))*32768)/32768;
 }
 return buffer;
}
export function levels(buffer){let peak=0,ss=0,active=0,activeSS=0;const a=buffer.getChannelData(0);for(const x of a){peak=Math.max(peak,Math.abs(x));ss+=x*x;if(Math.abs(x)>.0001){active++;activeSS+=x*x;}}return {peak,rms:Math.sqrt(ss/a.length),activeRms:Math.sqrt(activeSS/Math.max(active,1)),duration:buffer.duration};}
export function wav(buffer){
 const a=buffer.getChannelData(0),b=new ArrayBuffer(44+a.length*2),v=new DataView(b);
 const tag=(i,s)=>{for(let k=0;k<s.length;k++)v.setUint8(i+k,s.charCodeAt(k));};
 tag(0,'RIFF');v.setUint32(4,36+a.length*2,true);tag(8,'WAVE');tag(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);tag(36,'data');v.setUint32(40,a.length*2,true);
 for(let i=0;i<a.length;i++)v.setInt16(44+2*i,Math.round(Math.max(-1,Math.min(32767/32768,a[i]))*32768),true);
 return new Blob([b],{type:'audio/wav'});
}
export function save(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),20000);}
export function recipeLink(recipe){return location.origin+location.pathname+'#'+encodeURIComponent(JSON.stringify(recipe));}
export function restoredRecipe(){if(!location.hash)return null;try{const r=JSON.parse(decodeURIComponent(location.hash.slice(1)));if(r.version!==VERSION||typeof r.text!=='string')throw 0;return r;}catch{return null;}}
export class BrotSpeech extends EventTarget{
 constructor(){super();this.epoch=0;this.source=null;this.controller=null;this.current=null;this.activeNodes=0;this.backend=backend;this.renderer=new BrowserRenderer(message=>this.emit('state',message));}
 emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
 async unlock(){this.ctx??=new AudioContext({sampleRate:44100});await this.ctx.resume();}
 async plan(text,settings={}){if(this.backend==='python')return request('/plan',text,{...DEFAULTS,...settings});return (await this.renderer.request('plan',text,{...DEFAULTS,...settings})).meta;}
 async render(text,settings={}){
  this.stop();const epoch=this.epoch,controller=new AbortController();this.controller=controller;this.emit('state','Preparing the words…');
  try{
   let meta,samples;
   if(this.backend==='python'){
    meta=await request('/render',text,{...DEFAULTS,...settings},controller.signal);samples=decode(meta.pcm);delete meta.pcm;meta.backend='python-reference';
   }else{
    ({meta,samples}=await this.renderer.request('render',text,{...DEFAULTS,...settings},controller.signal));
   }
   if(epoch!==this.epoch)throw new DOMException('Cancelled','AbortError');
   this.emit('plan',meta);this.emit('state','Shaping the voice…');const t=performance.now();
   const buffer=await processFinal(samples,meta.sampleRate);
   if(epoch!==this.epoch)throw new DOMException('Cancelled','AbortError');
   if(levels(buffer).peak===0)throw Error('The browser produced silent audio. Please reload the page and try again.');
   const bytes=await wav(buffer).arrayBuffer();const hash=await crypto.subtle.digest('SHA-256',bytes);
   if(epoch!==this.epoch)throw new DOMException('Cancelled','AbortError');
   meta.finalSha256=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
   meta.output={...levels(buffer),sampleRate:buffer.sampleRate,chain:'SonicSafe 180 Hz–3200 Hz, limiter, hard clip, master 0.3',processingMs:performance.now()-t};
   this.current={buffer,meta};this.emit('ready',this.current);this.emit('state','Ready to speak.');return this.current;
  }finally{if(this.controller===controller)this.controller=null;}
 }
 async play(result=this.current){
  if(!result)throw Error('Prepare a voice first.');
  this.stop();const epoch=this.epoch;await this.unlock();if(epoch!==this.epoch)return;
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();
  source.buffer=result.buffer;gain.gain.value=1;source.connect(gain);gain.connect(this.ctx.destination);
  this.source={source,gain};this.activeNodes+=2;this.startedAt=this.ctx.currentTime;
  source.onended=()=>{source.disconnect();gain.disconnect();this.activeNodes-=2;if(this.source?.source===source){this.source=null;this.emit('state','Ready to replay.');this.emit('ended');}};
  source.start();source.stop(this.ctx.currentTime+result.buffer.duration+.01);this.emit('playing',result);this.emit('state','Speaking…');
 }
 stop(){
  this.epoch++;this.controller?.abort();this.controller=null;
  if(this.renderer.pending.size)this.renderer.reset();
  if(this.source){const {source,gain}=this.source,t=this.ctx.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(gain.gain.value,t);gain.gain.linearRampToValueAtTime(0,t+.018);try{source.stop(t+.02);}catch{}this.source=null;}
  this.emit('ended');this.emit('state','Stopped.');
 }
 async load(url){await this.unlock();const response=await fetch(url);if(!response.ok)throw Error('Sound check unavailable.');return {buffer:await this.ctx.decodeAudioData(await response.arrayBuffer()),meta:{}};}
}
