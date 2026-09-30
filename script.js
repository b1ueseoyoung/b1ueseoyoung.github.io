const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

$('#year').textContent = new Date().getFullYear();

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ---------- theme ---------- */
const root = document.documentElement;
function store(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}
function load(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
const saved = load('theme');
if (saved) root.dataset.theme = saved;
function toggleTheme() {
  const isDark = root.dataset.theme
    ? root.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = isDark ? 'light' : 'dark';
  store('theme', root.dataset.theme);
  return root.dataset.theme;
}
$('#themeBtn').addEventListener('click', toggleTheme);

/* ---------- pipeline toy ----------
   GeulBeot의 Lore Keeper 흐름을 흉내 낸 장난감이에요.
   (classify → extract → RAG search → judge) */
const LORE_DB = [
  { subject: '카엘', attr: '손잡이', value: '오른손잡이', keys: ['왼손', '양손'] },
  { subject: '카엘', attr: '직업', value: '검사', keys: ['마법사', '궁수', '상인'] },
  { subject: '리나', attr: '고향', value: '북쪽 설원', keys: ['남쪽', '사막', '바다'] },
  { subject: '리나', attr: '나이', value: '17살', keys: ['20살', '30살', '어른'] },
];

let running = false;
async function runPipeline() {
  if (running) return;
  running = true;
  const text = $('#chunkInput').value.trim() || '(빈 청크)';
  const out = $('#pipeOut');
  const steps = $$('#pipeline li');
  steps.forEach((s) => s.classList.remove('active', 'done'));
  out.className = 'pc-out';

  const subject = LORE_DB.find((l) => text.includes(l.subject))?.subject;
  const msgs = [
    `type = ${/["“”']/.test(text) ? 'DIALOGUE' : 'NARRATION'}`,
    subject ? `fact(subject="${subject}")` : 'fact = 새로운 설정',
    subject ? `${LORE_DB.filter((l) => l.subject === subject).length}건 검색됨` : '0건 검색됨',
  ];

  for (let i = 0; i < steps.length; i++) {
    steps[i].classList.add('active');
    out.textContent = `… ${steps[i].querySelector('b').textContent}${msgs[i] ? ' → ' + msgs[i] : ''}`;
    await sleep(650);
    steps[i].classList.replace('active', 'done');
  }

  const conflict = LORE_DB.find((l) => text.includes(l.subject) && l.keys.some((k) => text.includes(k)));
  if (conflict) {
    out.classList.add('warn');
    out.textContent = `⚠ CONFLICT: Lore DB에서 ${conflict.subject}의 ${conflict.attr}는 "${conflict.value}"`;
  } else {
    out.classList.add('ok');
    out.textContent = subject
      ? `✓ 충돌 없음 → Current DB에 저장했어요`
      : `✓ 새 설정이에요 → Lore DB 후보로 등록했어요`;
  }
  running = false;
}
$('#runBtn').addEventListener('click', runPipeline);
$('#chunkInput').addEventListener('keydown', (e) => e.key === 'Enter' && runPipeline());

/* ---------- project filter ---------- */
$('#filters').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  $$('#filters .chip').forEach((c) => {
    c.classList.toggle('active', c === btn);
    c.setAttribute('aria-pressed', String(c === btn));
  });
  const f = btn.dataset.f;
  $$('#projectGrid .project').forEach((p) => {
    p.classList.toggle('hide', f !== 'all' && !p.dataset.tags.split(' ').includes(f));
  });
});

/* ---------- reveal + counter ---------- */
const revealTargets = $$('.section, .card');
revealTargets.forEach((el) => el.classList.add('reveal'));
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    if (en.target.id === 'research') countUp($('#paperCount'), 4);
    io.unobserve(en.target);
  });
}, { threshold: 0.12 });
revealTargets.forEach((el) => io.observe(el));

function countUp(el, to) {
  let n = 0;
  const tick = () => { el.textContent = ++n; if (n < to) setTimeout(tick, 180); };
  tick();
}

/* ---------- copy email ---------- */
const EMAIL = 'moosim1120@gmail.com';
async function copyEmail() {
  try { await navigator.clipboard.writeText(EMAIL); toast('이메일을 복사했어요 📋'); }
  catch { toast(EMAIL); }
}
$('#copyBtn').addEventListener('click', copyEmail);

/* ---------- terminal ---------- */
const term = $('#term');
const body = $('#termBody');
const input = $('#termInput');
const history = [];
let hIdx = 0;

const COMMANDS = {
  help: () => [
    '사용 가능한 명령어:',
    '  whoami      자기소개',
    '  projects    프로젝트 목록',
    '  research    연구 · 수상',
    '  stack       기술 스택',
    '  contact     연락처',
    '  run         파이프라인 데모 실행',
    '  theme       라이트/다크 전환',
    '  goto <섹션>  focus | projects | research | stack | contact',
    '  clear       화면 지우기',
    '  exit        닫기',
  ].join('\n'),
  whoami: () => 'seoyoung (@b1ueseoyoung)\nAI Engineer & System Architect\n"이걸 쓰는 사람은 어떤 경험을 하게 될까?"',
  projects: () => [
    '🧚 꿈도깨비     FairyRAG 기반 대화형 동화 생성 서비스',
    '✍️  글벗         Agentic RAG로 설정 충돌 감지 · 복선 추천',
    '🛒 SELLON      이커머스 셀러용 B2B AI SaaS',
    '🩺 소아당뇨     CGM 기반 혈당 예측 & 음식 추천',
  ].join('\n'),
  research: () => '🏆 KCC 2025 학부생 장려상 (FairyRAG)\n🎤 HCI Korea 2026 구두 발표 (CO-DITOR)\n📄 FairyRAG · CO-DITOR · Co-Narrator · PA-RAG\n🎓 한성대 IRIS Lab 학부연구생',
  stack: () => 'python  java  fastapi  spring-boot\npytorch  tensorflow  scikit-learn\nlangchain  langgraph  rag  mcp  faiss  chromadb\naws-ec2  aws-s3',
  contact: () => `email   <a href="mailto:${EMAIL}">${EMAIL}</a>\ngithub  <a href="https://github.com/b1ueseoyoung" target="_blank" rel="noopener">github.com/b1ueseoyoung</a>`,
  run: () => { closeTerm(); $('.pipeline-card').scrollIntoView({ block: 'center' }); runPipeline(); return ''; },
  theme: () => `theme → ${toggleTheme()}`,
  goto: (arg) => {
    const el = arg && document.getElementById(arg);
    if (!el) return '<span class="dim">usage: goto focus|projects|research|stack|contact</span>';
    closeTerm(); el.scrollIntoView(); return '';
  },
  clear: () => { body.innerHTML = ''; return null; },
  exit: () => { closeTerm(); return ''; },
  sudo: () => '권한이 없어요 🙅 대신 커피챗은 언제든 환영이에요 ☕',
  ls: () => 'focus/  projects/  research/  stack/  contact/',
};

function print(html) {
  if (html === null) return;
  const div = document.createElement('div');
  div.innerHTML = html;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let greeted = false;
let lastFocus = null;
// 터미널이 열려 있는 동안 뒤쪽 화면은 포커스와 클릭이 닿지 않게 막아요
const setBackgroundInert = (on) => ['header.nav', 'main', '.footer', '#buddy'].forEach((s) => {
  const el = $(s);
  if (el) el.inert = on;
});
function openTerm() {
  if (!term.hidden) return;
  lastFocus = document.activeElement;
  term.hidden = false;
  setBackgroundInert(true);
  if (!greeted) {
    print('<span class="dim">welcome! `help`를 입력해 보세요.</span>');
    greeted = true;
  }
  input.focus();
}
function closeTerm() {
  if (term.hidden) return;
  term.hidden = true;
  setBackgroundInert(false);
  // 열기 전에 있던 곳으로 포커스를 돌려줘요 (스크롤 위치는 그대로)
  if (lastFocus && lastFocus !== document.body && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
}

$('#termBtn').addEventListener('click', openTerm);
$('#termClose').addEventListener('click', closeTerm);
term.addEventListener('click', (e) => e.target === term && closeTerm());

$('#termForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const raw = input.value.trim();
  input.value = '';
  if (!raw) return;
  history.push(raw);
  hIdx = history.length;
  print(`<span class="cmd">$ ${esc(raw)}</span>`);
  const [cmd, ...args] = raw.split(/\s+/);
  const name = cmd.toLowerCase();
  // constructor, __proto__ 같은 상속 속성은 명령어로 취급하지 않아요
  const fn = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : null;
  const out = fn ? fn(args.join(' ')) : `command not found: ${esc(cmd)} — <span class="dim">help</span>를 입력해 보세요`;
  if (out) print(out);
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && hIdx > 0) { input.value = history[--hIdx]; e.preventDefault(); }
  if (e.key === 'ArrowDown') { hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] ?? ''; }
});

document.addEventListener('keydown', (e) => {
  const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
  if (e.key === '/' && !typing && term.hidden) { e.preventDefault(); openTerm(); }
  if (e.key === 'Escape' && !term.hidden) closeTerm();
});

/* ---------- buddy: 돌아다니는 쫄라맨 ----------
   짧게 누르면 점프, 꾹 누르거나 누른 채로 움직이면 잡아서 끌고 다닐 수 있어요. */
(() => {
  const buddy = $('#buddy');
  const bubble = $('#buddyBubble');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LINES = [
    '안녕하세요! 👋',
    '/ 키를 눌러보세요!',
    '글벗 데모 해보셨어요?',
    '커피챗 환영 ☕',
    '저 논문 4편 썼어요 📄',
    '간지러워요 😆',
    'LangGraph 좋아해요',
  ];
  const GRAB_LINES = ['으악! 내려줘요 😵', '어디 가는 거예요?!', '높다아아 🙀', '살살 해주세요 🥺'];
  const GRAVITY = 2400;
  const HOLD_MS = 180;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const maxX = () => window.innerWidth - buddy.offsetWidth;
  const maxY = () => window.innerHeight - buddy.offsetHeight;

  let x = maxX() * 0.8;
  let y = 0; // 바닥에서 떨어진 높이
  let vx = 0, vy = 0;
  let dir = -1;
  let state = 'idle';
  let until = 0;
  let last = performance.now();
  let bubbleTimer;
  let press = null;

  function say(text) {
    bubble.textContent = text;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 2200);
  }

  function setState(next, now = performance.now()) {
    state = next;
    buddy.classList.toggle('walking', next === 'walk');
    buddy.classList.toggle('running', next === 'run');
    buddy.classList.toggle('waving', next === 'wave');
    buddy.classList.toggle('dragging', next === 'drag' || next === 'fall');
    if (next === 'walk') {
      until = now + rand(2500, 6000);
      if (Math.random() < 0.35) dir *= -1;
    } else if (next === 'run') {
      until = now + rand(1500, 3200);
      if (Math.random() < 0.5) dir *= -1;
      if (Math.random() < 0.4) say('바빠요 바빠! 💨');
    } else if (next === 'wave') {
      until = now + 1600;
      say(LINES[0]);
    } else if (next === 'drag' || next === 'fall') {
      until = Infinity;
    } else {
      until = now + rand(1000, 2800);
      if (Math.random() < 0.25) say(LINES[1 + Math.floor(Math.random() * 4)]);
    }
  }

  function place() {
    buddy.style.transform = `translate(${x}px, ${-y}px)`;
    buddy.style.setProperty('--dir', dir);
    buddy.classList.toggle('edge-l', x < 80);
    buddy.classList.toggle('edge-r', x > maxX() - 80);
  }

  function land() {
    y = 0;
    say(Math.abs(vy) > 900 ? '아야! 🤕' : '휴~ 살았다 😮‍💨');
    if (Math.abs(vx) > 30) dir = Math.sign(vx);
    vx = vy = 0;
    setState('idle');
  }

  function tick(now) {
    const dt = Math.min(now - last, 50) / 1000;
    last = now;
    if (state === 'walk' || state === 'run') {
      x += dir * (state === 'run' ? 240 : 70) * dt;
      if (x <= 0) { x = 0; dir = 1; }
      if (x >= maxX()) { x = maxX(); dir = -1; }
    } else if (state === 'fall') {
      if (reduced) { land(); } else {
        vy -= GRAVITY * dt;
        x += vx * dt;
        y += vy * dt;
        if (x <= 0 || x >= maxX()) { x = clamp(x, 0, maxX()); vx *= -0.5; } // 벽에 튕기기
        if (y <= 0) land();
      }
    }
    if (!reduced && now > until) {
      const r = Math.random();
      const moving = state === 'walk' || state === 'run';
      setState(moving ? (r < 0.2 ? 'wave' : 'idle') : (r < 0.35 ? 'run' : 'walk'), now);
    }
    place();
    requestAnimationFrame(tick);
  }

  function jump() {
    buddy.classList.remove('jumping');
    void buddy.offsetWidth; // 애니메이션 재시작
    buddy.classList.add('jumping');
    say(pick(LINES));
    if (!reduced) setTimeout(() => { if (state !== 'drag' && state !== 'fall') setState('run'); }, 550);
  }

  /* ----- 잡아서 끌기 ----- */
  function moveTo(cx, cy) {
    const now = performance.now();
    const nx = clamp(cx - press.offX, 0, maxX());
    const ny = clamp(window.innerHeight - (cy - press.offY) - buddy.offsetHeight, 0, maxY());
    const dt = Math.max(now - press.t, 8) / 1000;
    press.vx = (nx - x) / dt;
    press.vy = (ny - y) / dt;
    press.t = now;
    x = nx; y = ny;
    place();
  }

  function grab(cx, cy) {
    if (!press || press.dragged) return;
    press.dragged = true;
    buddy.classList.remove('jumping');
    setState('drag');
    say(pick(GRAB_LINES));
    moveTo(cx, cy);
  }

  buddy.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    try { buddy.setPointerCapture(e.pointerId); } catch {}
    const r = buddy.getBoundingClientRect();
    press = {
      sx: e.clientX, sy: e.clientY,
      offX: e.clientX - r.left, offY: e.clientY - r.top,
      t: performance.now(), vx: 0, vy: 0, dragged: false,
    };
    press.timer = setTimeout(() => grab(press.sx, press.sy), HOLD_MS);
  });

  buddy.addEventListener('pointermove', (e) => {
    if (!press) return;
    if (!press.dragged && Math.hypot(e.clientX - press.sx, e.clientY - press.sy) > 6) grab(e.clientX, e.clientY);
    if (press.dragged) moveTo(e.clientX, e.clientY);
  });

  function release() {
    if (!press) return;
    clearTimeout(press.timer);
    if (press.dragged) {
      // 멈춘 채로 놓으면 던진 속도는 0
      const stale = performance.now() - press.t > 80;
      vx = stale ? 0 : clamp(press.vx, -1800, 1800);
      vy = stale ? 0 : clamp(press.vy, -1800, 1800);
      setState('fall');
    } else {
      jump();
    }
    press = null;
  }
  buddy.addEventListener('pointerup', release);
  buddy.addEventListener('pointercancel', release);
  buddy.addEventListener('contextmenu', (e) => e.preventDefault());

  buddy.addEventListener('animationend', (e) => {
    if (e.animationName === 'jump') buddy.classList.remove('jumping');
  });
  window.addEventListener('resize', () => { x = clamp(x, 0, maxX()); y = clamp(y, 0, maxY()); place(); });

  place();
  if (!reduced) setState('wave');
  requestAnimationFrame(tick);
})();
