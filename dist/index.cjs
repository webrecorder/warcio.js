"use strict";var ce=Object.create;var F=Object.defineProperty;var ue=Object.getOwnPropertyDescriptor;var he=Object.getOwnPropertyNames;var fe=Object.getPrototypeOf,pe=Object.prototype.hasOwnProperty;var ye=(n,r)=>{for(var e in r)F(n,e,{get:r[e],enumerable:!0})},Y=(n,r,e,t)=>{if(r&&typeof r=="object"||typeof r=="function")for(let s of he(r))!pe.call(n,s)&&s!==e&&F(n,s,{get:()=>r[s],enumerable:!(t=ue(r,s))||t.enumerable});return n};var E=(n,r,e)=>(e=n!=null?ce(fe(n)):{},Y(r||!n||!n.__esModule?F(e,"default",{value:n,enumerable:!0}):e,n)),ge=n=>Y(F({},"__esModule",{value:!0}),n);var Le={};ye(Le,{AsyncIterReader:()=>g,BaseAsyncIterReader:()=>h,BaseSerializerBuffer:()=>I,CDXAndRecordIndexer:()=>B,CDXIndexer:()=>T,Indexer:()=>H,LimitReader:()=>R,NoConcatInflator:()=>C,StatusAndHeaders:()=>w,StatusAndHeadersParser:()=>b,WARCParser:()=>S,WARCRecord:()=>x,WARCSerializer:()=>D,WARC_1_0:()=>v,WARC_1_1:()=>j,appendRequestQuery:()=>z,concatChunks:()=>m,getSurt:()=>L,jsonToQueryParams:()=>q,jsonToQueryString:()=>U,mfdToQueryParams:()=>N,mfdToQueryString:()=>$,postToGetUrl:()=>P,splitChunk:()=>y});module.exports=ge(Le);var ee=E(require("pako"),1);function Z(n){let r;typeof n=="string"?r=n:n&&n.length?r=n.reduce((e,t)=>(e+=String.fromCharCode(t),e),""):n?r=n.toString():r="";try{return"__wb_post_data="+btoa(r)}catch{return"__wb_post_data="}}function Re(n){return n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function L(n){try{if(!n.startsWith("https:")&&!n.startsWith("http:"))return n;n=n.replace(/^(https?:\/\/)www\d*\./,"$1");let r=n.toLowerCase(),e=new URL(r),s=e.hostname.split(".").reverse().join(",");if(e.port&&(s+=":"+e.port),s+=")",s+=e.pathname,e.search){e.searchParams.sort(),s+=e.search;for(let[a,i]of e.searchParams.entries())if(!i){let o=new RegExp(`(?<=[&?])${Re(a)}=(?=&|$)`);o.exec(r)||(s=s.replace(o,a))}}return s}catch{return n}}function P(n){let{method:r,headers:e,postData:t}=n;if(r==="GET")return!1;let s=(e.get("content-type")||"").split(";")[0];function a(o){return o instanceof Uint8Array&&(o=new TextDecoder().decode(o)),o}let i="";switch(s){case"application/x-www-form-urlencoded":i=a(t);break;case"application/json":i=U(a(t));break;case"text/plain":try{i=U(a(t),!1)}catch{i=Z(t)}break;case"multipart/form-data":{let o=e.get("content-type");if(!o)throw new Error("utils cannot call postToGetURL when missing content-type header");i=$(a(t),o);break}default:i=Z(t)}return i!==null?(n.url=z(n.url,i,n.method),n.method="GET",n.requestBody=i,!0):!1}function z(n,r,e){if(!e)return n;let t=n.indexOf("?")>0?"&":"?";return`${n}${t}__wb_method=${e}&${r}`}function q(n,r=!0){if(typeof n=="string")try{n=JSON.parse(n)}catch{n={}}let e=new URLSearchParams,t={},s=a=>e.has(a)?(a in t||(t[a]=1),a+"."+ ++t[a]+"_"):a;try{JSON.stringify(n,(a,i)=>(["object","function"].includes(typeof i)||e.set(s(a),i),i))}catch(a){if(!r)throw a}return e}function N(n,r){let e=new URLSearchParams;n instanceof Uint8Array&&(n=new TextDecoder().decode(n));try{let t=r.split("boundary=")[1],s=n.split(new RegExp("-*"+t+"-*","mi"));for(let a of s){let i=a.trim().match(/name="([^"]+)"\r\n\r\n(.*)/im);i&&e.set(i[1],i[2])}}catch{}return e}function U(n,r=!0){return q(n,r).toString()}function $(n,r){return N(n,r).toString()}function m(n,r){if(n.length===1)return n[0];let e=new Uint8Array(r),t=0;for(let s of n)e.set(s,t),t+=s.byteLength;return e}function y(n,r){return[n.slice(0,r),n.slice(r)]}var te=new TextDecoder("utf-8"),C=class extends ee.default.Inflate{constructor(e,t){super(e);this.ended=!1;this.chunks=[];this.reader=t}onEnd(e){this.err=e,this.err||(this.reader._rawOffset+=this.strm.total_in)}},h=class n{static async readFully(r){let e=[],t=0;for await(let s of r)e.push(s),t+=s.byteLength;return m(e,t)}getReadableStream(){let r=this[Symbol.asyncIterator]();return new ReadableStream({pull(e){return r.next().then(t=>{t.done||!t.value?e.close():e.enqueue(t.value)})}})}async readFully(){return await n.readFully(this)}async readline(r=0){let e=await this.readlineRaw(r);return e?te.decode(e):""}async*iterLines(r=0){let e=null;for(;e=await this.readline(r);)yield e}};function me(n){return n&&Symbol.iterator in Object(n)}function we(n){return n&&Symbol.asyncIterator in Object(n)}var g=class n extends h{constructor(e,t="gzip",s=!1){super();this.compressed=t,this.opts={raw:t==="deflateRaw"},this.inflator=t?new C(this.opts,this):null;let a;if(we(e))a=e;else if(typeof e=="object"&&"read"in e&&typeof e.read=="function")a=n.fromReadable(e);else if(e instanceof ReadableStream)a=n.fromReadable(e.getReader());else if(me(e))a=n.fromIter(e);else throw new TypeError("Invalid Stream Source");s?this._sourceIter=this.dechunk(a):this._sourceIter=a[Symbol.asyncIterator](),this.lastValue=null,this.errored=!1,this._savedChunk=null,this._rawOffset=0,this._readOffset=0,this.numChunks=0}async _loadNext(){let e=await this._sourceIter.next();return e.done?null:e.value}async*dechunk(e){let t=e instanceof n?e:new n(e,null),s=-1,a=!0;for(;s!=0;){let i=await t.readlineRaw(64),o=new Uint8Array;if(s=i?parseInt(te.decode(i),16):0,!s||s>2**32){if(Number.isNaN(s)||s>2**32){a||(this.errored=!0),yield i;break}}else if(o=await t.readSize(s),o.length!=s){a?yield i:this.errored=!0,yield o;break}let l=await t.readSize(2);if(l[0]!=13||l[1]!=10){a?yield i:this.errored=!0,yield o,yield l;break}else{if(a=!1,!o||s===0)return;yield o}}yield*t}unread(e){e.length&&(this._readOffset-=e.length,this._savedChunk&&console.log("Already have chunk!"),this._savedChunk=e)}async _next(){if(this._savedChunk){let t=this._savedChunk;return this._savedChunk=null,t}if(this.compressed){let t=this._getNextChunk();if(t)return t}let e=await this._loadNext();for(;this.compressed&&e;){this._push(e);let t=this._getNextChunk(e);if(t)return t;e=await this._loadNext()}return e}_push(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _push when this.compressed is null");this.lastValue=e,this.inflator.ended&&(this.inflator=new C(this.opts,this)),this.inflator.push(e),this.inflator.err&&this.inflator.ended&&this.compressed==="deflate"&&this.opts.raw===!1&&this.numChunks===0&&(this.opts.raw=!0,this.compressed="deflateRaw",this.inflator=new C(this.opts,this),this.inflator.push(e))}_getNextChunk(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _getNextChunk when this.compressed is null");for(;;){if(this.inflator.chunks.length>0)return this.numChunks++,this.inflator.chunks.shift();if(this.inflator.ended){if(this.inflator.err!==0)return this.compressed=null,e;let t=this.inflator.strm.avail_in;if(t&&this.lastValue){this._push(this.lastValue.slice(-t));continue}}return null}}async*[Symbol.asyncIterator](){let e=null;for(;e=await this._next();)this._readOffset+=e.length,yield e}async readlineRaw(e){let t=[],s=0,a=-1,i=null;for await(let o of this){if(e&&s+o.byteLength>e){i=o,a=e-s-1;let l=o.slice(0,a+1).indexOf(10);l>=0&&(a=l);break}if(a=o.indexOf(10),a>=0){i=o;break}t.push(o),s+=o.byteLength}if(i){let[o,l]=y(i,a+1);t.push(o),s+=o.byteLength,this.unread(l)}else if(!t.length)return null;return m(t,s)}async readFully(){return(await this._readOrSkip())[1]}async readSize(e){return(await this._readOrSkip(e))[1]}async skipSize(e){return(await this._readOrSkip(e,!0))[0]}async _readOrSkip(e=-1,t=!1){let s=[],a=0;for await(let i of this){if(e>=0)if(i.length>e){let[o,l]=y(i,e);t||s.push(o),a+=o.byteLength,this.unread(l);break}else if(i.length===e){t||s.push(i),a+=i.byteLength,e=0;break}else e-=i.length;t||s.push(i),a+=i.byteLength}return t?[a,new Uint8Array]:[a,m(s,a)]}getReadOffset(){return this._readOffset}getRawOffset(){return this.compressed?this._rawOffset:this._readOffset}getRawLength(e){return this.compressed?this.inflator.strm.total_in:this._readOffset-e}static fromReadable(e){return{async*[Symbol.asyncIterator](){let s=null;for(;(s=await e.read())&&!s.done;)yield s.value}}}static fromIter(e){return{async*[Symbol.asyncIterator](){for(let s of e)yield s}}}},R=class extends h{constructor(e,t,s=0){super();this.sourceIter=e,this.length=t,this.limit=t,this.skip=s}setLimitSkip(e,t=0){this.limit=e,this.skip=t}async*[Symbol.asyncIterator](){if(!(this.limit<=0))for await(let e of this.sourceIter){if(this.skip>0)if(e.length>=this.skip){let[,t]=y(e,this.skip);e=t,this.skip=0}else{this.skip-=e.length;continue}if(e.length>this.limit){let[t,s]=y(e,this.limit);e=t,this.sourceIter.unread&&this.sourceIter.unread(s)}if(e.length&&(this.limit-=e.length,yield e),this.limit<=0)break}}async readlineRaw(e){if(this.limit<=0)return null;let t=await this.sourceIter.readlineRaw(e?Math.min(e,this.limit):this.limit);return this.limit-=t?.length||0,t}async skipFully(){let e=this.limit;for(;this.limit>0;)this.limit-=await this.sourceIter.skipSize(this.limit);return e}};var G=new Uint8Array([13,10]),re=new Uint8Array([13,10,13,10]),Ae=new TextDecoder("utf-8"),w=class{constructor({statusline:r,headers:e}){this.statusline=r,this.headers=e}toString(){let r=[this.statusline];for(let[e,t]of this.headers)r.push(`${e}: ${t}`);return r.join(`\r
`)+`\r
`}async*iterSerialize(r){yield r.encode(this.statusline),yield G;for(let[e,t]of this.headers)yield r.encode(`${e}: ${t}\r
`)}_parseResponseStatusLine(){let r=Ce(this.statusline," ",2);this._protocol=r[0]??"",this._statusCode=r.length>1?Number(r[1]):"",this._statusText=r.length>2?r[2]:""}get statusCode(){return this._statusCode===void 0&&this._parseResponseStatusLine(),this._statusCode}get protocol(){return this._protocol===void 0&&this._parseResponseStatusLine(),this._protocol}get statusText(){return this._statusText===void 0&&this._parseResponseStatusLine(),this._statusText}_parseRequestStatusLine(){let r=this.statusline.split(" ",2);this._method=r[0]??"",this._requestPath=r.length>1?r[1]:""}get method(){return this._method===void 0&&this._parseRequestStatusLine(),this._method}get requestPath(){return this._requestPath===void 0&&this._parseRequestStatusLine(),this._requestPath}},b=class{async parse(r,{headersClass:e,firstLine:t}={headersClass:Map}){let s=t||await r.readline();if(!s)return null;let a=s.trimEnd();if(!a)return null;let i=new e,o=i instanceof Headers,l=await be(r),d=0,u,W,p,f="",c;for(;d<l.length;){if(p=l.indexOf(`
`,d),c&&(l[d]===" "||l[d]==="	"))c+=l.slice(d,p<0?void 0:p).trimEnd();else{if(c){try{o&&f.toLowerCase()==="set-cookie"?i.append(f,c):i.set(f,c)}catch{}c=null}u=l.indexOf(":",d),W=u<0?d:u+1,u>=0&&u<p?(f=l.slice(d,u).trimStart(),c=l.slice(W,p<0?void 0:p).trim()):c=null}if(p<0)break;d=p+1}if(c)try{o&&f.toLowerCase()==="set-cookie"?i.append(f,c):i.set(f,c)}catch{}return new w({statusline:a,headers:i})}};function Ce(n,r,e){let t=n.split(r),s=t.slice(0,e);return t.slice(e).length>0&&s.push(t.slice(e).join(r)),s}async function _e(n,r){let e=0;for(let t=0;t<n.length-4;t++){let s=n.indexOf(13,e);if(s<0)break;if(s+3>=n.length){let{value:a}=await r.next();if(!a)break;let i=new Uint8Array(a.length+n.length);i.set(n,0),i.set(a,n.length),n=i}if(n[s+1]===10&&n[s+2]===13&&n[s+3]===10)return[s+3,n];e=s+1}return[-1,n]}async function be(n){let r=[],e=0,t=0,s=null,a=n[Symbol.asyncIterator]();for await(let i of a){if([t,i]=await _e(i,a),t>=0){s=i;break}r.push(i),e+=i.byteLength}if(s){let[i,o]=y(s,t+1);r.push(i),e+=i.byteLength,n.unread(o)}else if(!r.length)return"";return Ae.decode(m(r,e))}var ne=E(require("uuid-random"),1);var xe=new TextDecoder("utf-8"),Se=new TextEncoder,j="WARC/1.1",v="WARC/1.0",ke="http://netpreserve.org/warc/1.0/revisit/identical-payload-digest",Ie="http://netpreserve.org/warc/1.1/revisit/identical-payload-digest",He={warcinfo:"application/warc-fields",response:"application/http; msgtype=response",revisit:"application/http; msgtype=response",request:"application/http; msgtype=request",metadata:"application/warc-fields"},x=class n extends h{constructor({warcHeaders:e,reader:t}){super();this._offset=0;this._length=0;this.method="";this.requestBody="";this._urlkey="";this.warcHeaders=e,this._reader=t,this._contentReader=null,this.payload=null,this.httpHeaders=null,this.consumed="",this.fixUp()}static create({url:e,date:t,type:s,warcHeaders:a={},filename:i="",httpHeaders:o={},statusline:l="HTTP/1.1 200 OK",warcVersion:d=v,keepHeadersCase:u=!0,refersToUrl:W=void 0,refersToDate:p=void 0}={},f){function c(k){let de=k;return d===v&&(k=k.split(".")[0],k.charAt(de.length-1)!="Z"&&(k+="Z")),k}t=c(t||new Date().toISOString()),a={...a},s==="warcinfo"?i&&(a["WARC-Filename"]=i):e&&(a["WARC-Target-URI"]=e),a["WARC-Date"]=t,s&&(a["WARC-Type"]=s),s==="revisit"&&(a["WARC-Profile"]=d===j?Ie:ke,W&&(a["WARC-Refers-To-Target-URI"]=W,a["WARC-Refers-To-Date"]=c(p||new Date().toISOString())));let _=new w({statusline:d,headers:new Map(Object.entries(a))});_.headers.get("WARC-Record-ID")||_.headers.set("WARC-Record-ID",`<urn:uuid:${(0,ne.default)()}>`),_.headers.get("Content-Type")||_.headers.set("Content-Type",s&&He[s]||"application/octet-stream"),f||(f=se());let V=new n({warcHeaders:_,reader:f}),K=null,M=[];switch(s){case"response":case"request":case"revisit":M=Object.entries(o),K=u?new Map(M):new Headers(o),(M.length>0||s!=="revisit")&&(V.httpHeaders=new w({statusline:l,headers:K}));break}return V}static createWARCInfo(e={},t){async function*s(){for(let[a,i]of Object.entries(t))yield Se.encode(`${a}: ${i}\r
`)}return e.type="warcinfo",n.create(e,s())}getResponseInfo(){let e=this.httpHeaders;return e?{headers:e.headers,status:e.statusCode,statusText:e.statusText}:null}fixUp(){let e=this.warcHeaders.headers.get("WARC-Target-URI");e&&e.startsWith("<")&&e.endsWith(">")&&this.warcHeaders.headers.set("WARC-Target-URI",e.slice(1,-1))}async readFully(e=!1){if(this.httpHeaders){if(this.payload&&!this.payload.length)return this.payload;if(this._contentReader&&!e)throw new TypeError("WARC Record decoding already started, but requesting raw payload");if(e&&this.consumed==="raw"&&this.payload)return await this._createDecodingReader([this.payload]).readFully()}return this.payload?this.payload:(e?(this.payload=await super.readFully(),this.consumed="content"):(this.payload=await n.readFully(this._reader),this.consumed="raw"),this.payload)}get reader(){if(this.payload&&!this.payload.length)return se();if(this._contentReader)throw new TypeError("WARC Record decoding already started, but requesting raw payload");return this._reader}get contentReader(){return this.httpHeaders?(this._contentReader||(this._contentReader=this._createDecodingReader(this._reader)),this._contentReader):this._reader}_createDecodingReader(e){if(!this.httpHeaders)throw new Error("WARCRecord cannot call _createDecodingReader when this.httpHeaders === null");let t=this.httpHeaders.headers.get("Content-Encoding"),s=this.httpHeaders.headers.get("Transfer-Encoding"),a=s==="chunked";return!t&&!a&&(t=s),new g(e,t,a)}async readlineRaw(e){if(this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");if(this.contentReader instanceof h)return this.contentReader.readlineRaw(e);throw new Error("WARCRecord cannot call readlineRaw on this.contentReader if it does not extend BaseAsyncIterReader")}async contentText(){let e=await this.readFully(!0);return xe.decode(e)}async*[Symbol.asyncIterator](){for await(let e of this.contentReader)if(yield e,this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");this.consumed="content"}async skipFully(){if(!this.consumed){if(this._reader instanceof R){let e=await this._reader.skipFully();return this.consumed="skipped",e}throw new Error("WARCRecord cannot call skipFully on this._reader if it is not a LimitReader")}}warcHeader(e){return this.warcHeaders.headers.get(e)}get warcType(){return this.warcHeaders.headers.get("WARC-Type")}get warcTargetURI(){return this.warcHeaders.headers.get("WARC-Target-URI")}get warcDate(){return this.warcHeaders.headers.get("WARC-Date")}get warcRefersToTargetURI(){return this.warcHeaders.headers.get("WARC-Refers-To-Target-URI")}get warcRefersToDate(){return this.warcHeaders.headers.get("WARC-Refers-To-Date")}get warcPayloadDigest(){return this.warcHeaders.headers.get("WARC-Payload-Digest")}get warcBlockDigest(){return this.warcHeaders.headers.get("WARC-Block-Digest")}get warcContentType(){return this.warcHeaders.headers.get("Content-Type")}get warcContentLength(){return Number(this.warcHeaders.headers.get("Content-Length"))}};async function*se(){}var ae=new TextDecoder,X=new Uint8Array([]),S=class n{static parse(r,e){return new n(r,e).parse()}static iterRecords(r,e){return new n(r,e)[Symbol.asyncIterator]()}constructor(r,{keepHeadersCase:e=!1,parseHttp:t=!0}={}){this._offset=0,this._warcHeadersLength=0,this._headersClass=e?Map:Headers,this._parseHttp=t,r instanceof g?this._reader=r:this._reader=new g(r),this._record=null}async readToNextRecord(){if(!this._reader||!this._record)return X;await this._record.skipFully(),this._reader.compressed&&(this._offset=this._reader.getRawOffset());let r=await this._reader.readlineRaw(),e=0;if(!r)r=X;else{if(e=r.byteLength-1,e===9&&ae.decode(r).startsWith("WARC/"))return r;for(;e>0;){let t=r[e-1];if(t!==10&&t!==13)break;e--}e&&console.warn(`Content-Length Too Small: Record not followed by newline, Remainder Length: ${e}, Offset: ${this._reader.getRawOffset()-r.byteLength}`)}if(this._reader.compressed)await this._reader.skipSize(2),r=X;else{for(r=await this._reader.readlineRaw();r&&r.byteLength===2;)r=await this._reader.readlineRaw();this._offset=this._reader.getRawOffset(),r&&(this._offset-=r.length)}return r}_initRecordReader(r){return new R(this._reader,Number(r.headers.get("Content-Length")||0))}async parse(){let r=await this.readToNextRecord(),e=r?ae.decode(r):"",t=new b,s=await t.parse(this._reader,{firstLine:e,headersClass:this._headersClass});if(!s)return null;this._warcHeadersLength=this._reader.getReadOffset();let a=new x({warcHeaders:s,reader:this._initRecordReader(s)});if(this._record=a,this._parseHttp)switch(a.warcType){case"response":case"request":await this._addHttpHeaders(a,t);break;case"revisit":a.warcContentLength>0&&await this._addHttpHeaders(a,t);break}return a}get offset(){return this._offset}get recordLength(){return this._reader.getRawLength(this._offset)}async*[Symbol.asyncIterator](){let r=null;for(;(r=await this.parse())!==null;)yield r;this._record=null}async _addHttpHeaders(r,e){let t=await e.parse(this._reader,{headersClass:this._headersClass});r.httpHeaders=t;let s=this._reader.getReadOffset()-this._warcHeadersLength;r.reader instanceof R&&r.reader.setLimitSkip(r.warcContentLength-s)}};var oe=E(require("base32-encode"),1),le=E(require("pako"),1),O=require("hash-wasm");var ie=new TextEncoder,I=class{},Q=class extends I{constructor(){super(...arguments);this.buffers=[]}write(e){this.buffers.push(e)}async*readAll(){for(let e of this.buffers)yield e}},D=class n extends h{constructor(e,t={},s=new Q){super();this.gzip=!1;this.digestAlgo="";this.digestAlgoPrefix="";this.digestBase32=!1;this.preferPako=!1;this._alreadyDigested=!1;this.blockHasher=null;this.payloadHasher=null;this.httpHeadersBuff=null;this.warcHeadersBuff=null;this.gzip=!!t.gzip,this.record=e;let a=t&&t.digest||{};this.digestAlgo=a?.algo||"sha-256",this.digestAlgoPrefix=a?.prefix||"sha256:",this.digestBase32=!!a?.base32,this.preferPako=!!t?.preferPako,n.noComputeDigest(e)&&(this.digestAlgo=""),this.externalBuffer=s}static async serialize(e,t,s=new Q){return await new n(e,t,s).readFully()}static noComputeDigest(e){return e.warcType==="revisit"||e.warcType==="warcinfo"||e.warcPayloadDigest&&e.warcBlockDigest}async*[Symbol.asyncIterator](){if(!this.gzip){yield*this.generateRecord();return}if("CompressionStream"in globalThis&&!this.preferPako){let e=new globalThis.CompressionStream("gzip");yield*this.streamCompress(e)}else yield*this.pakoCompress()}async readlineRaw(e){return null}async*pakoCompress(){let e=new le.default.Deflate({gzip:!0}),t=null;for await(let s of this.generateRecord())for(t&&t.length>0&&e.push(t),t=s;e.chunks.length;)yield e.chunks.shift();t&&e.push(t,!0),yield e.result}async*streamCompress(e){let t=this.generateRecord();new ReadableStream({async pull(o){let l=await t.next();l.done?o.close():o.enqueue(l.value)}}).pipeThrough(e);let a=null,i=e.readable.getReader();for(;(a=await i.read())&&!a.done;)yield a.value}newHasher(){switch(this.digestAlgo){case"sha-256":return(0,O.createSHA256)();case"sha-1":return(0,O.createSHA1)();case"":return null;default:return(0,O.createSHA256)()}}getDigest(e){return this.digestAlgoPrefix+(this.digestBase32?(0,oe.default)(e.digest("binary"),"RFC4648"):e.digest("hex"))}async digestRecord(){let e=this.record;if(this._alreadyDigested)return Number(e.warcHeaders.headers.get("Content-Length"));let t=await this.newHasher(),s=await this.newHasher(),a=0;e.httpHeaders&&(this.httpHeadersBuff=ie.encode(e.httpHeaders.toString()+`\r
`),a+=this.httpHeadersBuff.length,t?.update(this.httpHeadersBuff));for await(let i of e.reader)t?.update(i),s?.update(i),await this.externalBuffer.write(i),a+=i.length;return s&&e.warcHeaders.headers.set("WARC-Payload-Digest",this.getDigest(s)),t&&e.warcHeaders.headers.set("WARC-Block-Digest",this.getDigest(t)),e.warcHeaders.headers.set("Content-Length",a.toString()),this.warcHeadersBuff=ie.encode(e.warcHeaders.toString()),this._alreadyDigested=!0,a}async*generateRecord(){if(await this.digestRecord(),this.warcHeadersBuff&&(yield this.warcHeadersBuff),yield G,this.httpHeadersBuff&&(yield this.httpHeadersBuff),this.externalBuffer)for await(let e of this.externalBuffer.readAll())yield e;yield re}};var Te=["offset","warc-type","warc-target-uri"],J=class{constructor(r={}){this.opts=r,this.fields=r&&r.fields?r.fields.split(","):Te,this.parseHttp=!1}serialize(r){return JSON.stringify(r)+`
`}write(r,e){e.write(this.serialize(r))}async writeAll(r,e){for await(let t of this.iterIndex(r))this.write(t,e)}async*iterIndex(r){let e={strictHeaders:!0,parseHttp:this.parseHttp};for(let{filename:t,reader:s}of r){let a=new S(s,e);yield*this.iterRecords(a,t)}}async*iterRecords(r,e){for await(let t of r){await t.skipFully();let s=this.indexRecord(t,r,e);s&&(yield s)}}indexRecord(r,e,t){if(this.filterRecord&&!this.filterRecord(r))return null;let s={},{offset:a,recordLength:i}=e,o={offset:a,length:i,filename:t};for(let l of this.fields)l in o?s[l]=o[l]:this.setField(l,r,s);return s}setField(r,e,t){let s=this.getField(r,e);s!==null&&(t[r]=s)}getField(r,e){if(r==="http:status")return e.httpHeaders&&(e.warcType==="response"||e.warcType==="revisit")?e.httpHeaders.statusCode:null;if(r.startsWith("http:")){if(e.httpHeaders){let t=e.httpHeaders.headers;return t instanceof Map&&(t=new Headers(Object.fromEntries(t))),t.get(r.slice(5))}return null}return e.warcHeaders.headers.get(r)||null}},H=class extends J{constructor(r){super(r);for(let e of this.fields)if(e.startsWith("http:")){this.parseHttp=!0;break}}},We="urlkey,timestamp,url,mime,status,digest,length,offset,filename".split(","),Ue="urlkey,timestamp,url,mime,status,digest,redirect,meta,length,offset,filename".split(","),T=class extends H{constructor(e){super(e);switch(this.includeAll=!!e?.all,this.overrideIndexForAll=!!e?.all,this.fields=We,this.parseHttp=!0,this.noSurt=!!e?.noSurt,this._lastRecord=null,e?.format){case"cdxj":this.serialize=this.serializeCDXJ;break;case"cdx":this.serialize=this.serializeCDX11;break;case"json":default:break}}async*iterRecords(e,t){this._lastRecord=null;for await(let a of e){await a.readFully();let i=this.indexRecord(a,e,t);i&&(yield i)}let s=this.indexRecord(null,e,t);s&&(yield s)}filterRecord(e){if(this.includeAll)return!0;let t=e.warcType;return!(t==="request"||t==="warcinfo"||(t==="metadata"||t==="resource")&&e.warcContentType==="application/warc-fields")}indexRecord(e,t,s){if(this.overrideIndexForAll)return e?super.indexRecord(e,t,s):null;let a=this._lastRecord;if(this._lastRecord=e,e&&(e._offset=t.offset,e._length=t.recordLength),!a)return null;if(!e||a.warcTargetURI!=e.warcTargetURI)return this.indexRecordPair(a,null,t,s);let i=e.warcType,o=a.warcType;return i==="request"&&(o==="response"||o==="revisit")?(this._lastRecord=null,this.indexRecordPair(a,e,t,s)):(i==="response"||i==="revisit")&&o==="request"?(this._lastRecord=null,this.indexRecordPair(e,a,t,s)):this.indexRecordPair(a,null,t,s)}indexRecordPair(e,t,s,a){let i,o,l=e.warcTargetURI||"";if(t&&t.httpHeaders&&t.httpHeaders.method!=="GET"){let u={url:l,method:t.httpHeaders.method,headers:t.httpHeaders.headers,postData:t.payload};i=u.method,P(u)&&(o=u.requestBody,e.method=i,e.requestBody=o,l=u.url)}e._urlkey=l;let d=super.indexRecord(e,s,a);return d&&(e&&e._offset!==void 0&&(d.offset=e._offset,d.length=e._length),i&&(d.method=i),o&&(d.requestBody=o)),d}serializeCDXJ(e){let{urlkey:t,timestamp:s}=e;return delete e.urlkey,delete e.timestamp,`${t} ${s} ${JSON.stringify(e)}
`}serializeCDX11(e){let t=[];for(let s of Ue)t.push(e[s]!=null?e[s]:"-");return t.join(" ")+`
`}getField(e,t){let s=null;switch(e){case"urlkey":return s=t._urlkey||t.warcTargetURI||null,this.noSurt||s===null?s:L(s);case"timestamp":return s=t.warcDate??"",s.replace(/[-:T]/g,"").slice(0,14);case"url":return t.warcTargetURI;case"mime":switch(t.warcType){case"revisit":return"warc/revisit";case"response":case"request":e="http:content-type";break;default:e="content-type"}return s=super.getField(e,t),s?s.toString().split(";",1)[0]?.trim():null;case"status":return super.getField("http:status",t);case"digest":return s=t.warcPayloadDigest,s?s.split(":",2)[1]:null;default:return null}}},B=class extends T{constructor(r){super(r),this.overrideIndexForAll=!1}indexRecordPair(r,e,t,s){let a=super.indexRecordPair(r,e,t,s);return a&&{cdx:a,record:r,reqRecord:e}}};0&&(module.exports={AsyncIterReader,BaseAsyncIterReader,BaseSerializerBuffer,CDXAndRecordIndexer,CDXIndexer,Indexer,LimitReader,NoConcatInflator,StatusAndHeaders,StatusAndHeadersParser,WARCParser,WARCRecord,WARCSerializer,WARC_1_0,WARC_1_1,appendRequestQuery,concatChunks,getSurt,jsonToQueryParams,jsonToQueryString,mfdToQueryParams,mfdToQueryString,postToGetUrl,splitChunk});
