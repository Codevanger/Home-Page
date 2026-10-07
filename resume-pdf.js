(function(root){
  const base = new URL('.', document.currentScript.src);
  let assets;
  const url = p => new URL(p,base).href;
  function script(path){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=url(path);el.onload=resolve;el.onerror=()=>{el.remove();reject(Error('Could not load PDF engine'));};document.head.appendChild(el);});}
  async function resource(path,binary=false){const r=await fetch(url(path));if(!r.ok)throw Error('Could not load '+path);return binary?new Uint8Array(await r.arrayBuffer()):r.text();}
  function load(){
    if(!assets)assets=Promise.all([
      import(url('vendor/resume/even.js')),
      script('vendor/resume/dompdf.min.js'),script('vendor/resume/purify.min.js'),
      resource('resume-theme/print.css'),
      resource('resume-theme/fonts/NotoSans-Regular.ttf',true),resource('resume-theme/fonts/NotoSans-Bold.ttf',true)
    ]).catch(e=>{assets=null;throw e;});
    return assets;
  }
  function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
  async function create(resume,{signal,onProgress=()=>{}}={}){
    const check=()=>{if(signal?.aborted)throw new DOMException('Cancelled','AbortError');};
    check();onProgress({stage:'assets'});
    const [theme,,,css,regular,bold]=await load();check();
    const data=ResumeThemeData.escapeData(ResumeThemeData.adapt(resume));
    const html=DOMPurify.sanitize(theme.render(data),{WHOLE_DOCUMENT:true,FORBID_TAGS:['script','link','img','iframe','object','embed'],FORBID_ATTR:['style']});
    const parsed=new DOMParser().parseFromString(html,'text/html');
    const policy=parsed.createElement('meta');policy.httpEquiv='Content-Security-Policy';policy.content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'";parsed.head.prepend(policy);
    const style=parsed.createElement('style');
    style.textContent=css.replace('@media print {','@media screen, print {')+`
      @font-face{font-family:ResumeSans;src:url(data:font/ttf;base64,${base64(regular)});font-weight:400}
      @font-face{font-family:ResumeSans;src:url(data:font/ttf;base64,${base64(bold)});font-weight:700}
      html,body{font-family:ResumeSans,sans-serif!important} body{width:100%;padding:0} .icon-list svg{display:none} .masthead{text-align:left} li::marker{content:"- "} .icon-list>li::marker,.tag-list>li::marker{content:""}
    `;
    parsed.head.append(style);
    const frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-same-origin');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.style.cssText='position:fixed;left:-12000px;top:0;width:695px;height:1000px;border:0;pointer-events:none;';
    try{
      const loaded=new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(Error('Could not prepare resume layout'));});
      frame.srcdoc='<!doctype html>'+parsed.documentElement.outerHTML;document.body.append(frame);await loaded;check();
      const doc=frame.contentDocument;
      await Promise.all([doc.fonts.load('400 10pt ResumeSans'),doc.fonts.load('700 10pt ResumeSans')]);await doc.fonts.ready;check();
      const engine=typeof root.dompdf==='function'?root.dompdf:root.dompdf.default;
      const pdf=await engine(doc.body,{
        format:'letter',marginPt:[40,45,40,45],pagination:true,compress:true,putOnlyUsedFonts:true,backgroundColor:'#ffffff',
        fontConfig:[{fontFamily:'ResumeSans',fontBytes:regular,fontWeight:400},{fontFamily:'ResumeSans',fontBytes:bold,fontWeight:700}],
        metadata:{title:resume.basics.name+' — Resume',author:resume.basics.name},
        onProgress:p=>{if(!signal?.aborted)onProgress(p);}
      });
      check();if(!(pdf instanceof Blob)||await pdf.slice(0,5).text()!=='%PDF-')throw Error('Invalid generated PDF');
      return pdf;
    }finally{frame.remove();}
  }
  root.ResumePDF={create};
})(globalThis);
