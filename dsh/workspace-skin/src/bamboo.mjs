// Build-time vector artwork. Each pivot is at a stem base, branch joint or leaf base.
// Nested groups let leaves inherit branch movement without moving in lockstep.
function leaves(seed) {
  return [[22,-19,-62,.65],[38,-29,34,.8],[57,-36,-42,.85],[77,-39,38,.9],[100,-37,-12,.74]].map(([x,y,angle,scale],i)=>
    `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"><g data-ws-sway="leaf" style="--duration:13s;--delay:${(-4+(seed%3)*.18+i*.12).toFixed(2)}s"><path d="M0 0 C22 -11 53 -17 86 -10 C58 -3 29 6 0 0Z" fill="currentColor" opacity="${.67+(i%3)*.12}"/><path d="M0 0 Q38 -6 80 -10" fill="none" stroke="currentColor" stroke-width=".6" opacity=".45"/></g></g>`
  ).join('');
}
function branch(x,y,angle,scale,seed) {
  return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"><g data-ws-sway="branch" style="--duration:13s;--delay:${(-4.6+(seed%3)*.18).toFixed(2)}s;--bend:${angle>90?-1:1}"><path d="M0 0 Q42 -43 113 -37" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>${leaves(seed)}</g></g>`;
}
function stem({path,nodes,branches,pivot,delay,duration,opacity}) {
  return `<g data-ws-sway="stem" style="transform-origin:${pivot[0]}px ${pivot[1]}px;--duration:13s;--delay:${(-5+(pivot[0]-286)/600).toFixed(2)}s" opacity="${opacity}"><path d="${path}" fill="currentColor" opacity=".55"/>${nodes.map(([x,y,w])=>`<path d="M${x-w} ${y} q${w} 3 ${w*2} 0" fill="none" stroke="currentColor" stroke-width="1.7" opacity=".7"/>`).join('')}${branches.map(b=>branch(...b)).join('')}</g>`;
}
export const bambooSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 940" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
${stem({pivot:[460,940],duration:13.8,delay:-5,opacity:.42,path:'M452 940 Q454 655 490 310 L492 310 Q463 660 462 940Z',nodes:[[460,795,6],[467,650,5],[478,500,4],[487,370,3]],branches:[[478,500,164,.66,8],[487,370,-12,.54,9],[467,650,15,.7,10]]})}
${stem({pivot:[286,940],duration:11.7,delay:-3.2,opacity:.64,path:'M281 940 Q279 661 228 350 L230 349 Q289 658 291 940Z',nodes:[[285,806,6],[280,652,5],[262,510,4],[238,389,3]],branches:[[262,510,157,.78,4],[238,389,-18,.66,5],[280,652,8,.82,6],[285,806,162,.74,7]]})}
${stem({pivot:[370,940],duration:10.8,delay:-1.4,opacity:1,path:'M363 940 Q372 579 421 153 L423 153 Q383 587 375 940Z',nodes:[[373,808,7],[382,648,6],[394,490,5],[407,331,4],[418,190,3]],branches:[[418,190,154,.64,0],[407,331,-9,.83,1],[394,490,164,.95,2],[382,648,8,.98,3],[373,808,155,.78,11]]})}
</svg>`;
