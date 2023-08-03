"use strict";var he=Object.create;var E=Object.defineProperty;var ue=Object.getOwnPropertyDescriptor;var fe=Object.getOwnPropertyNames;var pe=Object.getPrototypeOf,ye=Object.prototype.hasOwnProperty;var ge=(a,r)=>{for(var e in r)E(a,e,{get:r[e],enumerable:!0})},re=(a,r,e,t)=>{if(r&&typeof r=="object"||typeof r=="function")for(let s of fe(r))!ye.call(a,s)&&s!==e&&E(a,s,{get:()=>r[s],enumerable:!(t=ue(r,s))||t.enumerable});return a};var z=(a,r,e)=>(e=a!=null?he(pe(a)):{},re(r||!a||!a.__esModule?E(e,"default",{value:a,enumerable:!0}):e,a)),Re=a=>re(E({},"__esModule",{value:!0}),a);var Pe={};ge(Pe,{AsyncIterReader:()=>y,BaseAsyncIterReader:()=>h,BaseSerializerBuffer:()=>S,CDXAndRecordIndexer:()=>D,CDXIndexer:()=>T,FullRecordWARCSerializer:()=>B,Indexer:()=>I,LimitReader:()=>g,NoConcatInflator:()=>A,StatusAndHeaders:()=>m,StatusAndHeadersParser:()=>C,WARCParser:()=>x,WARCRecord:()=>_,WARCSerializer:()=>k,WARC_1_0:()=>P,WARC_1_1:()=>Q,appendRequestQuery:()=>q,concatChunks:()=>R,getSurt:()=>U,jsonToQueryParams:()=>N,jsonToQueryString:()=>H,mfdToQueryParams:()=>$,mfdToQueryString:()=>j,postToGetUrl:()=>L,splitChunk:()=>p});module.exports=Re(Pe);var ne=z(require("pako"),1);function se(a){let r;typeof a=="string"?r=a:a&&a.length?r=a.reduce((e,t)=>(e+=String.fromCharCode(t),e),""):a?r=a.toString():r="";try{return"__wb_post_data="+btoa(r)}catch{return"__wb_post_data="}}function me(a){return a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function U(a){try{if(!a.startsWith("https:")&&!a.startsWith("http:"))return a;a=a.replace(/^(https?:\/\/)www\d*\./,"$1");let r=a.toLowerCase(),e=new URL(r),s=e.hostname.split(".").reverse().join(",");if(e.port&&(s+=":"+e.port),s+=")",s+=e.pathname,e.search){e.searchParams.sort(),s+=e.search;for(let[n,i]of e.searchParams.entries())if(!i){let o=new RegExp(`(?<=[&?])${me(n)}=(?=&|$)`);o.exec(r)||(s=s.replace(o,n))}}return s}catch{return a}}function L(a){let{method:r,headers:e,postData:t}=a;if(r==="GET")return!1;let s=(e.get("content-type")||"").split(";")[0];function n(o){return o instanceof Uint8Array&&(o=new TextDecoder().decode(o)),o}let i="";switch(s){case"application/x-www-form-urlencoded":i=n(t);break;case"application/json":i=H(n(t));break;case"text/plain":try{i=H(n(t),!1)}catch{i=se(t)}break;case"multipart/form-data":{let o=e.get("content-type");if(!o)throw new Error("utils cannot call postToGetURL when missing content-type header");i=j(n(t),o);break}default:i=se(t)}return i!==null?(a.url=q(a.url,i,a.method),a.method="GET",a.requestBody=i,!0):!1}function q(a,r,e){if(!e)return a;let t=a.indexOf("?")>0?"&":"?";return`${a}${t}__wb_method=${e}&${r}`}function N(a,r=!0){if(typeof a=="string")try{a=JSON.parse(a)}catch{a={}}let e=new URLSearchParams,t={},s=n=>e.has(n)?(n in t||(t[n]=1),n+"."+ ++t[n]+"_"):n;try{JSON.stringify(a,(n,i)=>(["object","function"].includes(typeof i)||e.set(s(n),i),i))}catch(n){if(!r)throw n}return e}function $(a,r){let e=new URLSearchParams;a instanceof Uint8Array&&(a=new TextDecoder().decode(a));try{let t=r.split("boundary=")[1],s=a.split(new RegExp("-*"+t+"-*","mi"));for(let n of s){let i=n.trim().match(/name="([^"]+)"\r\n\r\n(.*)/im);i&&e.set(i[1],i[2])}}catch{}return e}function H(a,r=!0){return N(a,r).toString()}function j(a,r){return $(a,r).toString()}function R(a,r){if(a.length===1)return a[0];let e=new Uint8Array(r),t=0;for(let s of a)e.set(s,t),t+=s.byteLength;return e}function p(a,r){return[a.slice(0,r),a.slice(r)]}var ae=new TextDecoder("utf-8"),A=class extends ne.default.Inflate{constructor(e,t){super(e);this.ended=!1;this.chunks=[];this.reader=t}onEnd(e){this.err=e,this.err||(this.reader._rawOffset+=this.strm.total_in)}},h=class a{static async readFully(r,e=[]){let t=e,s=0;if(e)for(let n of e)s+=n.length;for await(let n of r)t.push(n),s+=n.byteLength;return R(t,s)}getReadableStream(){let r=this[Symbol.asyncIterator]();return new ReadableStream({pull(e){return r.next().then(t=>{t.done||!t.value?e.close():e.enqueue(t.value)})}})}async readFully(r=[]){return await a.readFully(this,r)}async readline(r=0){let e=await this.readlineRaw(r);return e?ae.decode(e):""}async*iterLines(r=0){let e=null;for(;e=await this.readline(r);)yield e}};function we(a){return a&&Symbol.iterator in Object(a)}function Ae(a){return a&&Symbol.asyncIterator in Object(a)}var y=class a extends h{constructor(e,t="gzip",s=!1){super();this.compressed=t,this.opts={raw:t==="deflateRaw"},this.inflator=t?new A(this.opts,this):null;let n;if(Ae(e))n=e;else if(typeof e=="object"&&"read"in e&&typeof e.read=="function")n=a.fromReadable(e);else if(e instanceof ReadableStream)n=a.fromReadable(e.getReader());else if(we(e))n=a.fromIter(e);else throw new TypeError("Invalid Stream Source");s?this._sourceIter=this.dechunk(n):this._sourceIter=n[Symbol.asyncIterator](),this.lastValue=null,this.errored=!1,this._savedChunk=null,this._rawOffset=0,this._readOffset=0,this.numChunks=0}async _loadNext(){let e=await this._sourceIter.next();return e.done?null:e.value}async*dechunk(e){let t=e instanceof a?e:new a(e,null),s=-1,n=!0;for(;s!=0;){let i=await t.readlineRaw(64),o=new Uint8Array;if(s=i?parseInt(ae.decode(i),16):0,!s||s>2**32){if(Number.isNaN(s)||s>2**32){n||(this.errored=!0),yield i;break}}else if(o=await t.readSize(s),o.length!=s){n?yield i:this.errored=!0,yield o;break}let l=await t.readSize(2);if(l[0]!=13||l[1]!=10){n?yield i:this.errored=!0,yield o,yield l;break}else{if(n=!1,!o||s===0)return;yield o}}yield*t}unread(e){e.length&&(this._readOffset-=e.length,this._savedChunk&&console.log("Already have chunk!"),this._savedChunk=e)}async _next(){if(this._savedChunk){let t=this._savedChunk;return this._savedChunk=null,t}if(this.compressed){let t=this._getNextChunk();if(t)return t}let e=await this._loadNext();for(;this.compressed&&e;){this._push(e);let t=this._getNextChunk(e);if(t)return t;e=await this._loadNext()}return e}_push(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _push when this.compressed is null");this.lastValue=e,this.inflator.ended&&(this.inflator=new A(this.opts,this)),this.inflator.push(e),this.inflator.err&&this.inflator.ended&&this.compressed==="deflate"&&this.opts.raw===!1&&this.numChunks===0&&(this.opts.raw=!0,this.compressed="deflateRaw",this.inflator=new A(this.opts,this),this.inflator.push(e))}_getNextChunk(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _getNextChunk when this.compressed is null");for(;;){if(this.inflator.chunks.length>0)return this.numChunks++,this.inflator.chunks.shift();if(this.inflator.ended){if(this.inflator.err!==0)return this.compressed=null,e;let t=this.inflator.strm.avail_in;if(t&&this.lastValue){this._push(this.lastValue.slice(-t));continue}}return null}}async*[Symbol.asyncIterator](){let e=null;for(;e=await this._next();)this._readOffset+=e.length,yield e}async readlineRaw(e){let t=[],s=0,n=-1,i=null;for await(let o of this){if(e&&s+o.byteLength>e){i=o,n=e-s-1;let l=o.slice(0,n+1).indexOf(10);l>=0&&(n=l);break}if(n=o.indexOf(10),n>=0){i=o;break}t.push(o),s+=o.byteLength}if(i){let[o,l]=p(i,n+1);t.push(o),s+=o.byteLength,this.unread(l)}else if(!t.length)return null;return R(t,s)}async readFully(e=[]){return(await this._readOrSkip(-1,!1,e))[1]}async readSize(e){return(await this._readOrSkip(e))[1]}async skipSize(e){return(await this._readOrSkip(e,!0))[0]}async _readOrSkip(e=-1,t=!1,s=[]){let n=s,i=0;for await(let o of this){if(e>=0)if(o.length>e){let[l,d]=p(o,e);t||n.push(l),i+=l.byteLength,this.unread(d);break}else if(o.length===e){t||n.push(o),i+=o.byteLength,e=0;break}else e-=o.length;t||n.push(o),i+=o.byteLength}return t?[i,new Uint8Array]:[i,R(n,i)]}getReadOffset(){return this._readOffset}getRawOffset(){return this.compressed?this._rawOffset:this._readOffset}getRawLength(e){return this.compressed?this.inflator.strm.total_in:this._readOffset-e}static fromReadable(e){return{async*[Symbol.asyncIterator](){let s=null;for(;(s=await e.read())&&!s.done;)yield s.value}}}static fromIter(e){return{async*[Symbol.asyncIterator](){for(let s of e)yield s}}}},g=class extends h{constructor(e,t,s=0){super();this.sourceIter=e,this.length=t,this.limit=t,this.skip=s}setLimitSkip(e,t=0){this.limit=e,this.skip=t}async*[Symbol.asyncIterator](){if(!(this.limit<=0))for await(let e of this.sourceIter){if(this.skip>0)if(e.length>=this.skip){let[,t]=p(e,this.skip);e=t,this.skip=0}else{this.skip-=e.length;continue}if(e.length>this.limit){let[t,s]=p(e,this.limit);e=t,this.sourceIter.unread&&this.sourceIter.unread(s)}if(e.length&&(this.limit-=e.length,yield e),this.limit<=0)break}}async readlineRaw(e){if(this.limit<=0)return null;let t=await this.sourceIter.readlineRaw(e?Math.min(e,this.limit):this.limit);return this.limit-=t?.length||0,t}async skipFully(){let e=this.limit;for(;this.limit>0;)this.limit-=await this.sourceIter.skipSize(this.limit);return e}};var M=new Uint8Array([13,10]),V=new Uint8Array([13,10,13,10]),Ce=new TextDecoder("utf-8"),m=class{constructor({statusline:r,headers:e}){this.statusline=r,this.headers=e}toString(){let r=[this.statusline];for(let[e,t]of this.headers)r.push(`${e}: ${t}`);return r.join(`\r
`)+`\r
`}async*iterSerialize(r){yield r.encode(this.statusline),yield M;for(let[e,t]of this.headers)yield r.encode(`${e}: ${t}\r
`)}_parseResponseStatusLine(){let r=_e(this.statusline," ",2);this._protocol=r[0]??"",this._statusCode=r.length>1?Number(r[1]):"",this._statusText=r.length>2?r[2]:""}get statusCode(){return this._statusCode===void 0&&this._parseResponseStatusLine(),this._statusCode}get protocol(){return this._protocol===void 0&&this._parseResponseStatusLine(),this._protocol}get statusText(){return this._statusText===void 0&&this._parseResponseStatusLine(),this._statusText}_parseRequestStatusLine(){let r=this.statusline.split(" ",2);this._method=r[0]??"",this._requestPath=r.length>1?r[1]:""}get method(){return this._method===void 0&&this._parseRequestStatusLine(),this._method}get requestPath(){return this._requestPath===void 0&&this._parseRequestStatusLine(),this._requestPath}},C=class{async parse(r,{headersClass:e,firstLine:t}={headersClass:Map}){let s=t||await r.readline();if(!s)return null;let n=s.trimEnd();if(!n)return null;let i=new e,o=await be(r),l=0,d,u,f,W="",c;for(;l<o.length;){if(f=o.indexOf(`
`,l),c&&(o[l]===" "||o[l]==="	"))c+=o.slice(l,f<0?void 0:f).trimEnd();else{if(c){try{i.set(W,c)}catch{}c=null}d=o.indexOf(":",l),u=d<0?l:d+1,d>=0&&d<f?(W=o.slice(l,d).trimStart(),c=o.slice(u,f<0?void 0:f).trim()):c=null}if(f<0)break;l=f+1}if(c)try{i.set(W,c)}catch{}return new m({statusline:n,headers:i})}};function _e(a,r,e){let t=a.split(r),s=t.slice(0,e);return t.slice(e).length>0&&s.push(t.slice(e).join(r)),s}async function xe(a,r){let e=0;for(let t=0;t<a.length-4;t++){let s=a.indexOf(13,e);if(s<0)break;if(s+3>=a.length){let{value:n}=await r.next();if(!n)break;let i=new Uint8Array(n.length+a.length);i.set(a,0),i.set(n,a.length),a=i}if(a[s+1]===10&&a[s+2]===13&&a[s+3]===10)return[s+3,a];e=s+1}return[-1,a]}async function be(a){let r=[],e=0,t=0,s=null,n=a[Symbol.asyncIterator]();for await(let i of n){if([t,i]=await xe(i,n),t>=0){s=i;break}r.push(i),e+=i.byteLength}if(s){let[i,o]=p(s,t+1);r.push(i),e+=i.byteLength,a.unread(o)}else if(!r.length)return"";return Ce.decode(R(r,e))}var oe=z(require("uuid-random"),1);var Se=new TextDecoder("utf-8"),ke=new TextEncoder,Q="WARC/1.1",P="WARC/1.0",Ie="http://netpreserve.org/warc/1.0/revisit/identical-payload-digest",Te="http://netpreserve.org/warc/1.1/revisit/identical-payload-digest",We={warcinfo:"application/warc-fields",response:"application/http; msgtype=response",revisit:"application/http; msgtype=response",request:"application/http; msgtype=request",metadata:"application/warc-fields"},_=class a extends h{constructor({warcHeaders:e,reader:t}){super();this._offset=0;this._length=0;this.method="";this.requestBody="";this._urlkey="";this.warcHeaders=e,this._reader=t,this._contentReader=null,this.payload=null,this.httpHeaders=null,this.consumed="",this.fixUp()}static create({url:e,date:t,type:s,warcHeaders:n={},filename:i="",httpHeaders:o={},statusline:l="HTTP/1.1 200 OK",warcVersion:d=P,keepHeadersCase:u=!0,refersToUrl:f=void 0,refersToDate:W=void 0}={},c){function F(b){let ce=b;return d===P&&(b=b.split(".")[0],b.charAt(ce.length-1)!="Z"&&(b+="Z")),b}t=F(t||new Date().toISOString()),n={...n},s==="warcinfo"?i&&(n["WARC-Filename"]=i):n["WARC-Target-URI"]=e,n["WARC-Date"]=t,n["WARC-Type"]=s,s==="revisit"&&(n["WARC-Profile"]=d===Q?Te:Ie,n["WARC-Refers-To-Target-URI"]=f,n["WARC-Refers-To-Date"]=F(W||new Date().toISOString())),n=new m({statusline:d,headers:u?new Map(Object.entries(n)):new Headers(n)}),n.headers.get("WARC-Record-ID")||n.headers.set("WARC-Record-ID",`<urn:uuid:${(0,oe.default)()}>`),n.headers.get("Content-Type")||n.headers.set("Content-Type",s&&We[s]||"application/octet-stream"),c||(c=ie());let ee=new a({warcHeaders:n,reader:c}),te=null,J=[];switch(s){case"response":case"request":case"revisit":J=Object.entries(o),te=u?new Map(J):new Headers(o),(J.length>0||s!=="revisit")&&(ee.httpHeaders=new m({statusline:l,headers:te}));break}return ee}static createWARCInfo(e={},t){async function*s(){for(let[n,i]of Object.entries(t))yield ke.encode(`${n}: ${i}\r
`)}return e.type="warcinfo",a.create(e,s())}getResponseInfo(){let e=this.httpHeaders;return e?{headers:e.headers,status:e.statusCode,statusText:e.statusText}:null}fixUp(){let e=this.warcHeaders.headers.get("WARC-Target-URI");e&&e.startsWith("<")&&e.endsWith(">")&&this.warcHeaders.headers.set("WARC-Target-URI",e.slice(1,-1))}async readFully(e=!1,t=[]){if(this.httpHeaders){if(this.payload&&!this.payload.length)return t&&t[0]||this.payload;if(this._contentReader&&!e)throw new TypeError("WARC Record decoding already started, but requesting raw payload");if(e&&this.consumed==="raw"&&this.payload)return await this._createDecodingReader([this.payload]).readFully(t)}return this.payload?this.payload:(e?(this.payload=await super.readFully(t),this.consumed="content"):(this.payload=await h.readFully(this._reader,t),this.consumed="raw"),this.payload)}get reader(){if(this.payload&&!this.payload.length)return ie();if(this._contentReader)throw new TypeError("WARC Record decoding already started, but requesting raw payload");return this._reader}get contentReader(){return this.httpHeaders?(this._contentReader||(this._contentReader=this._createDecodingReader(this._reader)),this._contentReader):this._reader}_createDecodingReader(e){if(!this.httpHeaders)throw new Error("WARCRecord cannot call _createDecodingReader when this.httpHeaders === null");let t=this.httpHeaders.headers.get("Content-Encoding"),s=this.httpHeaders.headers.get("Transfer-Encoding"),n=s==="chunked";return!t&&!n&&(t=s),new y(e,t,n)}async readlineRaw(e){if(this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");if(this.contentReader instanceof h)return this.contentReader.readlineRaw(e);throw new Error("WARCRecord cannot call readlineRaw on this.contentReader if it does not extend BaseAsyncIterReader")}async contentText(){let e=await this.readFully(!0);return Se.decode(e)}async*[Symbol.asyncIterator](){for await(let e of this.contentReader)if(yield e,this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");this.consumed="content"}async skipFully(){if(!this.consumed){if(this._reader instanceof g){let e=await this._reader.skipFully();return this.consumed="skipped",e}throw new Error("WARCRecord cannot call skipFully on this._reader if it is not a LimitReader")}}warcHeader(e){return this.warcHeaders.headers.get(e)}get warcType(){return this.warcHeaders.headers.get("WARC-Type")}get warcTargetURI(){return this.warcHeaders.headers.get("WARC-Target-URI")}get warcDate(){return this.warcHeaders.headers.get("WARC-Date")}get warcRefersToTargetURI(){return this.warcHeaders.headers.get("WARC-Refers-To-Target-URI")}get warcRefersToDate(){return this.warcHeaders.headers.get("WARC-Refers-To-Date")}get warcPayloadDigest(){return this.warcHeaders.headers.get("WARC-Payload-Digest")}get warcBlockDigest(){return this.warcHeaders.headers.get("WARC-Block-Digest")}get warcContentType(){return this.warcHeaders.headers.get("Content-Type")}get warcContentLength(){return Number(this.warcHeaders.headers.get("Content-Length"))}};async function*ie(){}var le=new TextDecoder,K=new Uint8Array([]),x=class a{static parse(r,e){return new a(r,e).parse()}static iterRecords(r,e){return new a(r,e)[Symbol.asyncIterator]()}constructor(r,{keepHeadersCase:e=!1,parseHttp:t=!0}={}){this._offset=0,this._warcHeadersLength=0,this._headersClass=e?Map:Headers,this._parseHttp=t,r instanceof y?this._reader=r:this._reader=new y(r),this._record=null}async readToNextRecord(){if(!this._reader||!this._record)return K;await this._record.skipFully(),this._reader.compressed&&(this._offset=this._reader.getRawOffset());let r=await this._reader.readlineRaw(),e=0;if(!r)r=K;else{if(e=r.byteLength-1,e===9&&le.decode(r).startsWith("WARC/"))return r;for(;e>0;){let t=r[e-1];if(t!==10&&t!==13)break;e--}e&&console.warn(`Content-Length Too Small: Record not followed by newline, Remainder Length: ${e}, Offset: ${this._reader.getRawOffset()-r.byteLength}`)}if(this._reader.compressed)await this._reader.skipSize(2),r=K;else{for(r=await this._reader.readlineRaw();r&&r.byteLength===2;)r=await this._reader.readlineRaw();this._offset=this._reader.getRawOffset(),r&&(this._offset-=r.length)}return r}_initRecordReader(r){return new g(this._reader,Number(r.headers.get("Content-Length")||0))}async parse(){let r=await this.readToNextRecord(),e=r?le.decode(r):"",t=new C,s=await t.parse(this._reader,{firstLine:e,headersClass:this._headersClass});if(!s)return null;this._warcHeadersLength=this._reader.getReadOffset();let n=new _({warcHeaders:s,reader:this._initRecordReader(s)});if(this._record=n,this._parseHttp)switch(n.warcType){case"response":case"request":await this._addHttpHeaders(n,t);break;case"revisit":n.warcContentLength>0&&await this._addHttpHeaders(n,t);break}return n}get offset(){return this._offset}get recordLength(){return this._reader.getRawLength(this._offset)}async*[Symbol.asyncIterator](){let r=null;for(;(r=await this.parse())!==null;)yield r;this._record=null}async _addHttpHeaders(r,e){let t=await e.parse(this._reader,{headersClass:this._headersClass});r.httpHeaders=t;let s=this._reader.getReadOffset()-this._warcHeadersLength;r.reader instanceof g&&r.reader.setLimitSkip(r.warcContentLength-s)}};var Y=z(require("base32-encode"),1),de=z(require("pako"),1),v=require("hash-wasm");var G=new TextEncoder,O=class a extends h{constructor(e,t={}){super();this.gzip=!1;this.digestAlgo="";this.digestAlgoPrefix="";this.digestBase32=!1;this.preferPako=!1;this.gzip=!!t.gzip,this.record=e;let s=t&&t.digest||{};this.digestAlgo=s?.algo||"sha-256",this.digestAlgoPrefix=s?.prefix||"sha256:",this.digestBase32=!!s?.base32,this.preferPako=!!t?.preferPako,a.noComputeDigest(e)&&(this.digestAlgo="")}static noComputeDigest(e){return e.warcType==="revisit"||e.warcType==="warcinfo"||e.warcPayloadDigest&&e.warcBlockDigest}async*[Symbol.asyncIterator](){if(!this.gzip){yield*this.generateRecord();return}if("CompressionStream"in globalThis&&!this.preferPako){let e=new globalThis.CompressionStream("gzip");yield*this.streamCompress(e)}else yield*this.pakoCompress()}async readlineRaw(e){return null}async*pakoCompress(){let e=new de.default.Deflate({gzip:!0}),t=null;for await(let s of this.generateRecord())for(t&&t.length>0&&e.push(t),t=s;e.chunks.length;)yield e.chunks.shift();t&&e.push(t,!0),yield e.result}async*streamCompress(e){let t=this.generateRecord();new ReadableStream({async pull(o){let l=await t.next();l.done?o.close():o.enqueue(l.value)}}).pipeThrough(e);let n=null,i=e.readable.getReader();for(;(n=await i.read())&&!n.done;)yield n.value}},S=class{},X=class extends S{constructor(){super(...arguments);this.buffers=[]}write(e){this.buffers.push(e)}async*readAll(){for(let e of this.buffers)yield e}},k=class a extends O{constructor(e,t={},s=new X){super(e,t);this.blockHasher=null;this.payloadHasher=null;this.httpHeadersBuff=null;this.warcHeadersBuff=null;this.externalBuffer=s}static async serialize(e,t,s=new X){return await new a(e,t,s).readFully()}newHasher(){switch(this.digestAlgo){case"sha-256":return(0,v.createSHA256)();case"sha-1":return(0,v.createSHA1)();case"":return null;default:return(0,v.createSHA256)()}}getDigest(e){return this.digestAlgoPrefix+(this.digestBase32?(0,Y.default)(e.digest("binary"),"RFC4648"):e.digest("hex"))}async digestRecord(){let e=this.record,t=await this.newHasher(),s=await this.newHasher(),n=0;e.httpHeaders&&(this.httpHeadersBuff=G.encode(e.httpHeaders.toString()+`\r
`),n+=this.httpHeadersBuff.length,t?.update(this.httpHeadersBuff));for await(let i of e.reader)t?.update(i),s?.update(i),await this.externalBuffer.write(i),n+=i.length;s&&e.warcHeaders.headers.set("WARC-Payload-Digest",this.getDigest(s)),t&&e.warcHeaders.headers.set("WARC-Block-Digest",this.getDigest(t)),e.warcHeaders.headers.set("Content-Length",n.toString()),this.warcHeadersBuff=G.encode(e.warcHeaders.toString())}async*generateRecord(){if(await this.digestRecord(),this.warcHeadersBuff&&(yield this.warcHeadersBuff),yield M,this.httpHeadersBuff&&(yield this.httpHeadersBuff),this.externalBuffer)for await(let e of this.externalBuffer.readAll())yield e;yield V}},B=class a extends O{static async serialize(r,e){return await new k(r,e).readFully()}static base16(r){return Array.from(new Uint8Array(r)).map(t=>t.toString(16).padStart(2,"0")).join("")}async digestMessage(r){let e=await crypto.subtle.digest(this.digestAlgo,r);return this.digestAlgoPrefix+(this.digestBase32?(0,Y.default)(e,"RFC4648"):a.base16(e))}async*generateRecord(){let r=0,e=null,t=0;this.record.httpHeaders&&(e=G.encode(this.record.httpHeaders.toString()+`\r
`),t=e.length);let s=await this.record.readFully(!1,e?[e]:[]);if(r+=s.length,this.digestAlgo){let i=await this.digestMessage(s),o=t>0?await this.digestMessage(s.slice(t)):i;this.record.warcHeaders.headers.set("WARC-Payload-Digest",o),this.record.warcHeaders.headers.set("WARC-Block-Digest",i)}this.record.warcHeaders.headers.set("Content-Length",r.toString()),yield G.encode(this.record.warcHeaders.toString()),yield M,yield s,yield V}};var He=["offset","warc-type","warc-target-uri"],Z=class{constructor(r={}){this.opts=r,this.fields=r&&r.fields?r.fields.split(","):He,this.parseHttp=!1}serialize(r){return JSON.stringify(r)+`
`}write(r,e){e.write(this.serialize(r))}async writeAll(r,e){for await(let t of this.iterIndex(r))this.write(t,e)}async*iterIndex(r){let e={strictHeaders:!0,parseHttp:this.parseHttp};for(let{filename:t,reader:s}of r){let n=new x(s,e);yield*this.iterRecords(n,t)}}async*iterRecords(r,e){for await(let t of r){await t.skipFully();let s=this.indexRecord(t,r,e);s&&(yield s)}}indexRecord(r,e,t){if(this.filterRecord&&!this.filterRecord(r))return null;let s={},{offset:n,recordLength:i}=e,o={offset:n,length:i,filename:t};for(let l of this.fields)l in o?s[l]=o[l]:this.setField(l,r,s);return s}setField(r,e,t){let s=this.getField(r,e);s!==null&&(t[r]=s)}getField(r,e){if(r==="http:status")return e.httpHeaders&&(e.warcType==="response"||e.warcType==="revisit")?e.httpHeaders.statusCode:null;if(r.startsWith("http:")){if(e.httpHeaders){let t=e.httpHeaders.headers;return t instanceof Map&&(t=new Headers(Object.fromEntries(t))),t.get(r.slice(5))}return null}return e.warcHeaders.headers.get(r)||null}},I=class extends Z{constructor(r){super(r);for(let e of this.fields)if(e.startsWith("http:")){this.parseHttp=!0;break}}},Ue="urlkey,timestamp,url,mime,status,digest,length,offset,filename".split(","),Le="urlkey,timestamp,url,mime,status,digest,redirect,meta,length,offset,filename".split(","),T=class extends I{constructor(e){super(e);switch(this.includeAll=!!e?.all,this.overrideIndexForAll=!!e?.all,this.fields=Ue,this.parseHttp=!0,this.noSurt=!!e?.noSurt,this._lastRecord=null,e?.format){case"cdxj":this.serialize=this.serializeCDXJ;break;case"cdx":this.serialize=this.serializeCDX11;break;case"json":default:break}}async*iterRecords(e,t){this._lastRecord=null;for await(let n of e){await n.readFully();let i=this.indexRecord(n,e,t);i&&(yield i)}let s=this.indexRecord(null,e,t);s&&(yield s)}filterRecord(e){if(this.includeAll)return!0;let t=e.warcType;return!(t==="request"||t==="warcinfo"||(t==="metadata"||t==="resource")&&e.warcContentType==="application/warc-fields")}indexRecord(e,t,s){if(this.overrideIndexForAll)return e?super.indexRecord(e,t,s):null;let n=this._lastRecord;if(this._lastRecord=e,e&&(e._offset=t.offset,e._length=t.recordLength),!n)return null;if(!e||n.warcTargetURI!=e.warcTargetURI)return this.indexRecordPair(n,null,t,s);let i=e.warcType,o=n.warcType;return i==="request"&&(o==="response"||o==="revisit")?(this._lastRecord=null,this.indexRecordPair(n,e,t,s)):(i==="response"||i==="revisit")&&o==="request"?(this._lastRecord=null,this.indexRecordPair(e,n,t,s)):this.indexRecordPair(n,null,t,s)}indexRecordPair(e,t,s,n){let i,o,l=e.warcTargetURI||"";if(t&&t.httpHeaders&&t.httpHeaders.method!=="GET"){let u={url:l,method:t.httpHeaders.method,headers:t.httpHeaders.headers,postData:t.payload};i=u.method,L(u)&&(o=u.requestBody,e.method=i,e.requestBody=o,l=u.url)}e._urlkey=l;let d=super.indexRecord(e,s,n);return d&&(e&&e._offset!==void 0&&(d.offset=e._offset,d.length=e._length),i&&(d.method=i),o&&(d.requestBody=o)),d}serializeCDXJ(e){let{urlkey:t,timestamp:s}=e;return delete e.urlkey,delete e.timestamp,`${t} ${s} ${JSON.stringify(e)}
`}serializeCDX11(e){let t=[];for(let s of Le)t.push(e[s]!=null?e[s]:"-");return t.join(" ")+`
`}getField(e,t){let s=null;switch(e){case"urlkey":return s=t._urlkey||t.warcTargetURI||null,this.noSurt||s===null?s:U(s);case"timestamp":return s=t.warcDate??"",s.replace(/[-:T]/g,"").slice(0,14);case"url":return t.warcTargetURI;case"mime":switch(t.warcType){case"revisit":return"warc/revisit";case"response":case"request":e="http:content-type";break;default:e="content-type"}return s=super.getField(e,t),s?s.toString().split(";",1)[0]?.trim():null;case"status":return super.getField("http:status",t);case"digest":return s=t.warcPayloadDigest,s?s.split(":",2)[1]:null;default:return null}}},D=class extends T{constructor(r){super(r),this.overrideIndexForAll=!1}indexRecordPair(r,e,t,s){let n=super.indexRecordPair(r,e,t,s);return n&&{cdx:n,record:r,reqRecord:e}}};0&&(module.exports={AsyncIterReader,BaseAsyncIterReader,BaseSerializerBuffer,CDXAndRecordIndexer,CDXIndexer,FullRecordWARCSerializer,Indexer,LimitReader,NoConcatInflator,StatusAndHeaders,StatusAndHeadersParser,WARCParser,WARCRecord,WARCSerializer,WARC_1_0,WARC_1_1,appendRequestQuery,concatChunks,getSurt,jsonToQueryParams,jsonToQueryString,mfdToQueryParams,mfdToQueryString,postToGetUrl,splitChunk});
