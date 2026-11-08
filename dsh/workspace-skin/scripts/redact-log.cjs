const os=require('node:os');
const path=require('node:path');
const project=path.resolve(__dirname,'..');
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// Sanitize only at output boundaries. Authenticated localhost URLs remain usable
// in memory, but their credentials and query values never enter public evidence.
function redact(value){
 let text=String(value);
 text=text.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,'[redacted-private-key]');
 text=text.replace(/((?:cookie|set-cookie)\s*:\s*)[^\r\n]+/gi,'$1[redacted]');
 text=text.replace(/https?:\/\/[^\s<>"']+/gi,raw=>{
  try{const url=new URL(raw);if(url.username||url.password){url.username='redacted';url.password='redacted';}if(url.search)url.search='[redacted]';if(url.hash)url.hash='[redacted]';return url.href;}catch{return '[redacted-url]';}
 });
 text=text.replace(/\b(Bearer|Basic)\s+[a-z\d+/_=.:~-]+/gi,'$1 [redacted]');
 text=text.replace(/((?:["']?)(?:authorization|proxy-authorization|cookie|set-cookie|api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|secret)(?:["']?)\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;\r\n}]+)/gi,'$1[redacted]');
 text=text.replace(/\b(?:sk-[a-z\d_-]{12,}|gh[pousr]_[a-z\d_]{12,}|github_pat_[a-z\d_]{12,}|eyJ[a-z\d_-]+\.eyJ[a-z\d_-]+\.[a-z\d_-]+)\b/gi,'[redacted]');
 for(const [prefix,label] of [[project,'[project]'],[os.homedir(),'[home]']])text=text.replace(new RegExp(escape(prefix),'g'),label);
 text=text.replace(/(?:\/Users\/|\/home\/)[^/\s]+/g,'[home]');
 text=text.replace(/(?:\/private)?\/(?:tmp|var\/folders)\/[^\s"'<>\n)]+/g,'[temp-path]');
 text=text.replace(/[A-Z]:\\Users\\[^\\\r\n]+/gi,'[home]');
 return text;
}
function sanitize(value){
 if(typeof value==='string')return redact(value);
 if(Array.isArray(value))return value.map(sanitize);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[redact(key),sanitize(item)]));
 return value;
}
module.exports={redact,sanitize};
