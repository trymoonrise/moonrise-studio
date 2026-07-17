const scenes=[...document.querySelectorAll('[data-scene]')];
const dotsRoot=document.getElementById('dots');
const counter=document.getElementById('counter');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let current=0;
let locked=false;

scenes.forEach((scene,index)=>{
  const button=document.createElement('button');
  button.type='button';
  button.className='dot';
  button.textContent=String(index+1).padStart(2,'0');
  button.setAttribute('aria-label','Open scene '+(index+1));
  button.setAttribute('aria-current',index===0?'true':'false');
  button.addEventListener('click',()=>go(index));
  dotsRoot.appendChild(button);
});

const dots=[...dotsRoot.children];

function finish(outgoing,incoming,next){
  outgoing.classList.remove('exit');
  incoming.classList.remove('enter');
  incoming.classList.add('active');
  current=next;
  counter.textContent=String(current+1).padStart(2,'0')+' / '+String(scenes.length).padStart(2,'0');
  locked=false;
}

function go(next){
  if(locked||next===current)return;
  locked=true;
  const outgoing=scenes[current];
  const incoming=scenes[next];
  outgoing.classList.remove('active');
  outgoing.classList.add('exit');
  incoming.classList.add('enter');
  dots[current].setAttribute('aria-current','false');
  dots[next].setAttribute('aria-current','true');
  if(reduced){
    finish(outgoing,incoming,next);
    return;
  }
  let completed=false;
  const done=()=>{
    if(completed)return;
    completed=true;
    incoming.removeEventListener('animationend',onAnimationEnd);
    finish(outgoing,incoming,next);
  };
  const onAnimationEnd=(event)=>{
    // Ignore bubbled child animations (eyebrow/title/copy).
    if(event.target!==incoming)return;
    if(event.animationName&&event.animationName.startsWith('content-'))return;
    done();
  };
  incoming.addEventListener('animationend',onAnimationEnd);
  setTimeout(done,1200);
}

document.getElementById('next').addEventListener('click',()=>go((current+1)%scenes.length));
document.getElementById('prev').addEventListener('click',()=>go((current-1+scenes.length)%scenes.length));
