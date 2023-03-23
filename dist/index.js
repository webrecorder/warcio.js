import ee from"pako";function G(i){let s;typeof i=="string"?s=i:i&&i.length?s=i.reduce((e,t)=>(e+=String.fromCharCode(t),e),""):i?s=i.toString():s="";try{return"__wb_post_data="+btoa(s)}catch{return"__wb_post_data="}}function Z(i){return i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function P(i){try{if(!i.startsWith("https:")&&!i.startsWith("http:"))return i;i=i.replace(/^(https?:\/\/)www\d*\./,"$1");let s=i.toLowerCase(),e=new URL(s),r=e.hostname.split(".").reverse().join(",");if(e.port&&(r+=":"+e.port),r+=")",r+=e.pathname,e.search){e.searchParams.sort(),r+=e.search;for(let[n,a]of e.searchParams.entries())if(!a){let o=new RegExp(`(?<=[&?])${Z(n)}=(?=&|$)`);o.exec(s)||(r=r.replace(o,n))}}return r}catch{return i}}function L(i){let{method:s,headers:e,postData:t}=i;if(s==="GET")return!1;let r=(e.get("content-type")||"").split(";")[0];function n(o){return o instanceof Uint8Array&&(o=new TextDecoder().decode(o)),o}let a="";switch(r){case"application/x-www-form-urlencoded":a=n(t);break;case"application/json":a=H(n(t));break;case"text/plain":try{a=H(n(t),!1)}catch{a=G(t)}break;case"multipart/form-data":{let o=e.get("content-type");if(!o)throw new Error("utils cannot call postToGetURL when missing content-type header");a=q(n(t),o);break}default:a=G(t)}return a!==null?(i.url=F(i.url,a,i.method),i.method="GET",i.requestBody=a,!0):!1}function F(i,s,e){if(!e)return i;let t=i.indexOf("?")>0?"&":"?";return`${i}${t}__wb_method=${e}&${s}`}function E(i,s=!0){if(typeof i=="string")try{i=JSON.parse(i)}catch{i={}}let e=new URLSearchParams,t={},r=n=>e.has(n)?(n in t||(t[n]=1),n+"."+ ++t[n]+"_"):n;try{JSON.stringify(i,(n,a)=>(["object","function"].includes(typeof a)||e.set(r(n),a),a))}catch(n){if(!s)throw n}return e}function B(i,s){let e=new URLSearchParams;i instanceof Uint8Array&&(i=new TextDecoder().decode(i));try{let t=s.split("boundary=")[1],r=i.split(new RegExp("-*"+t+"-*","mi"));for(let n of r){let a=n.trim().match(/name="([^"]+)"\r\n\r\n(.*)/im);a&&e.set(a[1],a[2])}}catch{}return e}function H(i,s=!0){return E(i,s).toString()}function q(i,s){return B(i,s).toString()}function y(i,s){if(i.length===1)return i[0];let e=new Uint8Array(s),t=0;for(let r of i)e.set(r,t),t+=r.byteLength;return e}function R(i,s){return[i.slice(0,s),i.slice(s)]}var X=new TextDecoder("utf-8"),b=class extends ee.Inflate{constructor(e,t){super(e);this.ended=!1;this.chunks=[];this.reader=t}onEnd(e){this.err=e,this.err||(this.reader._rawOffset+=this.strm.total_in)}},h=class{static async readFully(s){let e=[],t=0;for await(let r of s)e.push(r),t+=r.byteLength;return y(e,t)}getReadableStream(){let s=this[Symbol.asyncIterator]();return new ReadableStream({pull(e){return s.next().then(t=>{t.done||!t.value?e.close():e.enqueue(t.value)})}})}async readFully(){return await h.readFully(this)}async readline(s=0){let e=await this.readlineRaw(s);return e?X.decode(e):""}async*iterLines(s=0){let e=null;for(;e=await this.readline(s);)yield e}};function te(i){return i&&Symbol.iterator in Object(i)}function re(i){return i&&Symbol.asyncIterator in Object(i)}var c=class extends h{constructor(e,t="gzip",r=!1){super();this.compressed=t,this.opts={raw:t==="deflateRaw"},this.inflator=t?new b(this.opts,this):null;let n;if(re(e))n=e;else if(typeof e=="object"&&"read"in e&&typeof e.read=="function")n=c.fromReadable(e);else if(e instanceof ReadableStream)n=c.fromReadable(e.getReader());else if(te(e))n=c.fromIter(e);else throw new TypeError("Invalid Stream Source");r?this._sourceIter=this.dechunk(n):this._sourceIter=n[Symbol.asyncIterator](),this.lastValue=null,this.errored=!1,this._savedChunk=null,this._rawOffset=0,this._readOffset=0,this.numChunks=0}async _loadNext(){let e=await this._sourceIter.next();return e.done?null:e.value}async*dechunk(e){let t=e instanceof c?e:new c(e,null),r=-1,n=!0;for(;r!=0;){let a=await t.readlineRaw(64),o=new Uint8Array;if(r=a?parseInt(X.decode(a),16):0,!r||r>2**32){if(Number.isNaN(r)||r>2**32){n||(this.errored=!0),yield a;break}}else if(o=await t.readSize(r),o.length!=r){n?yield a:this.errored=!0,yield o;break}let l=await t.readSize(2);if(l[0]!=13||l[1]!=10){n?yield a:this.errored=!0,yield o,yield l;break}else{if(n=!1,!o||r===0)return;yield o}}yield*t}unread(e){!e.length||(this._readOffset-=e.length,this._savedChunk&&console.log("Already have chunk!"),this._savedChunk=e)}async _next(){if(this._savedChunk){let t=this._savedChunk;return this._savedChunk=null,t}if(this.compressed){let t=this._getNextChunk();if(t)return t}let e=await this._loadNext();for(;this.compressed&&e;){this._push(e);let t=this._getNextChunk(e);if(t)return t;e=await this._loadNext()}return e}_push(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _push when this.compressed is null");this.lastValue=e,this.inflator.ended&&(this.inflator=new b(this.opts,this)),this.inflator.push(e),this.inflator.err&&this.inflator.ended&&this.compressed==="deflate"&&this.opts.raw===!1&&this.numChunks===0&&(this.opts.raw=!0,this.compressed="deflateRaw",this.inflator=new b(this.opts,this),this.inflator.push(e))}_getNextChunk(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _getNextChunk when this.compressed is null");for(;;){if(this.inflator.chunks.length>0)return this.numChunks++,this.inflator.chunks.shift();if(this.inflator.ended){if(this.inflator.err!==0)return this.compressed=null,e;let t=this.inflator.strm.avail_in;if(t&&this.lastValue){this._push(this.lastValue.slice(-t));continue}}return null}}async*[Symbol.asyncIterator](){let e=null;for(;e=await this._next();)this._readOffset+=e.length,yield e}async readlineRaw(e){let t=[],r=0,n=-1,a=null;for await(let o of this){if(e&&r+o.byteLength>e){a=o,n=e-r-1;let l=o.slice(0,n+1).indexOf(10);l>=0&&(n=l);break}if(n=o.indexOf(10),n>=0){a=o;break}t.push(o),r+=o.byteLength}if(a){let[o,l]=R(a,n+1);t.push(o),r+=o.byteLength,this.unread(l)}else if(!t.length)return null;return y(t,r)}async readFully(){return(await this._readOrSkip())[1]}async readSize(e){return(await this._readOrSkip(e))[1]}async skipSize(e){return(await this._readOrSkip(e,!0))[0]}async _readOrSkip(e=-1,t=!1){let r=[],n=0;for await(let a of this){if(e>=0)if(a.length>e){let[o,l]=R(a,e);t||r.push(o),n+=o.byteLength,this.unread(l);break}else if(a.length===e){t||r.push(a),n+=a.byteLength,e=0;break}else e-=a.length;t||r.push(a),n+=a.byteLength}return t?[n,new Uint8Array]:[n,y(r,n)]}getReadOffset(){return this._readOffset}getRawOffset(){return this.compressed?this._rawOffset:this._readOffset}getRawLength(e){return this.compressed?this.inflator.strm.total_in:this._readOffset-e}static fromReadable(e){return{async*[Symbol.asyncIterator](){let r=null;for(;(r=await e.read())&&!r.done;)yield r.value}}}static fromIter(e){return{async*[Symbol.asyncIterator](){for(let r of e)yield r}}}},m=class extends h{constructor(e,t,r=0){super();this.sourceIter=e,this.length=t,this.limit=t,this.skip=r}setLimitSkip(e,t=0){this.limit=e,this.skip=t}async*[Symbol.asyncIterator](){if(!(this.limit<=0))for await(let e of this.sourceIter){if(this.skip>0)if(e.length>=this.skip){let[,t]=R(e,this.skip);e=t,this.skip=0}else{this.skip-=e.length;continue}if(e.length>this.limit){let[t,r]=R(e,this.limit);e=t,this.sourceIter.unread&&this.sourceIter.unread(r)}if(e.length&&(this.limit-=e.length,yield e),this.limit<=0)break}}async readlineRaw(e){if(this.limit<=0)return null;let t=await this.sourceIter.readlineRaw(e?Math.min(e,this.limit):this.limit);return this.limit-=t?.length||0,t}async skipFully(){let e=this.limit;for(;this.limit>0;)this.limit-=await this.sourceIter.skipSize(this.limit);return e}};var z=new Uint8Array([13,10]),J=new Uint8Array([13,10,13,10]),se=new TextDecoder("utf-8"),C=class{constructor({statusline:s,headers:e}){this.statusline=s,this.headers=e}toString(){let s=[this.statusline];for(let[e,t]of this.headers)s.push(`${e}: ${t}`);return s.join(`\r
`)+`\r
`}async*iterSerialize(s){yield s.encode(this.statusline),yield z;for(let[e,t]of this.headers)yield s.encode(`${e}: ${t}\r
`)}_parseResponseStatusLine(){let s=ne(this.statusline," ",2);this._protocol=s[0]??"",this._statusCode=s.length>1?Number(s[1]):"",this._statusText=s.length>2?s[2]:""}get statusCode(){return this._statusCode===void 0&&this._parseResponseStatusLine(),this._statusCode}get protocol(){return this._protocol===void 0&&this._parseResponseStatusLine(),this._protocol}get statusText(){return this._statusText===void 0&&this._parseResponseStatusLine(),this._statusText}_parseRequestStatusLine(){let s=this.statusline.split(" ",2);this._method=s[0]??"",this._requestPath=s.length>1?s[1]:""}get method(){return this._method===void 0&&this._parseRequestStatusLine(),this._method}get requestPath(){return this._requestPath===void 0&&this._parseRequestStatusLine(),this._requestPath}},k=class{async parse(s,{headersClass:e,firstLine:t}={headersClass:Map}){let r=t||await s.readline();if(!r)return null;let n=r.trimEnd();if(!n)return null;let a=new e,o=await ae(s),l=0,d,f,p,T="",u;for(;l<o.length;){if(p=o.indexOf(`
`,l),u&&(o[l]===" "||o[l]==="	"))u+=o.slice(l,p<0?void 0:p).trimEnd();else{if(u){try{a.set(T,u)}catch{}u=null}d=o.indexOf(":",l),f=d<0?l:d+1,d>=0&&d<p?(T=o.slice(l,d).trimStart(),u=o.slice(f,p<0?void 0:p).trim()):u=null}if(p<0)break;l=p+1}if(u)try{a.set(T,u)}catch{}return new C({statusline:n,headers:a})}};function ne(i,s,e){let t=i.split(s),r=t.slice(0,e);return t.slice(e).length>0&&r.push(t.slice(e).join(s)),r}async function ie(i,s){let e=0;for(let t=0;t<i.length-4;t++){let r=i.indexOf(13,e);if(r<0)break;if(r+3>=i.length){let{value:n}=await s.next();if(!n)break;let a=new Uint8Array(n.length+i.length);a.set(i,0),a.set(n,i.length),i=a}if(i[r+1]===10&&i[r+2]===13&&i[r+3]===10)return[r+3,i];e=r+1}return[-1,i]}async function ae(i){let s=[],e=0,t=0,r=null,n=i[Symbol.asyncIterator]();for await(let a of n){if([t,a]=await ie(a,n),t>=0){r=a;break}s.push(a),e+=a.byteLength}if(r){let[a,o]=R(r,t+1);s.push(a),e+=a.byteLength,i.unread(o)}else if(!s.length)return"";return se.decode(y(s,e))}import oe from"uuid-random";var le=new TextDecoder("utf-8"),de=new TextEncoder,N="WARC/1.1",v="WARC/1.0",ce="http://netpreserve.org/warc/1.0/revisit/identical-payload-digest",ue="http://netpreserve.org/warc/1.1/revisit/identical-payload-digest",he={warcinfo:"application/warc-fields",response:"application/http; msgtype=response",revisit:"application/http; msgtype=response",request:"application/http; msgtype=request",metadata:"application/warc-fields"},g=class extends h{constructor({warcHeaders:e,reader:t}){super();this._offset=0;this._length=0;this.method="";this.requestBody="";this._urlkey="";this.warcHeaders=e,this._reader=t,this._contentReader=null,this.payload=null,this.httpHeaders=null,this.consumed="",this.fixUp()}static create({url:e,date:t,type:r,warcHeaders:n={},filename:a="",httpHeaders:o={},statusline:l="HTTP/1.1 200 OK",warcVersion:d=v,keepHeadersCase:f=!0,refersToUrl:p=void 0,refersToDate:T=void 0}={},u){function U(x){let Y=x;return d===v&&(x=x.split(".")[0],x.charAt(Y.length-1)!="Z"&&(x+="Z")),x}t=U(t||new Date().toISOString()),n={...n},r==="warcinfo"?a&&(n["WARC-Filename"]=a):n["WARC-Target-URI"]=e,n["WARC-Date"]=t,n["WARC-Type"]=r,r==="revisit"&&(n["WARC-Profile"]=d===N?ue:ce,n["WARC-Refers-To-Target-URI"]=p,n["WARC-Refers-To-Date"]=U(T||new Date().toISOString())),n=new C({statusline:d,headers:f?new Map(Object.entries(n)):new Headers(n)}),n.headers.get("WARC-Record-ID")||n.headers.set("WARC-Record-ID",`<urn:uuid:${oe()}>`),n.headers.get("Content-Type")||n.headers.set("Content-Type",r&&he[r]||"application/octet-stream"),u||(u=async function*(){}());let M=new g({warcHeaders:n,reader:u}),Q=null,D=[];switch(r){case"response":case"request":case"revisit":D=Object.entries(o),Q=f?new Map(D):new Headers(o),(D.length>0||r!=="revisit")&&(M.httpHeaders=new C({statusline:l,headers:Q}));break}return M}static createWARCInfo(e={},t){async function*r(){for(let[n,a]of Object.entries(t))yield de.encode(`${n}: ${a}\r
`)}return e.type="warcinfo",g.create(e,r())}getResponseInfo(){let e=this.httpHeaders;return e?{headers:e.headers,status:e.statusCode,statusText:e.statusText}:null}fixUp(){let e=this.warcHeaders.headers.get("WARC-Target-URI");e&&e.startsWith("<")&&e.endsWith(">")&&this.warcHeaders.headers.set("WARC-Target-URI",e.slice(1,-1))}async readFully(e=!1){if(this.httpHeaders){if(this.payload&&!this.payload.length)return this.payload;if(this._contentReader&&!e)throw new TypeError("WARC Record decoding already started, but requesting raw payload");if(e&&this.consumed==="raw"&&this.payload)return await this._createDecodingReader([this.payload]).readFully()}return this.payload?this.payload:(e?(this.payload=await super.readFully(),this.consumed="content"):(this.payload=await g.readFully(this._reader),this.consumed="raw"),this.payload)}get reader(){if(this._contentReader)throw new TypeError("WARC Record decoding already started, but requesting raw payload");return this._reader}get contentReader(){return this.httpHeaders?(this._contentReader||(this._contentReader=this._createDecodingReader(this._reader)),this._contentReader):this._reader}_createDecodingReader(e){if(!this.httpHeaders)throw new Error("WARCRecord cannot call _createDecodingReader when this.httpHeaders === null");let t=this.httpHeaders.headers.get("Content-Encoding"),r=this.httpHeaders.headers.get("Transfer-Encoding"),n=r==="chunked";return!t&&!n&&(t=r),new c(e,t,n)}async readlineRaw(e){if(this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");if(this.contentReader instanceof h)return this.contentReader.readlineRaw(e);throw new Error("WARCRecord cannot call readlineRaw on this.contentReader if it does not extend BaseAsyncIterReader")}async contentText(){let e=await this.readFully(!0);return le.decode(e)}async*[Symbol.asyncIterator](){for await(let e of this.contentReader)if(yield e,this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");this.consumed="content"}async skipFully(){if(!this.consumed){if(this._reader instanceof m){let e=await this._reader.skipFully();return this.consumed="skipped",e}throw new Error("WARCRecord cannot call skipFully on this._reader if it is not a LimitReader")}}warcHeader(e){return this.warcHeaders.headers.get(e)}get warcType(){return this.warcHeaders.headers.get("WARC-Type")}get warcTargetURI(){return this.warcHeaders.headers.get("WARC-Target-URI")}get warcDate(){return this.warcHeaders.headers.get("WARC-Date")}get warcRefersToTargetURI(){return this.warcHeaders.headers.get("WARC-Refers-To-Target-URI")}get warcRefersToDate(){return this.warcHeaders.headers.get("WARC-Refers-To-Date")}get warcPayloadDigest(){return this.warcHeaders.headers.get("WARC-Payload-Digest")}get warcBlockDigest(){return this.warcHeaders.headers.get("WARC-Block-Digest")}get warcContentType(){return this.warcHeaders.headers.get("Content-Type")}get warcContentLength(){return Number(this.warcHeaders.headers.get("Content-Length"))}};var V=new TextDecoder,$=new Uint8Array([]),w=class{static parse(s,e){return new w(s,e).parse()}static iterRecords(s,e){return new w(s,e)[Symbol.asyncIterator]()}constructor(s,{keepHeadersCase:e=!1,parseHttp:t=!0}={}){this._offset=0,this._warcHeadersLength=0,this._headersClass=e?Map:Headers,this._parseHttp=t,s instanceof c?this._reader=s:this._reader=new c(s),this._record=null}async readToNextRecord(){if(!this._reader||!this._record)return $;await this._record.skipFully(),this._reader.compressed&&(this._offset=this._reader.getRawOffset());let s=await this._reader.readlineRaw(),e=0;if(!s)s=$;else{if(e=s.byteLength-1,e===9&&V.decode(s).startsWith("WARC/"))return s;for(;e>0;){let t=s[e-1];if(t!==10&&t!==13)break;e--}e&&console.warn(`Content-Length Too Small: Record not followed by newline, Remainder Length: ${e}, Offset: ${this._reader.getRawOffset()-s.byteLength}`)}if(this._reader.compressed)await this._reader.skipSize(2),s=$;else{for(s=await this._reader.readlineRaw();s&&s.byteLength===2;)s=await this._reader.readlineRaw();this._offset=this._reader.getRawOffset(),s&&(this._offset-=s.length)}return s}_initRecordReader(s){return new m(this._reader,Number(s.headers.get("Content-Length")||0))}async parse(){let s=await this.readToNextRecord(),e=s?V.decode(s):"",t=new k,r=await t.parse(this._reader,{firstLine:e,headersClass:this._headersClass});if(!r)return null;this._warcHeadersLength=this._reader.getReadOffset();let n=new g({warcHeaders:r,reader:this._initRecordReader(r)});if(this._record=n,this._parseHttp)switch(n.warcType){case"response":case"request":await this._addHttpHeaders(n,t);break;case"revisit":n.warcContentLength>0&&await this._addHttpHeaders(n,t);break}return n}get offset(){return this._offset}get recordLength(){return this._reader.getRawLength(this._offset)}async*[Symbol.asyncIterator](){let s=null;for(;(s=await this.parse())!==null;)yield s;this._record=null}async _addHttpHeaders(s,e){let t=await e.parse(this._reader,{headersClass:this._headersClass});s.httpHeaders=t;let r=this._reader.getReadOffset()-this._warcHeadersLength;s.reader instanceof m&&s.reader.setLimitSkip(s.warcContentLength-r)}};import fe from"base32-encode";import pe from"pako";var K=new TextEncoder,S=class extends h{constructor(e,t={}){super();this.gzip=!1;this.digestAlgo="";this.digestAlgoPrefix="";this.digestBase32=!1;this.record=e,this.gzip=Boolean(t.gzip);let r=t&&t.digest||{};e.warcType!=="revisit"&&e.warcType!=="warcinfo"&&(!e.warcPayloadDigest||!e.warcBlockDigest)?(this.digestAlgo=r?.algo||"sha-256",this.digestAlgoPrefix=r?.prefix||"sha256:",this.digestBase32=Boolean(r?.base32)):this.digestAlgo=""}static async serialize(e,t){return await new S(e,t).readFully()}static base16(e){return Array.from(new Uint8Array(e)).map(r=>r.toString(16).padStart(2,"0")).join("")}async*[Symbol.asyncIterator](){if(!this.gzip){yield*this.generateRecord();return}let e=null;"CompressionStream"in globalThis?(e=new globalThis.CompressionStream("gzip"),yield*this.streamCompress(e)):yield*this.pakoCompress()}async readlineRaw(e){return null}async*pakoCompress(){let e=new pe.Deflate({gzip:!0}),t=null;for await(let r of this.generateRecord())for(t&&t.length>0&&e.push(t),t=r;e.chunks.length;)yield e.chunks.shift();t&&e.push(t,!0),yield e.result}async*streamCompress(e){let t=this.generateRecord();new ReadableStream({async pull(o){let l=await t.next();l.done?o.close():o.enqueue(l.value)}}).pipeThrough(e);let n=null,a=e.readable.getReader();for(;(n=await a.read())&&!n.done;)yield n.value}async digestMessage(e){let t=await crypto.subtle.digest(this.digestAlgo,e);return this.digestAlgoPrefix+(this.digestBase32?fe(t,"RFC4648"):S.base16(t))}async*generateRecord(){let e=0,t=null;this.record.httpHeaders&&(t=K.encode(this.record.httpHeaders.toString()+`\r
`),e+=t.length);let r=await this.record.readFully();if(e+=r.length,this.digestAlgo){let a=await this.digestMessage(r),o=t?await this.digestMessage(y([t,r],e)):a;this.record.warcHeaders.headers.set("WARC-Payload-Digest",a),this.record.warcHeaders.headers.set("WARC-Block-Digest",o)}this.record.warcHeaders.headers.set("Content-Length",e.toString()),yield K.encode(this.record.warcHeaders.toString()),yield z,t&&(yield t),yield r,yield J}};var ye=["offset","warc-type","warc-target-uri"],j=class{constructor(s={}){this.opts=s,this.fields=s&&s.fields?s.fields.split(","):ye,this.parseHttp=!1}serialize(s){return JSON.stringify(s)+`
`}write(s,e){e.write(this.serialize(s))}async writeAll(s,e){for await(let t of this.iterIndex(s))this.write(t,e)}async*iterIndex(s){let e={strictHeaders:!0,parseHttp:this.parseHttp};for(let{filename:t,reader:r}of s){let n=new w(r,e);yield*this.iterRecords(n,t)}}async*iterRecords(s,e){for await(let t of s){await t.skipFully();let r=this.indexRecord(t,s,e);r&&(yield r)}}indexRecord(s,e,t){if(this.filterRecord&&!this.filterRecord(s))return null;let r={},n=e.offset,a=e.recordLength,o={offset:n,length:a,filename:t};for(let l of this.fields)l in o?r[l]=o[l]:this.setField(l,s,r);return r}setField(s,e,t){let r=this.getField(s,e);r!==null&&(t[s]=r)}getField(s,e){return s==="http:status"?e.httpHeaders&&(e.warcType==="response"||e.warcType==="revisit")?e.httpHeaders.statusCode:null:s.startsWith("http:")?e.httpHeaders?e.httpHeaders.headers.get(s.slice(5)):null:e.warcHeaders.headers.get(s)||null}},I=class extends j{constructor(s){super(s);for(let e of this.fields)if(e.startsWith("http:")){this.parseHttp=!0;break}}},ge="urlkey,timestamp,url,mime,status,digest,length,offset,filename".split(","),Re="urlkey,timestamp,url,mime,status,digest,redirect,meta,length,offset,filename".split(","),W=class extends I{constructor(e){super(e);switch(this.includeAll=Boolean(e?.all),this.overrideIndexForAll=Boolean(e?.all),this.fields=ge,this.parseHttp=!0,this.noSurt=Boolean(e?.noSurt),this._lastRecord=null,e?.format){case"cdxj":this.serialize=this.serializeCDXJ;break;case"cdx":this.serialize=this.serializeCDX11;break;case"json":default:break}}async*iterRecords(e,t){this._lastRecord=null;for await(let n of e){await n.readFully();let a=this.indexRecord(n,e,t);a&&(yield a)}let r=this.indexRecord(null,e,t);r&&(yield r)}filterRecord(e){if(this.includeAll)return!0;let t=e.warcType;return!(t==="request"||t==="warcinfo")}indexRecord(e,t,r){if(this.overrideIndexForAll)return e?super.indexRecord(e,t,r):null;let n=this._lastRecord;if(this._lastRecord=e,e&&(e._offset=t.offset,e._length=t.recordLength),!n)return null;if(!e||n.warcTargetURI!=e.warcTargetURI)return this.indexRecordPair(n,null,t,r);let a=e.warcType,o=n.warcType;return a==="request"&&(o==="response"||o==="revisit")?(this._lastRecord=null,this.indexRecordPair(n,e,t,r)):(a==="response"||a==="revisit")&&o==="request"?(this._lastRecord=null,this.indexRecordPair(e,n,t,r)):this.indexRecordPair(n,null,t,r)}indexRecordPair(e,t,r,n){let a,o,l=e.warcTargetURI||"";if(t&&t.httpHeaders&&t.httpHeaders.method!=="GET"){let f={url:l,method:t.httpHeaders.method,headers:t.httpHeaders.headers,postData:t.payload};a=f.method,L(f)&&(o=f.requestBody,e.method=a,e.requestBody=o,l=f.url)}e._urlkey=l;let d=super.indexRecord(e,r,n);return d&&(e&&e._offset!==void 0&&(d.offset=e._offset,d.length=e._length),a&&(d.method=a),o&&(d.requestBody=o)),d}serializeCDXJ(e){let{urlkey:t,timestamp:r}=e;return delete e.urlkey,delete e.timestamp,`${t} ${r} ${JSON.stringify(e)}
`}serializeCDX11(e){let t=[];for(let r of Re)t.push(e[r]!=null?e[r]:"-");return t.join(" ")+`
`}getField(e,t){let r=null;switch(e){case"urlkey":return r=t._urlkey||t.warcTargetURI||null,this.noSurt||r===null?r:P(r);case"timestamp":return r=t.warcDate??"",r.replace(/[-:T]/g,"").slice(0,14);case"url":return t.warcTargetURI;case"mime":switch(t.warcType){case"revisit":return"warc/revisit";case"response":case"request":e="http:content-type";break;default:e="content-type"}return r=super.getField(e,t),r?r.toString().split(";",1)[0]?.trim():null;case"status":return super.getField("http:status",t);case"digest":return r=t.warcPayloadDigest,r?r.split(":",2)[1]:null;default:return null}}},O=class extends W{constructor(s){super(s),this.overrideIndexForAll=!1}indexRecordPair(s,e,t,r){let n=super.indexRecordPair(s,e,t,r);return n&&{cdx:n,record:s,reqRecord:e}}};export{c as AsyncIterReader,h as BaseAsyncIterReader,O as CDXAndRecordIndexer,W as CDXIndexer,I as Indexer,m as LimitReader,b as NoConcatInflator,C as StatusAndHeaders,k as StatusAndHeadersParser,w as WARCParser,g as WARCRecord,S as WARCSerializer,v as WARC_1_0,N as WARC_1_1,F as appendRequestQuery,y as concatChunks,P as getSurt,E as jsonToQueryParams,H as jsonToQueryString,B as mfdToQueryParams,q as mfdToQueryString,L as postToGetUrl,R as splitChunk};
