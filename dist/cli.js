#!/usr/bin/env node
import{lstatSync as Ae,createReadStream as xe}from"fs";import{basename as _e}from"path";import{stdout as Ce,stderr as be}from"process";import Se from"yargs";import{hideBin as Ie}from"yargs/helpers";var D=n=>n.positional("filenames",{describe:"WARC file(s) to index",type:"string",array:!0,demandOption:"true"}).option("fields",{alias:"f",describe:"fields to include in index",type:"string"}),E=n=>n.positional("filenames",{describe:"WARC file(s) to index",type:"string",array:!0,demandOption:"true"}).option("all",{alias:"a",describe:"index all WARC records",type:"boolean"}).option("format",{describe:"output format",choices:["json","cdxj","cdx"],default:"cdxj"}).option("noSurt",{describe:"Use plain urlkey, do not convert to SURT form (Sort-friendly URI Reordering Transform)",type:"boolean"});import ee from"pako";function F(n){let r;typeof n=="string"?r=n:n&&n.length?r=n.reduce((e,t)=>(e+=String.fromCharCode(t),e),""):n?r=n.toString():r="";try{return"__wb_post_data="+btoa(r)}catch{return"__wb_post_data="}}function G(n){return n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function q(n){try{if(!n.startsWith("https:")&&!n.startsWith("http:"))return n;n=n.replace(/^(https?:\/\/)www\d*\./,"$1");let r=n.toLowerCase(),e=new URL(r),s=e.hostname.split(".").reverse().join(",");if(e.port&&(s+=":"+e.port),s+=")",s+=e.pathname,e.search){e.searchParams.sort(),s+=e.search;for(let[i,a]of e.searchParams.entries())if(!a){let o=new RegExp(`(?<=[&?])${G(i)}=(?=&|$)`);o.exec(r)||(s=s.replace(o,i))}}return s}catch{return n}}function B(n){let{method:r,headers:e,postData:t}=n;if(r==="GET")return!1;let s=(e.get("content-type")||"").split(";")[0];function i(o){return o instanceof Uint8Array&&(o=new TextDecoder().decode(o)),o}let a="";switch(s){case"application/x-www-form-urlencoded":a=i(t);break;case"application/json":a=j(i(t));break;case"text/plain":try{a=j(i(t),!1)}catch{a=F(t)}break;case"multipart/form-data":{let o=e.get("content-type");if(!o)throw new Error("utils cannot call postToGetURL when missing content-type header");a=Y(i(t),o);break}default:a=F(t)}return a!==null?(n.url=V(n.url,a,n.method),n.method="GET",n.requestBody=a,!0):!1}function V(n,r,e){if(!e)return n;let t=n.indexOf("?")>0?"&":"?";return`${n}${t}__wb_method=${e}&${r}`}function K(n,r=!0){if(typeof n=="string")try{n=JSON.parse(n)}catch{n={}}let e=new URLSearchParams,t={},s=i=>e.has(i)?(i in t||(t[i]=1),i+"."+ ++t[i]+"_"):i;try{JSON.stringify(n,(i,a)=>(["object","function"].includes(typeof a)||e.set(s(i),a),a))}catch(i){if(!r)throw i}return e}function Z(n,r){let e=new URLSearchParams;n instanceof Uint8Array&&(n=new TextDecoder().decode(n));try{let t=r.split("boundary=")[1],s=n.split(new RegExp("-*"+t+"-*","mi"));for(let i of s){let a=i.trim().match(/name="([^"]+)"\r\n\r\n(.*)/im);a&&e.set(a[1],a[2])}}catch{}return e}function j(n,r=!0){return K(n,r).toString()}function Y(n,r){return Z(n,r).toString()}function x(n,r){if(n.length===1)return n[0];let e=new Uint8Array(r),t=0;for(let s of n)e.set(s,t),t+=s.byteLength;return e}function m(n,r){return[n.slice(0,r),n.slice(r)]}var N=new TextDecoder("utf-8"),b=class extends ee.Inflate{constructor(e,t){super(e);this.ended=!1;this.chunks=[];this.reader=t}onEnd(e){this.err=e,this.err||(this.reader._rawOffset+=this.strm.total_in)}},g=class n{static async readFully(r){let e=[],t=0;for await(let s of r)e.push(s),t+=s.byteLength;return x(e,t)}getReadableStream(){let r=this[Symbol.asyncIterator]();return new ReadableStream({pull(e){return r.next().then(t=>{t.done||!t.value?e.close():e.enqueue(t.value)})}})}async readFully(){return await n.readFully(this)}async readline(r=0){let e=await this.readlineRaw(r);return e?N.decode(e):""}async*iterLines(r=0){let e=null;for(;e=await this.readline(r);)yield e}};function te(n){return n&&Symbol.iterator in Object(n)}function re(n){return n&&Symbol.asyncIterator in Object(n)}var R=class n extends g{constructor(e,t="gzip",s=!1){super();this.compressed=t,this.opts={raw:t==="deflateRaw"},this.inflator=t?new b(this.opts,this):null;let i;if(re(e))i=e;else if(typeof e=="object"&&"read"in e&&typeof e.read=="function")i=n.fromReadable(e);else if(e instanceof ReadableStream)i=n.fromReadable(e.getReader());else if(te(e))i=n.fromIter(e);else throw new TypeError("Invalid Stream Source");s?this._sourceIter=this.dechunk(i):this._sourceIter=i[Symbol.asyncIterator](),this.lastValue=null,this.errored=!1,this._savedChunk=null,this._rawOffset=0,this._readOffset=0,this.numChunks=0}async _loadNext(){let e=await this._sourceIter.next();return e.done?null:e.value}async*dechunk(e){let t=e instanceof n?e:new n(e,null),s=-1,i=!0;for(;s!=0;){let a=await t.readlineRaw(64),o=new Uint8Array;if(s=a?parseInt(N.decode(a),16):0,!s||s>2**32){if(Number.isNaN(s)||s>2**32){i||(this.errored=!0),yield a;break}}else if(o=await t.readSize(s),o.length!=s){i?yield a:this.errored=!0,yield o;break}let l=await t.readSize(2);if(l[0]!=13||l[1]!=10){i?yield a:this.errored=!0,yield o,yield l;break}else{if(i=!1,!o||s===0)return;yield o}}yield*t}unread(e){e.length&&(this._readOffset-=e.length,this._savedChunk&&console.log("Already have chunk!"),this._savedChunk=e)}async _next(){if(this._savedChunk){let t=this._savedChunk;return this._savedChunk=null,t}if(this.compressed){let t=this._getNextChunk();if(t)return t}let e=await this._loadNext();for(;this.compressed&&e;){this._push(e);let t=this._getNextChunk(e);if(t)return t;e=await this._loadNext()}return e}_push(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _push when this.compressed is null");this.lastValue=e,this.inflator.ended&&(this.inflator=new b(this.opts,this)),this.inflator.push(e),this.inflator.err&&this.inflator.ended&&this.compressed==="deflate"&&this.opts.raw===!1&&this.numChunks===0&&(this.opts.raw=!0,this.compressed="deflateRaw",this.inflator=new b(this.opts,this),this.inflator.push(e))}_getNextChunk(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _getNextChunk when this.compressed is null");for(;;){if(this.inflator.chunks.length>0)return this.numChunks++,this.inflator.chunks.shift();if(this.inflator.ended){if(this.inflator.err!==0)return this.compressed=null,e;let t=this.inflator.strm.avail_in;if(t&&this.lastValue){this._push(this.lastValue.slice(-t));continue}}return null}}async*[Symbol.asyncIterator](){let e=null;for(;e=await this._next();)this._readOffset+=e.length,yield e}async readlineRaw(e){let t=[],s=0,i=-1,a=null;for await(let o of this){if(e&&s+o.byteLength>e){a=o,i=e-s-1;let l=o.slice(0,i+1).indexOf(10);l>=0&&(i=l);break}if(i=o.indexOf(10),i>=0){a=o;break}t.push(o),s+=o.byteLength}if(a){let[o,l]=m(a,i+1);t.push(o),s+=o.byteLength,this.unread(l)}else if(!t.length)return null;return x(t,s)}async readFully(){return(await this._readOrSkip())[1]}async readSize(e){return(await this._readOrSkip(e))[1]}async skipSize(e){return(await this._readOrSkip(e,!0))[0]}async _readOrSkip(e=-1,t=!1){let s=[],i=0;for await(let a of this){if(e>=0)if(a.length>e){let[o,l]=m(a,e);t||s.push(o),i+=o.byteLength,this.unread(l);break}else if(a.length===e){t||s.push(a),i+=a.byteLength,e=0;break}else e-=a.length;t||s.push(a),i+=a.byteLength}return t?[i,new Uint8Array]:[i,x(s,i)]}getReadOffset(){return this._readOffset}getRawOffset(){return this.compressed?this._rawOffset:this._readOffset}getRawLength(e){return this.compressed?this.inflator.strm.total_in:this._readOffset-e}static fromReadable(e){return{async*[Symbol.asyncIterator](){let s=null;for(;(s=await e.read())&&!s.done;)yield s.value}}}static fromIter(e){return{async*[Symbol.asyncIterator](){for(let s of e)yield s}}}},w=class extends g{constructor(e,t,s=0){super();this.sourceIter=e,this.length=t,this.limit=t,this.skip=s}setLimitSkip(e,t=0){this.limit=e,this.skip=t}async*[Symbol.asyncIterator](){if(!(this.limit<=0))for await(let e of this.sourceIter){if(this.skip>0)if(e.length>=this.skip){let[,t]=m(e,this.skip);e=t,this.skip=0}else{this.skip-=e.length;continue}if(e.length>this.limit){let[t,s]=m(e,this.limit);e=t,this.sourceIter.unread&&this.sourceIter.unread(s)}if(e.length&&(this.limit-=e.length,yield e),this.limit<=0)break}}async readlineRaw(e){if(this.limit<=0)return null;let t=await this.sourceIter.readlineRaw(e?Math.min(e,this.limit):this.limit);return this.limit-=t?.length||0,t}async skipFully(){let e=this.limit;for(;this.limit>0;)this.limit-=await this.sourceIter.skipSize(this.limit);return e}};var se=new Uint8Array([13,10]),Ee=new Uint8Array([13,10,13,10]),ne=new TextDecoder("utf-8"),_=class{constructor({statusline:r,headers:e}){this.statusline=r,this.headers=e}toString(){let r=[this.statusline];for(let[e,t]of this.headers)r.push(`${e}: ${t}`);return r.join(`\r
`)+`\r
`}async*iterSerialize(r){yield r.encode(this.statusline),yield se;for(let[e,t]of this.headers)yield r.encode(`${e}: ${t}\r
`)}_parseResponseStatusLine(){let r=ie(this.statusline," ",2);this._protocol=r[0]??"",this._statusCode=r.length>1?Number(r[1]):"",this._statusText=r.length>2?r[2]:""}get statusCode(){return this._statusCode===void 0&&this._parseResponseStatusLine(),this._statusCode}get protocol(){return this._protocol===void 0&&this._parseResponseStatusLine(),this._protocol}get statusText(){return this._statusText===void 0&&this._parseResponseStatusLine(),this._statusText}_parseRequestStatusLine(){let r=this.statusline.split(" ",2);this._method=r[0]??"",this._requestPath=r.length>1?r[1]:""}get method(){return this._method===void 0&&this._parseRequestStatusLine(),this._method}get requestPath(){return this._requestPath===void 0&&this._parseRequestStatusLine(),this._requestPath}},T=class{async parse(r,{headersClass:e,firstLine:t}={headersClass:Map}){let s=t||await r.readline();if(!s)return null;let i=s.trimEnd();if(!i)return null;let a=new e,o=a instanceof Headers,l=await oe(r),d=0,u,I,f,h="",c;for(;d<l.length;){if(f=l.indexOf(`
`,d),c&&(l[d]===" "||l[d]==="	"))c+=l.slice(d,f<0?void 0:f).trimEnd();else{if(c){try{o&&h.toLowerCase()==="set-cookie"?a.append(h,c):a.set(h,c)}catch{}c=null}u=l.indexOf(":",d),I=u<0?d:u+1,u>=0&&u<f?(h=l.slice(d,u).trimStart(),c=l.slice(I,f<0?void 0:f).trim()):c=null}if(f<0)break;d=f+1}if(c)try{o&&h.toLowerCase()==="set-cookie"?a.append(h,c):a.set(h,c)}catch{}return new _({statusline:i,headers:a})}};function ie(n,r,e){let t=n.split(r),s=t.slice(0,e);return t.slice(e).length>0&&s.push(t.slice(e).join(r)),s}async function ae(n,r){let e=0;for(let t=0;t<n.length-4;t++){let s=n.indexOf(13,e);if(s<0)break;if(s+3>=n.length){let{value:i}=await r.next();if(!i)break;let a=new Uint8Array(i.length+n.length);a.set(n,0),a.set(i,n.length),n=a}if(n[s+1]===10&&n[s+2]===13&&n[s+3]===10)return[s+3,n];e=s+1}return[-1,n]}async function oe(n){let r=[],e=0,t=0,s=null,i=n[Symbol.asyncIterator]();for await(let a of i){if([t,a]=await ae(a,i),t>=0){s=a;break}r.push(a),e+=a.byteLength}if(s){let[a,o]=m(s,t+1);r.push(a),e+=a.byteLength,n.unread(o)}else if(!r.length)return"";return ne.decode(x(r,e))}import le from"uuid-random";var de=new TextDecoder("utf-8"),ce=new TextEncoder,ue="WARC/1.1",$="WARC/1.0",he="http://netpreserve.org/warc/1.0/revisit/identical-payload-digest",fe="http://netpreserve.org/warc/1.1/revisit/identical-payload-digest",pe={warcinfo:"application/warc-fields",response:"application/http; msgtype=response",revisit:"application/http; msgtype=response",request:"application/http; msgtype=request",metadata:"application/warc-fields"},W=class n extends g{constructor({warcHeaders:e,reader:t}){super();this._offset=0;this._length=0;this.method="";this.requestBody="";this._urlkey="";this.warcHeaders=e,this._reader=t,this._contentReader=null,this.payload=null,this.httpHeaders=null,this.consumed="",this.fixUp()}static create({url:e,date:t,type:s,warcHeaders:i={},filename:a="",httpHeaders:o={},statusline:l="HTTP/1.1 200 OK",warcVersion:d=$,keepHeadersCase:u=!0,refersToUrl:I=void 0,refersToDate:f=void 0}={},h){function c(A){let X=A;return d===$&&(A=A.split(".")[0],A.charAt(X.length-1)!="Z"&&(A+="Z")),A}t=c(t||new Date().toISOString()),i={...i},s==="warcinfo"?a&&(i["WARC-Filename"]=a):i["WARC-Target-URI"]=e,i["WARC-Date"]=t,i["WARC-Type"]=s,s==="revisit"&&(i["WARC-Profile"]=d===ue?fe:he,i["WARC-Refers-To-Target-URI"]=I,i["WARC-Refers-To-Date"]=c(f||new Date().toISOString())),i=new _({statusline:d,headers:new Map(Object.entries(i))}),i.headers.get("WARC-Record-ID")||i.headers.set("WARC-Record-ID",`<urn:uuid:${le()}>`),i.headers.get("Content-Type")||i.headers.set("Content-Type",s&&pe[s]||"application/octet-stream"),h||(h=z());let k=new n({warcHeaders:i,reader:h}),O=null,L=[];switch(s){case"response":case"request":case"revisit":L=Object.entries(o),O=u?new Map(L):new Headers(o),(L.length>0||s!=="revisit")&&(k.httpHeaders=new _({statusline:l,headers:O}));break}return k}static createWARCInfo(e={},t){async function*s(){for(let[i,a]of Object.entries(t))yield ce.encode(`${i}: ${a}\r
`)}return e.type="warcinfo",n.create(e,s())}getResponseInfo(){let e=this.httpHeaders;return e?{headers:e.headers,status:e.statusCode,statusText:e.statusText}:null}fixUp(){let e=this.warcHeaders.headers.get("WARC-Target-URI");e&&e.startsWith("<")&&e.endsWith(">")&&this.warcHeaders.headers.set("WARC-Target-URI",e.slice(1,-1))}async readFully(e=!1){if(this.httpHeaders){if(this.payload&&!this.payload.length)return this.payload;if(this._contentReader&&!e)throw new TypeError("WARC Record decoding already started, but requesting raw payload");if(e&&this.consumed==="raw"&&this.payload)return await this._createDecodingReader([this.payload]).readFully()}return this.payload?this.payload:(e?(this.payload=await super.readFully(),this.consumed="content"):(this.payload=await n.readFully(this._reader),this.consumed="raw"),this.payload)}get reader(){if(this.payload&&!this.payload.length)return z();if(this._contentReader)throw new TypeError("WARC Record decoding already started, but requesting raw payload");return this._reader}get contentReader(){return this.httpHeaders?(this._contentReader||(this._contentReader=this._createDecodingReader(this._reader)),this._contentReader):this._reader}_createDecodingReader(e){if(!this.httpHeaders)throw new Error("WARCRecord cannot call _createDecodingReader when this.httpHeaders === null");let t=this.httpHeaders.headers.get("Content-Encoding"),s=this.httpHeaders.headers.get("Transfer-Encoding"),i=s==="chunked";return!t&&!i&&(t=s),new R(e,t,i)}async readlineRaw(e){if(this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");if(this.contentReader instanceof g)return this.contentReader.readlineRaw(e);throw new Error("WARCRecord cannot call readlineRaw on this.contentReader if it does not extend BaseAsyncIterReader")}async contentText(){let e=await this.readFully(!0);return de.decode(e)}async*[Symbol.asyncIterator](){for await(let e of this.contentReader)if(yield e,this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");this.consumed="content"}async skipFully(){if(!this.consumed){if(this._reader instanceof w){let e=await this._reader.skipFully();return this.consumed="skipped",e}throw new Error("WARCRecord cannot call skipFully on this._reader if it is not a LimitReader")}}warcHeader(e){return this.warcHeaders.headers.get(e)}get warcType(){return this.warcHeaders.headers.get("WARC-Type")}get warcTargetURI(){return this.warcHeaders.headers.get("WARC-Target-URI")}get warcDate(){return this.warcHeaders.headers.get("WARC-Date")}get warcRefersToTargetURI(){return this.warcHeaders.headers.get("WARC-Refers-To-Target-URI")}get warcRefersToDate(){return this.warcHeaders.headers.get("WARC-Refers-To-Date")}get warcPayloadDigest(){return this.warcHeaders.headers.get("WARC-Payload-Digest")}get warcBlockDigest(){return this.warcHeaders.headers.get("WARC-Block-Digest")}get warcContentType(){return this.warcHeaders.headers.get("Content-Type")}get warcContentLength(){return Number(this.warcHeaders.headers.get("Content-Length"))}};async function*z(){}var M=new TextDecoder,v=new Uint8Array([]),U=class n{static parse(r,e){return new n(r,e).parse()}static iterRecords(r,e){return new n(r,e)[Symbol.asyncIterator]()}constructor(r,{keepHeadersCase:e=!1,parseHttp:t=!0}={}){this._offset=0,this._warcHeadersLength=0,this._headersClass=e?Map:Headers,this._parseHttp=t,r instanceof R?this._reader=r:this._reader=new R(r),this._record=null}async readToNextRecord(){if(!this._reader||!this._record)return v;await this._record.skipFully(),this._reader.compressed&&(this._offset=this._reader.getRawOffset());let r=await this._reader.readlineRaw(),e=0;if(!r)r=v;else{if(e=r.byteLength-1,e===9&&M.decode(r).startsWith("WARC/"))return r;for(;e>0;){let t=r[e-1];if(t!==10&&t!==13)break;e--}e&&console.warn(`Content-Length Too Small: Record not followed by newline, Remainder Length: ${e}, Offset: ${this._reader.getRawOffset()-r.byteLength}`)}if(this._reader.compressed)await this._reader.skipSize(2),r=v;else{for(r=await this._reader.readlineRaw();r&&r.byteLength===2;)r=await this._reader.readlineRaw();this._offset=this._reader.getRawOffset(),r&&(this._offset-=r.length)}return r}_initRecordReader(r){return new w(this._reader,Number(r.headers.get("Content-Length")||0))}async parse(){let r=await this.readToNextRecord(),e=r?M.decode(r):"",t=new T,s=await t.parse(this._reader,{firstLine:e,headersClass:this._headersClass});if(!s)return null;this._warcHeadersLength=this._reader.getReadOffset();let i=new W({warcHeaders:s,reader:this._initRecordReader(s)});if(this._record=i,this._parseHttp)switch(i.warcType){case"response":case"request":await this._addHttpHeaders(i,t);break;case"revisit":i.warcContentLength>0&&await this._addHttpHeaders(i,t);break}return i}get offset(){return this._offset}get recordLength(){return this._reader.getRawLength(this._offset)}async*[Symbol.asyncIterator](){let r=null;for(;(r=await this.parse())!==null;)yield r;this._record=null}async _addHttpHeaders(r,e){let t=await e.parse(this._reader,{headersClass:this._headersClass});r.httpHeaders=t;let s=this._reader.getReadOffset()-this._warcHeadersLength;r.reader instanceof w&&r.reader.setLimitSkip(r.warcContentLength-s)}};var ye=["offset","warc-type","warc-target-uri"],H=class{constructor(r={}){this.opts=r,this.fields=r&&r.fields?r.fields.split(","):ye,this.parseHttp=!1}serialize(r){return JSON.stringify(r)+`
`}write(r,e){e.write(this.serialize(r))}async writeAll(r,e){for await(let t of this.iterIndex(r))this.write(t,e)}async*iterIndex(r){let e={strictHeaders:!0,parseHttp:this.parseHttp};for(let{filename:t,reader:s}of r){let i=new U(s,e);yield*this.iterRecords(i,t)}}async*iterRecords(r,e){for await(let t of r){await t.skipFully();let s=this.indexRecord(t,r,e);s&&(yield s)}}indexRecord(r,e,t){if(this.filterRecord&&!this.filterRecord(r))return null;let s={},{offset:i,recordLength:a}=e,o={offset:i,length:a,filename:t};for(let l of this.fields)l in o?s[l]=o[l]:this.setField(l,r,s);return s}setField(r,e,t){let s=this.getField(r,e);s!==null&&(t[r]=s)}getField(r,e){if(r==="http:status")return e.httpHeaders&&(e.warcType==="response"||e.warcType==="revisit")?e.httpHeaders.statusCode:null;if(r.startsWith("http:")){if(e.httpHeaders){let t=e.httpHeaders.headers;return t instanceof Map&&(t=new Headers(Object.fromEntries(t))),t.get(r.slice(5))}return null}return e.warcHeaders.headers.get(r)||null}},C=class extends H{constructor(r){super(r);for(let e of this.fields)if(e.startsWith("http:")){this.parseHttp=!0;break}}},me="urlkey,timestamp,url,mime,status,digest,length,offset,filename".split(","),ge="urlkey,timestamp,url,mime,status,digest,redirect,meta,length,offset,filename".split(","),S=class extends C{constructor(e){super(e);switch(this.includeAll=!!e?.all,this.overrideIndexForAll=!!e?.all,this.fields=me,this.parseHttp=!0,this.noSurt=!!e?.noSurt,this._lastRecord=null,e?.format){case"cdxj":this.serialize=this.serializeCDXJ;break;case"cdx":this.serialize=this.serializeCDX11;break;case"json":default:break}}async*iterRecords(e,t){this._lastRecord=null;for await(let i of e){await i.readFully();let a=this.indexRecord(i,e,t);a&&(yield a)}let s=this.indexRecord(null,e,t);s&&(yield s)}filterRecord(e){if(this.includeAll)return!0;let t=e.warcType;return!(t==="request"||t==="warcinfo"||(t==="metadata"||t==="resource")&&e.warcContentType==="application/warc-fields")}indexRecord(e,t,s){if(this.overrideIndexForAll)return e?super.indexRecord(e,t,s):null;let i=this._lastRecord;if(this._lastRecord=e,e&&(e._offset=t.offset,e._length=t.recordLength),!i)return null;if(!e||i.warcTargetURI!=e.warcTargetURI)return this.indexRecordPair(i,null,t,s);let a=e.warcType,o=i.warcType;return a==="request"&&(o==="response"||o==="revisit")?(this._lastRecord=null,this.indexRecordPair(i,e,t,s)):(a==="response"||a==="revisit")&&o==="request"?(this._lastRecord=null,this.indexRecordPair(e,i,t,s)):this.indexRecordPair(i,null,t,s)}indexRecordPair(e,t,s,i){let a,o,l=e.warcTargetURI||"";if(t&&t.httpHeaders&&t.httpHeaders.method!=="GET"){let u={url:l,method:t.httpHeaders.method,headers:t.httpHeaders.headers,postData:t.payload};a=u.method,B(u)&&(o=u.requestBody,e.method=a,e.requestBody=o,l=u.url)}e._urlkey=l;let d=super.indexRecord(e,s,i);return d&&(e&&e._offset!==void 0&&(d.offset=e._offset,d.length=e._length),a&&(d.method=a),o&&(d.requestBody=o)),d}serializeCDXJ(e){let{urlkey:t,timestamp:s}=e;return delete e.urlkey,delete e.timestamp,`${t} ${s} ${JSON.stringify(e)}
`}serializeCDX11(e){let t=[];for(let s of ge)t.push(e[s]!=null?e[s]:"-");return t.join(" ")+`
`}getField(e,t){let s=null;switch(e){case"urlkey":return s=t._urlkey||t.warcTargetURI||null,this.noSurt||s===null?s:q(s);case"timestamp":return s=t.warcDate??"",s.replace(/[-:T]/g,"").slice(0,14);case"url":return t.warcTargetURI;case"mime":switch(t.warcType){case"revisit":return"warc/revisit";case"response":case"request":e="http:content-type";break;default:e="content-type"}return s=super.getField(e,t),s?s.toString().split(";",1)[0]?.trim():null;case"status":return super.getField("http:status",t);case"digest":return s=t.warcPayloadDigest,s?s.split(":",2)[1]:null;default:return null}}};var J="2.2.0";var ke=1024*128;function P(n=Ce,r){let e=Promise.resolve();return r=r||Ie(process.argv),Se().version(J).usage("$0 [command]").command({command:"index <filenames..>",describe:"Index WARC(s)",builder:D,handler:async t=>{e=new C(t).writeAll(Q(t.filenames),n)}}).command({command:"cdx-index <filenames..>",describe:"CDX(J) Index of WARC(s)",builder:E,handler:async t=>{e=new S(t).writeAll(Q(t.filenames),n)}}).demandCommand(1,"Please specify a command").strictCommands().help().parseAsync(r),e}function Q(n){return n.reduce((r,e)=>{if(!Ae(e).isFile())return be.write(`Skipping ${e}, not a file
`),r;let t=xe(e,{highWaterMark:ke});return e=_e(e),r.push({filename:e,reader:t}),r},[])}P();
