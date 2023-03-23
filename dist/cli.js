#!/usr/bin/env node
import{lstatSync as we,createReadStream as Ae}from"fs";import{basename as xe}from"path";import{stdout as _e,stderr as Ce}from"process";import be from"yargs";import{hideBin as Se}from"yargs/helpers";var D=i=>i.positional("filenames",{describe:"WARC file(s) to index",type:"string",array:!0,demandOption:"true"}).option("fields",{alias:"f",describe:"fields to include in index",type:"string"}),F=i=>i.positional("filenames",{describe:"WARC file(s) to index",type:"string",array:!0,demandOption:"true"}).option("all",{alias:"a",describe:"index all WARC records",type:"boolean"}).option("format",{describe:"output format",choices:["json","cdxj","cdx"],default:"cdxj"}).option("noSurt",{describe:"Use plain urlkey, do not convert to SURT form (Sort-friendly URI Reordering Transform)",type:"boolean"});import Y from"pako";function E(i){let r;typeof i=="string"?r=i:i&&i.length?r=i.reduce((e,t)=>(e+=String.fromCharCode(t),e),""):i?r=i.toString():r="";try{return"__wb_post_data="+btoa(r)}catch{return"__wb_post_data="}}function X(i){return i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function q(i){try{if(!i.startsWith("https:")&&!i.startsWith("http:"))return i;i=i.replace(/^(https?:\/\/)www\d*\./,"$1");let r=i.toLowerCase(),e=new URL(r),s=e.hostname.split(".").reverse().join(",");if(e.port&&(s+=":"+e.port),s+=")",s+=e.pathname,e.search){e.searchParams.sort(),s+=e.search;for(let[n,a]of e.searchParams.entries())if(!a){let o=new RegExp(`(?<=[&?])${X(n)}=(?=&|$)`);o.exec(r)||(s=s.replace(o,n))}}return s}catch{return i}}function N(i){let{method:r,headers:e,postData:t}=i;if(r==="GET")return!1;let s=(e.get("content-type")||"").split(";")[0];function n(o){return o instanceof Uint8Array&&(o=new TextDecoder().decode(o)),o}let a="";switch(s){case"application/x-www-form-urlencoded":a=n(t);break;case"application/json":a=j(n(t));break;case"text/plain":try{a=j(n(t),!1)}catch{a=E(t)}break;case"multipart/form-data":{let o=e.get("content-type");if(!o)throw new Error("utils cannot call postToGetURL when missing content-type header");a=Z(n(t),o);break}default:a=E(t)}return a!==null?(i.url=G(i.url,a,i.method),i.method="GET",i.requestBody=a,!0):!1}function G(i,r,e){if(!e)return i;let t=i.indexOf("?")>0?"&":"?";return`${i}${t}__wb_method=${e}&${r}`}function V(i,r=!0){if(typeof i=="string")try{i=JSON.parse(i)}catch{i={}}let e=new URLSearchParams,t={},s=n=>e.has(n)?(n in t||(t[n]=1),n+"."+ ++t[n]+"_"):n;try{JSON.stringify(i,(n,a)=>(["object","function"].includes(typeof a)||e.set(s(n),a),a))}catch(n){if(!r)throw n}return e}function K(i,r){let e=new URLSearchParams;i instanceof Uint8Array&&(i=new TextDecoder().decode(i));try{let t=r.split("boundary=")[1],s=i.split(new RegExp("-*"+t+"-*","mi"));for(let n of s){let a=n.trim().match(/name="([^"]+)"\r\n\r\n(.*)/im);a&&e.set(a[1],a[2])}}catch{}return e}function j(i,r=!0){return V(i,r).toString()}function Z(i,r){return K(i,r).toString()}function _(i,r){if(i.length===1)return i[0];let e=new Uint8Array(r),t=0;for(let s of i)e.set(s,t),t+=s.byteLength;return e}function w(i,r){return[i.slice(0,r),i.slice(r)]}var B=new TextDecoder("utf-8"),k=class extends Y.Inflate{constructor(e,t){super(e);this.ended=!1;this.chunks=[];this.reader=t}onEnd(e){this.err=e,this.err||(this.reader._rawOffset+=this.strm.total_in)}},m=class{static async readFully(r){let e=[],t=0;for await(let s of r)e.push(s),t+=s.byteLength;return _(e,t)}getReadableStream(){let r=this[Symbol.asyncIterator]();return new ReadableStream({pull(e){return r.next().then(t=>{t.done||!t.value?e.close():e.enqueue(t.value)})}})}async readFully(){return await m.readFully(this)}async readline(r=0){let e=await this.readlineRaw(r);return e?B.decode(e):""}async*iterLines(r=0){let e=null;for(;e=await this.readline(r);)yield e}};function ee(i){return i&&Symbol.iterator in Object(i)}function te(i){return i&&Symbol.asyncIterator in Object(i)}var u=class extends m{constructor(e,t="gzip",s=!1){super();this.compressed=t,this.opts={raw:t==="deflateRaw"},this.inflator=t?new k(this.opts,this):null;let n;if(te(e))n=e;else if(typeof e=="object"&&"read"in e&&typeof e.read=="function")n=u.fromReadable(e);else if(e instanceof ReadableStream)n=u.fromReadable(e.getReader());else if(ee(e))n=u.fromIter(e);else throw new TypeError("Invalid Stream Source");s?this._sourceIter=this.dechunk(n):this._sourceIter=n[Symbol.asyncIterator](),this.lastValue=null,this.errored=!1,this._savedChunk=null,this._rawOffset=0,this._readOffset=0,this.numChunks=0}async _loadNext(){let e=await this._sourceIter.next();return e.done?null:e.value}async*dechunk(e){let t=e instanceof u?e:new u(e,null),s=-1,n=!0;for(;s!=0;){let a=await t.readlineRaw(64),o=new Uint8Array;if(s=a?parseInt(B.decode(a),16):0,!s||s>2**32){if(Number.isNaN(s)||s>2**32){n||(this.errored=!0),yield a;break}}else if(o=await t.readSize(s),o.length!=s){n?yield a:this.errored=!0,yield o;break}let l=await t.readSize(2);if(l[0]!=13||l[1]!=10){n?yield a:this.errored=!0,yield o,yield l;break}else{if(n=!1,!o||s===0)return;yield o}}yield*t}unread(e){!e.length||(this._readOffset-=e.length,this._savedChunk&&console.log("Already have chunk!"),this._savedChunk=e)}async _next(){if(this._savedChunk){let t=this._savedChunk;return this._savedChunk=null,t}if(this.compressed){let t=this._getNextChunk();if(t)return t}let e=await this._loadNext();for(;this.compressed&&e;){this._push(e);let t=this._getNextChunk(e);if(t)return t;e=await this._loadNext()}return e}_push(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _push when this.compressed is null");this.lastValue=e,this.inflator.ended&&(this.inflator=new k(this.opts,this)),this.inflator.push(e),this.inflator.err&&this.inflator.ended&&this.compressed==="deflate"&&this.opts.raw===!1&&this.numChunks===0&&(this.opts.raw=!0,this.compressed="deflateRaw",this.inflator=new k(this.opts,this),this.inflator.push(e))}_getNextChunk(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _getNextChunk when this.compressed is null");for(;;){if(this.inflator.chunks.length>0)return this.numChunks++,this.inflator.chunks.shift();if(this.inflator.ended){if(this.inflator.err!==0)return this.compressed=null,e;let t=this.inflator.strm.avail_in;if(t&&this.lastValue){this._push(this.lastValue.slice(-t));continue}}return null}}async*[Symbol.asyncIterator](){let e=null;for(;e=await this._next();)this._readOffset+=e.length,yield e}async readlineRaw(e){let t=[],s=0,n=-1,a=null;for await(let o of this){if(e&&s+o.byteLength>e){a=o,n=e-s-1;let l=o.slice(0,n+1).indexOf(10);l>=0&&(n=l);break}if(n=o.indexOf(10),n>=0){a=o;break}t.push(o),s+=o.byteLength}if(a){let[o,l]=w(a,n+1);t.push(o),s+=o.byteLength,this.unread(l)}else if(!t.length)return null;return _(t,s)}async readFully(){return(await this._readOrSkip())[1]}async readSize(e){return(await this._readOrSkip(e))[1]}async skipSize(e){return(await this._readOrSkip(e,!0))[0]}async _readOrSkip(e=-1,t=!1){let s=[],n=0;for await(let a of this){if(e>=0)if(a.length>e){let[o,l]=w(a,e);t||s.push(o),n+=o.byteLength,this.unread(l);break}else if(a.length===e){t||s.push(a),n+=a.byteLength,e=0;break}else e-=a.length;t||s.push(a),n+=a.byteLength}return t?[n,new Uint8Array]:[n,_(s,n)]}getReadOffset(){return this._readOffset}getRawOffset(){return this.compressed?this._rawOffset:this._readOffset}getRawLength(e){return this.compressed?this.inflator.strm.total_in:this._readOffset-e}static fromReadable(e){return{async*[Symbol.asyncIterator](){let s=null;for(;(s=await e.read())&&!s.done;)yield s.value}}}static fromIter(e){return{async*[Symbol.asyncIterator](){for(let s of e)yield s}}}},A=class extends m{constructor(e,t,s=0){super();this.sourceIter=e,this.length=t,this.limit=t,this.skip=s}setLimitSkip(e,t=0){this.limit=e,this.skip=t}async*[Symbol.asyncIterator](){if(!(this.limit<=0))for await(let e of this.sourceIter){if(this.skip>0)if(e.length>=this.skip){let[,t]=w(e,this.skip);e=t,this.skip=0}else{this.skip-=e.length;continue}if(e.length>this.limit){let[t,s]=w(e,this.limit);e=t,this.sourceIter.unread&&this.sourceIter.unread(s)}if(e.length&&(this.limit-=e.length,yield e),this.limit<=0)break}}async readlineRaw(e){if(this.limit<=0)return null;let t=await this.sourceIter.readlineRaw(e?Math.min(e,this.limit):this.limit);return this.limit-=t?.length||0,t}async skipFully(){let e=this.limit;for(;this.limit>0;)this.limit-=await this.sourceIter.skipSize(this.limit);return e}};var re=new Uint8Array([13,10]),De=new Uint8Array([13,10,13,10]),se=new TextDecoder("utf-8"),C=class{constructor({statusline:r,headers:e}){this.statusline=r,this.headers=e}toString(){let r=[this.statusline];for(let[e,t]of this.headers)r.push(`${e}: ${t}`);return r.join(`\r
`)+`\r
`}async*iterSerialize(r){yield r.encode(this.statusline),yield re;for(let[e,t]of this.headers)yield r.encode(`${e}: ${t}\r
`)}_parseResponseStatusLine(){let r=ne(this.statusline," ",2);this._protocol=r[0]??"",this._statusCode=r.length>1?Number(r[1]):"",this._statusText=r.length>2?r[2]:""}get statusCode(){return this._statusCode===void 0&&this._parseResponseStatusLine(),this._statusCode}get protocol(){return this._protocol===void 0&&this._parseResponseStatusLine(),this._protocol}get statusText(){return this._statusText===void 0&&this._parseResponseStatusLine(),this._statusText}_parseRequestStatusLine(){let r=this.statusline.split(" ",2);this._method=r[0]??"",this._requestPath=r.length>1?r[1]:""}get method(){return this._method===void 0&&this._parseRequestStatusLine(),this._method}get requestPath(){return this._requestPath===void 0&&this._parseRequestStatusLine(),this._requestPath}},W=class{async parse(r,{headersClass:e,firstLine:t}={headersClass:Map}){let s=t||await r.readline();if(!s)return null;let n=s.trimEnd();if(!n)return null;let a=new e,o=await ae(r),l=0,d,h,f,S="",c;for(;l<o.length;){if(f=o.indexOf(`
`,l),c&&(o[l]===" "||o[l]==="	"))c+=o.slice(l,f<0?void 0:f).trimEnd();else{if(c){try{a.set(S,c)}catch{}c=null}d=o.indexOf(":",l),h=d<0?l:d+1,d>=0&&d<f?(S=o.slice(l,d).trimStart(),c=o.slice(h,f<0?void 0:f).trim()):c=null}if(f<0)break;l=f+1}if(c)try{a.set(S,c)}catch{}return new C({statusline:n,headers:a})}};function ne(i,r,e){let t=i.split(r),s=t.slice(0,e);return t.slice(e).length>0&&s.push(t.slice(e).join(r)),s}async function ie(i,r){let e=0;for(let t=0;t<i.length-4;t++){let s=i.indexOf(13,e);if(s<0)break;if(s+3>=i.length){let{value:n}=await r.next();if(!n)break;let a=new Uint8Array(n.length+i.length);a.set(i,0),a.set(n,i.length),i=a}if(i[s+1]===10&&i[s+2]===13&&i[s+3]===10)return[s+3,i];e=s+1}return[-1,i]}async function ae(i){let r=[],e=0,t=0,s=null,n=i[Symbol.asyncIterator]();for await(let a of n){if([t,a]=await ie(a,n),t>=0){s=a;break}r.push(a),e+=a.byteLength}if(s){let[a,o]=w(s,t+1);r.push(a),e+=a.byteLength,i.unread(o)}else if(!r.length)return"";return se.decode(_(r,e))}import oe from"uuid-random";var le=new TextDecoder("utf-8"),de=new TextEncoder,ce="WARC/1.1",$="WARC/1.0",ue="http://netpreserve.org/warc/1.0/revisit/identical-payload-digest",he="http://netpreserve.org/warc/1.1/revisit/identical-payload-digest",fe={warcinfo:"application/warc-fields",response:"application/http; msgtype=response",revisit:"application/http; msgtype=response",request:"application/http; msgtype=request",metadata:"application/warc-fields"},g=class extends m{constructor({warcHeaders:e,reader:t}){super();this._offset=0;this._length=0;this.method="";this.requestBody="";this._urlkey="";this.warcHeaders=e,this._reader=t,this._contentReader=null,this.payload=null,this.httpHeaders=null,this.consumed="",this.fixUp()}static create({url:e,date:t,type:s,warcHeaders:n={},filename:a="",httpHeaders:o={},statusline:l="HTTP/1.1 200 OK",warcVersion:d=$,keepHeadersCase:h=!0,refersToUrl:f=void 0,refersToDate:S=void 0}={},c){function T(R){let Q=R;return d===$&&(R=R.split(".")[0],R.charAt(Q.length-1)!="Z"&&(R+="Z")),R}t=T(t||new Date().toISOString()),n={...n},s==="warcinfo"?a&&(n["WARC-Filename"]=a):n["WARC-Target-URI"]=e,n["WARC-Date"]=t,n["WARC-Type"]=s,s==="revisit"&&(n["WARC-Profile"]=d===ce?he:ue,n["WARC-Refers-To-Target-URI"]=f,n["WARC-Refers-To-Date"]=T(S||new Date().toISOString())),n=new C({statusline:d,headers:h?new Map(Object.entries(n)):new Headers(n)}),n.headers.get("WARC-Record-ID")||n.headers.set("WARC-Record-ID",`<urn:uuid:${oe()}>`),n.headers.get("Content-Type")||n.headers.set("Content-Type",s&&fe[s]||"application/octet-stream"),c||(c=async function*(){}());let P=new g({warcHeaders:n,reader:c}),O=null,U=[];switch(s){case"response":case"request":case"revisit":U=Object.entries(o),O=h?new Map(U):new Headers(o),(U.length>0||s!=="revisit")&&(P.httpHeaders=new C({statusline:l,headers:O}));break}return P}static createWARCInfo(e={},t){async function*s(){for(let[n,a]of Object.entries(t))yield de.encode(`${n}: ${a}\r
`)}return e.type="warcinfo",g.create(e,s())}getResponseInfo(){let e=this.httpHeaders;return e?{headers:e.headers,status:e.statusCode,statusText:e.statusText}:null}fixUp(){let e=this.warcHeaders.headers.get("WARC-Target-URI");e&&e.startsWith("<")&&e.endsWith(">")&&this.warcHeaders.headers.set("WARC-Target-URI",e.slice(1,-1))}async readFully(e=!1){if(this.httpHeaders){if(this.payload&&!this.payload.length)return this.payload;if(this._contentReader&&!e)throw new TypeError("WARC Record decoding already started, but requesting raw payload");if(e&&this.consumed==="raw"&&this.payload)return await this._createDecodingReader([this.payload]).readFully()}return this.payload?this.payload:(e?(this.payload=await super.readFully(),this.consumed="content"):(this.payload=await g.readFully(this._reader),this.consumed="raw"),this.payload)}get reader(){if(this._contentReader)throw new TypeError("WARC Record decoding already started, but requesting raw payload");return this._reader}get contentReader(){return this.httpHeaders?(this._contentReader||(this._contentReader=this._createDecodingReader(this._reader)),this._contentReader):this._reader}_createDecodingReader(e){if(!this.httpHeaders)throw new Error("WARCRecord cannot call _createDecodingReader when this.httpHeaders === null");let t=this.httpHeaders.headers.get("Content-Encoding"),s=this.httpHeaders.headers.get("Transfer-Encoding"),n=s==="chunked";return!t&&!n&&(t=s),new u(e,t,n)}async readlineRaw(e){if(this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");if(this.contentReader instanceof m)return this.contentReader.readlineRaw(e);throw new Error("WARCRecord cannot call readlineRaw on this.contentReader if it does not extend BaseAsyncIterReader")}async contentText(){let e=await this.readFully(!0);return le.decode(e)}async*[Symbol.asyncIterator](){for await(let e of this.contentReader)if(yield e,this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");this.consumed="content"}async skipFully(){if(!this.consumed){if(this._reader instanceof A){let e=await this._reader.skipFully();return this.consumed="skipped",e}throw new Error("WARCRecord cannot call skipFully on this._reader if it is not a LimitReader")}}warcHeader(e){return this.warcHeaders.headers.get(e)}get warcType(){return this.warcHeaders.headers.get("WARC-Type")}get warcTargetURI(){return this.warcHeaders.headers.get("WARC-Target-URI")}get warcDate(){return this.warcHeaders.headers.get("WARC-Date")}get warcRefersToTargetURI(){return this.warcHeaders.headers.get("WARC-Refers-To-Target-URI")}get warcRefersToDate(){return this.warcHeaders.headers.get("WARC-Refers-To-Date")}get warcPayloadDigest(){return this.warcHeaders.headers.get("WARC-Payload-Digest")}get warcBlockDigest(){return this.warcHeaders.headers.get("WARC-Block-Digest")}get warcContentType(){return this.warcHeaders.headers.get("Content-Type")}get warcContentLength(){return Number(this.warcHeaders.headers.get("Content-Length"))}};var z=new TextDecoder,v=new Uint8Array([]),x=class{static parse(r,e){return new x(r,e).parse()}static iterRecords(r,e){return new x(r,e)[Symbol.asyncIterator]()}constructor(r,{keepHeadersCase:e=!1,parseHttp:t=!0}={}){this._offset=0,this._warcHeadersLength=0,this._headersClass=e?Map:Headers,this._parseHttp=t,r instanceof u?this._reader=r:this._reader=new u(r),this._record=null}async readToNextRecord(){if(!this._reader||!this._record)return v;await this._record.skipFully(),this._reader.compressed&&(this._offset=this._reader.getRawOffset());let r=await this._reader.readlineRaw(),e=0;if(!r)r=v;else{if(e=r.byteLength-1,e===9&&z.decode(r).startsWith("WARC/"))return r;for(;e>0;){let t=r[e-1];if(t!==10&&t!==13)break;e--}e&&console.warn(`Content-Length Too Small: Record not followed by newline, Remainder Length: ${e}, Offset: ${this._reader.getRawOffset()-r.byteLength}`)}if(this._reader.compressed)await this._reader.skipSize(2),r=v;else{for(r=await this._reader.readlineRaw();r&&r.byteLength===2;)r=await this._reader.readlineRaw();this._offset=this._reader.getRawOffset(),r&&(this._offset-=r.length)}return r}_initRecordReader(r){return new A(this._reader,Number(r.headers.get("Content-Length")||0))}async parse(){let r=await this.readToNextRecord(),e=r?z.decode(r):"",t=new W,s=await t.parse(this._reader,{firstLine:e,headersClass:this._headersClass});if(!s)return null;this._warcHeadersLength=this._reader.getReadOffset();let n=new g({warcHeaders:s,reader:this._initRecordReader(s)});if(this._record=n,this._parseHttp)switch(n.warcType){case"response":case"request":await this._addHttpHeaders(n,t);break;case"revisit":n.warcContentLength>0&&await this._addHttpHeaders(n,t);break}return n}get offset(){return this._offset}get recordLength(){return this._reader.getRawLength(this._offset)}async*[Symbol.asyncIterator](){let r=null;for(;(r=await this.parse())!==null;)yield r;this._record=null}async _addHttpHeaders(r,e){let t=await e.parse(this._reader,{headersClass:this._headersClass});r.httpHeaders=t;let s=this._reader.getReadOffset()-this._warcHeadersLength;r.reader instanceof A&&r.reader.setLimitSkip(r.warcContentLength-s)}};var pe=["offset","warc-type","warc-target-uri"],H=class{constructor(r={}){this.opts=r,this.fields=r&&r.fields?r.fields.split(","):pe,this.parseHttp=!1}serialize(r){return JSON.stringify(r)+`
`}write(r,e){e.write(this.serialize(r))}async writeAll(r,e){for await(let t of this.iterIndex(r))this.write(t,e)}async*iterIndex(r){let e={strictHeaders:!0,parseHttp:this.parseHttp};for(let{filename:t,reader:s}of r){let n=new x(s,e);yield*this.iterRecords(n,t)}}async*iterRecords(r,e){for await(let t of r){await t.skipFully();let s=this.indexRecord(t,r,e);s&&(yield s)}}indexRecord(r,e,t){if(this.filterRecord&&!this.filterRecord(r))return null;let s={},n=e.offset,a=e.recordLength,o={offset:n,length:a,filename:t};for(let l of this.fields)l in o?s[l]=o[l]:this.setField(l,r,s);return s}setField(r,e,t){let s=this.getField(r,e);s!==null&&(t[r]=s)}getField(r,e){return r==="http:status"?e.httpHeaders&&(e.warcType==="response"||e.warcType==="revisit")?e.httpHeaders.statusCode:null:r.startsWith("http:")?e.httpHeaders?e.httpHeaders.headers.get(r.slice(5)):null:e.warcHeaders.headers.get(r)||null}},b=class extends H{constructor(r){super(r);for(let e of this.fields)if(e.startsWith("http:")){this.parseHttp=!0;break}}},ye="urlkey,timestamp,url,mime,status,digest,length,offset,filename".split(","),me="urlkey,timestamp,url,mime,status,digest,redirect,meta,length,offset,filename".split(","),I=class extends b{constructor(e){super(e);switch(this.includeAll=Boolean(e?.all),this.overrideIndexForAll=Boolean(e?.all),this.fields=ye,this.parseHttp=!0,this.noSurt=Boolean(e?.noSurt),this._lastRecord=null,e?.format){case"cdxj":this.serialize=this.serializeCDXJ;break;case"cdx":this.serialize=this.serializeCDX11;break;case"json":default:break}}async*iterRecords(e,t){this._lastRecord=null;for await(let n of e){await n.readFully();let a=this.indexRecord(n,e,t);a&&(yield a)}let s=this.indexRecord(null,e,t);s&&(yield s)}filterRecord(e){if(this.includeAll)return!0;let t=e.warcType;return!(t==="request"||t==="warcinfo")}indexRecord(e,t,s){if(this.overrideIndexForAll)return e?super.indexRecord(e,t,s):null;let n=this._lastRecord;if(this._lastRecord=e,e&&(e._offset=t.offset,e._length=t.recordLength),!n)return null;if(!e||n.warcTargetURI!=e.warcTargetURI)return this.indexRecordPair(n,null,t,s);let a=e.warcType,o=n.warcType;return a==="request"&&(o==="response"||o==="revisit")?(this._lastRecord=null,this.indexRecordPair(n,e,t,s)):(a==="response"||a==="revisit")&&o==="request"?(this._lastRecord=null,this.indexRecordPair(e,n,t,s)):this.indexRecordPair(n,null,t,s)}indexRecordPair(e,t,s,n){let a,o,l=e.warcTargetURI||"";if(t&&t.httpHeaders&&t.httpHeaders.method!=="GET"){let h={url:l,method:t.httpHeaders.method,headers:t.httpHeaders.headers,postData:t.payload};a=h.method,N(h)&&(o=h.requestBody,e.method=a,e.requestBody=o,l=h.url)}e._urlkey=l;let d=super.indexRecord(e,s,n);return d&&(e&&e._offset!==void 0&&(d.offset=e._offset,d.length=e._length),a&&(d.method=a),o&&(d.requestBody=o)),d}serializeCDXJ(e){let{urlkey:t,timestamp:s}=e;return delete e.urlkey,delete e.timestamp,`${t} ${s} ${JSON.stringify(e)}
`}serializeCDX11(e){let t=[];for(let s of me)t.push(e[s]!=null?e[s]:"-");return t.join(" ")+`
`}getField(e,t){let s=null;switch(e){case"urlkey":return s=t._urlkey||t.warcTargetURI||null,this.noSurt||s===null?s:q(s);case"timestamp":return s=t.warcDate??"",s.replace(/[-:T]/g,"").slice(0,14);case"url":return t.warcTargetURI;case"mime":switch(t.warcType){case"revisit":return"warc/revisit";case"response":case"request":e="http:content-type";break;default:e="content-type"}return s=super.getField(e,t),s?s.toString().split(";",1)[0]?.trim():null;case"status":return super.getField("http:status",t);case"digest":return s=t.warcPayloadDigest,s?s.split(":",2)[1]:null;default:return null}}};var M="2.0.1";var ke=1024*128;function L(i=_e,r){let e=Promise.resolve();return r=r||Se(process.argv),be().version(M).usage("$0 [command]").command({command:"index <filenames..>",describe:"Index WARC(s)",builder:D,handler:async t=>{e=new b(t).writeAll(J(t.filenames),i)}}).command({command:"cdx-index <filenames..>",describe:"CDX(J) Index of WARC(s)",builder:F,handler:async t=>{e=new I(t).writeAll(J(t.filenames),i)}}).demandCommand(1,"Please specify a command").strictCommands().help().parseAsync(r),e}function J(i){return i.reduce((r,e)=>{if(!we(e).isFile())return Ce.write(`Skipping ${e}, not a file
`),r;let t=Ae(e,{highWaterMark:ke});return e=xe(e),r.push({filename:e,reader:t}),r},[])}L();
