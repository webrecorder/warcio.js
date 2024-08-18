#!/usr/bin/env node
"use strict";var ne=Object.create;var j=Object.defineProperty;var ie=Object.getOwnPropertyDescriptor;var ae=Object.getOwnPropertyNames;var oe=Object.getPrototypeOf,de=Object.prototype.hasOwnProperty;var le=(n,r,e,t)=>{if(r&&typeof r=="object"||typeof r=="function")for(let s of ae(r))!de.call(n,s)&&s!==e&&j(n,s,{get:()=>r[s],enumerable:!(t=ie(r,s))||t.enumerable});return n};var v=(n,r,e)=>(e=n!=null?ne(oe(n)):{},le(r||!n||!n.__esModule?j(e,"default",{value:n,enumerable:!0}):e,n));var U=require("fs"),ee=require("path"),H=require("process"),te=v(require("yargs"),1),re=require("yargs/helpers");var q=n=>n.positional("filenames",{describe:"WARC file(s) to index",type:"string",array:!0,demandOption:"true"}).option("fields",{alias:"f",describe:"fields to include in index",type:"string"}),B=n=>n.positional("filenames",{describe:"WARC file(s) to index",type:"string",array:!0,demandOption:"true"}).option("all",{alias:"a",describe:"index all WARC records",type:"boolean"}).option("format",{describe:"output format",choices:["json","cdxj","cdx"],default:"cdxj"}).option("noSurt",{describe:"Use plain urlkey, do not convert to SURT form (Sort-friendly URI Reordering Transform)",type:"boolean"});var J=v(require("pako"),1);function N(n){let r;typeof n=="string"?r=n:n&&n.length?r=n.reduce((e,t)=>(e+=String.fromCharCode(t),e),""):n?r=n.toString():r="";try{return"__wb_post_data="+btoa(r)}catch{return"__wb_post_data="}}function ce(n){return n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function z(n){try{if(!n.startsWith("https:")&&!n.startsWith("http:"))return n;n=n.replace(/^(https?:\/\/)www\d*\./,"$1");let r=n.toLowerCase(),e=new URL(r),s=e.hostname.split(".").reverse().join(",");if(e.port&&(s+=":"+e.port),s+=")",s+=e.pathname,e.search){e.searchParams.sort(),s+=e.search;for(let[i,a]of e.searchParams.entries())if(!a){let o=new RegExp(`(?<=[&?])${ce(i)}=(?=&|$)`);o.exec(r)||(s=s.replace(o,i))}}return s}catch{return n}}function M(n){let{method:r,headers:e,postData:t}=n;if(r==="GET")return!1;let s=(e.get("content-type")||"").split(";")[0];function i(o){return o instanceof Uint8Array&&(o=new TextDecoder().decode(o)),o}let a="";switch(s){case"application/x-www-form-urlencoded":a=i(t);break;case"application/json":a=$(i(t));break;case"text/plain":try{a=$(i(t),!1)}catch{a=N(t)}break;case"multipart/form-data":{let o=e.get("content-type");if(!o)throw new Error("utils cannot call postToGetURL when missing content-type header");a=pe(i(t),o);break}default:a=N(t)}return a!==null?(n.url=ue(n.url,a,n.method),n.method="GET",n.requestBody=a,!0):!1}function ue(n,r,e){if(!e)return n;let t=n.indexOf("?")>0?"&":"?";return`${n}${t}__wb_method=${e}&${r}`}function he(n,r=!0){if(typeof n=="string")try{n=JSON.parse(n)}catch{n={}}let e=new URLSearchParams,t={},s=i=>e.has(i)?(i in t||(t[i]=1),i+"."+ ++t[i]+"_"):i;try{JSON.stringify(n,(i,a)=>(["object","function"].includes(typeof a)||e.set(s(i),a),a))}catch(i){if(!r)throw i}return e}function fe(n,r){let e=new URLSearchParams;n instanceof Uint8Array&&(n=new TextDecoder().decode(n));try{let t=r.split("boundary=")[1],s=n.split(new RegExp("-*"+t+"-*","mi"));for(let i of s){let a=i.trim().match(/name="([^"]+)"\r\n\r\n(.*)/im);a&&e.set(a[1],a[2])}}catch{}return e}function $(n,r=!0){return he(n,r).toString()}function pe(n,r){return fe(n,r).toString()}function x(n,r){if(n.length===1)return n[0];let e=new Uint8Array(r),t=0;for(let s of n)e.set(s,t),t+=s.byteLength;return e}function g(n,r){return[n.slice(0,r),n.slice(r)]}var Q=new TextDecoder("utf-8"),S=class extends J.default.Inflate{constructor(e,t){super(e);this.ended=!1;this.chunks=[];this.reader=t}onEnd(e){this.err=e,this.err||(this.reader._rawOffset+=this.strm.total_in)}},y=class n{static async readFully(r){let e=[],t=0;for await(let s of r)e.push(s),t+=s.byteLength;return x(e,t)}getReadableStream(){let r=this[Symbol.asyncIterator]();return new ReadableStream({pull(e){return r.next().then(t=>{t.done||!t.value?e.close():e.enqueue(t.value)})}})}async readFully(){return await n.readFully(this)}async readline(r=0){let e=await this.readlineRaw(r);return e?Q.decode(e):""}async*iterLines(r=0){let e=null;for(;e=await this.readline(r);)yield e}};function ye(n){return n&&Symbol.iterator in Object(n)}function me(n){return n&&Symbol.asyncIterator in Object(n)}var R=class n extends y{constructor(e,t="gzip",s=!1){super();this.compressed=t,this.opts={raw:t==="deflateRaw"},this.inflator=t?new S(this.opts,this):null;let i;if(me(e))i=e;else if(typeof e=="object"&&"read"in e&&typeof e.read=="function")i=n.fromReadable(e);else if(e instanceof ReadableStream)i=n.fromReadable(e.getReader());else if(ye(e))i=n.fromIter(e);else throw new TypeError("Invalid Stream Source");s?this._sourceIter=this.dechunk(i):this._sourceIter=i[Symbol.asyncIterator](),this.lastValue=null,this.errored=!1,this._savedChunk=null,this._rawOffset=0,this._readOffset=0,this.numChunks=0}async _loadNext(){let e=await this._sourceIter.next();return e.done?null:e.value}async*dechunk(e){let t=e instanceof n?e:new n(e,null),s=-1,i=!0;for(;s!=0;){let a=await t.readlineRaw(64),o=new Uint8Array;if(s=a?parseInt(Q.decode(a),16):0,!s||s>2**32){if(Number.isNaN(s)||s>2**32){i||(this.errored=!0),yield a;break}}else if(o=await t.readSize(s),o.length!=s){i?yield a:this.errored=!0,yield o;break}let d=await t.readSize(2);if(d[0]!=13||d[1]!=10){i?yield a:this.errored=!0,yield o,yield d;break}else{if(i=!1,!o||s===0)return;yield o}}yield*t}unread(e){e.length&&(this._readOffset-=e.length,this._savedChunk&&console.log("Already have chunk!"),this._savedChunk=e)}async _next(){if(this._savedChunk){let t=this._savedChunk;return this._savedChunk=null,t}if(this.compressed){let t=this._getNextChunk();if(t)return t}let e=await this._loadNext();for(;this.compressed&&e;){this._push(e);let t=this._getNextChunk(e);if(t)return t;e=await this._loadNext()}return e}_push(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _push when this.compressed is null");this.lastValue=e,this.inflator.ended&&(this.inflator=new S(this.opts,this)),this.inflator.push(e),this.inflator.err&&this.inflator.ended&&this.compressed==="deflate"&&this.opts.raw===!1&&this.numChunks===0&&(this.opts.raw=!0,this.compressed="deflateRaw",this.inflator=new S(this.opts,this),this.inflator.push(e))}_getNextChunk(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _getNextChunk when this.compressed is null");for(;;){if(this.inflator.chunks.length>0)return this.numChunks++,this.inflator.chunks.shift();if(this.inflator.ended){if(this.inflator.err!==0)return this.compressed=null,e;let t=this.inflator.strm.avail_in;if(t&&this.lastValue){this._push(this.lastValue.slice(-t));continue}}return null}}async*[Symbol.asyncIterator](){let e=null;for(;e=await this._next();)this._readOffset+=e.length,yield e}async readlineRaw(e){let t=[],s=0,i=-1,a=null;for await(let o of this){if(e&&s+o.byteLength>e){a=o,i=e-s-1;let d=o.slice(0,i+1).indexOf(10);d>=0&&(i=d);break}if(i=o.indexOf(10),i>=0){a=o;break}t.push(o),s+=o.byteLength}if(a){let[o,d]=g(a,i+1);t.push(o),s+=o.byteLength,this.unread(d)}else if(!t.length)return null;return x(t,s)}async readFully(){return(await this._readOrSkip())[1]}async readSize(e){return(await this._readOrSkip(e))[1]}async skipSize(e){return(await this._readOrSkip(e,!0))[0]}async _readOrSkip(e=-1,t=!1){let s=[],i=0;for await(let a of this){if(e>=0)if(a.length>e){let[o,d]=g(a,e);t||s.push(o),i+=o.byteLength,this.unread(d);break}else if(a.length===e){t||s.push(a),i+=a.byteLength,e=0;break}else e-=a.length;t||s.push(a),i+=a.byteLength}return t?[i,new Uint8Array]:[i,x(s,i)]}getReadOffset(){return this._readOffset}getRawOffset(){return this.compressed?this._rawOffset:this._readOffset}getRawLength(e){return this.compressed?this.inflator.strm.total_in:this._readOffset-e}static fromReadable(e){return{async*[Symbol.asyncIterator](){let s=null;for(;(s=await e.read())&&!s.done;)yield s.value}}}static fromIter(e){return{async*[Symbol.asyncIterator](){for(let s of e)yield s}}}},w=class extends y{constructor(e,t,s=0){super();this.sourceIter=e,this.length=t,this.limit=t,this.skip=s}setLimitSkip(e,t=0){this.limit=e,this.skip=t}async*[Symbol.asyncIterator](){if(!(this.limit<=0))for await(let e of this.sourceIter){if(this.skip>0)if(e.length>=this.skip){let[,t]=g(e,this.skip);e=t,this.skip=0}else{this.skip-=e.length;continue}if(e.length>this.limit){let[t,s]=g(e,this.limit);e=t,this.sourceIter.unread&&this.sourceIter.unread(s)}if(e.length&&(this.limit-=e.length,yield e),this.limit<=0)break}}async readlineRaw(e){if(this.limit<=0)return null;let t=await this.sourceIter.readlineRaw(e?Math.min(e,this.limit):this.limit);return this.limit-=t?.length||0,t}async skipFully(){let e=this.limit;for(;this.limit>0;)this.limit-=await this.sourceIter.skipSize(this.limit);return e}};var ge=new Uint8Array([13,10]),$e=new Uint8Array([13,10,13,10]),Re=new TextDecoder("utf-8"),_=class{constructor({statusline:r,headers:e}){this.statusline=r,this.headers=e}toString(){let r=[this.statusline];for(let[e,t]of this.headers)r.push(`${e}: ${t}`);return r.join(`\r
`)+`\r
`}async*iterSerialize(r){yield r.encode(this.statusline),yield ge;for(let[e,t]of this.headers)yield r.encode(`${e}: ${t}\r
`)}_parseResponseStatusLine(){let r=we(this.statusline," ",2);this._protocol=r[0]??"",this._statusCode=r.length>1?Number(r[1]):"",this._statusText=r.length>2?r[2]:""}get statusCode(){return this._statusCode===void 0&&this._parseResponseStatusLine(),this._statusCode}get protocol(){return this._protocol===void 0&&this._parseResponseStatusLine(),this._protocol}get statusText(){return this._statusText===void 0&&this._parseResponseStatusLine(),this._statusText}_parseRequestStatusLine(){let r=this.statusline.split(" ",2);this._method=r[0]??"",this._requestPath=r.length>1?r[1]:""}get method(){return this._method===void 0&&this._parseRequestStatusLine(),this._method}get requestPath(){return this._requestPath===void 0&&this._parseRequestStatusLine(),this._requestPath}},k=class{async parse(r,{headersClass:e,firstLine:t}={headersClass:Map}){let s=t||await r.readline();if(!s)return null;let i=s.trimEnd();if(!i)return null;let a=new e,o=a instanceof Headers,d=await xe(r),l=0,u,b,f,h="",c;for(;l<d.length;){if(f=d.indexOf(`
`,l),c&&(d[l]===" "||d[l]==="	"))c+=d.slice(l,f<0?void 0:f).trimEnd();else{if(c){try{o&&h.toLowerCase()==="set-cookie"?a.append(h,c):a.set(h,c)}catch{}c=null}u=d.indexOf(":",l),b=u<0?l:u+1,u>=0&&u<f?(h=d.slice(l,u).trimStart(),c=d.slice(b,f<0?void 0:f).trim()):c=null}if(f<0)break;l=f+1}if(c)try{o&&h.toLowerCase()==="set-cookie"?a.append(h,c):a.set(h,c)}catch{}return new _({statusline:i,headers:a})}};function we(n,r,e){let t=n.split(r),s=t.slice(0,e);return t.slice(e).length>0&&s.push(t.slice(e).join(r)),s}async function Ae(n,r){let e=0;for(let t=0;t<n.length-4;t++){let s=n.indexOf(13,e);if(s<0)break;if(s+3>=n.length){let{value:i}=await r.next();if(!i)break;let a=new Uint8Array(i.length+n.length);a.set(n,0),a.set(i,n.length),n=a}if(n[s+1]===10&&n[s+2]===13&&n[s+3]===10)return[s+3,n];e=s+1}return[-1,n]}async function xe(n){let r=[],e=0,t=0,s=null,i=n[Symbol.asyncIterator]();for await(let a of i){if([t,a]=await Ae(a,i),t>=0){s=a;break}r.push(a),e+=a.byteLength}if(s){let[a,o]=g(s,t+1);r.push(a),e+=a.byteLength,n.unread(o)}else if(!r.length)return"";return Re.decode(x(r,e))}var V=v(require("uuid-random"),1);var _e=new TextDecoder("utf-8"),Ce=new TextEncoder,be="WARC/1.1",X="WARC/1.0",Se="http://netpreserve.org/warc/1.0/revisit/identical-payload-digest",Ie="http://netpreserve.org/warc/1.1/revisit/identical-payload-digest",ke={warcinfo:"application/warc-fields",response:"application/http; msgtype=response",revisit:"application/http; msgtype=response",request:"application/http; msgtype=request",metadata:"application/warc-fields"},T=class n extends y{constructor({warcHeaders:e,reader:t}){super();this._offset=0;this._length=0;this.method="";this.requestBody="";this._urlkey="";this.warcHeaders=e,this._reader=t,this._contentReader=null,this.payload=null,this.httpHeaders=null,this.consumed="",this.fixUp()}static create({url:e,date:t,type:s,warcHeaders:i={},filename:a="",httpHeaders:o={},statusline:d="HTTP/1.1 200 OK",warcVersion:l=X,keepHeadersCase:u=!0,refersToUrl:b=void 0,refersToDate:f=void 0}={},h){function c(A){let se=A;return l===X&&(A=A.split(".")[0],A.charAt(se.length-1)!="Z"&&(A+="Z")),A}t=c(t||new Date().toISOString()),i={...i},s==="warcinfo"?a&&(i["WARC-Filename"]=a):e&&(i["WARC-Target-URI"]=e),i["WARC-Date"]=t,s&&(i["WARC-Type"]=s),s==="revisit"&&(i["WARC-Profile"]=l===be?Ie:Se,b&&(i["WARC-Refers-To-Target-URI"]=b,i["WARC-Refers-To-Date"]=c(f||new Date().toISOString())));let m=new _({statusline:l,headers:new Map(Object.entries(i))});m.headers.get("WARC-Record-ID")||m.headers.set("WARC-Record-ID",`<urn:uuid:${(0,V.default)()}>`),m.headers.get("Content-Type")||m.headers.set("Content-Type",s&&ke[s]||"application/octet-stream"),h||(h=G());let E=new n({warcHeaders:m,reader:h}),F=null,L=[];switch(s){case"response":case"request":case"revisit":L=Object.entries(o),F=u?new Map(L):new Headers(o),(L.length>0||s!=="revisit")&&(E.httpHeaders=new _({statusline:d,headers:F}));break}return E}static createWARCInfo(e={},t){async function*s(){for(let[i,a]of Object.entries(t))yield Ce.encode(`${i}: ${a}\r
`)}return e.type="warcinfo",n.create(e,s())}getResponseInfo(){let e=this.httpHeaders;return e?{headers:e.headers,status:e.statusCode,statusText:e.statusText}:null}fixUp(){let e=this.warcHeaders.headers.get("WARC-Target-URI");e&&e.startsWith("<")&&e.endsWith(">")&&this.warcHeaders.headers.set("WARC-Target-URI",e.slice(1,-1))}async readFully(e=!1){if(this.httpHeaders){if(this.payload&&!this.payload.length)return this.payload;if(this._contentReader&&!e)throw new TypeError("WARC Record decoding already started, but requesting raw payload");if(e&&this.consumed==="raw"&&this.payload)return await this._createDecodingReader([this.payload]).readFully()}return this.payload?this.payload:(e?(this.payload=await super.readFully(),this.consumed="content"):(this.payload=await y.readFully(this._reader),this.consumed="raw"),this.payload)}get reader(){if(this.payload&&!this.payload.length)return G();if(this._contentReader)throw new TypeError("WARC Record decoding already started, but requesting raw payload");return this._reader}get contentReader(){return this.httpHeaders?(this._contentReader||(this._contentReader=this._createDecodingReader(this._reader)),this._contentReader):this._reader}_createDecodingReader(e){if(!this.httpHeaders)throw new Error("WARCRecord cannot call _createDecodingReader when this.httpHeaders === null");let t=this.httpHeaders.headers.get("Content-Encoding"),s=this.httpHeaders.headers.get("Transfer-Encoding"),i=s==="chunked";return!t&&!i&&(t=s),new R(e,t,i)}async readlineRaw(e){if(this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");if(this.contentReader instanceof y)return this.contentReader.readlineRaw(e);throw new Error("WARCRecord cannot call readlineRaw on this.contentReader if it does not extend BaseAsyncIterReader")}async contentText(){let e=await this.readFully(!0);return _e.decode(e)}async*[Symbol.asyncIterator](){for await(let e of this.contentReader)if(yield e,this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");this.consumed="content"}async skipFully(){if(!this.consumed){if(this._reader instanceof w){let e=await this._reader.skipFully();return this.consumed="skipped",e}throw new Error("WARCRecord cannot call skipFully on this._reader if it is not a LimitReader")}}warcHeader(e){return this.warcHeaders.headers.get(e)}get warcType(){return this.warcHeaders.headers.get("WARC-Type")}get warcTargetURI(){return this.warcHeaders.headers.get("WARC-Target-URI")}get warcDate(){return this.warcHeaders.headers.get("WARC-Date")}get warcRefersToTargetURI(){return this.warcHeaders.headers.get("WARC-Refers-To-Target-URI")}get warcRefersToDate(){return this.warcHeaders.headers.get("WARC-Refers-To-Date")}get warcPayloadDigest(){return this.warcHeaders.headers.get("WARC-Payload-Digest")}get warcBlockDigest(){return this.warcHeaders.headers.get("WARC-Block-Digest")}get warcContentType(){return this.warcHeaders.headers.get("Content-Type")}get warcContentLength(){return Number(this.warcHeaders.headers.get("Content-Length"))}};async function*G(){}var K=new TextDecoder,O=new Uint8Array([]),W=class n{static parse(r,e){return new n(r,e).parse()}static iterRecords(r,e){return new n(r,e)[Symbol.asyncIterator]()}constructor(r,{keepHeadersCase:e=!1,parseHttp:t=!0}={}){this._offset=0,this._warcHeadersLength=0,this._headersClass=e?Map:Headers,this._parseHttp=t,r instanceof R?this._reader=r:this._reader=new R(r),this._record=null}async readToNextRecord(){if(!this._reader||!this._record)return O;await this._record.skipFully(),this._reader.compressed&&(this._offset=this._reader.getRawOffset());let r=await this._reader.readlineRaw(),e=0;if(!r)r=O;else{if(e=r.byteLength-1,e===9&&K.decode(r).startsWith("WARC/"))return r;for(;e>0;){let t=r[e-1];if(t!==10&&t!==13)break;e--}e&&console.warn(`Content-Length Too Small: Record not followed by newline, Remainder Length: ${e}, Offset: ${this._reader.getRawOffset()-r.byteLength}`)}if(this._reader.compressed)await this._reader.skipSize(2),r=O;else{for(r=await this._reader.readlineRaw();r&&r.byteLength===2;)r=await this._reader.readlineRaw();this._offset=this._reader.getRawOffset(),r&&(this._offset-=r.length)}return r}_initRecordReader(r){return new w(this._reader,Number(r.headers.get("Content-Length")||0))}async parse(){let r=await this.readToNextRecord(),e=r?K.decode(r):"",t=new k,s=await t.parse(this._reader,{firstLine:e,headersClass:this._headersClass});if(!s)return null;this._warcHeadersLength=this._reader.getReadOffset();let i=new T({warcHeaders:s,reader:this._initRecordReader(s)});if(this._record=i,this._parseHttp)switch(i.warcType){case"response":case"request":await this._addHttpHeaders(i,t);break;case"revisit":i.warcContentLength>0&&await this._addHttpHeaders(i,t);break}return i}get offset(){return this._offset}get recordLength(){return this._reader.getRawLength(this._offset)}async*[Symbol.asyncIterator](){let r=null;for(;(r=await this.parse())!==null;)yield r;this._record=null}async _addHttpHeaders(r,e){let t=await e.parse(this._reader,{headersClass:this._headersClass});r.httpHeaders=t;let s=this._reader.getReadOffset()-this._warcHeadersLength;r.reader instanceof w&&r.reader.setLimitSkip(r.warcContentLength-s)}};var Te=["offset","warc-type","warc-target-uri"],P=class{constructor(r={}){this.opts=r,this.fields=r&&r.fields?r.fields.split(","):Te,this.parseHttp=!1}serialize(r){return JSON.stringify(r)+`
`}write(r,e){e.write(this.serialize(r))}async writeAll(r,e){for await(let t of this.iterIndex(r))this.write(t,e)}async*iterIndex(r){let e={strictHeaders:!0,parseHttp:this.parseHttp};for(let{filename:t,reader:s}of r){let i=new W(s,e);yield*this.iterRecords(i,t)}}async*iterRecords(r,e){for await(let t of r){await t.skipFully();let s=this.indexRecord(t,r,e);s&&(yield s)}}indexRecord(r,e,t){if(this.filterRecord&&!this.filterRecord(r))return null;let s={},{offset:i,recordLength:a}=e,o={offset:i,length:a,filename:t};for(let d of this.fields)d in o?s[d]=o[d]:this.setField(d,r,s);return s}setField(r,e,t){let s=this.getField(r,e);s!==null&&(t[r]=s)}getField(r,e){if(r==="http:status")return e.httpHeaders&&(e.warcType==="response"||e.warcType==="revisit")?e.httpHeaders.statusCode:null;if(r.startsWith("http:")){if(e.httpHeaders){let t=e.httpHeaders.headers;return t instanceof Map&&(t=new Headers(Object.fromEntries(t))),t.get(r.slice(5))}return null}return e.warcHeaders.headers.get(r)||null}},C=class extends P{constructor(r){super(r);for(let e of this.fields)if(e.startsWith("http:")){this.parseHttp=!0;break}}},We="urlkey,timestamp,url,mime,status,digest,length,offset,filename".split(","),Ue="urlkey,timestamp,url,mime,status,digest,redirect,meta,length,offset,filename".split(","),I=class extends C{constructor(e){super(e);switch(this.includeAll=!!e?.all,this.overrideIndexForAll=!!e?.all,this.fields=We,this.parseHttp=!0,this.noSurt=!!e?.noSurt,this._lastRecord=null,e?.format){case"cdxj":this.serialize=this.serializeCDXJ;break;case"cdx":this.serialize=this.serializeCDX11;break;case"json":default:break}}async*iterRecords(e,t){this._lastRecord=null;for await(let i of e){await i.readFully();let a=this.indexRecord(i,e,t);a&&(yield a)}let s=this.indexRecord(null,e,t);s&&(yield s)}filterRecord(e){if(this.includeAll)return!0;let t=e.warcType;return!(t==="request"||t==="warcinfo"||(t==="metadata"||t==="resource")&&e.warcContentType==="application/warc-fields")}indexRecord(e,t,s){if(this.overrideIndexForAll)return e?super.indexRecord(e,t,s):null;let i=this._lastRecord;if(this._lastRecord=e,e&&(e._offset=t.offset,e._length=t.recordLength),!i)return null;if(!e||i.warcTargetURI!=e.warcTargetURI)return this.indexRecordPair(i,null,t,s);let a=e.warcType,o=i.warcType;return a==="request"&&(o==="response"||o==="revisit")?(this._lastRecord=null,this.indexRecordPair(i,e,t,s)):(a==="response"||a==="revisit")&&o==="request"?(this._lastRecord=null,this.indexRecordPair(e,i,t,s)):this.indexRecordPair(i,null,t,s)}indexRecordPair(e,t,s,i){let a,o,d=e.warcTargetURI||"";if(t&&t.httpHeaders&&t.httpHeaders.method!=="GET"){let u={url:d,method:t.httpHeaders.method,headers:t.httpHeaders.headers,postData:t.payload};a=u.method,M(u)&&(o=u.requestBody,e.method=a,e.requestBody=o,d=u.url)}e._urlkey=d;let l=super.indexRecord(e,s,i);return l&&(e&&e._offset!==void 0&&(l.offset=e._offset,l.length=e._length),a&&(l.method=a),o&&(l.requestBody=o)),l}serializeCDXJ(e){let{urlkey:t,timestamp:s}=e;return delete e.urlkey,delete e.timestamp,`${t} ${s} ${JSON.stringify(e)}
`}serializeCDX11(e){let t=[];for(let s of Ue)t.push(e[s]!=null?e[s]:"-");return t.join(" ")+`
`}getField(e,t){let s=null;switch(e){case"urlkey":return s=t._urlkey||t.warcTargetURI||null,this.noSurt||s===null?s:z(s);case"timestamp":return s=t.warcDate??"",s.replace(/[-:T]/g,"").slice(0,14);case"url":return t.warcTargetURI;case"mime":switch(t.warcType){case"revisit":return"warc/revisit";case"response":case"request":e="http:content-type";break;default:e="content-type"}return s=super.getField(e,t),s?s.toString().split(";",1)[0]?.trim():null;case"status":return super.getField("http:status",t);case"digest":return s=t.warcPayloadDigest,s?s.split(":",2)[1]:null;default:return null}}};var Z="2.2.2";var ve=1024*128;function D(n=H.stdout,r){let e=Promise.resolve();return r=r||(0,re.hideBin)(process.argv),(0,te.default)().version(Z).usage("$0 [command]").command({command:"index <filenames..>",describe:"Index WARC(s)",builder:q,handler:async t=>{e=new C(t).writeAll(Y(t.filenames),n)}}).command({command:"cdx-index <filenames..>",describe:"CDX(J) Index of WARC(s)",builder:B,handler:async t=>{e=new I(t).writeAll(Y(t.filenames),n)}}).demandCommand(1,"Please specify a command").strictCommands().help().parseAsync(r),e}function Y(n){return n.reduce((r,e)=>{if(!(0,U.lstatSync)(e).isFile())return H.stderr.write(`Skipping ${e}, not a file
`),r;let t=(0,U.createReadStream)(e,{highWaterMark:ve});return e=(0,ee.basename)(e),r.push({filename:e,reader:t}),r},[])}D();
