(()=>{ 
  const HIDE_TEXT = ['Listar','Listado','Histórico','Demo','Prueba','Sandbox'];
  const TARGETS=['button','a','[role="tab"]','h2','h3','.nav-tab','.menu a'];
  const BLOCKS=['section','.card','.panel','.box','.tab-pane','[role="tabpanel"]','.menu-item'];
  function hideByText(){
    document.querySelectorAll(TARGETS.join(',')).forEach(el=>{
      const t=(el.textContent||'').trim().toLowerCase();
      if(HIDE_TEXT.some(s=>t.includes(s.toLowerCase()))){
        (el.closest(BLOCKS.join(','))||el).style.display='none';
      }
    });
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',hideByText):hideByText();
})();
