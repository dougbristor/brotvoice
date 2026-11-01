// Entire speech pipeline runs here. This worker never contacts a speech API.
import * as ort from './vendor/ort/ort.wasm.min.mjs';
import createPhonemizer from './vendor/phonemizer/piper_phonemize.js';
import createWorld from './vendor/world/world.mjs';
const VERSION='brot-speech-0.1.0', DEFAULTS={voice:'warm',quality:'original',rate:1,pitch:-1,character:.55,seed:7,pronunciation:'lot',mode:'brot'};
const VOICES={warm:'en_GB-northern_english_male-medium',bright:'en_GB-alba-medium'};
let requestId=0,phonemizer,world,voice,feature,printed=[];
const state=message=>postMessage({id:requestId,state:message});
const asset=name=>new URL(name,import.meta.url).href;
async function cached(name){
 const url=asset(name);let cache;
 try{cache=await caches.open('speaking-brot-assets-v1');const hit=await cache.match(url);if(hit)return hit;}catch{}
 const response=await fetch(url);if(!response.ok)throw Error(`Could not load ${name} (${response.status}).`);
 // Complete storage before returning: Stop may terminate the worker after this.
 if(cache){try{await cache.put(url,response.clone());}catch{}}
 return response;
}
function recipe(text,settings){
 if(typeof text!=='string')throw Error('Please enter English text.');
 text=text.normalize('NFC').trim();
 if(!text||text.length>600)throw Error('Enter between 1 and 600 characters.');
 if(!/[\p{L}\p{N}]/u.test(text))throw Error('Please include a word or a number.');
 if([...text].some(c=>/[\p{C}\p{S}]/u.test(c)&&c!=='\n'&&c!=='\t'))throw Error('Please write symbols as English words.');
 if(text.includes('[[')||text.includes(']]'))throw Error('Use the Brot pronunciation control for the project word.');
 const r={...DEFAULTS};for(const key of Object.keys(r))if(key in (settings||{}))r[key]=settings[key];
 for(const [key,lo,hi]of [['rate',.7,1.35],['pitch',-5,5],['character',0,1]]){r[key]=Number(r[key]);if(!Number.isFinite(r[key])||r[key]<lo||r[key]>hi)throw Error(`${key} must be between ${lo} and ${hi}.`);}
 r.seed=Number(r.seed);if(!Number.isInteger(r.seed)||r.seed<0||r.seed>100000)throw Error('Seed must be from 0 to 100000.');
 if(!VOICES[r.voice]||!['original','fp16','int8'].includes(r.quality)||!['lot','boat'].includes(r.pronunciation)||!['brot','ablated','plain'].includes(r.mode))throw Error('Unknown voice or synthesis mode.');
 if(r.voice!=='warm')r.quality='original';
 return {version:VERSION,text,...r};
}
// One piper_phonemize instance leaks wasm heap (fixed 16 MB) on every callMain: about 1/103 of it per call plus
// 1/24600 per character, so it aborts after ~105 short or ~38 long calls and stays dead (caro, 2026-10-31,
// investigation/brotoid_article_20261031). Count the load and make a fresh instance well before that.
let phonemizerLoad=0,phonemizerData=null;
async function initPhonemizer(){
 if(phonemizer&&phonemizerLoad<40)return;
 if(!phonemizer)state('Loading the English pronunciation engine…');
 phonemizerData??=await (await cached('vendor/phonemizer/piper_phonemize.data')).arrayBuffer();
 const data=phonemizerData.slice(0);phonemizer=null;phonemizerLoad=0;
 phonemizer=await createPhonemizer({
  locateFile:name=>asset('vendor/phonemizer/'+name),
  getPreloadedPackage:()=>data,
  print:line=>{try{printed.push(JSON.parse(line));}catch{}},
  printErr:line=>console.warn('Piper phonemizer:',line)
 });
}
// eSpeak reads ". " + a lowercase letter as a non-final stop, so "break size. i times j" ran on as one clause (fable/brotbot 10-29).
// Give eSpeak a line break after that stop instead (the caption and words keep the space) unless it closes an ellipsis or an
// abbreviation. Not a capital: "I" is read as the pronoun (aɪ), not the letter i (ˈaɪ). Not "\n\n" (drops the stop) or U+2029 (read "dot").
const ABBR=/(?:^|[\s(])(?:\p{L}\.){2,}$|(?:^|[\s(])(?:etc|vs|cf|approx|viz|al|ca|resp|esp|incl|eq|eqs|fig|figs|ch|sec|no)\.$/iu;
const sentenceBreak=t=>t.replace(/(?<!\.)\.\s+(?=\p{Ll})/gu,(m,at)=>ABBR.test(t.slice(0,at+1))?m:'.\n');
function phonemizePart(text,config){
 if(!text.trim())return [];
 printed=[];phonemizerLoad+=1+text.length/240;
 try{phonemizer.callMain(['-l',config.espeak.voice,'--input',JSON.stringify([{text}]),'--espeak_data','/espeak-ng-data']);}
 catch(e){phonemizer=null;throw Error('The English pronunciation engine stopped; please try again.');}
 const rows=printed.filter(x=>Array.isArray(x.phonemes)&&Array.isArray(x.phoneme_ids));
 if(!rows.length)throw Error('The English pronunciation engine returned no words.');
 const result=[];
 for(const row of rows){
  // Piper IDs contain BOS/pad + one ID/pad per IPA codepoint + EOS.
  // Recover its original sentence boundaries before applying this model's map.
  let cursor=0,count=0;
  for(const id of row.phoneme_ids){if(id===2){result.push(row.phonemes.slice(cursor,cursor+count));cursor+=count;count=0;}else if(id!==0&&id!==1)count++;}
  if(cursor<row.phonemes.length)result.push(row.phonemes.slice(cursor));
 }
 return result.filter(x=>x.length);
}
async function plan(r,config){
 await initPhonemizer();
 const raw=r.pronunciation==='lot'?'bɹˈɒt':'bɹˈəʊt';
 // Keep the project stem and its stress in BROT-oid; ordinary English guesses bro-toid.
 // Cover plurals/possessives without changing the displayed text or unrelated words.
 const parts=r.text.replace(/\b(brotoid(?:s|['’]s)?|brot)\b/gi,word=>{
  const lower=word.toLowerCase(),suffix=lower==='brot'?'':'ɔɪd'+(lower==='brotoid'?'':'z');
  return `[[${raw}${suffix}]]`;
 }).split(/(\[\[.*?\]\])/s);
 const phonemes=[];let previousRaw=false;
 for(let i=0;i<parts.length;i++){
  let part=parts[i];
  if(part.startsWith('[[')){
   previousRaw=true;if(!phonemes.length||/[.!?]$/.test(phonemes.at(-1).join('')))phonemes.push([]);
   if(i&&parts[i-1].endsWith(' '))phonemes.at(-1).push(' ');
   phonemes.at(-1).push(...part.slice(2,-2).trim());
   if(parts[i+1]?.startsWith(' '))phonemes.at(-1).push(' ');
  }else{
   // eSpeak drops punctuation at the start of a detached text fragment.
   // Preserve the boundary after our project-word override explicitly.
   if(previousRaw){
    const leading=part.match(/^\s*([.!?,;:]+)\s*/);
    if(leading){
     phonemes.at(-1).push(...leading[1]);
     previousRaw=!/[.!?]/.test(leading[1]);
     if(previousRaw)phonemes.at(-1).push(' ');
     part=part.slice(leading[0].length);
    }
   }
   // A fragment cut off before our override ends phrase-final, so eSpeak gives its last word the
   // citation form: "A brotoid" said "ay brotoid", "to" said /tuː/. Phonemize it with a b-initial
   // carrier noun in the override's place, then strip the carrier; fall back if the strip misses.
   part=sentenceBreak(part);
   let next;
   if(parts[i+1]?.startsWith('[[')&&/[\p{L}\p{N}]\s+$/u.test(part)){
    next=phonemizePart(part+'blot',config);
    const last=next.at(-1)?.join('').match(/^(.*?) ?blˈɒt$/su);
    if(last&&last[1])next[next.length-1]=[...last[1]];else next=null;
   }
   next??=phonemizePart(part,config);
   if(previousRaw&&next.length)phonemes.at(-1).push(...next.shift());
   phonemes.push(...next);previousRaw=false;
  }
 }
 if(!phonemes.length||!phonemes.some(x=>x.length))throw Error('No pronounceable English words found.');
 return {recipe:r,clauses:phonemes.map(x=>x.join('')),phonemes,
  words:r.text.match(/[\p{L}\p{N}_]+(?:['’][\p{L}\p{N}_]+)*|[^\p{L}\p{N}_\s]/gu)||[],
  pronunciation:{Brot:r.pronunciation==='lot'?'/brɒt/':'/brəʊt/',Brotoid:r.pronunciation==='lot'?'/ˈbrɒtɔɪd/':'/ˈbrəʊtɔɪd/'},model:VOICES[r.voice],
  timing:'Phoneme order is exact for the browser planner; word times are estimates.'};
}
async function getVoice(name,quality='original'){
 const key=name+':'+quality;
 if(voice?.key===key)return voice;
 if(voice){await voice.session.release();voice=null;}
 if(feature){world._brot_delete(feature.handle);feature=null;}
 const size={original:63,fp16:32,int8:17}[quality];
 state(`Loading the voice on this device (first visit: about ${size} MB)…`);
 const config=await (await cached(`models/${VOICES[name]}.onnx.json`)).json();
 const suffix=quality==='original'?'':`-${quality}weights`;
 const data=await (await cached(`models/${VOICES[name]}${suffix}.onnx`)).arrayBuffer();
 ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=asset('vendor/ort/');
 const session=await ort.InferenceSession.create(data,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
 return voice={name,key,quality,config,session};
}
function ids(phonemes,config){
 const map=config.phoneme_id_map,out=[...map['^'],...map['_']];
 for(const p of phonemes){if(!map[p])throw Error(`Unrecognised pronunciation symbol: ${p}`);out.push(...map[p],...map['_']);}
 out.push(...map['$']);return BigInt64Array.from(out,BigInt);
}
function orbit(count,seed){
 let x=0,y=0,z=0;const burn=1500+seed%997,values=[];
 for(let i=0;i<burn+count+2;i++){
  [x,y,z]=[x*x-y*y-z*z-.381,y*(2*x-z)+.0195,z*(2*x+y)+.516];
  if(!Number.isFinite(x+y+z)||x*x+y*y+z*z>100)throw Error('Brot orbit escaped.');
  if(i>=burn)values.push([x,y,z]);
 }
 const a=Float64Array.from({length:count},(_,i)=>values[i+2][0]-values[i][0]);let max=1e-9;
 for(const v of a)max=Math.max(max,Math.abs(v));for(let i=0;i<a.length;i++)a[i]/=max;
 const slow=Float64Array.from(a,(_,i)=>{let sum=0;for(let j=Math.max(0,i-7);j<=Math.min(a.length-1,i+7);j++)sum+=a[j];return sum/15;});
 return {a,slow,xyz:values.slice(0,count),math:{map:'z²+c',coordinates:'(real,i,j), T-049',c:[-.381,.0195,.516],z0:[0,0,0],burn,steps_per_second:100,observable:'x[n+2]-x[n], peak-normalised over this utterance'}};
}
const interpolate=(a,index)=>{const i=Math.max(0,Math.min(a.length-1,index)),lo=Math.floor(i),hi=Math.min(a.length-1,lo+1);return a[lo]+(a[hi]-a[lo])*(i-lo);};
function alloc(values){const ptr=world._malloc(values.length*8);if(!ptr)throw Error('The browser ran out of voice memory.');world.HEAPF64.set(values,ptr/8);return ptr;}
async function analyse(r,p,v){
 const key=JSON.stringify([r.text,r.voice,r.quality,r.rate,r.pronunciation]);
 if(feature?.key===key)return {...feature,cached:true};
 if(feature){world._brot_delete(feature.handle);feature=null;}
 state('Forming the words on this device…');
 const sr=v.config.audio.sample_rate,pieces=[],spans=[];let cursor=0;
 for(const phonemes of p.phonemes){
  const input=ids(phonemes,v.config);
  const result=await v.session.run({input:new ort.Tensor('int64',input,[1,input.length]),input_lengths:new ort.Tensor('int64',BigInt64Array.of(BigInt(input.length)),[1]),scales:new ort.Tensor('float32',Float32Array.of(0,1/r.rate,0),[3])});
  const audio=new Float64Array(result.output.data);
  pieces.push(audio);spans.push({start:cursor/sr,end:(cursor+audio.length)/sr,ipa:phonemes.join('')});cursor+=audio.length;
  const gap=new Float64Array(Math.round(.13*sr));pieces.push(gap);cursor+=gap.length;
  for(const tensor of Object.values(result))tensor.dispose();
  if(cursor>60*sr)throw Error('This utterance is longer than sixty seconds. Please split it.');
 }
 const x=new Float64Array(cursor);let offset=0;for(const piece of pieces){x.set(piece,offset);offset+=piece.length;}
 world??=await createWorld();state('Shaping its Brot character…');
 const ptr=alloc(x);let handle;try{handle=world._brot_analyse(ptr,x.length,sr);}finally{world._free(ptr);}
 if(!handle)throw Error('The browser could not analyse the voice.');
 feature={key,handle,x,sr,spans};return {...feature,cached:false};
}
async function render(r,p,v,start){
 const f=await analyse(r,p,v),analysed=performance.now(),h=f.handle,sr=f.sr;
 const frames=world._brot_frames(h),bins=world._brot_bins(h);
 // Copy before any malloc: WebAssembly memory growth detaches old JS views.
 const base=world.HEAPF64.slice(world._brot_f0(h)/8,world._brot_f0(h)/8+frames);
 const times=world.HEAPF64.slice(world._brot_times(h)/8,world._brot_times(h)/8+frames);
 const spectrum=world.HEAPF64.slice(world._brot_spectrum(h)/8,world._brot_spectrum(h)/8+frames*bins);
 const o=orbit(Math.max(4,Math.ceil((times.at(-1)+.1)*100)),r.seed),ch=r.mode==='brot'?r.character:0;
 const activity=Float64Array.from(times,t=>interpolate(o.a,t*100));
 const f0=Float64Array.from(base,(v,i)=>v?Math.max(65,Math.min(550,v*2**((r.pitch+ch*(.65*activity[i]+1.1*interpolate(o.slow,times[i]*100)))/12))):0);
 for(let i=0;i<frames;i++)for(let j=0;j<bins;j++){
  const hz=j*sr/(2*(bins-1)),tilt=Math.log2(Math.max(hz,100)/500);
  spectrum[i*bins+j]*=10**(Math.max(-10,Math.min(8,-ch*(.8+.7*activity[i])*tilt))/10);
 }
 let y;
 if(r.mode==='plain')y=f.x.slice();
 else{
  const n=Math.floor((frames-1)*.005*sr)+1,allocated=[];
  try{
   const fp=alloc(f0);allocated.push(fp);const sp=alloc(spectrum);allocated.push(sp);
   const out=world._malloc(n*8);if(!out)throw Error('The browser ran out of voice memory.');allocated.push(out);
   world._brot_synth(h,fp,sp,n,out);y=world.HEAPF64.slice(out/8,out/8+n);
  }finally{for(const ptr of allocated)world._free(ptr);}
  const gain=Float64Array.from(base,(v,i)=>1+ch*.12*activity[i]*(v>0));
  for(let i=0;i<y.length;i++)y[i]*=interpolate(gain,i/sr/.005);
 }
 let peak=0;for(const value of y){if(!Number.isFinite(value))throw Error('Invalid voice output.');peak=Math.max(peak,Math.abs(value));}
 if(!peak)throw Error('The browser produced silent speech.');
 const head=Math.round(.08*sr),samples=new Float32Array(head+y.length+Math.round(.15*sr));
 for(let i=0;i<y.length;i++)samples[head+i]=y[i]*.55/peak;
 const step=Math.max(1,Math.floor(frames/500)),indices=Array.from({length:Math.ceil(frames/step)},(_,i)=>i*step);
 const meta={...p,backend:'browser-wasm',duration:samples.length/sr,sampleRate:sr,sourceMath:o.math,spans:f.spans,
  synthesis:{articulator:'Piper '+VOICES[r.voice],vocoder:'WORLD WebAssembly',contribution:'Brot drives source pitch microstructure, source energy and spectral tilt.',ablated:ch===0,seed:r.seed,character:ch},
  trace:{times:indices.map(i=>times[i]+.08),f0:indices.map(i=>f0[i]),activity:indices.map(i=>activity[i]),orbit:o.xyz.filter((_,i)=>i%Math.max(1,Math.floor(o.xyz.length/500))===0)},
  performance:{analysisCached:f.cached,analysisMs:analysed-start,renderMs:performance.now()-analysed,totalMs:performance.now()-start},
  runtime:{onnx:'1.22.0',threads:1,phonemizer:'English-only Piper wasm 1.0.0',voiceLocation:'this browser',speechService:false,weightStorage:r.quality,activations:'float32'}};
 return {meta,samples};
}
let queue=Promise.resolve();
self.onmessage=({data})=>{queue=queue.then(async()=>{
 requestId=data.id;
 try{
  const start=performance.now(),r=recipe(data.text,data.settings);
  if(data.operation==='plan'){
   const config=voice?.name===r.voice?voice.config:await (await cached(`models/${VOICES[r.voice]}.onnx.json`)).json();
   postMessage({id:data.id,meta:await plan(r,config)});return;
  }
  const v=await getVoice(r.voice,r.quality),p=await plan(r,v.config);
  const result=await render(r,p,v,start);postMessage({id:data.id,...result},[result.samples.buffer]);
 }catch(e){postMessage({id:data.id,error:e.message||String(e)});}
});};
