const style = document.createElement('style');
style.textContent = `
  .card-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:auto;align-items:stretch}
  .card-actions > a,.card-actions > button{width:100%;min-width:0;height:42px!important;min-height:42px;display:inline-flex!important;align-items:center;justify-content:center;box-sizing:border-box;padding:0 12px!important;border-radius:10px!important;font-size:12px!important;font-weight:800;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:none}
  .card-actions .primary-btn{background:var(--accent)!important;color:var(--accentText)!important;border:1px solid var(--accent)!important;box-shadow:none!important}
  .card-actions .secondary-btn{background:var(--panel2)!important;color:var(--text)!important;border:1px solid var(--border-strong)!important}
  .card-actions > a:hover,.card-actions > button:hover{transform:translateY(-1px)!important;border-color:var(--accent)!important;box-shadow:0 7px 16px rgba(0,0,0,.14)!important}
  .card-actions > a:active,.card-actions > button:active{transform:translateY(0) scale(.98)!important}
  .card-actions > a:focus-visible,.card-actions > button:focus-visible{outline:none;box-shadow:var(--ring)!important}
  .card-actions .primary-btn:hover{filter:brightness(1.04)}
  @media(max-width:620px){.card-actions{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.card-actions > a,.card-actions > button{height:40px!important;min-height:40px;font-size:11px!important;padding:0 9px!important}}
`;
document.head.appendChild(style);

function normalizeCardButtons(root=document){
  root.querySelectorAll('.card').forEach(card=>{
    const actions=card.querySelector('.card-actions');
    if(!actions) return;

    actions.querySelectorAll('a').forEach(link=>{
      link.classList.add('card-action');
      const text=link.textContent.trim();
      if(/^Call$/i.test(text) && link.getAttribute('href')?.startsWith('tel:')){
        const raw=link.getAttribute('data-phone')||link.getAttribute('href').slice(4);
        const first=(raw.split('/')[0]||raw).trim();
        link.href='tel:'+first.replace(/[^+\\d]/g,'');
      }
    });

    // Keep the action area balanced even when a venue has only one or two links.
    const links=[...actions.querySelectorAll('a')];
    if(links.length===1) links[0].style.gridColumn='1 / -1';
  });
}

normalizeCardButtons();
const observer=new MutationObserver(()=>normalizeCardButtons());
observer.observe(document.body,{childList:true,subtree:true});
