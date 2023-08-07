import I from"fs";import{unlink as P}from"fs/promises";import{temporaryFile as W}from"tempy";import L from"base32-encode";import O from"pako";import{createSHA256 as C,createSHA1 as T}from"hash-wasm";import z from"pako";function y(i,a){if(i.length===1)return i[0];let e=new Uint8Array(a),t=0;for(let r of i)e.set(r,t),t+=r.byteLength;return e}function d(i,a){return[i.slice(0,a),i.slice(a)]}var S=new TextDecoder("utf-8"),p=class extends z.Inflate{constructor(e,t){super(e);this.ended=!1;this.chunks=[];this.reader=t}onEnd(e){this.err=e,this.err||(this.reader._rawOffset+=this.strm.total_in)}},h=class i{static async readFully(a){let e=[],t=0;for await(let r of a)e.push(r),t+=r.byteLength;return y(e,t)}getReadableStream(){let a=this[Symbol.asyncIterator]();return new ReadableStream({pull(e){return a.next().then(t=>{t.done||!t.value?e.close():e.enqueue(t.value)})}})}async readFully(){return await i.readFully(this)}async readline(a=0){let e=await this.readlineRaw(a);return e?S.decode(e):""}async*iterLines(a=0){let e=null;for(;e=await this.readline(a);)yield e}};function v(i){return i&&Symbol.iterator in Object(i)}function B(i){return i&&Symbol.asyncIterator in Object(i)}var R=class i extends h{constructor(e,t="gzip",r=!1){super();this.compressed=t,this.opts={raw:t==="deflateRaw"},this.inflator=t?new p(this.opts,this):null;let s;if(B(e))s=e;else if(typeof e=="object"&&"read"in e&&typeof e.read=="function")s=i.fromReadable(e);else if(e instanceof ReadableStream)s=i.fromReadable(e.getReader());else if(v(e))s=i.fromIter(e);else throw new TypeError("Invalid Stream Source");r?this._sourceIter=this.dechunk(s):this._sourceIter=s[Symbol.asyncIterator](),this.lastValue=null,this.errored=!1,this._savedChunk=null,this._rawOffset=0,this._readOffset=0,this.numChunks=0}async _loadNext(){let e=await this._sourceIter.next();return e.done?null:e.value}async*dechunk(e){let t=e instanceof i?e:new i(e,null),r=-1,s=!0;for(;r!=0;){let n=await t.readlineRaw(64),o=new Uint8Array;if(r=n?parseInt(S.decode(n),16):0,!r||r>2**32){if(Number.isNaN(r)||r>2**32){s||(this.errored=!0),yield n;break}}else if(o=await t.readSize(r),o.length!=r){s?yield n:this.errored=!0,yield o;break}let l=await t.readSize(2);if(l[0]!=13||l[1]!=10){s?yield n:this.errored=!0,yield o,yield l;break}else{if(s=!1,!o||r===0)return;yield o}}yield*t}unread(e){e.length&&(this._readOffset-=e.length,this._savedChunk&&console.log("Already have chunk!"),this._savedChunk=e)}async _next(){if(this._savedChunk){let t=this._savedChunk;return this._savedChunk=null,t}if(this.compressed){let t=this._getNextChunk();if(t)return t}let e=await this._loadNext();for(;this.compressed&&e;){this._push(e);let t=this._getNextChunk(e);if(t)return t;e=await this._loadNext()}return e}_push(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _push when this.compressed is null");this.lastValue=e,this.inflator.ended&&(this.inflator=new p(this.opts,this)),this.inflator.push(e),this.inflator.err&&this.inflator.ended&&this.compressed==="deflate"&&this.opts.raw===!1&&this.numChunks===0&&(this.opts.raw=!0,this.compressed="deflateRaw",this.inflator=new p(this.opts,this),this.inflator.push(e))}_getNextChunk(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _getNextChunk when this.compressed is null");for(;;){if(this.inflator.chunks.length>0)return this.numChunks++,this.inflator.chunks.shift();if(this.inflator.ended){if(this.inflator.err!==0)return this.compressed=null,e;let t=this.inflator.strm.avail_in;if(t&&this.lastValue){this._push(this.lastValue.slice(-t));continue}}return null}}async*[Symbol.asyncIterator](){let e=null;for(;e=await this._next();)this._readOffset+=e.length,yield e}async readlineRaw(e){let t=[],r=0,s=-1,n=null;for await(let o of this){if(e&&r+o.byteLength>e){n=o,s=e-r-1;let l=o.slice(0,s+1).indexOf(10);l>=0&&(s=l);break}if(s=o.indexOf(10),s>=0){n=o;break}t.push(o),r+=o.byteLength}if(n){let[o,l]=d(n,s+1);t.push(o),r+=o.byteLength,this.unread(l)}else if(!t.length)return null;return y(t,r)}async readFully(){return(await this._readOrSkip())[1]}async readSize(e){return(await this._readOrSkip(e))[1]}async skipSize(e){return(await this._readOrSkip(e,!0))[0]}async _readOrSkip(e=-1,t=!1){let r=[],s=0;for await(let n of this){if(e>=0)if(n.length>e){let[o,l]=d(n,e);t||r.push(o),s+=o.byteLength,this.unread(l);break}else if(n.length===e){t||r.push(n),s+=n.byteLength,e=0;break}else e-=n.length;t||r.push(n),s+=n.byteLength}return t?[s,new Uint8Array]:[s,y(r,s)]}getReadOffset(){return this._readOffset}getRawOffset(){return this.compressed?this._rawOffset:this._readOffset}getRawLength(e){return this.compressed?this.inflator.strm.total_in:this._readOffset-e}static fromReadable(e){return{async*[Symbol.asyncIterator](){let r=null;for(;(r=await e.read())&&!r.done;)yield r.value}}}static fromIter(e){return{async*[Symbol.asyncIterator](){for(let r of e)yield r}}}},x=class extends h{constructor(e,t,r=0){super();this.sourceIter=e,this.length=t,this.limit=t,this.skip=r}setLimitSkip(e,t=0){this.limit=e,this.skip=t}async*[Symbol.asyncIterator](){if(!(this.limit<=0))for await(let e of this.sourceIter){if(this.skip>0)if(e.length>=this.skip){let[,t]=d(e,this.skip);e=t,this.skip=0}else{this.skip-=e.length;continue}if(e.length>this.limit){let[t,r]=d(e,this.limit);e=t,this.sourceIter.unread&&this.sourceIter.unread(r)}if(e.length&&(this.limit-=e.length,yield e),this.limit<=0)break}}async readlineRaw(e){if(this.limit<=0)return null;let t=await this.sourceIter.readlineRaw(e?Math.min(e,this.limit):this.limit);return this.limit-=t?.length||0,t}async skipFully(){let e=this.limit;for(;this.limit>0;)this.limit-=await this.sourceIter.skipSize(this.limit);return e}};var k=new Uint8Array([13,10]),_=new Uint8Array([13,10,13,10]),j=new TextDecoder("utf-8");var U=new TextEncoder,w=class{},u=class extends w{constructor(){super(...arguments);this.buffers=[]}write(e){this.buffers.push(e)}async*readAll(){for(let e of this.buffers)yield e}},m=class i extends h{constructor(e,t={},r=new u){super();this.gzip=!1;this.digestAlgo="";this.digestAlgoPrefix="";this.digestBase32=!1;this.preferPako=!1;this._alreadyDigested=!1;this.blockHasher=null;this.payloadHasher=null;this.httpHeadersBuff=null;this.warcHeadersBuff=null;this.gzip=!!t.gzip,this.record=e;let s=t&&t.digest||{};this.digestAlgo=s?.algo||"sha-256",this.digestAlgoPrefix=s?.prefix||"sha256:",this.digestBase32=!!s?.base32,this.preferPako=!!t?.preferPako,i.noComputeDigest(e)&&(this.digestAlgo=""),this.externalBuffer=r}static async serialize(e,t,r=new u){return await new i(e,t,r).readFully()}static noComputeDigest(e){return e.warcType==="revisit"||e.warcType==="warcinfo"||e.warcPayloadDigest&&e.warcBlockDigest}async*[Symbol.asyncIterator](){if(!this.gzip){yield*this.generateRecord();return}if("CompressionStream"in globalThis&&!this.preferPako){let e=new globalThis.CompressionStream("gzip");yield*this.streamCompress(e)}else yield*this.pakoCompress()}async readlineRaw(e){return null}async*pakoCompress(){let e=new O.Deflate({gzip:!0}),t=null;for await(let r of this.generateRecord())for(t&&t.length>0&&e.push(t),t=r;e.chunks.length;)yield e.chunks.shift();t&&e.push(t,!0),yield e.result}async*streamCompress(e){let t=this.generateRecord();new ReadableStream({async pull(o){let l=await t.next();l.done?o.close():o.enqueue(l.value)}}).pipeThrough(e);let s=null,n=e.readable.getReader();for(;(s=await n.read())&&!s.done;)yield s.value}newHasher(){switch(this.digestAlgo){case"sha-256":return C();case"sha-1":return T();case"":return null;default:return C()}}getDigest(e){return this.digestAlgoPrefix+(this.digestBase32?L(e.digest("binary"),"RFC4648"):e.digest("hex"))}async digestRecord(){let e=this.record;if(this._alreadyDigested)return Number(e.warcHeaders.headers.get("Content-Length"));let t=await this.newHasher(),r=await this.newHasher(),s=0;e.httpHeaders&&(this.httpHeadersBuff=U.encode(e.httpHeaders.toString()+`\r
`),s+=this.httpHeadersBuff.length,t?.update(this.httpHeadersBuff));for await(let n of e.reader)t?.update(n),r?.update(n),await this.externalBuffer.write(n),s+=n.length;return r&&e.warcHeaders.headers.set("WARC-Payload-Digest",this.getDigest(r)),t&&e.warcHeaders.headers.set("WARC-Block-Digest",this.getDigest(t)),e.warcHeaders.headers.set("Content-Length",s.toString()),this.warcHeadersBuff=U.encode(e.warcHeaders.toString()),this._alreadyDigested=!0,s}async*generateRecord(){if(await this.digestRecord(),this.warcHeadersBuff&&(yield this.warcHeadersBuff),yield k,this.httpHeadersBuff&&(yield this.httpHeadersBuff),this.externalBuffer)for await(let e of this.externalBuffer.readAll())yield e;yield _}};var A=1024*1024*2,b=class i extends m{static async serialize(a,e){return await new i(a,e).readFully()}constructor(a,e={}){super(a,e,new g(e.maxMemSize||A))}},g=class extends u{constructor(e=A){super();this.currSize=0;this.fh=null;this.filename="";this.memSize=e}write(e){this.currSize+e.length<=this.memSize?this.buffers.push(e):(this.fh||(this.filename=W(),this.fh=I.createWriteStream(this.filename)),this.fh.write(e)),this.currSize+=e.length}async*readAll(){for(let t of this.buffers)yield t;if(!this.fh)return;await E(this.fh),this.fh=null;let e=I.createReadStream(this.filename);for await(let t of e)yield t;await P(this.filename)}};function E(i){let a=new Promise(e=>{i.once("finish",()=>e())});return i.end(),a}export{A as DEFAULT_MEM_SIZE,g as TempFileBuffer,b as WARCSerializer};
