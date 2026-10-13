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
// 히어로 터미널이 보여 주는 명령(ls projects/, cat awards.txt, papers)의 결과. 실제 터미널에서도 같은 결과가 나와요
const PROJECT_DIRS = ['꿈도깨비', '글벗', 'SELLON', '소아당뇨-예측'];
const AWARDS = ['KSC 2025        학부생 장려상 <span class="dim">· FairyRAG</span>', 'HCI Korea 2026  구두 발표 <span class="dim">· CO-DITOR</span>'];
const PAPERS = ['FairyRAG', 'CO-DITOR', 'CO-Narrator', 'PA-RAG'];

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
  ls: (arg) => (/^projects\/?$/.test(arg) ? PROJECT_DIRS : SECTIONS).map((s) => `${s}/`).join('  '),
  cat: (arg) => (arg === 'awards.txt' ? AWARDS.join('\n') : '<span class="dim">usage: cat awards.txt</span>'),
  papers: () => `${PAPERS.length}  ${PAPERS.join('  ')}`,
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
  // 히어로 터미널의 lore_keeper.run("문장")은 그 문장으로 run을 실행해요 (문장 안의 공백 때문에 나누기 전에 봐요)
  const lore = raw.match(/^lore_keeper\.run(?:\(\s*["“']?(.*?)["”']?\s*\))?$/i);
  if (lore) {
    if (lore[1] && !running) $('#chunkInput').value = lore[1];
    COMMANDS.run();
    return;
  }
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

/* ---------- 히어로 모션: 제목 타자, 터미널 부팅, 문장 슬롯 (20초) ----------
   화면은 render(t)가 t만으로 정하고, 시계는 requestAnimationFrame 하나예요.
   움직임 줄이기 설정이면 자동 재생하지 않고 마지막 화면만 보여 줘요. */
(() => {
  const hero = $('.hero');
  const scroller = $('.tm-scroll');
  if (!hero || !scroller) return;
  root.classList.add('js'); // 보통은 index.html이 이미 달아 둬요. 터미널 창(.tm)이 이 클래스가 있어야 보여요
  const DURATION = 20;
  const heroId = $('.hero-id');
  const h1 = $('#heroTitle');
  const phrases = $$('.phrase', h1);
  const subPhrases = $$('.hero-sub > .phrase');
  const cta = $('.hero-cta');
  const caret = $('.tm-caret');
  const card = $('.tm-card');
  const ctl = $('.tm-ctl');
  const reelEl = $('.tk-reel');
  const reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = reduceMq.matches;
  // ?capture: 검증 도구가 seek(t)로 한 장씩 그리도록 자동 재생을 꺼요
  const capture = new URLSearchParams(location.search).has('capture');

  // 이징: --ease-out(cubic-bezier(.16, 1, .3, 1))과 같은 곡선
  function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (u) => ((ax * u + bx) * u + cx) * u;
    const sy = (u) => ((ay * u + by) * u + cy) * u;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let lo = 0, hi = 1, u = x;
      for (let i = 0; i < 24; i++) { if (sx(u) < x) lo = u; else hi = u; u = (lo + hi) / 2; }
      return sy(u);
    };
  }
  const easeOut = cubicBezier(.16, 1, .3, 1);
  const easeInOut = cubicBezier(.65, 0, .35, 1);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const prog = (t, a, d) => clamp01((t - a) / d);
  const lerp = (a, b, f) => a + (b - a) * f;
  const fx = (v) => Math.round(v * 100) / 100;
  // 인덱스로 정하는 의사난수 (같은 t는 늘 같은 화면이 되도록 Math.random은 안 써요)
  const hash = (i) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  // 커서 깜빡임: t0에 켜진 상태로 시작해요
  const blink = (t, t0, period = 1.06) => clamp01(.5 + 1.6 * Math.cos((2 * Math.PI * (t - t0)) / period));

  // 타자 일정: 사람처럼 조금 불규칙하지만 인덱스로 정해져요
  function keys(text, start, base, seed) {
    const at = [];
    let k = start;
    for (let i = 0; i < text.length; i++) {
      at.push(k);
      const c = text[i], next = text[i + 1];
      let d = base * (.55 + .9 * hash(seed + i * 7));
      if (c === ' ' || next === ' ') d += base * .5 * hash(seed + i * 13 + 5);
      if ('._("-/'.includes(c)) d += base * .3;
      k += d;
    }
    return { at, end: k };
  }
  const typed = (at, t) => { let n = 0; while (n < at.length && at[n] <= t) n++; return n; };

  // 제목: 캐럿이 지나가며 글자를 열어요
  const H = [];
  {
    let start = .3;
    phrases.forEach((p, k) => {
      const s = keys(p.textContent, start, .052, 101 + k * 53);
      H.push(s);
      start = s.end + .14;
    });
  }
  const H_END = H[H.length - 1].end;

  // 터미널 대본 (내용은 이 페이지에 있는 사실만)
  const lines = [];
  function cmd(text, at, opt = {}) {
    const k = keys(text, at + (opt.wait ?? .32), opt.base ?? .062, opt.seed ?? at * 31);
    const L = { kind: 'cmd', text, at, keys: k.at, enter: k.end + .16, gap: opt.gap !== false && lines.length > 0 };
    lines.push(L);
    return L.enter;
  }
  const out = (html, at, opt = {}) => { lines.push({ kind: 'out', html, at, desk: !!opt.desk, gap: !!opt.gap }); return at; };
  function step(label, res, at, dur, bad) {
    lines.push({ kind: 'step', label, res, at, dur, bad: !!bad });
    return at + dur;
  }

  let e = cmd('whoami', 1.4, { wait: .55, base: .085, seed: 7 });
  out('seoyoung <span class="dim">—</span> AI Engineer &amp; System Architect', e + .14);
  out('<span class="dim">IRIS Lab 학부연구생 · KT AIVLE School 9기 반장</span>', e + .3, { desk: true });

  e = cmd('ls projects/', e + .5, { wait: .28, base: .058, seed: 41 });
  const dirs = PROJECT_DIRS;
  const LS = { kind: 'items', at: e + .14, times: dirs.map((_, i) => e + .14 + i * .085) };
  LS.html = dirs.map((d) => `<span class="it">${d}<span class="acc">/</span></span>`).join('  ');
  lines.push(LS);

  const CAT_ENTER = cmd('cat awards.txt', LS.times[LS.times.length - 1] + .3, { wait: .28, base: .056, seed: 77 });
  out(AWARDS[0], CAT_ENTER + .14);
  const AWARDS_END = out(AWARDS[1], CAT_ENTER + .3);

  e = cmd('papers --count', AWARDS_END + .7, { wait: .28, base: .056, seed: 113 });
  const papers = PAPERS;
  const COUNT = { kind: 'count', at: e + .14, times: papers.map((_, i) => e + .2 + i * .25) };
  COUNT.html = `<span class="n">0</span>  <span class="dim">${papers.map((p) => `<span class="it">${p}</span>`).join('  ')}</span>`;
  lines.push(COUNT);

  const SCENE_AT = out('<span class="dim"># 글벗 — 웹소설 설정 충돌을 판정하는 에이전트</span>', COUNT.times[COUNT.times.length - 1] + 1.2, { gap: true });
  e = cmd('lore_keeper.run("카엘은 왼손잡이 검사다.")', SCENE_AT + .25, { wait: .3, base: .044, seed: 151, gap: false });
  let s = e + .1;
  s = step('classify', 'type = NARRATION', s, .44) + .07;
  s = step('extract', esc('fact(subject="카엘")'), s, .44) + .07;
  s = step('search', '2건 검색됨', s, .44) + .07;
  s = step('judge', '손잡이 설정과 충돌', s, .54, true);
  const JUDGE_AT = s;
  out(`${' '.repeat(14)}<span class="dim">Lore DB: 카엘의 손잡이는 "오른손잡이"</span>`, s + .22, { desk: true });

  const LAST = { kind: 'last', at: s + .72, gap: true };
  LAST.hint = LAST.at + 1.1;
  LAST.stop = LAST.at + 1.06 * Math.round((19.1 - LAST.at) / 1.06); // 커서가 켜진 박자에서 멈춰요
  LAST.html = '<span><span class="p">$</span> <span class="cur"></span></span>'
    + '<span class="rp rp-key"><kbd>/</kbd>키로 터미널을 열어 보세요</span>'
    + '<span class="rp rp-touch">상단 터미널 버튼으로 열어 보세요</span>';
  lines.push(LAST);

  for (const L of lines) {
    const el = document.createElement('div');
    el.className = 'tl' + (L.gap ? ' gap' : '') + (L.desk ? ' d-only' : '') + (L.kind === 'last' ? ' last' : '');
    if (L.kind === 'cmd') {
      el.innerHTML = '<span class="p">$</span> <span class="tx"></span><span class="cur"></span>';
      L.tx = el.querySelector('.tx');
      L.shown = -1;
    } else if (L.kind === 'step') {
      el.innerHTML = `  <span class="mk dim">|</span> ${L.label.padEnd(10)}<span class="res${L.bad ? ' bad' : ''}">${L.res}</span>`;
      L.mk = el.querySelector('.mk');
      L.resEl = el.querySelector('.res');
      L.mkText = '';
    } else {
      el.innerHTML = L.html;
    }
    if (L.kind === 'items' || L.kind === 'count') L.its = [...el.querySelectorAll('.it')];
    if (L.kind === 'count') { L.n = el.querySelector('.n'); L.nText = ''; }
    L.cur = el.querySelector('.cur');
    if (L.kind === 'last') L.rps = [...el.querySelectorAll('.rp')];
    L.el = el;
    scroller.appendChild(el);
  }
  const cmds = lines.filter((L) => L.kind === 'cmd');
  // 타자로 나올 글자를 처음부터 한 번 그려 둬요 (Pretendard는 글자 범위별로 받아서, 처음 나오는 글자의 글꼴이 늦게 바뀌는 일을 막아요)
  const ghost = document.createElement('div');
  ghost.className = 'tl-ghost';
  ghost.textContent = cmds.map((C) => C.text).join(' ') + ' ✓!|/-\\0123456789';
  scroller.appendChild(ghost);

  // 문장 슬롯: 들어오는 시각과, 함께 켤 ls projects/ 항목 번호 (dirs 순서, -1은 없음)
  const REEL_PLAN = [
    { at: H_END, dir: 0 },           // 동화를 만들고: 제목 타자가 끝나는 순간
    { at: CAT_ENTER, dir: 2 },       // VoC 이상을 잡고: cat awards.txt의 Enter
    { at: SCENE_AT, dir: 3 },        // 혈당을 예측하고: 글벗 장면이 시작될 때
    { at: JUDGE_AT - .06, dir: -1 }, // 설정 충돌을 찾습니다.: judge 결과와 함께 내려앉아 끝까지 남아요
  ];
  const RC = { ch: .028, chDur: .85, lead: .2, out: .5 }; // 글자 간격, 들어오기, 앞 문장이 먼저 빠지는 시간, 빠지기
  const reel = $$('.tk-line', reelEl).map((line, i) => {
    const chars = [];
    const text = line.textContent;
    line.textContent = '';
    for (const ch of text) {
      if (ch === ' ') { line.append(' '); continue; }
      const c = document.createElement('span');
      c.className = 'tk-c';
      c.textContent = ch;
      line.append(c);
      chars.push(c);
    }
    return { chars, ...REEL_PLAN[i] };
  });
  reel.forEach((R, i) => { R.outAt = i < reel.length - 1 ? reel[i + 1].at - RC.lead : Infinity; });
  reelEl.classList.add('is-live');

  // 크기에 따라 달라지는 값은 resize와 글꼴 로드 때만 다시 재요
  let geo = [], scrollEv = [], lit = [], lh = 19, caretH = 40;
  function measure() {
    const hr = hero.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(h1).fontSize) || 40;
    const range = document.createRange();
    geo = phrases.map((p) => {
      const node = p.firstChild;
      if (!node || node.nodeType !== 3 || p.childNodes.length !== 1) return null;
      const pr = p.getBoundingClientRect();
      const xs = [];
      let x0 = null, minTop = Infinity, maxTop = -Infinity;
      for (let i = 0; i < node.length; i++) {
        range.setStart(node, i); range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (x0 === null) x0 = r.left - pr.left;
        xs.push(r.right - pr.left);
        minTop = Math.min(minTop, r.top); maxTop = Math.max(maxTop, r.top);
      }
      return { x0, xs, w: pr.width, multi: maxTop - minTop > fs * .6, left: pr.left - hr.left, cy: pr.top - hr.top + pr.height / 2 };
    });
    caretH = Math.round(fs * .84);
    caret.style.height = `${caretH}px`;
    caret.style.width = `${Math.max(2, Math.round(fs * .05))}px`;

    lh = parseFloat(getComputedStyle(lines[0].el).height) || 19;
    const rows = parseFloat(getComputedStyle(hero).getPropertyValue('--tm-rows')) || 7.5;
    let u = 0, prev = 0;
    scrollEv = [];
    for (const L of lines) {
      L.u = null;
      if (getComputedStyle(L.el).display === 'none') continue;
      u += L.gap ? .5 : 0;
      L.u = u;
      u += 1;
      const over = Math.max(0, u - rows);
      if (over > prev) { scrollEv.push({ at: L.at, d: over - prev }); prev = over; }
    }

    // ls 항목 불빛은 그 줄이 창 안에 다 보이는 동안만 켜요 (위로 밀려나 안 보이면 생략)
    let gone = Infinity;
    if (LS.u != null) {
      let sc = 0;
      for (const ev of scrollEv) { sc += ev.d; if (LS.u - sc < 0) { gone = ev.at; break; } }
    }
    LS.its.forEach((el) => { el._c = ''; el.style.color = ''; });
    lit = reel.flatMap((R, i) => {
      if (R.dir < 0 || LS.u == null) return [];
      const on = Math.max(R.at, LS.times[R.dir] + .3);
      const off = Math.min(reel[i + 1] ? reel[i + 1].at : Infinity, on + 2.2, gone - .45);
      return off - on >= 1 ? [{ el: LS.its[R.dir], on, off }] : [];
    });
  }

  let t = 0, playing = false;
  const setText = (el, key, obj, v) => { if (obj[key] !== v) { obj[key] = v; el.textContent = v; } };

  function revealX(k, time) {
    const g = geo[k], s = H[k];
    const n = typed(s.at, time);
    if (n === 0) return g.x0;
    const from = n > 1 ? g.xs[n - 2] : g.x0;
    return lerp(from, g.xs[n - 1], easeOut(prog(time, s.at[n - 1], .07)));
  }

  function render(time) {
    t = Math.max(0, Math.min(DURATION, time));

    // 이름 줄
    let a = easeOut(prog(t, 0, .6));
    heroId.style.opacity = fx(a);
    heroId.style.translate = `0 ${fx((1 - a) * 6)}px`;

    // 제목: 글자 단위로 열리고 캐럿이 앞장서요. 한 구절이 두 줄로 접히면 그냥 서서히 나타나요
    phrases.forEach((p, k) => {
      const g = geo[k], s = H[k];
      if (!g || g.multi) {
        p.style.clipPath = '';
        p.style.opacity = fx(easeOut(prog(t, s.at[0], s.end - s.at[0] + .2)));
        return;
      }
      p.style.opacity = '';
      if (t >= s.end + .1) { p.style.clipPath = 'none'; return; }
      p.style.clipPath = `inset(-25% ${fx(Math.max(0, g.w - revealX(k, t)))}px -25% -8px)`;
    });
    const ck = t < H[1].at[0] ? 0 : 1;
    const cg = geo[ck];
    if (cg && !cg.multi && t < H_END + 1.3) {
      const x = cg.left + revealX(ck, t) + Math.max(3, caretH * .08);
      caret.style.transform = `translate(${fx(x)}px, ${fx(cg.cy - caretH / 2)}px)`;
      let o = easeOut(prog(t, .12, .2));
      if (t > H_END + .08) o = blink(t, H_END + .08, .9) * (1 - prog(t, H_END + .85, .3));
      caret.style.opacity = fx(o);
    } else {
      caret.style.opacity = 0;
    }

    // 소개 문단과 버튼
    subPhrases.forEach((p, i) => {
      const v = easeOut(prog(t, 1.75 + i * .12, .7));
      p.style.opacity = fx(v);
      p.style.translate = `0 ${fx((1 - v) * 10)}px`;
    });
    a = easeOut(prog(t, 2.15, .7));
    cta.style.opacity = fx(a);
    cta.style.translate = `0 ${fx((1 - a) * 10)}px`;

    // 문장 슬롯: 새 문장은 글자마다 아래에서 올라오고, 앞 문장은 조금 먼저 위로 빠져요
    for (const R of reel) {
      R.chars.forEach((el, k) => {
        const pin = easeOut(prog(t, R.at + k * RC.ch, RC.chDur));
        const pout = R.outAt === Infinity ? 0 : easeInOut(prog(t, R.outAt + k * RC.ch * .7, RC.out));
        const y = 110 * (1 - pin) - 110 * pout;
        const v = Math.abs(y) < .005 ? 'none' : `translateY(${y.toFixed(2)}%)`;
        if (el._ty !== v) { el._ty = v; el.style.transform = v; }
      });
    }

    // 터미널 창
    const ci = easeOut(prog(t, .95, .45)), cm = easeOut(prog(t, .95, 1));
    card.style.opacity = fx(ci);
    card.style.transform = `translateY(${fx((1 - cm) * 16)}px) scale(${fx(98.5 + 1.5 * cm) / 100})`;
    ctl.style.opacity = fx(ci);
    ctl.style.transform = `translateY(${fx((1 - cm) * 16)}px)`;

    // 터미널 줄
    let sc = 0;
    for (const ev of scrollEv) sc += ev.d * easeOut(prog(t, ev.at, .45));
    scroller.style.transform = `translateY(${fx(-sc * lh)}px)`;
    let active = null;
    for (const C of cmds) if (t >= C.at && t < C.enter) active = C;
    for (const L of lines) {
      const vis = L.kind === 'cmd' || L.kind === 'last' ? prog(t, L.at, .2) : prog(t, L.at, .16);
      // 위로 밀려나는 줄은 창 윗변에 닿는 순간부터 빠르게 사라져요 (반쯤 잘린 줄이 남지 않게)
      const edge = L.u == null ? 1 : clamp01(1 + (L.u - sc) / .4);
      L.el.style.opacity = fx(easeOut(vis) * edge);
      if (L.kind === 'cmd') {
        const n = typed(L.keys, t);
        if (L.shown !== n) { L.shown = n; L.tx.textContent = L.text.slice(0, n); }
        let o = 0;
        if (L === active) o = t >= L.keys[0] - .06 ? 1 : blink(t, L.at);
        L.cur.style.opacity = fx(o);
      } else if (L.kind === 'items' || L.kind === 'count') {
        L.its.forEach((it, i) => {
          const v = easeOut(prog(t, L.times[i], .22));
          it.style.opacity = fx(v);
          it.style.transform = `translateY(${fx((1 - v) * 3)}px)`;
        });
        if (L.kind === 'count') {
          const n = typed(L.times, t);
          setText(L.n, 'nText', L, String(n));
          const v = n ? easeOut(prog(t, L.times[n - 1], .3)) : 1;
          L.n.style.transform = `translateY(${fx((1 - v) * 4)}px)`;
        }
      } else if (L.kind === 'step') {
        const done = t >= L.at + L.dur;
        const m = done ? (L.bad ? '!' : '✓') : '|/-\\'[Math.floor(Math.max(0, t - L.at) / .085) % 4];
        if (L.mkText !== m) { L.mkText = m; L.mk.textContent = m; L.mk.className = 'mk ' + (done && L.bad ? 'bad' : 'dim'); }
        const v = easeOut(prog(t, L.at + L.dur, .24));
        L.resEl.style.opacity = fx(v);
        L.resEl.style.transform = `translateX(${fx((1 - v) * -4)}px)`;
      } else if (L.kind === 'last') {
        L.cur.style.opacity = fx(t >= L.stop ? 1 : t >= L.at ? blink(t, L.at) : 0);
        const v = easeOut(prog(t, L.hint, .7));
        L.rps.forEach((r) => { r.style.opacity = fx(v); r.style.transform = `translateX(${fx((1 - v) * 8)}px)`; });
      }
    }
    // 슬롯 문장과 짝인 ls projects/ 항목을 accent로 잠깐 켜요 (색은 토큰이라 테마를 바로 따라가요)
    for (const P of lit) {
      const v = easeOut(prog(t, P.on, .3)) * (1 - easeInOut(prog(t, P.off, .45)));
      const c = v > .001 ? `color-mix(in srgb, var(--accent) ${fx(v * 100)}%, var(--text))` : '';
      if (P.el._c !== c) { P.el._c = c; P.el.style.color = c; }
    }

    updateCtl();
  }

  // 재생 제어
  const LABEL = {
    playing: ['소개 애니메이션 일시정지', '일시정지'],
    paused: ['소개 애니메이션 재생', '재생'],
    ended: ['소개 애니메이션 다시 보기', '다시 보기'],
  };
  function updateCtl() {
    const st = playing ? 'playing' : t >= DURATION ? 'ended' : 'paused';
    if (ctl.dataset.state === st) return;
    ctl.dataset.state = st;
    ctl.setAttribute('aria-label', LABEL[st][0]);
    ctl.title = LABEL[st][1];
  }

  let raf = 0, last = 0, autoPaused = false, tabHidden = false, offscreen = false;
  function frame(now) {
    raf = 0;
    if (!playing) return;
    const dt = Math.min(.1, (now - last) / 1000);
    last = now;
    render(t + dt);
    if (t >= DURATION) { playing = false; updateCtl(); return; }
    raf = requestAnimationFrame(frame);
  }
  function play() {
    if (playing) return;
    if (t >= DURATION) t = 0;
    playing = true;
    last = performance.now();
    render(t);
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    updateCtl();
  }
  // 도입부(제목, 소개, 버튼, 첫 문장)가 끝나기 전에 멈추면 도입부가 끝난 화면에서 멈춰요
  const INTRO_END = Math.max(3.15, reel[0].at + (reel[0].chars.length - 1) * RC.ch + RC.chDur);
  ctl.addEventListener('click', () => {
    autoPaused = false;
    if (playing) { pause(); if (t < INTRO_END) render(INTRO_END); }
    else play();
  });
  // 탭이 숨거나, 히어로가 화면 밖이거나, 터미널(/)이 열려 있으면 잠시 멈추고, 돌아오면 이어서 재생해요
  function autoCheck() {
    const blocked = tabHidden || offscreen || !term.hidden;
    if (blocked && playing) { pause(); autoPaused = true; }
    else if (!blocked && autoPaused) { autoPaused = false; play(); }
  }
  document.addEventListener('visibilitychange', () => { tabHidden = document.hidden; autoCheck(); });
  new MutationObserver(autoCheck).observe(term, { attributes: true, attributeFilter: ['hidden'] });
  // 화면 밖: 히어로가 화면 가운데 70% 띠에 전혀 걸치지 않을 때. 히어로 면적 비율로 재면
  // 확대해서 화면이 히어로보다 훨씬 작을 때 맨 위에서도 '화면 밖'이 되어 빈 히어로로 멈춰요
  new IntersectionObserver(([en]) => {
    offscreen = !en.isIntersecting;
    autoCheck();
  }, { rootMargin: '-15% 0px' }).observe(hero);
  // 재생 중에 움직임 줄이기를 켜면 멈추고 마지막 화면을 보여 줘요
  reduceMq.addEventListener('change', (ev) => {
    if (!ev.matches) return;
    autoPaused = false;
    pause();
    render(DURATION);
  });

  let pend = 0;
  const remeasure = () => { if (pend) return; pend = requestAnimationFrame(() => { pend = 0; measure(); render(t); }); };
  addEventListener('resize', remeasure);
  new ResizeObserver(remeasure).observe(h1);
  document.fonts?.ready.then(() => { measure(); render(t); });

  // 검증 도구용 계약: seek(t)는 t만으로 화면을 정해요
  window.heroMotion = { duration: DURATION, seek: (time) => render(Number(time) || 0), play, pause };

  measure();
  // index.html의 안전장치가 hero-wait를 먼저 풀었으면 히어로 글자가 이미 다 보인 상태예요.
  // 그때는 t=0으로 되돌려 지우지 않고 도입부가 끝난 화면에서 이어 가요
  const late = !root.classList.contains('hero-wait');
  if (reduced) render(DURATION);
  else if (capture) render(0);
  else if (late) { render(INTRO_END); play(); }
  else play();
  root.classList.remove('hero-wait');
})();
