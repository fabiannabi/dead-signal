import { QuartzComponent, QuartzComponentConstructor } from "./types"

const LightboxScript: QuartzComponent = () => {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function(){
  var lb;
  function getLb(){
    if(lb) return lb;
    lb = document.createElement('div');
    lb.id = 'photo-lb';
    lb.className = 'photo-lightbox';
    lb.innerHTML = '<img alt=""><span class="lb-hint">click · esc para cerrar</span>';
    lb.addEventListener('click', function(){ lb.classList.remove('lb-open'); });
    lb.querySelector('img').addEventListener('click', function(e){ e.stopPropagation(); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') lb.classList.remove('lb-open'); });
    document.body.appendChild(lb);
    return lb;
  }
  document.addEventListener('click', function(e){
    var t = e.target;
    if(!t || t.tagName !== 'IMG') return;
    var img = (t.closest('.photo-item') || t.closest('.media-evidence-block')) ? t : null;
    if(!img) return;
    var box = getLb();
    box.querySelector('img').src = img.src;
    box.querySelector('img').alt = img.alt || '';
    box.classList.add('lb-open');
  });
})();
`,
      }}
    />
  )
}

LightboxScript.displayName = "LightboxScript"
export default (() => LightboxScript) satisfies QuartzComponentConstructor
