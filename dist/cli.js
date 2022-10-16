#!/usr/bin/env node
import{lstatSync as Re,createReadStream as we}from"fs";import{basename as Ae}from"path";import _e from"yargs";import D from"yargs";var E=D.positional("filename",{describe:"WARC file(s) to index",type:"string",demandOption:"true"}).option("f",{alias:"fields",describe:"fields to include in index",type:"string"}),F=D.positional("filename",{describe:"WARC file(s) to index",type:"string",demandOption:"true"}).option("a",{alias:"all",describe:"index all WARC records",type:"boolean"}).option("format",{describe:"output format",choices:["json","cdxj","cdx"],default:"cdxj"}).option("noSurt",{describe:"Use plain urlkey, do not convert to SURT form (Sort-friendly URI Reordering Transform)",type:"boolean"});import{ReadStream as K}from"fs";import{Inflate as Y}from"pako";function O(i){let r;return typeof i=="string"?r=i:i&&i.length?r=i.reduce((e,t)=>(e+=String.fromCharCode(t),e),""):i?r=i.toString():r="","__wb_post_data="+btoa(r)}function J(i){return i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function q(i){try{if(!i.startsWith("https:")&&!i.startsWith("http:"))return i;i=i.replace(/^(https?:\/\/)www\d*\./,"$1");let r=i.toLowerCase(),e=new URL(r),s=e.hostname.split(".").reverse().join(",");if(e.port&&(s+=":"+e.port),s+=")",s+=e.pathname,e.search){e.searchParams.sort(),s+=e.search;for(let[n,a]of e.searchParams.entries())if(!a){let o=new RegExp(`(?<=[&?])${J(n)}=(?=&|$)`);o.exec(r)||(s=s.replace(o,n))}}return s}catch{return i}}function B(i){let{method:r,headers:e,postData:t}=i;if(r==="GET")return!1;let s=(e.get("content-type")||"").split(";")[0];function n(o){return o instanceof Uint8Array&&(o=new TextDecoder().decode(o)),o}let a="";switch(s){case"application/x-www-form-urlencoded":a=n(t);break;case"application/json":a=N(n(t));break;case"text/plain":try{a=N(n(t),!1)}catch{a=O(t)}break;case"multipart/form-data":let o=e.get("content-type");if(!o)throw new Error("utils cannot call postToGetURL when missing content-type header");a=Z(n(t),o);break;default:a=O(t)}return a!==null?(i.url=V(i.url,a,i.method),i.method="GET",i.requestBody=a,!0):!1}function V(i,r,e){if(!e)return i;let t=i.indexOf("?")>0?"&":"?";return`${i}${t}__wb_method=${e}&${r}`}function X(i,r=!0){if(typeof i=="string")try{i=JSON.parse(i)}catch{i={}}let e=new URLSearchParams,t={},s=n=>e.has(n)?(n in t||(t[n]=1),n+"."+ ++t[n]+"_"):n;try{JSON.stringify(i,(n,a)=>(["object","function"].includes(typeof a)||e.set(s(n),a),a))}catch(n){if(!r)throw n}return e}function Q(i,r){let e=new URLSearchParams;i instanceof Uint8Array&&(i=new TextDecoder().decode(i));try{let t=r.split("boundary=")[1],s=i.split(new RegExp("-*"+t+"-*","mi"));for(let n=0;n<s.length;n++){let a=s[n].trim().match(/name="([^"]+)"\r\n\r\n(.*)/im);a&&e.set(a[1],a[2])}}catch{}return e}function N(i,r=!0){return X(i,r).toString()}function Z(i,r){return Q(i,r).toString()}function _(i,r){if(i.length===1)return i[0];let e=new Uint8Array(r),t=0;for(let s of i)e.set(s,t),t+=s.byteLength;return e}function w(i,r){return[i.slice(0,r),i.slice(r)]}var G=new TextDecoder("utf-8"),k=class extends Y{constructor(e,t){super(e);this.ended=!1;this.chunks=[];this.reader=t}onEnd(e){this.err=e,this.err||(this.reader._rawOffset+=this.strm.total_in)}},m=class{static async readFully(r){if(!r)return[0,new Uint8Array];let e=[],t=0;for await(let s of r)e.push(s),t+=s.byteLength;return[t,_(e,t)]}getReadableStream(){let r=this[Symbol.asyncIterator]();return new ReadableStream({pull(e){return r.next().then(t=>{t.done||!t.value?e.close():e.enqueue(t.value)})}})}async readFully(){return(await m.readFully(this[Symbol.asyncIterator]()))[1]}async readline(r=0){let e=await this.readlineRaw(r);return e?G.decode(e):""}async*iterLines(r=0){let e=null;for(;e=await this.readline(r);)yield e}};function ee(i){return i&&Symbol.iterator in i}function te(i){return i&&Symbol.asyncIterator in i}var c=class extends m{constructor(e,t="gzip",s=!1){super();this.compressed=t,this.opts={raw:t==="deflateRaw"},this.inflator=t?new k(this.opts,this):null;let n;if(e instanceof ReadableStream)n=c.fromReadable(e.getReader());else if(e instanceof K)n=c.fromReadable(e);else if(e instanceof m)n=e[Symbol.asyncIterator]();else if(te(e)&&typeof e[Symbol.asyncIterator]=="function")n=e;else if(ee(e)&&typeof e[Symbol.iterator]=="function")n=c.fromIter(e);else if(Array.isArray(e))n=c.fromIter(e);else throw new TypeError("Invalid Stream Source");s?this._sourceIter=this.dechunk(n[Symbol.asyncIterator]()):this._sourceIter=n[Symbol.asyncIterator](),this.lastValue=null,this.errored=!1,this._savedChunk=null,this._rawOffset=0,this._readOffset=0,this.numChunks=0}async _loadNext(){let e=await this._sourceIter.next();return e.done?null:e.value}async*dechunk(e){let t=e instanceof c?e:new c(e),s=-1,n=-1,a=!0;for(;s!=0;){let o=await t.readlineRaw(64),d=new Uint8Array;if(s=o?parseInt(G.decode(o),16):0,!s||s>2**32){if(Number.isNaN(s)||s>2**32){a||(this.errored=!0),yield o;break}}else if([n,d]=await t.readSize(s),d.length!=s){a?yield o:this.errored=!0,yield d;break}let l=(await t.readSize(2))[1];if(l[0]!=13||l[1]!=10){a?yield o:this.errored=!0,yield d,yield l;break}else{if(a=!1,!d||s===0)return;yield d}}yield*t}unread(e){!e.length||(this._readOffset-=e.length,this._savedChunk&&console.log("Already have chunk!"),this._savedChunk=e)}async _next(){if(this._savedChunk){let t=this._savedChunk;return this._savedChunk=null,t}if(this.compressed){let t=this._getNextChunk();if(t)return t}let e=await this._loadNext();for(;this.compressed&&e;){this._push(e);let t=this._getNextChunk(e);if(t)return t;e=await this._loadNext()}return e}_push(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _push when this.compressed === true");this.lastValue=e,this.inflator.ended&&(this.inflator=new k(this.opts,this)),this.inflator.push(e),this.inflator.err&&this.inflator.ended&&this.compressed==="deflate"&&this.opts.raw===!1&&this.numChunks===0&&(this.opts.raw=!0,this.compressed="deflateRaw",this.inflator=new k(this.opts,this),this.inflator.push(e))}_getNextChunk(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _getNextChunk when this.compressed === true");for(;;){if(this.inflator.chunks.length>0)return this.numChunks++,this.inflator.chunks.shift();if(this.inflator.ended){if(this.inflator.err!==0)return this.compressed=null,e;let t=this.inflator.strm.avail_in;if(t&&this.lastValue){this._push(this.lastValue.slice(-t));continue}}return null}}async*[Symbol.asyncIterator](){let e=null;for(;e=await this._next();)this._readOffset+=e.length,yield e}async readlineRaw(e){let t=[],s=0,n=-1,a=null;for await(let o of this){if(e&&s+o.byteLength>e){a=o,n=e-s-1;let d=o.slice(0,n+1).indexOf(10);d>=0&&(n=d);break}if(n=o.indexOf(10),n>=0){a=o;break}t.push(o),s+=o.byteLength}if(a){let[o,d]=w(a,n+1);t.push(o),s+=o.byteLength,this.unread(d)}else if(!t.length)return null;return _(t,s)}async readFully(){return(await this.readSize())[1]}async readSize(e=-1,t=!1){let s=[],n=0;for await(let a of this){if(e>=0)if(a.length>e){let[o,d]=w(a,e);t||s.push(o),n+=o.byteLength,this.unread(d);break}else if(a.length===e){t||s.push(a),n+=a.byteLength,e=0;break}else e-=a.length;t||s.push(a),n+=a.byteLength}return t?[n,new Uint8Array]:[n,_(s,n)]}getReadOffset(){return this._readOffset}getRawOffset(){return this.compressed?this._rawOffset:this._readOffset}getRawLength(e){return this.compressed?this.inflator.strm.total_in:this._readOffset-e}static fromReadable(e){return{async*[Symbol.asyncIterator](){let s=null;for(;(s=await e.read())&&!s.done;)yield s.value}}}static fromIter(e){return{async*[Symbol.asyncIterator](){for(let s of e)yield s}}}},x=class extends m{constructor(e,t,s=0){super();this.sourceIter=e,this.length=t,this.limit=t,this.skip=s}setLimitSkip(e,t=0){this.limit=e,this.skip=t}async*[Symbol.asyncIterator](){if(!(this.limit<=0))for await(let e of this.sourceIter){if(this.skip>0)if(e.length>=this.skip){let[,t]=w(e,this.skip);e=t,this.skip=0}else{this.skip-=e.length;continue}if(e.length>this.limit){let[t,s]=w(e,this.limit);e=t,this.sourceIter.unread&&this.sourceIter.unread(s)}if(e.length&&(this.limit-=e.length,yield e),this.limit<=0)break}}async readlineRaw(e){if(this.limit<=0)return null;let t=await this.sourceIter.readlineRaw(e?Math.min(e,this.limit):this.limit);return this.limit-=(t==null?void 0:t.length)||0,t}async skipFully(){let e=this.limit;for(;this.limit>0;)this.limit-=(await this.sourceIter.readSize(this.limit,!0))[0];return e}};var re=new Uint8Array([13,10]),Ee=new Uint8Array([13,10,13,10]),se=new TextDecoder("utf-8"),C=class{constructor({statusline:r,headers:e}){this.statusline=r,this.headers=e}toString(){let r=[this.statusline];for(let[e,t]of this.headers)r.push(`${e}: ${t}`);return r.join(`\r
`)+`\r
`}async*iterSerialize(r){yield r.encode(this.statusline),yield re;for(let[e,t]of this.headers)yield r.encode(`${e}: ${t}\r
`)}_parseResponseStatusLine(){let r=ne(this.statusline," ",2);this._protocol=r[0]??"",this._statusCode=r.length>1?Number(r[1]):"",this._statusText=r.length>2?r[2]:""}get statusCode(){return this._statusCode===void 0&&this._parseResponseStatusLine(),this._statusCode}get protocol(){return this._protocol===void 0&&this._parseResponseStatusLine(),this._protocol}get statusText(){return this._statusText===void 0&&this._parseResponseStatusLine(),this._statusText}_parseRequestStatusLine(){let r=this.statusline.split(" ",2);this._method=r[0]??"",this._requestPath=r.length>1?r[1]:""}get method(){return this._method===void 0&&this._parseRequestStatusLine(),this._method}get requestPath(){return this._requestPath===void 0&&this._parseRequestStatusLine(),this._requestPath}},T=class{async parse(r,{headersClass:e,firstLine:t}={headersClass:Map}){let s=t||await r.readline();if(!s)return null;let n=s.trimEnd();if(!n)return null;let a=new e,o=await ae(r),d=0,l,h,f,S="",u;for(;d<o.length;){if(f=o.indexOf(`
`,d),u&&(o[d]===" "||o[d]==="	"))u+=o.slice(d,f<0?void 0:f).trimEnd();else{if(u){try{a.set(S,u)}catch{}u=null}l=o.indexOf(":",d),h=l<0?d:l+1,l>=0&&l<f?(S=o.slice(d,l).trimStart(),u=o.slice(h,f<0?void 0:f).trim()):u=null}if(f<0)break;d=f+1}if(u)try{a.set(S,u)}catch{}return new C({statusline:n,headers:a})}};function ne(i,r,e){let t=i.split(r),s=t.slice(0,e);return t.slice(e).length>0&&s.push(t.slice(e).join(r)),s}async function ie(i,r){let e=0;for(let t=0;t<i.length-4;t++){let s=i.indexOf(13,e);if(s<0)break;if(s+3>=i.length){let{value:n}=await r.next();if(!n)break;let a=new Uint8Array(n.length+i.length);a.set(i,0),a.set(n,i.length),i=a}if(i[s+1]===10&&i[s+2]===13&&i[s+3]===10)return[s+3,i];e=s+1}return[-1,i]}async function ae(i){let r=[],e=0,t=0,s=null,n=i[Symbol.asyncIterator]();for await(let a of n){if([t,a]=await ie(a,n),t>=0){s=a;break}r.push(a),e+=a.byteLength}if(s){let[a,o]=w(s,t+1);r.push(a),e+=a.byteLength,i.unread(o)}else if(!r.length)return"";return se.decode(_(r,e))}import oe from"uuid-random";var de=new TextDecoder("utf-8"),le=new TextEncoder,ce="WARC/1.1",$="WARC/1.0",ue="http://netpreserve.org/warc/1.0/revisit/identical-payload-digest",he="http://netpreserve.org/warc/1.1/revisit/identical-payload-digest",fe={warcinfo:"application/warc-fields",response:"application/http; msgtype=response",revisit:"application/http; msgtype=response",request:"application/http; msgtype=request",metadata:"application/warc-fields"},g=class extends m{constructor({warcHeaders:e,reader:t}){super();this._offset=0;this._length=0;this.method="";this.requestBody="";this._urlkey="";this.warcHeaders=e,this._reader=t,this._contentReader=null,this.payload=null,this.httpHeaders=null,this.consumed="",this.fixUp()}static create({url:e,date:t,type:s,warcHeaders:n={},filename:a="",httpHeaders:o={},statusline:d="HTTP/1.1 200 OK",warcVersion:l=$,keepHeadersCase:h=!0,refersToUrl:f=void 0,refersToDate:S=void 0}={},u){function U(R){let M=R;return l===$&&(R=R.split(".")[0],R.charAt(M.length-1)!="Z"&&(R+="Z")),R}t=U(t||new Date().toISOString()),n={...n},s==="warcinfo"?a&&(n["WARC-Filename"]=a):n["WARC-Target-URI"]=e,n["WARC-Date"]=t,n["WARC-Type"]=s,s==="revisit"&&(n["WARC-Profile"]=l===ce?he:ue,n["WARC-Refers-To-Target-URI"]=f,n["WARC-Refers-To-Date"]=U(S||new Date().toISOString())),n=new C({statusline:l,headers:h?new Map(Object.entries(n)):new Headers(n)}),n.headers.get("WARC-Record-ID")||n.headers.set("WARC-Record-ID",`<urn:uuid:${oe()}>`),n.headers.get("Content-Type")||n.headers.set("Content-Type",s&&fe[s]||"application/octet-stream"),u||(u=async function*(){}());let H=new g({warcHeaders:n,reader:u}),P=null,L=[];switch(s){case"response":case"request":case"revisit":L=Object.entries(o),P=h?new Map(L):new Headers(o),(L.length>0||s!=="revisit")&&(H.httpHeaders=new C({statusline:d,headers:P}));break}return H}static createWARCInfo(e={},t){async function*s(){for(let[n,a]of Object.entries(t))yield le.encode(`${n}: ${a}\r
`)}return e.type="warcinfo",g.create(e,s())}getResponseInfo(){let e=this.httpHeaders;return e?{headers:e.headers,status:e.statusCode,statusText:e.statusText}:null}fixUp(){let e=this.warcHeaders.headers.get("WARC-Target-URI");e&&e.startsWith("<")&&e.endsWith(">")&&this.warcHeaders.headers.set("WARC-Target-URI",e.slice(1,-1))}async readFully(e=!1){if(this.httpHeaders){if(this.payload&&!this.payload.length)return this.payload;if(this._contentReader&&!e)throw new TypeError("WARC Record decoding already started, but requesting raw payload");if(e&&this.consumed==="raw"&&this.payload)return await this._createDecodingReader([this.payload]).readFully()}return this.payload?this.payload:(e?(this.payload=await super.readFully(),this.consumed="content"):(this.payload=(await g.readFully(this._reader))[1],this.consumed="raw"),this.payload)}get reader(){if(this._contentReader)throw new TypeError("WARC Record decoding already started, but requesting raw payload");return this._reader}get contentReader(){return this.httpHeaders?(this._contentReader||(this._contentReader=this._createDecodingReader(this._reader)),this._contentReader):this._reader}_createDecodingReader(e){if(!this.httpHeaders)throw new Error("WARCRecord cannot call _createDecodingReader when this.httpHeaders === null");let t=this.httpHeaders.headers.get("Content-Encoding"),s=this.httpHeaders.headers.get("Transfer-Encoding"),n=s==="chunked";return!t&&!n&&(t=s),new c(e,t,n)}async readlineRaw(e){if(this.consumed)throw new Error("Record already consumed. Perhaps a promise was not awaited?");if("readlineRaw"in this.contentReader)return this.contentReader.readlineRaw(e);throw new Error("WARCRecord cannot call readlineRaw on this.contentReader if it does not have the function")}async contentText(){let e=await this.readFully(!0);return de.decode(e.buffer)}async*[Symbol.asyncIterator](){for await(let e of this.contentReader)if(yield e,this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");this.consumed="content"}async skipFully(){if(!this.consumed){if(this._reader instanceof x){let e=await this._reader.skipFully();return this.consumed="skipped",e}throw new Error("WARCRecord cannot call skipFully on this._reader if it is not a LimitReader")}}warcHeader(e){return this.warcHeaders.headers.get(e)}get warcType(){return this.warcHeaders.headers.get("WARC-Type")}get warcTargetURI(){let e=this.warcHeaders.headers.get("WARC-Target-URI");if(!e)throw new Error("WARCRecord headers do not contain WARC-Target-URI");return e}get warcDate(){return this.warcHeaders.headers.get("WARC-Date")}get warcRefersToTargetURI(){return this.warcHeaders.headers.get("WARC-Refers-To-Target-URI")}get warcRefersToDate(){return this.warcHeaders.headers.get("WARC-Refers-To-Date")}get warcPayloadDigest(){return this.warcHeaders.headers.get("WARC-Payload-Digest")}get warcBlockDigest(){return this.warcHeaders.headers.get("WARC-Block-Digest")}get warcContentType(){return this.warcHeaders.headers.get("Content-Type")}get warcContentLength(){return Number(this.warcHeaders.headers.get("Content-Length"))}};var pe=new TextDecoder,z=new Uint8Array([]),A=class{static parse(r,e){return new A(r,e).parse()}static iterRecords(r,e){return new A(r,e)[Symbol.asyncIterator]()}constructor(r,{keepHeadersCase:e=!1,parseHttp:t=!0}={}){this._offset=0,this._warcHeadersLength=0,this._headersClass=e?Map:Headers,this._parseHttp=t,this._atRecordBoundary=!0,r instanceof c?this._reader=r:this._reader=new c(r),this._record=null}async readToNextRecord(){let r;if(!this._atRecordBoundary&&this._reader&&this._record){await this._record.skipFully();let e=0;if(r=await this._reader.readlineRaw(),!r)r=z;else for(e=r.byteLength-1;e>=0;){let t=r[e-1];if(t!==10&&t!==13)break;e--}if(e&&console.warn(`Content-Length Too Small: Record not followed by newline, Remainder Length: ${e}, Offset: ${this._reader.getRawOffset()-r.byteLength}`),this._reader.compressed)await this._reader.readSize(2,!0),r=z;else for(r=await this._reader.readlineRaw();r&&r.byteLength===2;)r=await this._reader.readlineRaw()}return this._atRecordBoundary=!0,r?pe.decode(r):""}_initRecordReader(r){return new x(this._reader,Number(r.headers.get("Content-Length")||0))}async parse(){let r=await this.readToNextRecord();this._offset=this._reader.getRawOffset()-r.length;let e=new T,t=await e.parse(this._reader,{firstLine:r,headersClass:this._headersClass});if(!t)return null;this._warcHeadersLength=this._reader.getReadOffset();let s=new g({warcHeaders:t,reader:this._initRecordReader(t)});if(this._atRecordBoundary=!1,this._record=s,this._parseHttp)switch(s.warcType){case"response":case"request":await this._addHttpHeaders(s,e);break;case"revisit":s.warcContentLength>0&&await this._addHttpHeaders(s,e);break}return s}get offset(){return this._offset}get recordLength(){return this._reader.getRawLength(this._offset)}async*[Symbol.asyncIterator](){let r=null;for(;(r=await this.parse())!==null;)yield r;this._record=null}async _addHttpHeaders(r,e){let t=await e.parse(this._reader,{headersClass:this._headersClass});r.httpHeaders=t;let s=this._reader.getReadOffset()-this._warcHeadersLength;r.reader.setLimitSkip&&r.reader.setLimitSkip(r.warcContentLength-s)}};var ye="offset,warc-type,warc-target-uri".split(","),W=class{constructor(r,e){this.opts=r,this.out=e,this.fields=r.f?r.f.split(","):ye,this.parseHttp=!1}serialize(r){return JSON.stringify(r)+`
`}write(r){this.out.write(this.serialize(r))}async run(r){for await(let e of this.iterIndex(r))this.write(e)}async*iterIndex(r){let e={strictHeaders:!0,parseHttp:this.parseHttp};for(let{filename:t,reader:s}of r){let n=new A(s,e);yield*this.iterRecords(n,t)}}async*iterRecords(r,e){for await(let t of r){await t.skipFully();let s=this.indexRecord(t,r,e);s&&(yield s)}}indexRecord(r,e,t){if(this.filterRecord&&!this.filterRecord(r))return null;let s={},n=e.offset,a=e.recordLength,o={offset:n,length:a,filename:t};for(let d of this.fields)d in o?s[d]=o[d]:this.setField(d,r,s);return s}setField(r,e,t){let s=this.getField(r,e);s!=null&&(t[r]=s)}getField(r,e){return r==="http:status"?e.httpHeaders&&(e.warcType==="response"||e.warcType==="revisit")?e.httpHeaders.statusCode:null:r.startsWith("http:")?e.httpHeaders?e.httpHeaders.headers.get(r.slice(5)):null:e.warcHeaders.headers.get(r)}},b=class extends W{constructor(r,e){super(r,e);for(let t of this.fields)if(t.startsWith("http:")){this.parseHttp=!0;break}}},me="urlkey,timestamp,url,mime,status,digest,length,offset,filename".split(","),ge="urlkey,timestamp,url,mime,status,digest,redirect,meta,length,offset,filename".split(","),I=class extends b{constructor(e,t){super(e,t);switch(this.includeAll=Boolean(e.a),this.fields=me,this.parseHttp=!0,this.noSurt=Boolean(e.noSurt),this._lastRecord=null,e.format){case"cdxj":this.serialize=this.serializeCDXJ;break;case"cdx":this.serialize=this.serializeCDX11;break;case"json":default:break}}async*iterRecords(e,t){this._lastRecord=null;for await(let n of e){await n.readFully();let a=this.indexRecord(n,e,t);a&&(yield a)}let s=this.indexRecord(null,e,t);s&&(yield s)}filterRecord(e){if(this.includeAll)return!0;let t=e.warcType;return!(t==="request"||t==="warcinfo")}indexRecord(e,t,s){if(this.includeAll)return e?super.indexRecord(e,t,s):null;let n=this._lastRecord;return e&&(e._offset=t.offset,e._length=t.recordLength),n?!e||n.warcTargetURI!=e.warcTargetURI?(this._lastRecord=e,this.indexRecordPair(n,null,t,s)):e.warcType==="request"&&n.warcType==="response"?(this._lastRecord=null,this.indexRecordPair(n,e,t,s)):e.warcType==="response"&&n.warcType==="request"?(this._lastRecord=null,this.indexRecordPair(e,n,t,s)):(this._lastRecord=e,this.indexRecordPair(n,null,t,s)):(this._lastRecord=e,null)}indexRecordPair(e,t,s,n){let a,o,d=e.warcTargetURI;if(t&&t.httpHeaders&&t.httpHeaders.method!=="GET"){let h={url:d,method:t.httpHeaders.method,headers:t.httpHeaders.headers,postData:t.payload};a=h.method,B(h)&&(o=h.requestBody,e.method=a,e.requestBody=o,d=h.url)}e._urlkey=d;let l=super.indexRecord(e,s,n);return l&&(e&&e._offset!==void 0&&(l.offset=e._offset,l.length=e._length),a&&(l.method=a),o&&(l.requestBody=o)),l}serializeCDXJ(e){let{urlkey:t,timestamp:s}=e;return delete e.urlkey,delete e.timestamp,`${t} ${s} ${JSON.stringify(e)}
`}serializeCDX11(e){let t=[];for(let s of ge)t.push(e[s]!=null?e[s]:"-");return t.join(" ")+`
`}getField(e,t){var n;let s=null;switch(e){case"urlkey":return s=t._urlkey?t._urlkey:t.warcTargetURI,this.noSurt?s:q(s);case"timestamp":return s=t.warcDate??"",s.replace(/[-:T]/g,"").slice(0,14);case"url":return t.warcTargetURI;case"mime":switch(t.warcType){case"revisit":return"warc/revisit";case"response":case"request":e="http:content-type";break;default:e="content-type"}return s=super.getField(e,t),s?(n=s.toString().split(";",1)[0])==null?void 0:n.trim():null;case"status":return super.getField("http:status",t);case"digest":return s=t.warcPayloadDigest,s?s.split(":",2)[1]:null;default:return null}}};var xe=1024*128;function v(i=[],r=process.stdout){let e=Promise.resolve();return _e.usage("$0 [command]").command({command:"index <filename..>",describe:"Index WARC(s)",builder:t=>E,handler:async t=>{e=new b(t,r).run(j([t.filename]))}}).command({command:"cdx-index <filename..>",describe:"CDX(J) Index of WARC(s)",builder:t=>F,handler:async t=>{e=new I(t,r).run(j([t.filename]))}}).demandCommand(1,"Please specify a command").strictCommands().help().parseAsync(i),e}function j(i){return i.reduce((r,e)=>{if(!Re(e).isFile())return process.stderr.write(`Skipping ${e}, not a file
`),r;let t=we(e,{highWaterMark:xe});return e=Ae(e),r.push({filename:e,reader:t}),r},[])}v();
//# sourceMappingURL=cli.js.map