"use strict";var D=Object.create;var g=Object.defineProperty;var E=Object.getOwnPropertyDescriptor;var F=Object.getOwnPropertyNames;var M=Object.getPrototypeOf,N=Object.prototype.hasOwnProperty;var $=(s,i)=>{for(var e in i)g(s,e,{get:i[e],enumerable:!0})},_=(s,i,e,t)=>{if(i&&typeof i=="object"||typeof i=="function")for(let r of F(i))!N.call(s,r)&&r!==e&&g(s,r,{get:()=>i[r],enumerable:!(t=E(i,r))||t.enumerable});return s};var m=(s,i,e)=>(e=s!=null?D(M(s)):{},_(i||!s||!s.__esModule?g(e,"default",{value:s,enumerable:!0}):e,s)),q=s=>_(g({},"__esModule",{value:!0}),s);var J={};$(J,{DEFAULT_MEM_SIZE:()=>R,TempFileBuffer:()=>p,WARCSerializer:()=>b});module.exports=q(J);var k=m(require("fs"),1),P=require("fs/promises"),T=require("tempy");var O=m(require("base32-encode"),1),L=m(require("pako"),1),y=require("hash-wasm");var I=m(require("pako"),1);function w(s,i){if(s.length===1)return s[0];let e=new Uint8Array(i),t=0;for(let r of s)e.set(r,t),t+=r.byteLength;return e}function d(s,i){return[s.slice(0,i),s.slice(i)]}var z=new TextDecoder("utf-8"),f=class extends I.default.Inflate{constructor(e,t){super(e);this.ended=!1;this.chunks=[];this.reader=t}onEnd(e){this.err=e,this.err||(this.reader._rawOffset+=this.strm.total_in)}},h=class s{static async readFully(i,e=[]){let t=e,r=0;if(e)for(let n of e)r+=n.length;for await(let n of i)t.push(n),r+=n.byteLength;return w(t,r)}getReadableStream(){let i=this[Symbol.asyncIterator]();return new ReadableStream({pull(e){return i.next().then(t=>{t.done||!t.value?e.close():e.enqueue(t.value)})}})}async readFully(i=[]){return await s.readFully(this,i)}async readline(i=0){let e=await this.readlineRaw(i);return e?z.decode(e):""}async*iterLines(i=0){let e=null;for(;e=await this.readline(i);)yield e}};function j(s){return s&&Symbol.iterator in Object(s)}function V(s){return s&&Symbol.asyncIterator in Object(s)}var C=class s extends h{constructor(e,t="gzip",r=!1){super();this.compressed=t,this.opts={raw:t==="deflateRaw"},this.inflator=t?new f(this.opts,this):null;let n;if(V(e))n=e;else if(typeof e=="object"&&"read"in e&&typeof e.read=="function")n=s.fromReadable(e);else if(e instanceof ReadableStream)n=s.fromReadable(e.getReader());else if(j(e))n=s.fromIter(e);else throw new TypeError("Invalid Stream Source");r?this._sourceIter=this.dechunk(n):this._sourceIter=n[Symbol.asyncIterator](),this.lastValue=null,this.errored=!1,this._savedChunk=null,this._rawOffset=0,this._readOffset=0,this.numChunks=0}async _loadNext(){let e=await this._sourceIter.next();return e.done?null:e.value}async*dechunk(e){let t=e instanceof s?e:new s(e,null),r=-1,n=!0;for(;r!=0;){let o=await t.readlineRaw(64),a=new Uint8Array;if(r=o?parseInt(z.decode(o),16):0,!r||r>2**32){if(Number.isNaN(r)||r>2**32){n||(this.errored=!0),yield o;break}}else if(a=await t.readSize(r),a.length!=r){n?yield o:this.errored=!0,yield a;break}let l=await t.readSize(2);if(l[0]!=13||l[1]!=10){n?yield o:this.errored=!0,yield a,yield l;break}else{if(n=!1,!a||r===0)return;yield a}}yield*t}unread(e){e.length&&(this._readOffset-=e.length,this._savedChunk&&console.log("Already have chunk!"),this._savedChunk=e)}async _next(){if(this._savedChunk){let t=this._savedChunk;return this._savedChunk=null,t}if(this.compressed){let t=this._getNextChunk();if(t)return t}let e=await this._loadNext();for(;this.compressed&&e;){this._push(e);let t=this._getNextChunk(e);if(t)return t;e=await this._loadNext()}return e}_push(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _push when this.compressed is null");this.lastValue=e,this.inflator.ended&&(this.inflator=new f(this.opts,this)),this.inflator.push(e),this.inflator.err&&this.inflator.ended&&this.compressed==="deflate"&&this.opts.raw===!1&&this.numChunks===0&&(this.opts.raw=!0,this.compressed="deflateRaw",this.inflator=new f(this.opts,this),this.inflator.push(e))}_getNextChunk(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _getNextChunk when this.compressed is null");for(;;){if(this.inflator.chunks.length>0)return this.numChunks++,this.inflator.chunks.shift();if(this.inflator.ended){if(this.inflator.err!==0)return this.compressed=null,e;let t=this.inflator.strm.avail_in;if(t&&this.lastValue){this._push(this.lastValue.slice(-t));continue}}return null}}async*[Symbol.asyncIterator](){let e=null;for(;e=await this._next();)this._readOffset+=e.length,yield e}async readlineRaw(e){let t=[],r=0,n=-1,o=null;for await(let a of this){if(e&&r+a.byteLength>e){o=a,n=e-r-1;let l=a.slice(0,n+1).indexOf(10);l>=0&&(n=l);break}if(n=a.indexOf(10),n>=0){o=a;break}t.push(a),r+=a.byteLength}if(o){let[a,l]=d(o,n+1);t.push(a),r+=a.byteLength,this.unread(l)}else if(!t.length)return null;return w(t,r)}async readFully(e=[]){return(await this._readOrSkip(-1,!1,e))[1]}async readSize(e){return(await this._readOrSkip(e))[1]}async skipSize(e){return(await this._readOrSkip(e,!0))[0]}async _readOrSkip(e=-1,t=!1,r=[]){let n=r,o=0;for await(let a of this){if(e>=0)if(a.length>e){let[l,W]=d(a,e);t||n.push(l),o+=l.byteLength,this.unread(W);break}else if(a.length===e){t||n.push(a),o+=a.byteLength,e=0;break}else e-=a.length;t||n.push(a),o+=a.byteLength}return t?[o,new Uint8Array]:[o,w(n,o)]}getReadOffset(){return this._readOffset}getRawOffset(){return this.compressed?this._rawOffset:this._readOffset}getRawLength(e){return this.compressed?this.inflator.strm.total_in:this._readOffset-e}static fromReadable(e){return{async*[Symbol.asyncIterator](){let r=null;for(;(r=await e.read())&&!r.done;)yield r.value}}}static fromIter(e){return{async*[Symbol.asyncIterator](){for(let r of e)yield r}}}},U=class extends h{constructor(e,t,r=0){super();this.sourceIter=e,this.length=t,this.limit=t,this.skip=r}setLimitSkip(e,t=0){this.limit=e,this.skip=t}async*[Symbol.asyncIterator](){if(!(this.limit<=0))for await(let e of this.sourceIter){if(this.skip>0)if(e.length>=this.skip){let[,t]=d(e,this.skip);e=t,this.skip=0}else{this.skip-=e.length;continue}if(e.length>this.limit){let[t,r]=d(e,this.limit);e=t,this.sourceIter.unread&&this.sourceIter.unread(r)}if(e.length&&(this.limit-=e.length,yield e),this.limit<=0)break}}async readlineRaw(e){if(this.limit<=0)return null;let t=await this.sourceIter.readlineRaw(e?Math.min(e,this.limit):this.limit);return this.limit-=t?.length||0,t}async skipFully(){let e=this.limit;for(;this.limit>0;)this.limit-=await this.sourceIter.skipSize(this.limit);return e}};var B=new Uint8Array([13,10]),H=new Uint8Array([13,10,13,10]),re=new TextDecoder("utf-8");var v=new TextEncoder,x=class s extends h{constructor(e,t={}){super();this.gzip=!1;this.digestAlgo="";this.digestAlgoPrefix="";this.digestBase32=!1;this.preferPako=!1;this.gzip=!!t.gzip,this.record=e;let r=t&&t.digest||{};this.digestAlgo=r?.algo||"sha-256",this.digestAlgoPrefix=r?.prefix||"sha256:",this.digestBase32=!!r?.base32,this.preferPako=!!t?.preferPako,s.noComputeDigest(e)&&(this.digestAlgo="")}static noComputeDigest(e){return e.warcType==="revisit"||e.warcType==="warcinfo"||e.warcPayloadDigest&&e.warcBlockDigest}async*[Symbol.asyncIterator](){if(!this.gzip){yield*this.generateRecord();return}if("CompressionStream"in globalThis&&!this.preferPako){let e=new globalThis.CompressionStream("gzip");yield*this.streamCompress(e)}else yield*this.pakoCompress()}async readlineRaw(e){return null}async*pakoCompress(){let e=new L.default.Deflate({gzip:!0}),t=null;for await(let r of this.generateRecord())for(t&&t.length>0&&e.push(t),t=r;e.chunks.length;)yield e.chunks.shift();t&&e.push(t,!0),yield e.result}async*streamCompress(e){let t=this.generateRecord();new ReadableStream({async pull(a){let l=await t.next();l.done?a.close():a.enqueue(l.value)}}).pipeThrough(e);let n=null,o=e.readable.getReader();for(;(n=await o.read())&&!n.done;)yield n.value}},S=class{},c=class extends S{constructor(){super(...arguments);this.buffers=[]}write(e){this.buffers.push(e)}async*readAll(){for(let e of this.buffers)yield e}},A=class s extends x{constructor(e,t={},r=new c){super(e,t);this._alreadyDigested=!1;this.blockHasher=null;this.payloadHasher=null;this.httpHeadersBuff=null;this.warcHeadersBuff=null;this.externalBuffer=r}static async serialize(e,t,r=new c){return await new s(e,t,r).readFully()}newHasher(){switch(this.digestAlgo){case"sha-256":return(0,y.createSHA256)();case"sha-1":return(0,y.createSHA1)();case"":return null;default:return(0,y.createSHA256)()}}getDigest(e){return this.digestAlgoPrefix+(this.digestBase32?(0,O.default)(e.digest("binary"),"RFC4648"):e.digest("hex"))}async digestRecord(){let e=this.record;if(this._alreadyDigested)return Number(e.warcHeaders.headers.get("Content-Length"));let t=await this.newHasher(),r=await this.newHasher(),n=0;e.httpHeaders&&(this.httpHeadersBuff=v.encode(e.httpHeaders.toString()+`\r
`),n+=this.httpHeadersBuff.length,t?.update(this.httpHeadersBuff));for await(let o of e.reader)t?.update(o),r?.update(o),await this.externalBuffer.write(o),n+=o.length;return r&&e.warcHeaders.headers.set("WARC-Payload-Digest",this.getDigest(r)),t&&e.warcHeaders.headers.set("WARC-Block-Digest",this.getDigest(t)),e.warcHeaders.headers.set("Content-Length",n.toString()),this.warcHeadersBuff=v.encode(e.warcHeaders.toString()),this._alreadyDigested=!0,n}async*generateRecord(){if(await this.digestRecord(),this.warcHeadersBuff&&(yield this.warcHeadersBuff),yield B,this.httpHeadersBuff&&(yield this.httpHeadersBuff),this.externalBuffer)for await(let e of this.externalBuffer.readAll())yield e;yield H}};var R=1024*256,b=class s extends A{static async serialize(i,e){return await new s(i,e).readFully()}constructor(i,e={}){super(i,e,new p(e.maxMemSize||R))}},p=class extends c{constructor(e=R){super();this.currSize=0;this.fh=null;this.filename="";this.memSize=e}write(e){this.currSize+e.length<=this.memSize?this.buffers.push(e):(this.fh||(this.filename=(0,T.temporaryFile)(),this.fh=k.default.createWriteStream(this.filename)),this.fh.write(e)),this.currSize+=e.length}async*readAll(){for(let t of this.buffers)yield t;if(!this.fh)return;await Q(this.fh),this.fh=null;let e=k.default.createReadStream(this.filename);for await(let t of e)yield t;await(0,P.unlink)(this.filename)}};function Q(s){let i=new Promise(e=>{s.once("finish",()=>e())});return s.end(),i}0&&(module.exports={DEFAULT_MEM_SIZE,TempFileBuffer,WARCSerializer});
