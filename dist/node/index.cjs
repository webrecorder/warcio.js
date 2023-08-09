"use strict";var P=Object.create;var m=Object.defineProperty;var W=Object.getOwnPropertyDescriptor;var E=Object.getOwnPropertyNames;var F=Object.getPrototypeOf,D=Object.prototype.hasOwnProperty;var N=(s,n)=>{for(var e in n)m(s,e,{get:n[e],enumerable:!0})},S=(s,n,e,t)=>{if(n&&typeof n=="object"||typeof n=="function")for(let r of E(n))!D.call(s,r)&&r!==e&&m(s,r,{get:()=>n[r],enumerable:!(t=W(n,r))||t.enumerable});return s};var g=(s,n,e)=>(e=s!=null?P(F(s)):{},S(n||!s||!s.__esModule?m(e,"default",{value:s,enumerable:!0}):e,s)),$=s=>S(m({},"__esModule",{value:!0}),s);var Q={};N(Q,{DEFAULT_MEM_SIZE:()=>R,TempFileBuffer:()=>y,WARCSerializer:()=>A});module.exports=$(Q);var k=g(require("fs"),1),O=require("fs/promises"),T=require("tempy");var B=g(require("base32-encode"),1),H=g(require("pako"),1),p=require("hash-wasm");var U=g(require("pako"),1);function w(s,n){if(s.length===1)return s[0];let e=new Uint8Array(n),t=0;for(let r of s)e.set(r,t),t+=r.byteLength;return e}function f(s,n){return[s.slice(0,n),s.slice(n)]}var I=new TextDecoder("utf-8"),d=class extends U.default.Inflate{constructor(e,t){super(e);this.ended=!1;this.chunks=[];this.reader=t}onEnd(e){this.err=e,this.err||(this.reader._rawOffset+=this.strm.total_in)}},h=class s{static async readFully(n){let e=[],t=0;for await(let r of n)e.push(r),t+=r.byteLength;return w(e,t)}getReadableStream(){let n=this[Symbol.asyncIterator]();return new ReadableStream({pull(e){return n.next().then(t=>{t.done||!t.value?e.close():e.enqueue(t.value)})}})}async readFully(){return await s.readFully(this)}async readline(n=0){let e=await this.readlineRaw(n);return e?I.decode(e):""}async*iterLines(n=0){let e=null;for(;e=await this.readline(n);)yield e}};function q(s){return s&&Symbol.iterator in Object(s)}function M(s){return s&&Symbol.asyncIterator in Object(s)}var _=class s extends h{constructor(e,t="gzip",r=!1){super();this.compressed=t,this.opts={raw:t==="deflateRaw"},this.inflator=t?new d(this.opts,this):null;let i;if(M(e))i=e;else if(typeof e=="object"&&"read"in e&&typeof e.read=="function")i=s.fromReadable(e);else if(e instanceof ReadableStream)i=s.fromReadable(e.getReader());else if(q(e))i=s.fromIter(e);else throw new TypeError("Invalid Stream Source");r?this._sourceIter=this.dechunk(i):this._sourceIter=i[Symbol.asyncIterator](),this.lastValue=null,this.errored=!1,this._savedChunk=null,this._rawOffset=0,this._readOffset=0,this.numChunks=0}async _loadNext(){let e=await this._sourceIter.next();return e.done?null:e.value}async*dechunk(e){let t=e instanceof s?e:new s(e,null),r=-1,i=!0;for(;r!=0;){let a=await t.readlineRaw(64),o=new Uint8Array;if(r=a?parseInt(I.decode(a),16):0,!r||r>2**32){if(Number.isNaN(r)||r>2**32){i||(this.errored=!0),yield a;break}}else if(o=await t.readSize(r),o.length!=r){i?yield a:this.errored=!0,yield o;break}let l=await t.readSize(2);if(l[0]!=13||l[1]!=10){i?yield a:this.errored=!0,yield o,yield l;break}else{if(i=!1,!o||r===0)return;yield o}}yield*t}unread(e){e.length&&(this._readOffset-=e.length,this._savedChunk&&console.log("Already have chunk!"),this._savedChunk=e)}async _next(){if(this._savedChunk){let t=this._savedChunk;return this._savedChunk=null,t}if(this.compressed){let t=this._getNextChunk();if(t)return t}let e=await this._loadNext();for(;this.compressed&&e;){this._push(e);let t=this._getNextChunk(e);if(t)return t;e=await this._loadNext()}return e}_push(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _push when this.compressed is null");this.lastValue=e,this.inflator.ended&&(this.inflator=new d(this.opts,this)),this.inflator.push(e),this.inflator.err&&this.inflator.ended&&this.compressed==="deflate"&&this.opts.raw===!1&&this.numChunks===0&&(this.opts.raw=!0,this.compressed="deflateRaw",this.inflator=new d(this.opts,this),this.inflator.push(e))}_getNextChunk(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _getNextChunk when this.compressed is null");for(;;){if(this.inflator.chunks.length>0)return this.numChunks++,this.inflator.chunks.shift();if(this.inflator.ended){if(this.inflator.err!==0)return this.compressed=null,e;let t=this.inflator.strm.avail_in;if(t&&this.lastValue){this._push(this.lastValue.slice(-t));continue}}return null}}async*[Symbol.asyncIterator](){let e=null;for(;e=await this._next();)this._readOffset+=e.length,yield e}async readlineRaw(e){let t=[],r=0,i=-1,a=null;for await(let o of this){if(e&&r+o.byteLength>e){a=o,i=e-r-1;let l=o.slice(0,i+1).indexOf(10);l>=0&&(i=l);break}if(i=o.indexOf(10),i>=0){a=o;break}t.push(o),r+=o.byteLength}if(a){let[o,l]=f(a,i+1);t.push(o),r+=o.byteLength,this.unread(l)}else if(!t.length)return null;return w(t,r)}async readFully(){return(await this._readOrSkip())[1]}async readSize(e){return(await this._readOrSkip(e))[1]}async skipSize(e){return(await this._readOrSkip(e,!0))[0]}async _readOrSkip(e=-1,t=!1){let r=[],i=0;for await(let a of this){if(e>=0)if(a.length>e){let[o,l]=f(a,e);t||r.push(o),i+=o.byteLength,this.unread(l);break}else if(a.length===e){t||r.push(a),i+=a.byteLength,e=0;break}else e-=a.length;t||r.push(a),i+=a.byteLength}return t?[i,new Uint8Array]:[i,w(r,i)]}getReadOffset(){return this._readOffset}getRawOffset(){return this.compressed?this._rawOffset:this._readOffset}getRawLength(e){return this.compressed?this.inflator.strm.total_in:this._readOffset-e}static fromReadable(e){return{async*[Symbol.asyncIterator](){let r=null;for(;(r=await e.read())&&!r.done;)yield r.value}}}static fromIter(e){return{async*[Symbol.asyncIterator](){for(let r of e)yield r}}}},C=class extends h{constructor(e,t,r=0){super();this.sourceIter=e,this.length=t,this.limit=t,this.skip=r}setLimitSkip(e,t=0){this.limit=e,this.skip=t}async*[Symbol.asyncIterator](){if(!(this.limit<=0))for await(let e of this.sourceIter){if(this.skip>0)if(e.length>=this.skip){let[,t]=f(e,this.skip);e=t,this.skip=0}else{this.skip-=e.length;continue}if(e.length>this.limit){let[t,r]=f(e,this.limit);e=t,this.sourceIter.unread&&this.sourceIter.unread(r)}if(e.length&&(this.limit-=e.length,yield e),this.limit<=0)break}}async readlineRaw(e){if(this.limit<=0)return null;let t=await this.sourceIter.readlineRaw(e?Math.min(e,this.limit):this.limit);return this.limit-=t?.length||0,t}async skipFully(){let e=this.limit;for(;this.limit>0;)this.limit-=await this.sourceIter.skipSize(this.limit);return e}};var z=new Uint8Array([13,10]),L=new Uint8Array([13,10,13,10]),ee=new TextDecoder("utf-8");var v=new TextEncoder,x=class{},u=class extends x{constructor(){super(...arguments);this.buffers=[]}write(e){this.buffers.push(e)}async*readAll(){for(let e of this.buffers)yield e}},b=class s extends h{constructor(e,t={},r=new u){super();this.gzip=!1;this.digestAlgo="";this.digestAlgoPrefix="";this.digestBase32=!1;this.preferPako=!1;this._alreadyDigested=!1;this.blockHasher=null;this.payloadHasher=null;this.httpHeadersBuff=null;this.warcHeadersBuff=null;this.gzip=!!t.gzip,this.record=e;let i=t&&t.digest||{};this.digestAlgo=i?.algo||"sha-256",this.digestAlgoPrefix=i?.prefix||"sha256:",this.digestBase32=!!i?.base32,this.preferPako=!!t?.preferPako,s.noComputeDigest(e)&&(this.digestAlgo=""),this.externalBuffer=r}static async serialize(e,t,r=new u){return await new s(e,t,r).readFully()}static noComputeDigest(e){return e.warcType==="revisit"||e.warcType==="warcinfo"||e.warcPayloadDigest&&e.warcBlockDigest}async*[Symbol.asyncIterator](){if(!this.gzip){yield*this.generateRecord();return}if("CompressionStream"in globalThis&&!this.preferPako){let e=new globalThis.CompressionStream("gzip");yield*this.streamCompress(e)}else yield*this.pakoCompress()}async readlineRaw(e){return null}async*pakoCompress(){let e=new H.default.Deflate({gzip:!0}),t=null;for await(let r of this.generateRecord())for(t&&t.length>0&&e.push(t),t=r;e.chunks.length;)yield e.chunks.shift();t&&e.push(t,!0),yield e.result}async*streamCompress(e){let t=this.generateRecord();new ReadableStream({async pull(o){let l=await t.next();l.done?o.close():o.enqueue(l.value)}}).pipeThrough(e);let i=null,a=e.readable.getReader();for(;(i=await a.read())&&!i.done;)yield i.value}newHasher(){switch(this.digestAlgo){case"sha-256":return(0,p.createSHA256)();case"sha-1":return(0,p.createSHA1)();case"":return null;default:return(0,p.createSHA256)()}}getDigest(e){return this.digestAlgoPrefix+(this.digestBase32?(0,B.default)(e.digest("binary"),"RFC4648"):e.digest("hex"))}async digestRecord(){let e=this.record;if(this._alreadyDigested)return Number(e.warcHeaders.headers.get("Content-Length"));let t=await this.newHasher(),r=await this.newHasher(),i=0;e.httpHeaders&&(this.httpHeadersBuff=v.encode(e.httpHeaders.toString()+`\r
`),i+=this.httpHeadersBuff.length,t?.update(this.httpHeadersBuff));for await(let a of e.reader)t?.update(a),r?.update(a),await this.externalBuffer.write(a),i+=a.length;return r&&e.warcHeaders.headers.set("WARC-Payload-Digest",this.getDigest(r)),t&&e.warcHeaders.headers.set("WARC-Block-Digest",this.getDigest(t)),e.warcHeaders.headers.set("Content-Length",i.toString()),this.warcHeadersBuff=v.encode(e.warcHeaders.toString()),this._alreadyDigested=!0,i}async*generateRecord(){if(await this.digestRecord(),this.warcHeadersBuff&&(yield this.warcHeadersBuff),yield z,this.httpHeadersBuff&&(yield this.httpHeadersBuff),this.externalBuffer)for await(let e of this.externalBuffer.readAll())yield e;yield L}};var R=1024*1024*2,A=class s extends b{static async serialize(n,e){return await new s(n,e).readFully()}constructor(n,e={}){super(n,e,new y(e.maxMemSize||R))}},y=class extends u{constructor(e=R){super();this.currSize=0;this.fh=null;this.filename="";this.memSize=e}write(e){this.currSize+e.length<=this.memSize?this.buffers.push(e):(this.fh||(this.filename=(0,T.temporaryFile)(),this.fh=k.default.createWriteStream(this.filename)),this.fh.write(e)),this.currSize+=e.length}async*readAll(){for(let t of this.buffers)yield t;if(!this.fh)return;await V(this.fh),this.fh=null;let e=k.default.createReadStream(this.filename);for await(let t of e)yield t;await(0,O.unlink)(this.filename)}};function V(s){let n=new Promise(e=>{s.once("finish",()=>e())});return s.end(),n}0&&(module.exports={DEFAULT_MEM_SIZE,TempFileBuffer,WARCSerializer});
