function u(t){let e;typeof t=="string"?e=t:t&&t.length?e=t.reduce((r,n)=>(r+=String.fromCharCode(n),r),""):t?e=t.toString():e="";try{return"__wb_post_data="+btoa(e)}catch{return"__wb_post_data="}}function m(t){return t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function d(t){try{if(!t.startsWith("https:")&&!t.startsWith("http:"))return t;t=t.replace(/^(https?:\/\/)www\d*\./,"$1");let e=t.toLowerCase(),r=new URL(e),i=r.hostname.split(".").reverse().join(",");if(r.port&&(i+=":"+r.port),i+=")",i+=r.pathname,r.search){r.searchParams.sort(),i+=r.search;for(let[o,s]of r.searchParams.entries())if(!s){let a=new RegExp(`(?<=[&?])${m(o)}=(?=&|$)`);a.exec(e)||(i=i.replace(a,o))}}return i}catch{return t}}function w(t){let{method:e,headers:r,postData:n}=t;if(e==="GET")return!1;let i=(r.get("content-type")||"").split(";")[0];function o(a){return a instanceof Uint8Array&&(a=new TextDecoder().decode(a)),a}let s="";switch(i){case"application/x-www-form-urlencoded":s=o(n);break;case"application/json":s=c(o(n));break;case"text/plain":try{s=c(o(n),!1)}catch{s=u(n)}break;case"multipart/form-data":{let a=r.get("content-type");if(!a)throw new Error("utils cannot call postToGetURL when missing content-type header");s=g(o(n),a);break}default:s=u(n)}return s!==null?(t.url=f(t.url,s,t.method),t.method="GET",t.requestBody=s,!0):!1}function f(t,e,r){if(!r)return t;let n=t.indexOf("?")>0?"&":"?";return`${t}${n}__wb_method=${r}&${e}`}function p(t,e=!0){if(typeof t=="string")try{t=JSON.parse(t)}catch{t={}}let r=new URLSearchParams,n={},i=o=>r.has(o)?(o in n||(n[o]=1),o+"."+ ++n[o]+"_"):o;try{JSON.stringify(t,(o,s)=>(["object","function"].includes(typeof s)||r.set(i(o),s),s))}catch(o){if(!e)throw o}return r}function y(t,e){let r=new URLSearchParams;t instanceof Uint8Array&&(t=new TextDecoder().decode(t));try{let n=e.split("boundary=")[1],i=t.split(new RegExp("-*"+n+"-*","mi"));for(let o of i){let s=o.trim().match(/name="([^"]+)"\r\n\r\n(.*)/im);s&&r.set(s[1],s[2])}}catch{}return r}function c(t,e=!0){return p(t,e).toString()}function g(t,e){return y(t,e).toString()}function x(t,e){if(t.length===1)return t[0];let r=new Uint8Array(e),n=0;for(let i of t)r.set(i,n),n+=i.byteLength;return r}function U(t,e){return[t.slice(0,e),t.slice(e)]}export{f as appendRequestQuery,x as concatChunks,d as getSurt,p as jsonToQueryParams,c as jsonToQueryString,y as mfdToQueryParams,g as mfdToQueryString,w as postToGetUrl,U as splitChunk};
