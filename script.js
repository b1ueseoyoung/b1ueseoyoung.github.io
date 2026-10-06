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
// 예시 문장: 입력 칸에 넣고 바로 실행해요 (실행 중에는 무시)
$$('.example').forEach((b) => b.addEventListener('click', () => {
  if (running) return;
  $('#chunkInput').value = b.dataset.text;
  runPipeline();
}));

/* ---------- project filter ---------- */
function setFilter(f) {
  let label = '';
  $$('#filters .chip').forEach((c) => {
    const on = c.dataset.f === f;
    c.classList.toggle('active', on);
    c.setAttribute('aria-pressed', String(on));
    if (on) label = c.textContent;
  });
  $$('#projects [data-tags]').forEach((el) => {
    el.hidden = f !== 'all' && !el.dataset.tags.split(' ').includes(f);
  });
  const n = $$('#projectGrid .case:not([hidden])').length;
  $('#filterCount').textContent = f === 'all' ? `프로젝트 ${n}개` : `${label} 프로젝트 ${n}개`;
}
$('#filters').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (btn) setFilter(btn.dataset.f);
});
// 걸러져서 숨은 사례로 가는 링크를 누르면 먼저 '전체'로 되돌려요
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  const target = a && document.getElementById(a.getAttribute('href').slice(1));
  if (target && target.hidden) setFilter('all');
});

/* ---------- reveal ---------- */
const revealTargets = $$('[data-reveal]');
revealTargets.forEach((el) => el.classList.add('reveal'));
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    io.unobserve(en.target);
  });
}, { rootMargin: '0px 0px -8% 0px' });
revealTargets.forEach((el) => io.observe(el));

/* ---------- 목록에서 지금 보고 있는 사례 표시 ---------- */
const cases = $$('#projectGrid .case');
const indexLinks = $$('#projectIndex a');
const inBand = new Set();
const spy = new IntersectionObserver((entries) => {
  entries.forEach((en) => inBand[en.isIntersecting ? 'add' : 'delete'](en.target.id));
  const current = cases.filter((c) => inBand.has(c.id)).pop();
  if (!current) return;
  indexLinks.forEach((a) => {
    if (a.hash === `#${current.id}`) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
}, { rootMargin: '-15% 0px -35% 0px' });
cases.forEach((c) => spy.observe(c));

/* ---------- copy email ---------- */
const EMAIL = 'moosim1120@gmail.com';
async function copyEmail() {
  try { await navigator.clipboard.writeText(EMAIL); toast('이메일을 복사했어요'); }
  catch { toast(EMAIL); }
}
$('#copyBtn').addEventListener('click', copyEmail);

/* ---------- terminal ---------- */
const term = $('#term');
const body = $('#termBody');
const input = $('#termInput');
const cmdHistory = [];
let hIdx = 0;
const SECTIONS = ['projects', 'focus', 'research', 'stack', 'side', 'contact'];

const COMMANDS = {
  help: () => [
    '사용 가능한 명령어:',
    '  whoami      자기소개',
    '  projects    프로젝트 목록',
    '  research    연구와 수상',
    '  stack       기술 스택',
    '  contact     연락처',
    '  run         글벗 파이프라인 데모 실행',
    '  theme       라이트/다크 전환',
    `  goto <섹션>  ${SECTIONS.join(' | ')}`,
    '  clear       화면 지우기',
    '  exit        닫기',
  ].join('\n'),
  whoami: () => 'seoyoung (@b1ueseoyoung)\nAI Engineer & System Architect\n“이걸 쓰는 사람은 어떤 경험을 하게 될까?”',
  projects: () => [
    '꿈도깨비    대화형 동화 생성 웹 서비스, FairyRAG 논문의 바탕 (팀장, 백엔드)',
    '글벗        Agentic AI와 RAG로 웹소설 설정 충돌 감지',
    'SELLON     멀티채널 VoC 기반 상품 이슈 탐지·진단 AI 플랫폼 (조장, AI 파트 전담)',
    '소아당뇨    CGM 데이터 기반 혈당 예측과 음식 추천',
    '<span class="dim">자세한 내용은 goto projects, 데모는 run</span>',
  ].join('\n'),
  research: () => [
    'KSC 2025 학부생 장려상 (FairyRAG)',
    'HCI Korea 2026 구두 발표 (CO-DITOR)',
    '논문 4편: FairyRAG, CO-DITOR, Co-Narrator, PA-RAG',
    '한성대 컴퓨터공학부 IRIS Lab 산학공동연구, 학부연구생 (진행 중)',
    'KT AIVLE School 9기 (AI 트랙, 반장)',
  ].join('\n'),
  stack: () => 'python  java  fastapi  spring-boot\npytorch  tensorflow  scikit-learn  stable-diffusion\nlangchain  langgraph  rag  multi-agent  mcp  openai-api  faiss  chromadb  langsmith\naws-ec2  aws-s3',
  contact: () => `email   <a href="mailto:${EMAIL}">${EMAIL}</a>\ngithub  <a href="https://github.com/b1ueseoyoung" target="_blank" rel="noopener">github.com/b1ueseoyoung</a>`,
  run: () => {
    setFilter('all'); // 글벗 사례가 걸러져 숨어 있으면 다시 보이게 해요
    closeTerm();
    $('.pipeline-card').scrollIntoView({ block: 'center' });
    runPipeline();
    return '';
  },
  theme: () => `theme → ${toggleTheme()}`,
  goto: (arg) => {
    const el = SECTIONS.includes(arg) && document.getElementById(arg);
    if (!el) return `<span class="dim">usage: goto ${SECTIONS.join('|')}</span>`;
    closeTerm(); el.scrollIntoView(); return '';
  },
  clear: () => { body.innerHTML = ''; return null; },
  exit: () => { closeTerm(); return ''; },
  sudo: () => '권한이 없어요. 대신 contact로 연락처를 볼 수 있어요.',
  ls: () => SECTIONS.map((s) => `${s}/`).join('  '),
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
const setBackgroundInert = (on) => ['.skip-link', '.site-header', 'main', '.site-footer'].forEach((s) => {
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
  input.blur(); // 숨겨진 입력창이 포커스를 쥔 채 남지 않게 해요
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
  cmdHistory.push(raw);
  hIdx = cmdHistory.length;
  print(`<span class="cmd">$ ${esc(raw)}</span>`);
  const [cmd, ...args] = raw.split(/\s+/);
  const name = cmd.toLowerCase();
  // constructor, __proto__ 같은 상속 속성은 명령어로 취급하지 않아요
  const fn = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : null;
  const out = fn ? fn(args.join(' ')) : `command not found: ${esc(cmd)}. <span class="dim">help</span>를 입력해 보세요`;
  if (out) print(out);
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && hIdx > 0) { input.value = cmdHistory[--hIdx]; e.preventDefault(); }
  if (e.key === 'ArrowDown') { hIdx = Math.min(cmdHistory.length, hIdx + 1); input.value = cmdHistory[hIdx] ?? ''; }
});

document.addEventListener('keydown', (e) => {
  const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
  if (e.key === '/' && !typing && term.hidden) { e.preventDefault(); openTerm(); }
  if (e.key === 'Escape' && !term.hidden) closeTerm();
});

/* ---------- buddy: 선 위를 걷는 쫄라맨 ----------
   자리는 히어로의 오른쪽 아래 무대, 바닥은 프로젝트 섹션의 윗선이에요.
   짧게 누르면 점프, 꾹 누르거나 누른 채로 움직이면 잡아서 화면 어디로든 끌고 다닐 수 있고,
   놓으면 바닥으로 떨어진 뒤 무대로 돌아가요. */
(() => {
  const buddy = $('#buddy');
  const stage = $('#buddyStage');
  const bubble = $('#buddyBubble');
  const hero = buddy.offsetParent; // x는 히어로 왼쪽 끝, y는 히어로 아래쪽 변(바닥)에서 잰 값
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none)').matches;
  const LINES = [
    '안녕하세요!',
    touch ? '아래에 프로젝트가 있어요' : '/ 키로 터미널을 열어요',
    '글벗 데모를 돌려 보세요',
    '논문 4편을 썼어요',
    '메일은 맨 아래에 있어요',
    '간지러워요',
    '글벗은 LangGraph 기반이에요',
  ];
  const GRAB_LINES = ['으악! 내려 주세요', '어디 가는 거예요?!', '너무 높아요', '살살 해 주세요'];
  const GRAVITY = 2400;
  const HOLD_MS = 180;
  const KEY_STEP = 24;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let w = 0, h = 0;
  let homeMin = 0, homeMax = 0;
  function measure() {
    w = buddy.offsetWidth;
    h = buddy.offsetHeight;
    homeMin = stage.offsetLeft;
    homeMax = Math.max(homeMin, homeMin + stage.offsetWidth - w);
  }
  function viewBounds() {
    const g = hero.getBoundingClientRect();
    return {
      left: g.left,
      bottom: g.bottom,
      minX: -g.left,
      maxX: root.clientWidth - g.left - w,
      maxY: Math.max(0, g.bottom - h),
    };
  }

  measure();
  let x = homeMin + (homeMax - homeMin) * 0.7;
  let y = 0; // 바닥에서 떨어진 높이
  let vx = 0, vy = 0;
  let dir = -1;
  let state = 'idle';
  let until = 0;
  let last = performance.now();
  let bubbleTimer;
  let bubbleW = 0;
  let press = null;
  const away = () => x < homeMin - 2 || x > homeMax + 2;

  function say(text) {
    bubble.textContent = text;
    bubble.classList.add('show');
    bubbleW = bubble.offsetWidth;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 2200);
    place();
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
      if (Math.random() < 0.4) say('바빠요 바빠!');
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
    if (!bubbleW) return;
    // 말풍선이 화면 밖으로, 평소에는 무대 밖으로도 나가지 않게 옆으로 밀어요
    const b = viewBounds();
    let min = b.minX + 8;
    let max = b.maxX + w - 8;
    if (state !== 'drag' && state !== 'fall' && !away()) {
      min = Math.max(min, homeMin);
      max = Math.min(max, homeMax + w);
    }
    const center = x + w / 2;
    const left = clamp(center - bubbleW / 2, min, Math.max(min, max - bubbleW));
    bubble.style.setProperty('--bx', `${Math.round(left + bubbleW / 2 - center)}px`);
  }

  function land() {
    y = 0;
    const hard = Math.abs(vy) > 900;
    if (Math.abs(vx) > 30) dir = Math.sign(vx);
    vx = vy = 0;
    if (reduced) x = clamp(x, homeMin, homeMax); // 움직임을 줄인 환경에서는 바로 무대로 돌아가요
    if (away()) {
      setState('run');
      dir = x < homeMin ? 1 : -1;
      say(hard ? '아야!' : '제자리로 갈게요');
    } else {
      setState('idle');
      say(hard ? '아야!' : '휴, 살았다');
    }
  }

  function tick(now) {
    const dt = Math.min(now - last, 50) / 1000;
    last = now;
    if (state === 'walk' || state === 'run') {
      // 무대 끝에 닿으면 돌아서고, 무대 밖에 있으면 무대 쪽으로 가요
      if (x < homeMin) dir = 1;
      else if (x > homeMax) dir = -1;
      x += dir * (state === 'run' ? 240 : 70) * dt;
    } else if (state === 'fall') {
      if (reduced) { land(); } else {
        const b = viewBounds();
        vy -= GRAVITY * dt;
        x += vx * dt;
        y += vy * dt;
        if (x <= b.minX || x >= b.maxX) { x = clamp(x, b.minX, b.maxX); vx *= -0.5; } // 벽에 튕기기
        if (y <= 0) land();
      }
    }
    if (!reduced && now > until) {
      const moving = state === 'walk' || state === 'run';
      if (moving && away()) {
        until = now + 400; // 무대에 닿을 때까지는 계속 가요
      } else {
        const r = Math.random();
        setState(moving ? (r < 0.2 ? 'wave' : 'idle') : (r < 0.35 ? 'run' : 'walk'), now);
      }
    }
    place();
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
    const b = viewBounds();
    const nx = clamp(cx - press.offX - b.left, b.minX, b.maxX);
    const ny = clamp(b.bottom - (cy - press.offY) - h, 0, b.maxY);
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

  // 키보드: Enter나 Space로 점프, 좌우 방향키로 무대 안에서 이동
  buddy.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) jump();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (state === 'drag' || state === 'fall') return;
      dir = e.key === 'ArrowLeft' ? -1 : 1;
      x = clamp(x + dir * KEY_STEP, homeMin, homeMax);
      place();
    }
  });

  buddy.addEventListener('animationend', (e) => {
    if (e.animationName === 'jump') buddy.classList.remove('jumping');
  });
  window.addEventListener('resize', () => {
    measure();
    if (state !== 'drag' && state !== 'fall') { x = clamp(x, homeMin, homeMax); y = 0; }
    place();
  });

  // 히어로가 화면에 보일 때만 움직임을 계산해요
  let raf = 0;
  const loop = (now) => { tick(now); raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    else if (!en.isIntersecting) { cancelAnimationFrame(raf); raf = 0; }
  }, { rootMargin: '200px 0px' }).observe(hero);

  place();
  if (!reduced) setState('wave');
})();
