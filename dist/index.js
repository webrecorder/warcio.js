import ae from"pako";function V(a){let s;typeof a=="string"?s=a:a&&a.length?s=a.reduce((e,t)=>(e+=String.fromCharCode(t),e),""):a?s=a.toString():s="";try{return"__wb_post_data="+btoa(s)}catch{return"__wb_post_data="}}function ne(a){return a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function P(a){try{if(!a.startsWith("https:")&&!a.startsWith("http:"))return a;a=a.replace(/^(https?:\/\/)www\d*\./,"$1");let s=a.toLowerCase(),e=new URL(s),r=e.hostname.split(".").reverse().join(",");if(e.port&&(r+=":"+e.port),r+=")",r+=e.pathname,e.search){e.searchParams.sort(),r+=e.search;for(let[n,i]of e.searchParams.entries())if(!i){let o=new RegExp(`(?<=[&?])${ne(n)}=(?=&|$)`);o.exec(s)||(r=r.replace(o,n))}}return r}catch{return a}}function v(a){let{method:s,headers:e,postData:t}=a;if(s==="GET")return!1;let r=(e.get("content-type")||"").split(";")[0];function n(o){return o instanceof Uint8Array&&(o=new TextDecoder().decode(o)),o}let i="";switch(r){case"application/x-www-form-urlencoded":i=n(t);break;case"application/json":i=L(n(t));break;case"text/plain":try{i=L(n(t),!1)}catch{i=V(t)}break;case"multipart/form-data":{let o=e.get("content-type");if(!o)throw new Error("utils cannot call postToGetURL when missing content-type header");i=$(n(t),o);break}default:i=V(t)}return i!==null?(a.url=z(a.url,i,a.method),a.method="GET",a.requestBody=i,!0):!1}function z(a,s,e){if(!e)return a;let t=a.indexOf("?")>0?"&":"?";return`${a}${t}__wb_method=${e}&${s}`}function q(a,s=!0){if(typeof a=="string")try{a=JSON.parse(a)}catch{a={}}let e=new URLSearchParams,t={},r=n=>e.has(n)?(n in t||(t[n]=1),n+"."+ ++t[n]+"_"):n;try{JSON.stringify(a,(n,i)=>(["object","function"].includes(typeof i)||e.set(r(n),i),i))}catch(n){if(!s)throw n}return e}function N(a,s){let e=new URLSearchParams;a instanceof Uint8Array&&(a=new TextDecoder().decode(a));try{let t=s.split("boundary=")[1],r=a.split(new RegExp("-*"+t+"-*","mi"));for(let n of r){let i=n.trim().match(/name="([^"]+)"\r\n\r\n(.*)/im);i&&e.set(i[1],i[2])}}catch{}return e}function L(a,s=!0){return q(a,s).toString()}function $(a,s){return N(a,s).toString()}function A(a,s){if(a.length===1)return a[0];let e=new Uint8Array(s),t=0;for(let r of a)e.set(r,t),t+=r.byteLength;return e}function y(a,s){return[a.slice(0,s),a.slice(s)]}var K=new TextDecoder("utf-8"),b=class extends ae.Inflate{constructor(e,t){super(e);this.ended=!1;this.chunks=[];this.reader=t}onEnd(e){this.err=e,this.err||(this.reader._rawOffset+=this.strm.total_in)}},f=class a{static async readFully(s){let e=[],t=0;for await(let r of s)e.push(r),t+=r.byteLength;return A(e,t)}getReadableStream(){let s=this[Symbol.asyncIterator]();return new ReadableStream({pull(e){return s.next().then(t=>{t.done||!t.value?e.close():e.enqueue(t.value)})}})}async readFully(){return await a.readFully(this)}async readline(s=0){let e=await this.readlineRaw(s);return e?K.decode(e):""}async*iterLines(s=0){let e=null;for(;e=await this.readline(s);)yield e}};function ie(a){return a&&Symbol.iterator in Object(a)}function oe(a){return a&&Symbol.asyncIterator in Object(a)}var g=class a extends f{constructor(e,t="gzip",r=!1){super();this.compressed=t,this.opts={raw:t==="deflateRaw"},this.inflator=t?new b(this.opts,this):null;let n;if(oe(e))n=e;else if(typeof e=="object"&&"read"in e&&typeof e.read=="function")n=a.fromReadable(e);else if(e instanceof ReadableStream)n=a.fromReadable(e.getReader());else if(ie(e))n=a.fromIter(e);else throw new TypeError("Invalid Stream Source");r?this._sourceIter=this.dechunk(n):this._sourceIter=n[Symbol.asyncIterator](),this.lastValue=null,this.errored=!1,this._savedChunk=null,this._rawOffset=0,this._readOffset=0,this.numChunks=0}async _loadNext(){let e=await this._sourceIter.next();return e.done?null:e.value}async*dechunk(e){let t=e instanceof a?e:new a(e,null),r=-1,n=!0;for(;r!=0;){let i=await t.readlineRaw(64),o=new Uint8Array;if(r=i?parseInt(K.decode(i),16):0,!r||r>2**32){if(Number.isNaN(r)||r>2**32){n||(this.errored=!0),yield i;break}}else if(o=await t.readSize(r),o.length!=r){n?yield i:this.errored=!0,yield o;break}let l=await t.readSize(2);if(l[0]!=13||l[1]!=10){n?yield i:this.errored=!0,yield o,yield l;break}else{if(n=!1,!o||r===0)return;yield o}}yield*t}unread(e){e.length&&(this._readOffset-=e.length,this._savedChunk&&console.log("Already have chunk!"),this._savedChunk=e)}async _next(){if(this._savedChunk){let t=this._savedChunk;return this._savedChunk=null,t}if(this.compressed){let t=this._getNextChunk();if(t)return t}let e=await this._loadNext();for(;this.compressed&&e;){this._push(e);let t=this._getNextChunk(e);if(t)return t;e=await this._loadNext()}return e}_push(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _push when this.compressed is null");this.lastValue=e,this.inflator.ended&&(this.inflator=new b(this.opts,this)),this.inflator.push(e),this.inflator.err&&this.inflator.ended&&this.compressed==="deflate"&&this.opts.raw===!1&&this.numChunks===0&&(this.opts.raw=!0,this.compressed="deflateRaw",this.inflator=new b(this.opts,this),this.inflator.push(e))}_getNextChunk(e){if(!this.inflator)throw new Error("AsyncIterReader cannot call _getNextChunk when this.compressed is null");for(;;){if(this.inflator.chunks.length>0)return this.numChunks++,this.inflator.chunks.shift();if(this.inflator.ended){if(this.inflator.err!==0)return this.compressed=null,e;let t=this.inflator.strm.avail_in;if(t&&this.lastValue){this._push(this.lastValue.slice(-t));continue}}return null}}async*[Symbol.asyncIterator](){let e=null;for(;e=await this._next();)this._readOffset+=e.length,yield e}async readlineRaw(e){let t=[],r=0,n=-1,i=null;for await(let o of this){if(e&&r+o.byteLength>e){i=o,n=e-r-1;let l=o.slice(0,n+1).indexOf(10);l>=0&&(n=l);break}if(n=o.indexOf(10),n>=0){i=o;break}t.push(o),r+=o.byteLength}if(i){let[o,l]=y(i,n+1);t.push(o),r+=o.byteLength,this.unread(l)}else if(!t.length)return null;return A(t,r)}async readFully(){return(await this._readOrSkip())[1]}async readSize(e){return(await this._readOrSkip(e))[1]}async skipSize(e){return(await this._readOrSkip(e,!0))[0]}async _readOrSkip(e=-1,t=!1){let r=[],n=0;for await(let i of this){if(e>=0)if(i.length>e){let[o,l]=y(i,e);t||r.push(o),n+=o.byteLength,this.unread(l);break}else if(i.length===e){t||r.push(i),n+=i.byteLength,e=0;break}else e-=i.length;t||r.push(i),n+=i.byteLength}return t?[n,new Uint8Array]:[n,A(r,n)]}getReadOffset(){return this._readOffset}getRawOffset(){return this.compressed?this._rawOffset:this._readOffset}getRawLength(e){return this.compressed?this.inflator.strm.total_in:this._readOffset-e}static fromReadable(e){return{async*[Symbol.asyncIterator](){let r=null;for(;(r=await e.read())&&!r.done;)yield r.value}}}static fromIter(e){return{async*[Symbol.asyncIterator](){for(let r of e)yield r}}}},R=class extends f{constructor(e,t,r=0){super();this.sourceIter=e,this.length=t,this.limit=t,this.skip=r}setLimitSkip(e,t=0){this.limit=e,this.skip=t}async*[Symbol.asyncIterator](){if(!(this.limit<=0))for await(let e of this.sourceIter){if(this.skip>0)if(e.length>=this.skip){let[,t]=y(e,this.skip);e=t,this.skip=0}else{this.skip-=e.length;continue}if(e.length>this.limit){let[t,r]=y(e,this.limit);e=t,this.sourceIter.unread&&this.sourceIter.unread(r)}if(e.length&&(this.limit-=e.length,yield e),this.limit<=0)break}}async readlineRaw(e){if(this.limit<=0)return null;let t=await this.sourceIter.readlineRaw(e?Math.min(e,this.limit):this.limit);return this.limit-=t?.length||0,t}async skipFully(){let e=this.limit;for(;this.limit>0;)this.limit-=await this.sourceIter.skipSize(this.limit);return e}};var j=new Uint8Array([13,10]),Y=new Uint8Array([13,10,13,10]),le=new TextDecoder("utf-8"),C=class{constructor({statusline:s,headers:e}){this.statusline=s,this.headers=e}toString(){let s=[this.statusline];for(let[e,t]of this.headers)s.push(`${e}: ${t}`);return s.join(`\r
`)+`\r
`}async*iterSerialize(s){yield s.encode(this.statusline),yield j;for(let[e,t]of this.headers)yield s.encode(`${e}: ${t}\r
`)}_parseResponseStatusLine(){let s=de(this.statusline," ",2);this._protocol=s[0]??"",this._statusCode=s.length>1?Number(s[1]):"",this._statusText=s.length>2?s[2]:""}get statusCode(){return this._statusCode===void 0&&this._parseResponseStatusLine(),this._statusCode}get protocol(){return this._protocol===void 0&&this._parseResponseStatusLine(),this._protocol}get statusText(){return this._statusText===void 0&&this._parseResponseStatusLine(),this._statusText}_parseRequestStatusLine(){let s=this.statusline.split(" ",2);this._method=s[0]??"",this._requestPath=s.length>1?s[1]:""}get method(){return this._method===void 0&&this._parseRequestStatusLine(),this._method}get requestPath(){return this._requestPath===void 0&&this._parseRequestStatusLine(),this._requestPath}},S=class{async parse(s,{headersClass:e,firstLine:t}={headersClass:Map}){let r=t||await s.readline();if(!r)return null;let n=r.trimEnd();if(!n)return null;let i=new e,o=i instanceof Headers,l=await ue(s),d=0,u,H,p,h="",c;for(;d<l.length;){if(p=l.indexOf(`
`,d),c&&(l[d]===" "||l[d]==="	"))c+=l.slice(d,p<0?void 0:p).trimEnd();else{if(c){try{o&&h.toLowerCase()==="set-cookie"?i.append(h,c):i.set(h,c)}catch{}c=null}u=l.indexOf(":",d),H=u<0?d:u+1,u>=0&&u<p?(h=l.slice(d,u).trimStart(),c=l.slice(H,p<0?void 0:p).trim()):c=null}if(p<0)break;d=p+1}if(c)try{o&&h.toLowerCase()==="set-cookie"?i.append(h,c):i.set(h,c)}catch{}return new C({statusline:n,headers:i})}};function de(a,s,e){let t=a.split(s),r=t.slice(0,e);return t.slice(e).length>0&&r.push(t.slice(e).join(s)),r}async function ce(a,s){let e=0;for(let t=0;t<a.length-4;t++){let r=a.indexOf(13,e);if(r<0)break;if(r+3>=a.length){let{value:n}=await s.next();if(!n)break;let i=new Uint8Array(n.length+a.length);i.set(a,0),i.set(n,a.length),a=i}if(a[r+1]===10&&a[r+2]===13&&a[r+3]===10)return[r+3,a];e=r+1}return[-1,a]}async function ue(a){let s=[],e=0,t=0,r=null,n=a[Symbol.asyncIterator]();for await(let i of n){if([t,i]=await ce(i,n),t>=0){r=i;break}s.push(i),e+=i.byteLength}if(r){let[i,o]=y(r,t+1);s.push(i),e+=i.byteLength,a.unread(o)}else if(!s.length)return"";return le.decode(A(s,e))}import he from"uuid-random";var fe=new TextDecoder("utf-8"),pe=new TextEncoder,Q="WARC/1.1",O="WARC/1.0",ye="http://netpreserve.org/warc/1.0/revisit/identical-payload-digest",ge="http://netpreserve.org/warc/1.1/revisit/identical-payload-digest",Re={warcinfo:"application/warc-fields",response:"application/http; msgtype=response",revisit:"application/http; msgtype=response",request:"application/http; msgtype=request",metadata:"application/warc-fields"},k=class a extends f{constructor({warcHeaders:e,reader:t}){super();this._offset=0;this._length=0;this.method="";this.requestBody="";this._urlkey="";this.warcHeaders=e,this._reader=t,this._contentReader=null,this.payload=null,this.httpHeaders=null,this.consumed="",this.fixUp()}static create({url:e,date:t,type:r,warcHeaders:n={},filename:i="",httpHeaders:o={},statusline:l="HTTP/1.1 200 OK",warcVersion:d=O,keepHeadersCase:u=!0,refersToUrl:H=void 0,refersToDate:p=void 0}={},h){function c(x){let se=x;return d===O&&(x=x.split(".")[0],x.charAt(se.length-1)!="Z"&&(x+="Z")),x}t=c(t||new Date().toISOString()),n={...n},r==="warcinfo"?i&&(n["WARC-Filename"]=i):e&&(n["WARC-Target-URI"]=e),n["WARC-Date"]=t,r&&(n["WARC-Type"]=r),r==="revisit"&&(n["WARC-Profile"]=d===Q?ge:ye,H&&(n["WARC-Refers-To-Target-URI"]=H,n["WARC-Refers-To-Date"]=c(p||new Date().toISOString())));let _=new C({statusline:d,headers:new Map(Object.entries(n))});_.headers.get("WARC-Record-ID")||_.headers.set("WARC-Record-ID",`<urn:uuid:${he()}>`),_.headers.get("Content-Type")||_.headers.set("Content-Type",r&&Re[r]||"application/octet-stream"),h||(h=Z());let X=new a({warcHeaders:_,reader:h}),J=null,E=[];switch(r){case"response":case"request":case"revisit":E=Object.entries(o),J=u?new Map(E):new Headers(o),(E.length>0||r!=="revisit")&&(X.httpHeaders=new C({statusline:l,headers:J}));break}return X}static createWARCInfo(e={},t){async function*r(){for(let[n,i]of Object.entries(t))yield pe.encode(`${n}: ${i}\r
`)}return e.type="warcinfo",a.create(e,r())}getResponseInfo(){let e=this.httpHeaders;return e?{headers:e.headers,status:e.statusCode,statusText:e.statusText}:null}fixUp(){let e=this.warcHeaders.headers.get("WARC-Target-URI");e&&e.startsWith("<")&&e.endsWith(">")&&this.warcHeaders.headers.set("WARC-Target-URI",e.slice(1,-1))}async readFully(e=!1){if(this.httpHeaders){if(this.payload&&!this.payload.length)return this.payload;if(this._contentReader&&!e)throw new TypeError("WARC Record decoding already started, but requesting raw payload");if(e&&this.consumed==="raw"&&this.payload)return await this._createDecodingReader([this.payload]).readFully()}return this.payload?this.payload:(e?(this.payload=await super.readFully(),this.consumed="content"):(this.payload=await a.readFully(this._reader),this.consumed="raw"),this.payload)}get reader(){if(this.payload&&!this.payload.length)return Z();if(this._contentReader)throw new TypeError("WARC Record decoding already started, but requesting raw payload");return this._reader}get contentReader(){return this.httpHeaders?(this._contentReader||(this._contentReader=this._createDecodingReader(this._reader)),this._contentReader):this._reader}_createDecodingReader(e){if(!this.httpHeaders)throw new Error("WARCRecord cannot call _createDecodingReader when this.httpHeaders === null");let t=this.httpHeaders.headers.get("Content-Encoding"),r=this.httpHeaders.headers.get("Transfer-Encoding"),n=r==="chunked";return!t&&!n&&(t=r),new g(e,t,n)}async readlineRaw(e){if(this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");if(this.contentReader instanceof f)return this.contentReader.readlineRaw(e);throw new Error("WARCRecord cannot call readlineRaw on this.contentReader if it does not extend BaseAsyncIterReader")}async contentText(){let e=await this.readFully(!0);return fe.decode(e)}async*[Symbol.asyncIterator](){for await(let e of this.contentReader)if(yield e,this.consumed)throw new Error("Record already consumed.. Perhaps a promise was not awaited?");this.consumed="content"}async skipFully(){if(!this.consumed){if(this._reader instanceof R){let e=await this._reader.skipFully();return this.consumed="skipped",e}throw new Error("WARCRecord cannot call skipFully on this._reader if it is not a LimitReader")}}warcHeader(e){return this.warcHeaders.headers.get(e)}get warcType(){return this.warcHeaders.headers.get("WARC-Type")}get warcTargetURI(){return this.warcHeaders.headers.get("WARC-Target-URI")}get warcDate(){return this.warcHeaders.headers.get("WARC-Date")}get warcRefersToTargetURI(){return this.warcHeaders.headers.get("WARC-Refers-To-Target-URI")}get warcRefersToDate(){return this.warcHeaders.headers.get("WARC-Refers-To-Date")}get warcPayloadDigest(){return this.warcHeaders.headers.get("WARC-Payload-Digest")}get warcBlockDigest(){return this.warcHeaders.headers.get("WARC-Block-Digest")}get warcContentType(){return this.warcHeaders.headers.get("Content-Type")}get warcContentLength(){return Number(this.warcHeaders.headers.get("Content-Length"))}};async function*Z(){}var ee=new TextDecoder,M=new Uint8Array([]),I=class a{static parse(s,e){return new a(s,e).parse()}static iterRecords(s,e){return new a(s,e)[Symbol.asyncIterator]()}constructor(s,{keepHeadersCase:e=!1,parseHttp:t=!0}={}){this._offset=0,this._warcHeadersLength=0,this._headersClass=e?Map:Headers,this._parseHttp=t,s instanceof g?this._reader=s:this._reader=new g(s),this._record=null}async readToNextRecord(){if(!this._reader||!this._record)return M;await this._record.skipFully(),this._reader.compressed&&(this._offset=this._reader.getRawOffset());let s=await this._reader.readlineRaw(),e=0;if(!s)s=M;else{if(e=s.byteLength-1,e===9&&ee.decode(s).startsWith("WARC/"))return s;for(;e>0;){let t=s[e-1];if(t!==10&&t!==13)break;e--}e&&console.warn(`Content-Length Too Small: Record not followed by newline, Remainder Length: ${e}, Offset: ${this._reader.getRawOffset()-s.byteLength}`)}if(this._reader.compressed)await this._reader.skipSize(2),s=M;else{for(s=await this._reader.readlineRaw();s&&s.byteLength===2;)s=await this._reader.readlineRaw();this._offset=this._reader.getRawOffset(),s&&(this._offset-=s.length)}return s}_initRecordReader(s){return new R(this._reader,Number(s.headers.get("Content-Length")||0))}async parse(){let s=await this.readToNextRecord(),e=s?ee.decode(s):"",t=new S,r=await t.parse(this._reader,{firstLine:e,headersClass:this._headersClass});if(!r)return null;this._warcHeadersLength=this._reader.getReadOffset();let n=new k({warcHeaders:r,reader:this._initRecordReader(r)});if(this._record=n,this._parseHttp)switch(n.warcType){case"response":case"request":await this._addHttpHeaders(n,t);break;case"revisit":n.warcContentLength>0&&await this._addHttpHeaders(n,t);break}return n}get offset(){return this._offset}get recordLength(){return this._reader.getRawLength(this._offset)}async*[Symbol.asyncIterator](){let s=null;for(;(s=await this.parse())!==null;)yield s;this._record=null}async _addHttpHeaders(s,e){let t=await e.parse(this._reader,{headersClass:this._headersClass});s.httpHeaders=t;let r=this._reader.getReadOffset()-this._warcHeadersLength;s.reader instanceof R&&s.reader.setLimitSkip(s.warcContentLength-r)}};import me from"base32-encode";import we from"pako";import{createSHA256 as te,createSHA1 as Ae}from"hash-wasm";var re=new TextEncoder,T=class{},D=class extends T{constructor(){super(...arguments);this.buffers=[]}write(e){this.buffers.push(e)}async*readAll(){for(let e of this.buffers)yield e}},B=class a extends f{constructor(e,t={},r=new D){super();this.gzip=!1;this.digestAlgo="";this.digestAlgoPrefix="";this.digestBase32=!1;this.preferPako=!1;this._alreadyDigested=!1;this.blockHasher=null;this.payloadHasher=null;this.httpHeadersBuff=null;this.warcHeadersBuff=null;this.gzip=!!t.gzip,this.record=e;let n=t&&t.digest||{};this.digestAlgo=n?.algo||"sha-256",this.digestAlgoPrefix=n?.prefix||"sha256:",this.digestBase32=!!n?.base32,this.preferPako=!!t?.preferPako,a.noComputeDigest(e)&&(this.digestAlgo=""),this.externalBuffer=r}static async serialize(e,t,r=new D){return await new a(e,t,r).readFully()}static noComputeDigest(e){return e.warcType==="revisit"||e.warcType==="warcinfo"||e.warcPayloadDigest&&e.warcBlockDigest}async*[Symbol.asyncIterator](){if(!this.gzip){yield*this.generateRecord();return}if("CompressionStream"in globalThis&&!this.preferPako){let e=new globalThis.CompressionStream("gzip");yield*this.streamCompress(e)}else yield*this.pakoCompress()}async readlineRaw(e){return null}async*pakoCompress(){let e=new we.Deflate({gzip:!0}),t=null;for await(let r of this.generateRecord())for(t&&t.length>0&&e.push(t),t=r;e.chunks.length;)yield e.chunks.shift();t&&e.push(t,!0),yield e.result}async*streamCompress(e){let t=this.generateRecord();new ReadableStream({async pull(o){let l=await t.next();l.done?o.close():o.enqueue(l.value)}}).pipeThrough(e);let n=null,i=e.readable.getReader();for(;(n=await i.read())&&!n.done;)yield n.value}newHasher(){switch(this.digestAlgo){case"sha-256":return te();case"sha-1":return Ae();case"":return null;default:return te()}}getDigest(e){return this.digestAlgoPrefix+(this.digestBase32?me(e.digest("binary"),"RFC4648"):e.digest("hex"))}async digestRecord(){let e=this.record;if(this._alreadyDigested)return Number(e.warcHeaders.headers.get("Content-Length"));let t=await this.newHasher(),r=await this.newHasher(),n=0;e.httpHeaders&&(this.httpHeadersBuff=re.encode(e.httpHeaders.toString()+`\r
`),n+=this.httpHeadersBuff.length,t?.update(this.httpHeadersBuff));for await(let i of e.reader)t?.update(i),r?.update(i),await this.externalBuffer.write(i),n+=i.length;return r&&e.warcHeaders.headers.set("WARC-Payload-Digest",this.getDigest(r)),t&&e.warcHeaders.headers.set("WARC-Block-Digest",this.getDigest(t)),e.warcHeaders.headers.set("Content-Length",n.toString()),this.warcHeadersBuff=re.encode(e.warcHeaders.toString()),this._alreadyDigested=!0,n}async*generateRecord(){if(await this.digestRecord(),this.warcHeadersBuff&&(yield this.warcHeadersBuff),yield j,this.httpHeadersBuff&&(yield this.httpHeadersBuff),this.externalBuffer)for await(let e of this.externalBuffer.readAll())yield e;yield Y}};var Ce=["offset","warc-type","warc-target-uri"],G=class{constructor(s={}){this.opts=s,this.fields=s&&s.fields?s.fields.split(","):Ce,this.parseHttp=!1}serialize(s){return JSON.stringify(s)+`
`}write(s,e){e.write(this.serialize(s))}async writeAll(s,e){for await(let t of this.iterIndex(s))this.write(t,e)}async*iterIndex(s){let e={strictHeaders:!0,parseHttp:this.parseHttp};for(let{filename:t,reader:r}of s){let n=new I(r,e);yield*this.iterRecords(n,t)}}async*iterRecords(s,e){for await(let t of s){await t.skipFully();let r=this.indexRecord(t,s,e);r&&(yield r)}}indexRecord(s,e,t){if(this.filterRecord&&!this.filterRecord(s))return null;let r={},{offset:n,recordLength:i}=e,o={offset:n,length:i,filename:t};for(let l of this.fields)l in o?r[l]=o[l]:this.setField(l,s,r);return r}setField(s,e,t){let r=this.getField(s,e);r!==null&&(t[s]=r)}getField(s,e){if(s==="http:status")return e.httpHeaders&&(e.warcType==="response"||e.warcType==="revisit")?e.httpHeaders.statusCode:null;if(s.startsWith("http:")){if(e.httpHeaders){let t=e.httpHeaders.headers;return t instanceof Map&&(t=new Headers(Object.fromEntries(t))),t.get(s.slice(5))}return null}return e.warcHeaders.headers.get(s)||null}},W=class extends G{constructor(s){super(s);for(let e of this.fields)if(e.startsWith("http:")){this.parseHttp=!0;break}}},_e="urlkey,timestamp,url,mime,status,digest,length,offset,filename".split(","),be="urlkey,timestamp,url,mime,status,digest,redirect,meta,length,offset,filename".split(","),U=class extends W{constructor(e){super(e);switch(this.includeAll=!!e?.all,this.overrideIndexForAll=!!e?.all,this.fields=_e,this.parseHttp=!0,this.noSurt=!!e?.noSurt,this._lastRecord=null,e?.format){case"cdxj":this.serialize=this.serializeCDXJ;break;case"cdx":this.serialize=this.serializeCDX11;break;case"json":default:break}}async*iterRecords(e,t){this._lastRecord=null;for await(let n of e){await n.readFully();let i=this.indexRecord(n,e,t);i&&(yield i)}let r=this.indexRecord(null,e,t);r&&(yield r)}filterRecord(e){if(this.includeAll)return!0;let t=e.warcType;return!(t==="request"||t==="warcinfo"||(t==="metadata"||t==="resource")&&e.warcContentType==="application/warc-fields")}indexRecord(e,t,r){if(this.overrideIndexForAll)return e?super.indexRecord(e,t,r):null;let n=this._lastRecord;if(this._lastRecord=e,e&&(e._offset=t.offset,e._length=t.recordLength),!n)return null;if(!e||n.warcTargetURI!=e.warcTargetURI)return this.indexRecordPair(n,null,t,r);let i=e.warcType,o=n.warcType;return i==="request"&&(o==="response"||o==="revisit")?(this._lastRecord=null,this.indexRecordPair(n,e,t,r)):(i==="response"||i==="revisit")&&o==="request"?(this._lastRecord=null,this.indexRecordPair(e,n,t,r)):this.indexRecordPair(n,null,t,r)}indexRecordPair(e,t,r,n){let i,o,l=e.warcTargetURI||"";if(t&&t.httpHeaders&&t.httpHeaders.method!=="GET"){let u={url:l,method:t.httpHeaders.method,headers:t.httpHeaders.headers,postData:t.payload};i=u.method,v(u)&&(o=u.requestBody,e.method=i,e.requestBody=o,l=u.url)}e._urlkey=l;let d=super.indexRecord(e,r,n);return d&&(e&&e._offset!==void 0&&(d.offset=e._offset,d.length=e._length),i&&(d.method=i),o&&(d.requestBody=o)),d}serializeCDXJ(e){let{urlkey:t,timestamp:r}=e;return delete e.urlkey,delete e.timestamp,`${t} ${r} ${JSON.stringify(e)}
`}serializeCDX11(e){let t=[];for(let r of be)t.push(e[r]!=null?e[r]:"-");return t.join(" ")+`
`}getField(e,t){let r=null;switch(e){case"urlkey":return r=t._urlkey||t.warcTargetURI||null,this.noSurt||r===null?r:P(r);case"timestamp":return r=t.warcDate??"",r.replace(/[-:T]/g,"").slice(0,14);case"url":return t.warcTargetURI;case"mime":switch(t.warcType){case"revisit":return"warc/revisit";case"response":case"request":e="http:content-type";break;default:e="content-type"}return r=super.getField(e,t),r?r.toString().split(";",1)[0]?.trim():null;case"status":return super.getField("http:status",t);case"digest":return r=t.warcPayloadDigest,r?r.split(":",2)[1]:null;default:return null}}},F=class extends U{constructor(s){super(s),this.overrideIndexForAll=!1}indexRecordPair(s,e,t,r){let n=super.indexRecordPair(s,e,t,r);return n&&{cdx:n,record:s,reqRecord:e}}};export{g as AsyncIterReader,f as BaseAsyncIterReader,T as BaseSerializerBuffer,F as CDXAndRecordIndexer,U as CDXIndexer,W as Indexer,R as LimitReader,b as NoConcatInflator,C as StatusAndHeaders,S as StatusAndHeadersParser,I as WARCParser,k as WARCRecord,B as WARCSerializer,O as WARC_1_0,Q as WARC_1_1,z as appendRequestQuery,A as concatChunks,P as getSurt,q as jsonToQueryParams,L as jsonToQueryString,N as mfdToQueryParams,$ as mfdToQueryString,v as postToGetUrl,y as splitChunk};
