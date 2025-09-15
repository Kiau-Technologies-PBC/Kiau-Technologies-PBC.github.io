/* compacted circular graph module */
const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, cls = '') => Object.assign(document.createElement(tag), { className: cls });
const mkNS = (tag) => document.createElementNS(NS, tag);

class BoxNode {
  constructor(text, i, color) {
    this.text = text; this.i = i;
    this.el = mk('button', 'box'); this.el.type = 'button'; this.el.textContent = text;
    this.cx = 0; this.cy = 0;
    // apply initial color if provided
    if (color) this.applyColor(color);
  }

  // choose readable text color for background (simple luminance test for hex or rgb)
  static readableTextColor(bg) {
    if (!bg) return '';
    const hexMatch = bg.match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
      const l = 0.2126*r + 0.7152*g + 0.0722*b;
      return l > 180 ? '#111' : '#fff';
    }
    const rgbMatch = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbMatch) {
      const r = +rgbMatch[1], g = +rgbMatch[2], b = +rgbMatch[3];
      const l = 0.2126*r + 0.7152*g + 0.0722*b;
      return l > 180 ? '#111' : '#fff';
    }
    return '#fff';
  }

  // small helper: adjust color brightness (percent negative = darker, positive = lighter)
  static shadeColor(color, percent) {
    // hex
    const hexMatch = (color || '').match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
      let r = parseInt(hex.substring(0,2),16);
      let g = parseInt(hex.substring(2,4),16);
      let b = parseInt(hex.substring(4,6),16);
      const amt = Math.round(255 * (percent/100));
      r = Math.min(255, Math.max(0, r + amt));
      g = Math.min(255, Math.max(0, g + amt));
      b = Math.min(255, Math.max(0, b + amt));
      const toHex = v => v.toString(16).padStart(2,'0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    // rgb() or rgba()
    const rgbMatch = color && color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbMatch) {
      let r = +rgbMatch[1], g = +rgbMatch[2], b = +rgbMatch[3];
      const amt = Math.round(255 * (percent/100));
      r = Math.min(255, Math.max(0, r + amt));
      g = Math.min(255, Math.max(0, g + amt));
      b = Math.min(255, Math.max(0, b + amt));
      return `rgb(${r}, ${g}, ${b})`;
    }
    // fallback: return original
    return color;
  }

  applyColor(color) {
    this.color = color;
    this.el.style.background = color;
    this.el.style.color = BoxNode.readableTextColor(color);
    // border: slightly darker (negative percent) so it's "off" the background
    const border = BoxNode.shadeColor(color, -12);
    this.el.style.border = `2px solid ${border}`;
    this.el.style.boxShadow = `0 10px 24px rgba(0,0,0,0.15), 0 0 0 6px ${BoxNode.shadeColor(color, 55)}20`; // subtle halo
  }

  setPos(x,y){ this.cx = x; this.cy = y; this.el.style.left = x + 'px'; this.el.style.top = y + 'px'; }
  setColor(color){ this.applyColor(color); }
}

class BoxModal {
  constructor(){
    // create overlay
    this.dom = mk('div','cg-modal-overlay'); this.dom.style.display = 'none';

    // content wrapper (flex row)
    const wrap = mk('div','cg-modal-wrap');
    const left = mk('div','cg-modal-left');    // newspaper / long card
    const right = mk('div','cg-modal-right');  // column area (underneath post-it)
    wrap.append(left, right);

    // post-it (small overlapping note)
    const postIt = mk('div','cg-postit');
    postIt.setAttribute('role','note');
    wrap.appendChild(postIt);

    // nav row in right column
    const nav = mk('div','cg-modal-nav');
    this.prev = mk('button','cg-btn-prev'); this.next = mk('button','cg-btn-next');
    [this.prev,this.next].forEach(b => { b.type='button'; nav.appendChild(b); });
    right.appendChild(nav);

    this.left = left; this.right = right; this.postIt = postIt;
    this.dom.appendChild(wrap);
    document.body.appendChild(this.dom);

    // close when clicking the overlay background
    this.dom.addEventListener('click', e => { if (e.target === this.dom) this.close(); });
    this.prev.addEventListener('click', ()=> this.onPrev && this.onPrev());
    this.next.addEventListener('click', ()=> this.onNext && this.onNext());

    // scoped styles (inject once)
    if (!document.getElementById('cg-modal-styles')) {
      const s = mk('style'); s.id = 'cg-modal-styles';
      s.textContent = `
        .cg-modal-overlay{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(6,10,14,0.55); z-index:9999; padding:24px; box-sizing:border-box; }
        .cg-modal-wrap{
          position:relative;
          display:flex;
          gap:18px;
          width:min(1100px,96%);
          max-width:1100px;
          background: linear-gradient(180deg,#0b1220,#071018);
          padding:18px;
          box-shadow:0 18px 50px rgba(2,6,23,0.6);
          border-radius:12px;
          box-sizing:border-box;
        }
        .cg-modal-left{
          flex:1.6;
          background:#fff;
          color:#0b1220;
          padding:20px 24px;
          border-radius:10px;
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.63);
          overflow:auto;
          max-height:78vh;
          box-sizing:border-box;
        }
        .cg-modal-left h2{ margin:0 0 10px 0; font-size:20px; }
        /* make detail text wrap and scroll when long; keep readable line length */
        .cg-modal-left .detail{
          color:#111;
          line-height:1.5;
          font-size:14px;
          white-space:normal;
          word-break:break-word;
          hyphens:auto;
          max-height: calc(78vh - 88px); /* leave room for header/nav */
          overflow:auto;
          padding-right:8px; box-sizing:border-box;
        }
        .cg-modal-right{
          flex:0.9;
          background:linear-gradient(180deg,#0b1220,#071018);
          color:#e6eef8;
          padding:12px;
          border-radius:10px;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          min-width:220px;
          max-height:78vh;
          box-sizing:border-box;
          overflow:auto;
        }
        .cg-modal-nav{ display:flex; gap:8px; justify-content:center; margin-top:6px; }
        .cg-modal-nav button{ background:transparent; border:1px solid rgba(255,255,255,0.06); color:inherit; padding:8px 10px; border-radius:8px; cursor:pointer; }
        .cg-postit{
          position:absolute;
          right:-88px;
          top:100px;
          width:160px;
          min-height:80px;
          background:#ffe87f;
          color:#2b2b2b;
          padding:10px;
          border-radius:8px;
          transform:rotate(6deg);
          box-shadow:0 10px 30px rgba(0,0,0,0.25);
          font-size:13px;
          line-height:1.3;
          z-index:5;
        }
        /* ensure post-it doesn't overflow on small screens */
        @media (max-width:720px){
          .cg-modal-wrap{ flex-direction:column; width:96%; padding:12px; }
          .cg-postit{ position:static; transform:none; margin:10px auto 0; right:auto; top:auto; width:90%; }
        }
      `;
      document.head.appendChild(s);
    }
  }
  open(node, idx, total, labels=[]){
    this.dom.style.display = 'flex';
    // left shows main detailed article (HTML allowed)
    const articleHtml = node.article || node.content || `<p>Details for ${node.text}</p>`;
    this.left.innerHTML = `<h2>${node.text}</h2><div class="detail">${articleHtml}</div>`;
    // right column displays meta / short info
    const short = node.note || (typeof node.content === 'string' ? node.content.slice(0,140) : '');
    this.right.innerHTML = `<div style="padding:6px 2px"><strong>Quick info</strong><div style="margin-top:8px;font-size:13px;opacity:.95">${short}</div></div>`;
    // re-append nav into right (nav was created in constructor)
    const nav = this.right.querySelector('.cg-modal-nav');
    if (nav) this.right.appendChild(nav);
    // post-it content (small highlight)
    this.postIt.innerHTML = node.postit || `<strong>Note</strong><div style="margin-top:6px;font-size:13px">${node.postitText || 'Quick takeaway'}</div>`;

    const prevLabel = labels.length ? labels[(idx-1+total)%total]:'Previous';
    const nextLabel = labels.length ? labels[(idx+1)%total]:'Next';
    this.prev.textContent = `← ${prevLabel}`; this.next.textContent = `${nextLabel} →`;
    this.prev.disabled = this.next.disabled = false;
  }
  close(){ this.dom.style.display='none'; this.onClose && this.onClose(); }
}

export default function initCircularGraph(root, labels = ['Empathy','Define','Ideate','Prototype','Test','Debrief'], connections){
  // normalize labels -> nodes
  // allow labels to be strings OR full objects with many fields (text, content, article, postit, note, etc.)
  const nodesData = labels.map((it,i) => {
    if (typeof it === 'string') return { text: it, content: '' };
    // merge provided object onto defaults so extra fields are preserved
    return Object.assign({
      text: it.text || `Node ${i+1}`,
      content: it.content || '',
      article: it.article || '',
      postit: it.postit || '',
      postitText: it.postitText || '',
      note: it.note || ''
    }, it);
  });

  const container = mk('div','circular-graph'); root.appendChild(container);
  // ensure container allows children drawing outside its box and has a positioning context
  container.style.position = container.style.position || 'relative';
  container.style.overflow = 'visible';

  // create svg but append it AFTER the boxes so the arrows render on top
  const svg = mkNS('svg');
  svg.classList.add('circular-graph-svg');
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  svg.setAttribute('overflow', 'visible'); // allow arrowheads past viewBox
  svg.style.overflow = 'visible';
  svg.style.pointerEvents = 'none';     // keep boxes clickable
  svg.style.position = 'absolute';
  svg.style.inset = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';

  // defs will be created inside layout so markers/filters are fresh each draw

  const boxes = nodesData.map((n,i)=> new BoxNode(n.text,i, n.color));
  boxes.forEach(b=> container.appendChild(b.el));

  // copy full node data onto each BoxNode instance (so modal reads node.article/postit/note)
  boxes.forEach((b,i)=> Object.assign(b, nodesData[i]));

  // <-- add this line so SVG (paths/markers) are visible on top of boxes
  container.appendChild(svg);

  const modal = new BoxModal();
  let current = 0;
  modal.onPrev = ()=> focus((current-1+boxes.length)%boxes.length);
  modal.onNext = ()=> focus((current+1)%boxes.length);

  // compact helpers
  const sampleCubic = (sx,sy,c1x,c1y,c2x,c2y,tx,ty,n=14) => {
    const pts = [];
    for(let i=0;i<=n;i++){
      const t = i/n, u=1-t;
      pts.push({
        x: u*u*u*sx + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*tx,
        y: u*u*u*sy + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*ty
      });
    }
    return pts;
  };
  const rectsFromBoxes = (containerRect) => boxes.map(bb=>{
    const r = bb.el.getBoundingClientRect();
    return {
      left: r.left - containerRect.left,
      top: r.top - containerRect.top,
      right: r.right - containerRect.left,
      bottom: r.bottom - containerRect.top,
      cx: (r.left + r.right) / 2 - containerRect.left,
      cy: (r.top + r.bottom) / 2 - containerRect.top
    };
  });
  const intersectsRect = (x,y,rect) => x>=rect.left && x<=rect.right && y>=rect.top && y<=rect.bottom;

  // main layout + routing (kept concise)
  function layout(){
    const rect = container.getBoundingClientRect();
    const cx = rect.width/2, cy = rect.height/2, radius = Math.min(rect.width,rect.height)*0.36;
    const step = (Math.PI*2)/boxes.length;
    boxes.forEach((b,i)=> b.setPos(cx + Math.cos(-Math.PI/2 + i*step)*radius, cy + Math.sin(-Math.PI/2 + i*step)*radius));

    svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    // recreate defs and attach filter so markers render correctly
    const defs = mkNS('defs');
    defs.innerHTML = `<filter id="cg-drop"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.45)"/></filter>`;
    svg.innerHTML = ''; svg.appendChild(defs); // keep defs at top

    // marker factory — smaller arrowhead
    const makeMarker = (idx, color) => {
      const id = `arrow-${idx}`;
      const m = mkNS('marker');
      // smaller marker — still scales with strokeWidth
      m.setAttribute('id', id);
      m.setAttribute('markerUnits', 'strokeWidth');
      m.setAttribute('markerWidth', '8');   // smaller box
      m.setAttribute('markerHeight', '8');
      m.setAttribute('refX', '6');          // move tip near path end
      m.setAttribute('refY', '4');
      m.setAttribute('orient', 'auto');
      const p = mkNS('path');
      // smaller triangle shaped arrow
      p.setAttribute('d', 'M0,0 L0,8 L8,4 z');
      p.setAttribute('fill', color);
      m.appendChild(p);
      defs.appendChild(m);
      return id;
    };

    const connList = layout._connections || boxes.map((_,i)=>({from:i,to:(i+1)%boxes.length,curve:0.14,color:getComputedStyle(document.documentElement).getPropertyValue('--muted')||'#c7cabd'}));
    const containerRect = container.getBoundingClientRect();
    const boxRects = rectsFromBoxes(containerRect);

    // safe obstacles default so layout can run when none are provided
    const obstacles = layout._obstacles || [];

    connList.forEach((c, idx)=>{
      const A = boxes[c.from], B = boxes[c.to]; if(!A||!B) return;
      // start/end centers
      let sx = A.cx, sy = A.cy, tx = B.cx, ty = B.cy;
      let dx = tx-sx, dy = ty-sy, d = Math.hypot(dx,dy); if (d<1) return;
      const ux = dx/d, uy = dy/d;
      // box padding projection to move endpoints to edges
      const aRect = boxRects[c.from], bRect = boxRects[c.to];
      const aHalf = (Math.abs((aRect.right-aRect.left)/2 * ux) + Math.abs((aRect.bottom-aRect.top)/2 * uy));
      const bHalf = (Math.abs((bRect.right-bRect.left)/2 * ux) + Math.abs((bRect.bottom-bRect.top)/2 * uy));
      const gap = ('gap' in c) ? c.gap : 6;
      sx += ux*(aHalf+gap); sy += uy*(aHalf+gap);
      tx -= ux*(bHalf+gap); ty -= uy*(bHalf+gap);
      dx = tx - sx; dy = ty - sy; d = Math.hypot(dx,dy); if (d < 3) return;

      // perpendicular
      let px = -dy / d, py = dx / d;
      // optional tip offset (perpendicular) to nudge arrowhead direction/position
      // set c.tipOffset (px units in px) on a connection to nudge its arrow endpoint
      if (c.tipOffset) {
        tx += px * c.tipOffset;
        ty += py * c.tipOffset;
        dx = tx - sx; dy = ty - sy; d = Math.hypot(dx,dy); if (d < 3) return;
        px = -dy / d; py = dx / d;
      }

      // try increasing offset until bezier doesn't sample inside obstacles
      const base = ('curve' in c) ? c.curve : 0.14;
      let chosen = null;
      for (let k=1;k<=7;k++){
        const off = d * Math.abs(base) * (0.6 + 0.45*k) * (base<0?-1:1);
        const c1x = sx + dx*0.28 + px*off, c1y = sy + dy*0.28 + py*off;
        const c2x = tx - dx*0.28 + px*off, c2y = ty - dy*0.28 + py*off;
        const pts = sampleCubic(sx,sy,c1x,c1y,c2x,c2y,tx,ty,12);
        const hit = pts.some(p => obstacles.some(r => intersectsRect(p.x,p.y,r)));
        if (!hit){ chosen = {c1x,c1y,c2x,c2y}; break; }
      }
      if (!chosen){
        // fallback moderate bulge
        const off = d * Math.abs(base) * 2.2 * (base<0?-1:1);
        chosen = { c1x: sx + dx*0.28 + px*off, c1y: sy + dy*0.28 + py*off, c2x: tx - dx*0.28 + px*off, c2y: ty - dy*0.28 + py*off };
      }

      // make marker + path
      const markerId = makeMarker(idx, c.color || getComputedStyle(document.documentElement).getPropertyValue('--muted')||'#c7cabd');
      const path = mkNS('path');
      path.setAttribute('d', `M ${sx} ${sy} C ${chosen.c1x} ${chosen.c1y} ${chosen.c2x} ${chosen.c2y} ${tx} ${ty}`);
      path.setAttribute('stroke', c.color || getComputedStyle(document.documentElement).getPropertyValue('--muted')||'#c7cabd');
      path.setAttribute('stroke-width', c.width || 1.4);
      path.setAttribute('fill','none'); path.setAttribute('marker-end', `url(#${markerId})`);
      path.setAttribute('stroke-linecap','round'); path.setAttribute('stroke-linejoin','round');
      path.setAttribute('vector-effect','non-scaling-stroke');
      path.style.filter = 'url(#cg-drop)'; path.classList.add('cg-path');
      svg.appendChild(path);

      if (c.label){
        const midx = sx + dx*0.5 + px*(d* Math.abs(base) * 0.6);
        const midy = sy + dy*0.5 + py*(d* Math.abs(base) * 0.6);
        const t = mkNS('text'); t.setAttribute('x',midx); t.setAttribute('y',midy); t.setAttribute('text-anchor','middle'); t.setAttribute('alignment-baseline','middle');
        t.setAttribute('fill', c.color || getComputedStyle(document.documentElement).getPropertyValue('--muted')||'#c7cabd'); t.setAttribute('font-size', c.labelSize||12); t.textContent = c.label;
        svg.appendChild(t);
      }
    });
  }

  // API helpers
  layout._connections = connections || null;
  function setConnections(conns){ layout._connections = conns; layout(); }
  // update node data at runtime — pass an object with fields to merge (e.g. { article: '<p>...</p>' })
  function setNodeContent(i, data){
    if (!boxes[i]) return;
    if (typeof data === 'string') boxes[i].content = data;
    else Object.assign(boxes[i], data);
    if (current === i && modal.dom.style.display === 'flex') modal.open(boxes[i], i, boxes.length, labels);
  }
  // update a node's color at runtime
  function setNodeColor(index, color){
    if (!boxes[index]) return;
    boxes[index].setColor(color);
  }

  function focus(i){
    current = i; const node = boxes[i];
    const cx = container.clientWidth/2, cy = container.clientHeight/2;
    const dx = cx - node.cx, dy = cy - node.cy;
    container.style.transition='transform .36s ease'; container.style.transformOrigin='center center';
    container.style.transform = `translate(${dx}px, ${dy}px) scale(${window.innerWidth<420?1.06:1.18})`;
    boxes.forEach(b=> b.el.classList.toggle('focused', b===node));
    modal.open(node, i, boxes.length, labels);
  }

  boxes.forEach((b,i)=>{ b.el.addEventListener('click',()=> focus(i)); b.el.addEventListener('keydown', e=>{ if (e.key==='Enter') focus(i); }); });

  modal.onClose = ()=> { container.style.transition='transform .28s ease'; container.style.transform=''; boxes.forEach(b=>b.el.classList.remove('focused')); };

  window.addEventListener('resize', () => requestAnimationFrame(layout));
  layout();

  // auto-init when used directly
  return { container, boxes, focusIndex: focus, modal, setConnections, setNodeContent, setNodeColor, layout };
}

// auto-run when page present
const root = document.getElementById('circular-graph-root');
// color of arrow should be blue if going clockwise, red if counterclockwise
if (root){
  // ensure .box text wraps and doesn't overflow
  if (!document.getElementById('cg-box-styles')) {
    const bs = mk('style'); bs.id = 'cg-box-styles';
    bs.textContent = `
      .box { white-space:normal; word-break:break-word; overflow:hidden; text-overflow:ellipsis; box-sizing:border-box; padding:10px 12px; max-width:160px; }
      .box .label { display:block; }
    `;
    document.head.appendChild(bs);
  }

  const conns = [
    { from: 0, to: 1, curve: -0.3, color: '#a5d1ab', gap: 1, tipOffset: -20 },
    { from: 1, to: 0, curve: -0.3, color: '#39543d', tipOffset: -12 },
    { from: 1, to: 2, curve: -0.3, color: '#a5d1ab', tipOffset: -12 },
    { from: 2, to: 1, curve: -0.3, color: '#39543d', tipOffset: -12 },
    { from: 2, to: 3, curve: -0.3, color: '#a5d1ab', tipOffset: -12 },
    { from: 3, to: 2, curve: -0.3, color: '#39543d', tipOffset: -12 },
    { from: 3, to: 4, curve: -0.3, color: '#a5d1ab', tipOffset: -12 },
    { from: 4, to: 3, curve: -0.3, color: '#39543d', tipOffset: -12 },
    { from: 4, to: 5, curve: -0.3, color: '#a5d1ab', tipOffset: -12 },
    { from: 5, to: 0, curve: -0.2, color: '#a5d1ab', tipOffset: -20},
    { from: 5, to: 1, curve: 0.4, color: '#39543d', tipOffset: -12 },
    { from: 4, to: 2, curve: -0.3, color: '#39543d', tipOffset: -12 }
  ];
  const nodes = [
    {
      text: 'Empathy',
      color: '#111c80',
      article: `<p><strong>Listen!</strong> and take notes. Don't ask the target user "what do you need?", instead ask about their day-to-day and identify problems. They are here to share their experience — you will eventually find the solution.</p>
                `,
      postitText: `This is the most important step in design thinking. Here, we ensure we are creating a solution for a problem that actually exists, not a perceived one. We must understand why this problem exists, by listening!`,
      note: `Remember, you need to be able to put yourself in their shoes, and to do that, you have to understand their position.`
    },
    {
      text: 'Define',
      color: '#2a8011',
      article: `<ol><li>Grab your notes from Empathy</li><li>Discuss and list all the problems you identified with your team.</li><li>Pick <strong>ONE</strong> and only one problem to solve.</li></ol>
                <p><strong>Ask:</strong> What problems did we identify? Solving which problem would have the most impact? Which one is the most pressing?</p>
                `,
      postitText: 'Remember: At this stage, we are NOT trying to find a solution, yet...',
      note: 'Focus on the single highest-impact problem.'
    },
    {
      text: 'Ideate',
      color: '#c2bc19',
      article: `<h3>Blue. Sky. Thinking.</h3>
                <ol><li>Get Post-its</li><li>Set a 5 minute timer</li><li>Put every possible idea to solve the ONE problem you picked in the define stage.</li></ol>
                <p>Remember, the solutions you come up with during the timed portion can be magical, fantastical, and not grounded in reality.</p>
                `,
      postitText: 'Group similar ideas, discuss trends, pick 1–5 promising ideas.',
      note: 'Once the timer is up, go through the post-its, group similar ideas together, and discuss trends/common ideas with your team. Depending on the size of your team (and how many prototypes you can make), pick the most promising 1–5 ideas.'
    },
    {
      text: 'Prototype',
      color: '#a60319',
      article: `<p><strong>Craft! Build!</strong><br>
                Internally, use whatever materials you have to physically build a representation of your solution, to <strong>share</strong> your ideas with your teammates (cardboard, glue, popsicle sticks, clay, trash!).<br>
                Externally, use rapid prototyping skills to develop a minimum viable product (MVP).</p>
                `,
      postitText: 'The first prototype is about rapid work — a tangible thing to iterate from.',
      note: '<p><strong>Consider:</strong> Size, feel, look. Be quick, not perfect. You want something to look at — <br>even for software, a physical <br>representation of data flow can help the team.</p>'
    },
    {
      text: 'Test',
      color: '#f76075',
      article: `<p>Does it work? (Probably not)</p>
                <ul><li>Ask others and your target user to interact with your prototype.</li><li>First, observe how your user interacts — refrain from preambles and explanations.</li><li>Then interview the user about their experience.</li></ul>
                <p><strong>Consider:</strong> How intuitive is this for the user? Will my intended user actually use this?</p>`,
      postitText: 'The test is not about us, it is about the user. Since we built this... of course we know how it works. This step is super important because it allows us to observe our user interacting with our product, which will help us make informed changes to improve the UX',
      note: 'How could this be more intuitive for the user?<br>Will my intended user, well, actually use this?'
    },
    {
      text: 'Debrief',
      color: '#7e32ad',
      article: `<p>Time to brain dump. This step is about metacognition: think about how you thought through the process.</p>
                <ol><li>Set a 2–3 minute timer</li><li>Write everything about your experience going through the design cycle</li><li>What went well? What needs to improve?</li></ol>
                <p>Determine next steps, delegate tasks, and give credit.</p>`,
      postitText: 'Analyze what went wrong and why; set a plan for the next run.',
      note: 'Retrospective & next steps'
    }
  ];
  initCircularGraph(root, nodes, conns);
}