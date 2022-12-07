#!/usr/bin/env node
"use strict";var ee=Object.create;var F=Object.defineProperty;var te=Object.getOwnPropertyDescriptor;var re=Object.getOwnPropertyNames;var se=Object.getPrototypeOf,ne=Object.prototype.hasOwnProperty;var ie=(i,r,e,t)=>{if(r&&typeof r=="object"||typeof r=="function")for(let s of re(r))!ne.call(i,s)&&s!==e&&F(i,s,{get:()=>r[s],enumerable:!(t=te(r,s))||t.enumerable});return i};var T=(i,r,e)=>(e=i!=null?ee(se(i)):{},ie(r||!i||!i.__esModule?F(e,"default",{value:i,enumerable:!0}):e,i));var U=require("fs"),Z=require("path"),H=require("process"),K=T(require("yargs"),1);var v=T(require("yargs"),1),B=v.default.positional("filenames",{describe:"WARC file(s) to index",type:"string",array:!0,demandOption:"true"}).option("fields",{alias:"f",describe:"fields to include in index",type:"string"}),q=v.default.positional("filenames",{describe:"WARC file(s) to index",type:"string",array:!0,demandOption:"true"}).option("all",{alias:"a",describe:"index all WARC records",type:"boolean"}).option("format",{describe:"output format",choices:["json","cdxj","cdx"],default:"cdxj"}).option("noSurt",{describe:"Use plain urlkey, do not convert to SURT form (Sort-friendly URI Reordering Transform)",type:"boolean"});var M=T(require("pako"),1);function N(i){let r;return typeof i=="string"?r=i:i&&i.length?r=i.reduce((e,t)=>(e+=String.fromCharCode(t),e),""):i?r=i.toString():r="","__wb_post_data="+Buffer.from(r,"latin1").toString("base64")}function ae(i){return i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function z(i){try{if(!i.startsWith("https:")&&!i.startsWith("http:"))return i;i=i.replace(/^(https?:\/\/)www\d*\./,"$1");let r=i.toLowerCase(),e=new URL(r),s=e.hostname.split(".").reverse().join(",");if(e.port&&(s+=":"+e.port),s+=")",s+=e.pathname,e.search){e.searchParams.sort(),s+=e.search;for(let[n,a]of e.searchParams.entries())if(!a){let o=new RegExp(`(?<=[&?])${ae(n)}=(?=&|$)`);o.exec(r)||(s=s.replace(o,n))}}return s}catch{return i}}function j(i){let{method:r,headers:e,postData:t}=i;if(r==="GET")return!1;let s=(e.get("content-type")||"").split(";")[0];function n(o){return o instanceof Uint8Array&&(o=new TextDecoder().decode(o)),o}let a="";switch(s){case"application/x-www-form-urlencoded":a=n(t);break;case"application/json":a=$(n(t));break;case"text/plain":try{a=$(n(t),!1)}catch{a=N(t)}break;case"multipart/form-data":{let o=e.get("content-type");if(!o)throw new Error("utils cannot call postToGetURL when missing content-type header");a=ce(n(t),o);break}default:a=N(t)}return a!==null?(i.url=oe(i.url,a,i.method),i.method="GET",i.requestBody=a,!0):!1}function oe(i,r,e){if(!e)return i;let t=i.indexOf("?")>0?"&":"?";return`${i}${t}__wb_method=${e}&${r}`}function le(i,r=!0){if(typeof i=="string")try{i=JSON.parse(i)}catch{i={}}let e=new URLSearchParams,t={},s=n=>e.has(n)?(n in t||(t[n]=1),n+"."+ ++t[n]+"_"):n;try{JSON.stringify(i,(n,a)=>(["object","function"].includes(typeof a)||e.set(s(n),a),a))}catch(n){if(!r)throw n}return e}function de(i,r){let e=new URLSearchParams;i instanceof Uint8Array&&(i=new TextDecoder().decode(i));try{let t=r.split("boundary=")[1],s=i.split(new RegExp("-*"+t+"-*","mi"));for(let n of s){let a=n.trim().match(/name="([^"]+)"\r\n\r\n(.*)/im);a&&e.set(a[1],a[2])}}catch{}return e}function $(i,r=!0){return le(i,r).toString()}function ce(i,r){return de(i,r).toString()}function _(i,r){if(i.length===1)return i[0];let e=new Uint8Array(r),t=0;for(let s of i)e.set(s,t),t+=s.byteLength;return e}function R(i,r){return[i.slice(0,r),i.slice(r)]}var J=new TextDecoder("utf-8"),S=class extends M.default.Inflate{constructor(e,t){super(e);this.ended=!1;this.chunks=[];this.reader=t}onEnd(e){this.err=e,this.err||(this.reader._rawOffset+=this.strm.total_in)}},y=class{static async readFully(r){let e=[],t=0;for await(let s of r)e.push(s),t+=s.byteLength;return[t,_(e,t)]}getReadableStream(){let r=this[Symbol.asyncIterator]();return new ReadableStream({pull(e){return r.next().then(t=>{t.done||!t.value?e.close():e.enqueue(t.value)})}})}async readFully(){return(await y.readFully(this))[1]}async readline(r=0){let e=await this.readlineRaw(r);return e?J.decode(e):""}async*iterLines(r=0){let e=null;for(;e=await this.readline(r);)yield e}};function ue(i){return i&&Symbol.iterator in Object(i)}function he(i){return i&&Symbol.asyncIterator in Object(i)}var u=class extends y{constructor(e,t="gzip",s=!1){super();this.compressed=t,this.opts={raw:t==="deflateRaw"},this.inflator=t?new S(this.opts,this):null;let n;if(he(e))n=e;else if(typeof e=="object"&&"read"in e&&typeof e.read=="function")n=u.fromReadable(e);else if(e instanceof ReadableStream)n=u.fromReadable(e.getReader());else if(ue(e))n=u.fromIter(e);else throw new TypeError("Invalid Stream Source");s?this._sourceIter=this.dechunk(n):this._sourceIter=n[Symbol.asyncIterator](),this.lastValue=null,this.errored=!1,this._savedChunk=null,this._rawOffset=0,this._readOffset=0,this.numChunks=0}async _loadNext(){let e=await this._sourceIter.next();return e.done?null:e.value}async*dechunk(e){let t=e instanceof u?e:new u(e,null),s=-1,n=!0;for(;s!=0;){let a=await t.readlineRaw(64),o=new Uint8Array;if(s=a?parseInt(J.decode(a),16):0,!s||s>2**32){if(Number.isNaN(s)||s>2**32){n||(this.errored=!0),yield a;break}}else if(o=(await t.readSize(s))[1],o.length!=s){n?yield a:this.errored=!0,yield o;break}let l=(await t.readSize(2))[1];if(l[0]!=13||l[1]!=10){n?yield a:this.errored=!0,yield o,yield l;break}else{if(n=!1,!o||s===0)return;yield o}}yield*t}unread(e){!e.length||(this._readOffset-=e.length,this._savedChunk&&console.log("Already have chunk!"),this._savedChunk=e)}async _next(){if(this._savedChunk){let t=this._savedChunk;return this._savedChunk=null,t}if(this.compressed){let t=this._getNextChunk();if(t)return t}let e=await this._loadNext();for(;this.compressed&&e;){this._push(e);let t=this._getNextChunk(e);if(t)return t;e=await this._loadNext()}return e}_push(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _push when this.compressed is null");this.lastValue=e,this.inflator.ended&&(this.inflator=new S(this.opts,this)),this.inflator.push(e),this.inflator.err&&this.inflator.ended&&this.compressed==="deflate"&&this.opts.raw===!1&&this.numChunks===0&&(this.opts.raw=!0,this.compressed="deflateRaw",this.inflator=new S(this.opts,this),this.inflator.push(e))}_getNextChunk(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _getNextChunk when this.compressed is null");for(;;){if(this.inflator.chunks.length>0)return this.numChunks++,this.inflator.chunks.shift();if(this.inflator.ended){if(this.inflator.err!==0)return this.compressed=null,e;let t=this.inflator.strm.avail_in;if(t&&this.lastValue){this._push(this.lastValue.slice(-t));continue}}return null}}async*[Symbol.asyncIterator](){let e=null;for(;e=await this._next();)this._readOffset+=e.length,yield e}async readlineRaw(e){let t=[],s=0,n=-1,a=null;for await(let o of this){if(e&&s+o.byteLength>e){a=o,n=e-s-1;let l=o.slice(0,n+1).indexOf(10);l>=0&&(n=l);break}if(n=o.indexOf(10),n>=0){a=o;break}t.push(o),s+=o.byteLength}if(a){let[o,l]=R(a,n+1);t.push(o),s+=o.byteLength,this.unread(l)}else if(!t.length)return null;return _(t,s)}async readFully(){return(await this.readSize())[1]}async readSize(e=-1,t=!1){let s=[],n=0;for await(let a of this){if(e>=0)if(a.length>e){let[o,l]=R(a,e);t||s.push(o),n+=o.byteLength,this.unread(l);break}else if(a.length===e){t||s.push(a),n+=a.byteLength,e=0;break}else e-=a.length;t||s.push(a),n+=a.byteLength}return t?[n,new Uint8Array]:[n,_(s,n)]}getReadOffset(){return this._readOffset}getRawOffset(){return this.compressed?this._rawOffset:this._readOffset}getRawLength(e){return this.compressed?this.inflator.strm.total_in:this._readOffset-e}static fromReadable(e){return{async*[Symbol.asyncIterator](){let s=null;for(;(s=await e.read())&&!s.done;)yield s.value}}}static fromIter(e){return{async*[Symbol.asyncIterator](){for(let s of e)yield s}}}},w=class extends y{constructor(e,t,s=0){super();this.sourceIter=e,this.length=t,this.limit=t,this.skip=s}setLimitSkip(e,t=0){this.limit=e,this.skip=t}async*[Symbol.asyncIterator](){if(!(this.limit<=0))for await(let e of this.sourceIter){if(this.skip>0)if(e.length>=this.skip){let[,t]=R(e,this.skip);e=t,this.skip=0}else{this.skip-=e.length;continue}if(e.length>this.limit){let[t,s]=R(e,this.limit);e=t,this.sourceIter.unread&&this.sourceIter.unread(s)}if(e.length&&(this.limit-=e.length,yield e),this.limit<=0)break}}async readlineRaw(e){if(this.limit<=0)return null;let t=await this.sourceIter.readlineRaw(e?Math.min(e,this.limit):this.limit);return this.limit-=t?.length||0,t}async skipFully(){let e=this.limit;for(;this.limit>0;)this.limit-=(await this.sourceIter.readSize(this.limit,!0))[0];return e}};var fe=new Uint8Array([13,10]),Fe=new Uint8Array([13,10,13,10]),pe=new TextDecoder("utf-8"),x=class{constructor({statusline:r,headers:e}){this.statusline=r,this.headers=e}toString(){let r=[this.statusline];for(let[e,t]of this.headers)r.push(`${e}: ${t}`);return r.join(`\r
`)+`\r
`}async*iterSerialize(r){yield r.encode(this.statusline),yield fe;for(let[e,t]of this.headers)yield r.encode(`${e}: ${t}\r
`)}_parseResponseStatusLine(){let r=ye(this.statusline," ",2);this._protocol=r[0]??"",this._statusCode=r.length>1?Number(r[1]):"",this._statusText=r.length>2?r[2]:""}get statusCode(){return this._statusCode===void 0&&this._parseResponseStatusLine(),this._statusCode}get protocol(){return this._protocol===void 0&&this._parseResponseStatusLine(),this._protocol}get statusText(){return this._statusText===void 0&&this._parseResponseStatusLine(),this._statusText}_parseRequestStatusLine(){let r=this.statusline.split(" ",2);this._method=r[0]??"",this._requestPath=r.length>1?r[1]:""}get method(){return this._method===void 0&&this._parseRequestStatusLine(),this._method}get requestPath(){return this._requestPath===void 0&&this._parseRequestStatusLine(),this._requestPath}},W=class{async parse(r,{headersClass:e,firstLine:t}={headersClass:Map}){let s=t||await r.readline();if(!s)return null;let n=s.trimEnd();if(!n)return null;let a=new e,o=await ge(r),l=0,d,h,f,b="",c;for(;l<o.length;){if(f=o.indexOf(`
`,l),c&&(o[l]===" "||o[l]==="	"))c+=o.slice(l,f<0?void 0:f).trimEnd();else{if(c){try{a.set(b,c)}catch{}c=null}d=o.indexOf(":",l),h=d<0?l:d+1,d>=0&&d<f?(b=o.slice(l,d).trimStart(),c=o.slice(h,f<0?void 0:f).trim()):c=null}if(f<0)break;l=f+1}if(c)try{a.set(b,c)}catch{}return new x({statusline:n,headers:a})}};function ye(i,r,e){let t=i.split(r),s=t.slice(0,e);return t.slice(e).length>0&&s.push(t.slice(e).join(r)),s}async function me(i,r){let e=0;for(let t=0;t<i.length-4;t++){let s=i.indexOf(13,e);if(s<0)break;if(s+3>=i.length){let{value:n}=await r.next();if(!n)break;let a=new Uint8Array(n.length+i.length);a.set(i,0),a.set(n,i.length),i=a}if(i[s+1]===10&&i[s+2]===13&&i[s+3]===10)return[s+3,i];e=s+1}return[-1,i]}async function ge(i){let r=[],e=0,t=0,s=null,n=i[Symbol.asyncIterator]();for await(let a of n){if([t,a]=await me(a,n),t>=0){s=a;break}r.push(a),e+=a.byteLength}if(s){let[a,o]=R(s,t+1);r.push(a),e+=a.byteLength,i.unread(o)}else if(!r.length)return"";return pe.decode(_(r,e))}var G=T(require("uuid-random"),1);var Re=new TextDecoder("utf-8"),we=new TextEncoder,Ae="WARC/1.1",Q="WARC/1.0",_e="http://netpreserve.org/warc/1.0/revisit/identical-payload-digest",xe="http://netpreserve.org/warc/1.1/revisit/identical-payload-digest",Ce={warcinfo:"application/warc-fields",response:"application/http; msgtype=response",revisit:"application/http; msgtype=response",request:"application/http; msgtype=request",metadata:"application/warc-fields"},m=class extends y{constructor({warcHeaders:e,reader:t}){super();this._offset=0;this._length=0;this.method="";this.requestBody="";this._urlkey="";this.warcHeaders=e,this._reader=t,this._contentReader=null,this.payload=null,this.httpHeaders=null,this.consumed="",this.fixUp()}static create({url:e,date:t,type:s,warcHeaders:n={},filename:a="",httpHeaders:o={},statusline:l="HTTP/1.1 200 OK",warcVersion:d=Q,keepHeadersCase:h=!0,refersToUrl:f=void 0,refersToDate:b=void 0}={},c){function I(g){let Y=g;return d===Q&&(g=g.split(".")[0],g.charAt(Y.length-1)!="Z"&&(g+="Z")),g}t=I(t||new Date().toISOString()),n={...n},s==="warcinfo"?a&&(n["WARC-Filename"]=a):n["WARC-Target-URI"]=e,n["WARC-Date"]=t,n["WARC-Type"]=s,s==="revisit"&&(n["WARC-Profile"]=d===Ae?xe:_e,n["WARC-Refers-To-Target-URI"]=f,n["WARC-Refers-To-Date"]=I(b||new Date().toISOString())),n=new x({statusline:d,headers:h?new Map(Object.entries(n)):new Headers(n)}),n.headers.get("WARC-Record-ID")||n.headers.set("WARC-Record-ID",`<urn:uuid:${(0,G.default)()}>`),n.headers.get("Content-Type")||n.headers.set("Content-Type",s&&Ce[s]||"application/octet-stream"),c||(c=async function*(){}());let D=new m({warcHeaders:n,reader:c}),E=null,L=[];switch(s){case"response":case"request":case"revisit":L=Object.entries(o),E=h?new Map(L):new Headers(o),(L.length>0||s!=="revisit")&&(D.httpHeaders=new x({statusline:l,headers:E}));break}return D}static createWARCInfo(e={},t){async function*s(){for(let[n,a]of Object.entries(t))yield we.encode(`${n}: ${a}\r
`)}return e.type="warcinfo",m.create(e,s())}getResponseInfo(){let e=this.httpHeaders;return e?{headers:e.headers,status:e.statusCode,statusText:e.statusText}:null}fixUp(){let e=this.warcHeaders.headers.get("WARC-Target-URI");e&&e.startsWith("<")&&e.endsWith(">")&&this.warcHeaders.headers.set("WARC-Target-URI",e.slice(1,-1))}async readFully(e=!1){if(this.httpHeaders){if(this.payload&&!this.payload.length)return this.payload;if(this._contentReader&&!e)throw new TypeError("WARC Record decoding already started, but requesting raw payload");if(e&&this.consumed==="raw"&&this.payload)return await this._createDecodingReader([this.payload]).readFully()}return this.payload?this.payload:(e?(this.payload=await super.readFully(),this.consumed="content"):(this.payload=(await m.readFully(this._reader))[1],this.consumed="raw"),this.payload)}get reader(){if(this._contentReader)throw new TypeError("WARC Record decoding already started, but requesting raw payload");return this._reader}get contentReader(){return this.httpHeaders?(this._contentReader||(this._contentReader=this._createDecodingReader(this._reader)),this._contentReader):this._reader}_createDecodingReader(e){if(!this.httpHeaders)throw new Error("WARCRecord cannot call _createDecodingReader when this.httpHeaders === null");let t=this.httpHeaders.headers.get("Content-Encoding"),s=this.httpHeaders.headers.get("Transfer-Encoding"),n=s==="chunked";return!t&&!n&&(t=s),new u(e,t,n)}async readlineRaw(e){if(this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");if(this.contentReader instanceof y)return this.contentReader.readlineRaw(e);throw new Error("WARCRecord cannot call readlineRaw on this.contentReader if it does not extend BaseAsyncIterReader")}async contentText(){let e=await this.readFully(!0);return Re.decode(e)}async*[Symbol.asyncIterator](){for await(let e of this.contentReader)if(yield e,this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");this.consumed="content"}async skipFully(){if(!this.consumed){if(this._reader instanceof w){let e=await this._reader.skipFully();return this.consumed="skipped",e}throw new Error("WARCRecord cannot call skipFully on this._reader if it is not a LimitReader")}}warcHeader(e){return this.warcHeaders.headers.get(e)}get warcType(){return this.warcHeaders.headers.get("WARC-Type")}get warcTargetURI(){return this.warcHeaders.headers.get("WARC-Target-URI")}get warcDate(){return this.warcHeaders.headers.get("WARC-Date")}get warcRefersToTargetURI(){return this.warcHeaders.headers.get("WARC-Refers-To-Target-URI")}get warcRefersToDate(){return this.warcHeaders.headers.get("WARC-Refers-To-Date")}get warcPayloadDigest(){return this.warcHeaders.headers.get("WARC-Payload-Digest")}get warcBlockDigest(){return this.warcHeaders.headers.get("WARC-Block-Digest")}get warcContentType(){return this.warcHeaders.headers.get("Content-Type")}get warcContentLength(){return Number(this.warcHeaders.headers.get("Content-Length"))}};var be=new TextDecoder,V=new Uint8Array([]),A=class{static parse(r,e){return new A(r,e).parse()}static iterRecords(r,e){return new A(r,e)[Symbol.asyncIterator]()}constructor(r,{keepHeadersCase:e=!1,parseHttp:t=!0}={}){this._offset=0,this._warcHeadersLength=0,this._headersClass=e?Map:Headers,this._parseHttp=t,this._atRecordBoundary=!0,r instanceof u?this._reader=r:this._reader=new u(r),this._record=null}async readToNextRecord(){let r;if(!this._atRecordBoundary&&this._reader&&this._record){await this._record.skipFully();let e=0;if(r=await this._reader.readlineRaw(),!r)r=V;else for(e=r.byteLength-1;e>=0;){let t=r[e-1];if(t!==10&&t!==13)break;e--}if(e&&console.warn(`Content-Length Too Small: Record not followed by newline, Remainder Length: ${e}, Offset: ${this._reader.getRawOffset()-r.byteLength}`),this._reader.compressed)await this._reader.readSize(2,!0),r=V;else for(r=await this._reader.readlineRaw();r&&r.byteLength===2;)r=await this._reader.readlineRaw()}return this._atRecordBoundary=!0,r?be.decode(r):""}_initRecordReader(r){return new w(this._reader,Number(r.headers.get("Content-Length")||0))}async parse(){let r=await this.readToNextRecord();this._offset=this._reader.getRawOffset()-r.length;let e=new W,t=await e.parse(this._reader,{firstLine:r,headersClass:this._headersClass});if(!t)return null;this._warcHeadersLength=this._reader.getReadOffset();let s=new m({warcHeaders:t,reader:this._initRecordReader(t)});if(this._atRecordBoundary=!1,this._record=s,this._parseHttp)switch(s.warcType){case"response":case"request":await this._addHttpHeaders(s,e);break;case"revisit":s.warcContentLength>0&&await this._addHttpHeaders(s,e);break}return s}get offset(){return this._offset}get recordLength(){return this._reader.getRawLength(this._offset)}async*[Symbol.asyncIterator](){let r=null;for(;(r=await this.parse())!==null;)yield r;this._record=null}async _addHttpHeaders(r,e){let t=await e.parse(this._reader,{headersClass:this._headersClass});r.httpHeaders=t;let s=this._reader.getReadOffset()-this._warcHeadersLength;r.reader instanceof w&&r.reader.setLimitSkip(r.warcContentLength-s)}};var Se=["offset","warc-type","warc-target-uri"],P=class{constructor(r={},e=process.stdout){this.opts=r,this.out=e,this.fields=r&&r.fields?r.fields.split(","):Se,this.parseHttp=!1}serialize(r){return JSON.stringify(r)+`
`}write(r){this.out.write(this.serialize(r))}async run(r){for await(let e of this.iterIndex(r))this.write(e)}async*iterIndex(r){let e={strictHeaders:!0,parseHttp:this.parseHttp};for(let{filename:t,reader:s}of r){let n=new A(s,e);yield*this.iterRecords(n,t)}}async*iterRecords(r,e){for await(let t of r){await t.skipFully();let s=this.indexRecord(t,r,e);s&&(yield s)}}indexRecord(r,e,t){if(this.filterRecord&&!this.filterRecord(r))return null;let s={},n=e.offset,a=e.recordLength,o={offset:n,length:a,filename:t};for(let l of this.fields)l in o?s[l]=o[l]:this.setField(l,r,s);return s}setField(r,e,t){let s=this.getField(r,e);s!==null&&(t[r]=s)}getField(r,e){return r==="http:status"?e.httpHeaders&&(e.warcType==="response"||e.warcType==="revisit")?e.httpHeaders.statusCode:null:r.startsWith("http:")?e.httpHeaders?e.httpHeaders.headers.get(r.slice(5)):null:e.warcHeaders.headers.get(r)||null}},C=class extends P{constructor(r,e){super(r,e);for(let t of this.fields)if(t.startsWith("http:")){this.parseHttp=!0;break}}},ke="urlkey,timestamp,url,mime,status,digest,length,offset,filename".split(","),Ie="urlkey,timestamp,url,mime,status,digest,redirect,meta,length,offset,filename".split(","),k=class extends C{constructor(e,t){super(e,t);switch(this.includeAll=Boolean(e?.all),this.fields=ke,this.parseHttp=!0,this.noSurt=Boolean(e?.noSurt),this._lastRecord=null,e?.format){case"cdxj":this.serialize=this.serializeCDXJ;break;case"cdx":this.serialize=this.serializeCDX11;break;case"json":default:break}}async*iterRecords(e,t){this._lastRecord=null;for await(let n of e){await n.readFully();let a=this.indexRecord(n,e,t);a&&(yield a)}let s=this.indexRecord(null,e,t);s&&(yield s)}filterRecord(e){if(this.includeAll)return!0;let t=e.warcType;return!(t==="request"||t==="warcinfo")}indexRecord(e,t,s){if(this.includeAll)return e?super.indexRecord(e,t,s):null;let n=this._lastRecord;return e&&(e._offset=t.offset,e._length=t.recordLength),n?!e||n.warcTargetURI!=e.warcTargetURI?(this._lastRecord=e,this.indexRecordPair(n,null,t,s)):e.warcType==="request"&&n.warcType==="response"?(this._lastRecord=null,this.indexRecordPair(n,e,t,s)):e.warcType==="response"&&n.warcType==="request"?(this._lastRecord=null,this.indexRecordPair(e,n,t,s)):(this._lastRecord=e,this.indexRecordPair(n,null,t,s)):(this._lastRecord=e,null)}indexRecordPair(e,t,s,n){let a,o,l=e.warcTargetURI||"";if(t&&t.httpHeaders&&t.httpHeaders.method!=="GET"){let h={url:l,method:t.httpHeaders.method,headers:t.httpHeaders.headers,postData:t.payload};a=h.method,j(h)&&(o=h.requestBody,e.method=a,e.requestBody=o,l=h.url)}e._urlkey=l;let d=super.indexRecord(e,s,n);return d&&(e&&e._offset!==void 0&&(d.offset=e._offset,d.length=e._length),a&&(d.method=a),o&&(d.requestBody=o)),d}serializeCDXJ(e){let{urlkey:t,timestamp:s}=e;return delete e.urlkey,delete e.timestamp,`${t} ${s} ${JSON.stringify(e)}
`}serializeCDX11(e){let t=[];for(let s of Ie)t.push(e[s]!=null?e[s]:"-");return t.join(" ")+`
`}getField(e,t){let s=null;switch(e){case"urlkey":return s=t._urlkey||t.warcTargetURI||null,this.noSurt||s===null?s:z(s);case"timestamp":return s=t.warcDate??"",s.replace(/[-:T]/g,"").slice(0,14);case"url":return t.warcTargetURI;case"mime":switch(t.warcType){case"revisit":return"warc/revisit";case"response":case"request":e="http:content-type";break;default:e="content-type"}return s=super.getField(e,t),s?s.toString().split(";",1)[0]?.trim():null;case"status":return super.getField("http:status",t);case"digest":return s=t.warcPayloadDigest,s?s.split(":",2)[1]:null;default:return null}}};var Te=1024*128;function O(i=[],r=H.stdout){let e=Promise.resolve();return K.default.usage("$0 [command]").command({command:"index <filenames..>",describe:"Index WARC(s)",builder:()=>B,handler:async t=>{e=new C(t,r).run(X(t.filenames))}}).command({command:"cdx-index <filenames..>",describe:"CDX(J) Index of WARC(s)",builder:()=>q,handler:async t=>{e=new k(t,r).run(X(t.filenames))}}).demandCommand(1,"Please specify a command").strictCommands().help().parseAsync(i),e}function X(i){return i.reduce((r,e)=>{if(!(0,U.lstatSync)(e).isFile())return H.stderr.write(`Skipping ${e}, not a file
`),r;let t=(0,U.createReadStream)(e,{highWaterMark:Te});return e=(0,Z.basename)(e),r.push({filename:e,reader:t}),r},[])}O();
//# sourceMappingURL=cli.cjs.map