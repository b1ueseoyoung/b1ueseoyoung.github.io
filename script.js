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
  $$('#filters .chip').forEach((c) => c.classList.toggle('active', c === btn));
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
function openTerm() {
  term.hidden = false;
  if (!greeted) {
    print('<span class="dim">welcome! `help`를 입력해 보세요.</span>');
    greeted = true;
  }
  input.focus();
}
function closeTerm() { term.hidden = true; }

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
  const fn = COMMANDS[cmd.toLowerCase()];
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

/* ---------- buddy: 돌아다니는 쫄라맨 ---------- */
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
  const rand = (a, b) => a + Math.random() * (b - a);
  const maxX = () => window.innerWidth - buddy.offsetWidth;

  let x = maxX() * 0.8;
  let dir = -1;
  let state = 'idle';
  let until = 0;
  let last = performance.now();
  let bubbleTimer;

  function say(text) {
    bubble.textContent = text;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 2200);
  }

  function setState(next, now) {
    state = next;
    buddy.classList.toggle('walking', next === 'walk');
    buddy.classList.toggle('running', next === 'run');
    buddy.classList.toggle('waving', next === 'wave');
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
    } else {
      until = now + rand(1000, 2800);
      if (Math.random() < 0.25) say(LINES[1 + Math.floor(Math.random() * 4)]);
    }
  }

  function place() {
    buddy.style.transform = `translateX(${x}px)`;
    buddy.style.setProperty('--dir', dir);
    buddy.classList.toggle('edge-l', x < 80);
    buddy.classList.toggle('edge-r', x > maxX() - 80);
  }

  function tick(now) {
    const dt = Math.min(now - last, 50) / 1000;
    last = now;
    if (state === 'walk' || state === 'run') {
      x += dir * (state === 'run' ? 240 : 70) * dt;
      if (x <= 0) { x = 0; dir = 1; }
      if (x >= maxX()) { x = maxX(); dir = -1; }
    }
    if (now > until) {
      const r = Math.random();
      const moving = state === 'walk' || state === 'run';
      setState(moving ? (r < 0.2 ? 'wave' : 'idle') : (r < 0.35 ? 'run' : 'walk'), now);
    }
    place();
    requestAnimationFrame(tick);
  }

  buddy.addEventListener('click', () => {
    buddy.classList.remove('jumping');
    void buddy.offsetWidth; // 애니메이션 재시작
    buddy.classList.add('jumping');
    say(LINES[Math.floor(Math.random() * LINES.length)]);
    if (!reduced) setTimeout(() => setState('run', performance.now()), 550);
  });
  buddy.addEventListener('animationend', (e) => {
    if (e.animationName === 'jump') buddy.classList.remove('jumping');
  });
  window.addEventListener('resize', () => { x = Math.min(x, maxX()); place(); });

  place();
  if (!reduced) {
    setState('wave', performance.now());
    requestAnimationFrame(tick);
  }
})();
