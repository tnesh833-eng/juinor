// ---- Hacker-theme background: matrix rain ----
(function(){
  const canvas = document.getElementById('matrixRain');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const chars = '01ABCDEF{}<>/#$%&*!?01010101アイウエオカキクケコ01';
  const fontSize = 15;
  let columns, drops;
  let width, height;

  function resize(){
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    columns = Math.floor(width / fontSize);
    drops = new Array(columns).fill(0).map(() => Math.floor(Math.random() * -50));
  }
  window.addEventListener('resize', resize);
  resize();

  function draw(){
    ctx.fillStyle = 'rgba(6, 12, 20, 0.08)';
    ctx.fillRect(0, 0, width, height);

    ctx.font = fontSize + 'px "JetBrains Mono", monospace';

    for (let i = 0; i < columns; i++){
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      // brighter leading character, dimmer cyan trail
      ctx.fillStyle = Math.random() > 0.96 ? 'rgba(231,238,246,0.9)' : 'rgba(79,211,240,0.55)';
      ctx.fillText(char, x, y);

      if (y > height && Math.random() > 0.975){
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  setInterval(draw, 45);
})();

(function(){
  const pwdInput = document.getElementById('pwd');
  const toggleBtn = document.getElementById('toggleBtn');
  const meter = document.getElementById('meter');
  const bars = meter.querySelectorAll('i');
  const verdict = document.getElementById('verdict');
  const statusLine = document.getElementById('statusLine');
  const checklist = document.getElementById('checklist');
  const statSpace = document.getElementById('statSpace');
  const statEntropy = document.getElementById('statEntropy');
  const breachWarn = document.getElementById('breachWarn');

  // small illustrative sample of commonly leaked / breached passwords
  const commonLeaked = new Set([
    "123456","password","123456789","12345678","12345","qwerty",
    "abc123","football","monkey","letmein","111111","iloveyou",
    "admin","welcome","password1","1234567","dragon","master",
    "sunshine","princess","qwertyuiop","000000","1q2w3e4r","passw0rd"
  ]);

  toggleBtn.addEventListener('click', () => {
    const isPwd = pwdInput.type === 'password';
    pwdInput.type = isPwd ? 'text' : 'password';
    toggleBtn.textContent = isPwd ? 'Hide' : 'Show';
  });

  function analyze(pw){
    const len = pw.length;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasDigit = /[0-9]/.test(pw);
    const hasSymbol = /[^A-Za-z0-9]/.test(pw);
    const hasUnicode = [...pw].some(ch => ch.codePointAt(0) > 127);

    let poolSize = 0;
    if (hasLower) poolSize += 26;
    if (hasUpper) poolSize += 26;
    if (hasDigit) poolSize += 10;
    if (hasSymbol) poolSize += 33;
    if (hasUnicode) poolSize = 143000;
    if (poolSize === 0) poolSize = 1;

    const entropy = len > 0 ? Math.round(len * Math.log2(poolSize)) : 0;
    const varietyCount = [hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length;
    const isLeaked = commonLeaked.has(pw.toLowerCase());

    let score = 0;
    if (len >= 8) score++;
    if (len >= 12) score++;
    if (varietyCount >= 3) score++;
    if (varietyCount === 4) score++;
    if (len < 8 || isLeaked) score = 0;

    let label, color;
    if (len === 0){ label = 'IDLE'; color = 'var(--text-dim)'; }
    else if (score <= 1){ label = 'WEAK'; color = 'var(--red)'; }
    else if (score <= 3){ label = 'MEDIUM'; color = 'var(--amber)'; }
    else { label = 'STRONG'; color = 'var(--green)'; }

    return { len, hasUpper, hasDigit, hasSymbol, hasUnicode, poolSize, entropy, isLeaked, score, label, color };
  }

  let lastLabel = null;
  let lastPassState = {};

  function render(pw){
    const r = analyze(pw);

    // bars — only replay the grow-pop animation on bars that just turned on
    bars.forEach((bar, i) => {
      const active = pw.length > 0 && i < r.score;
      const wasOn = bar.classList.contains('on');
      bar.style.setProperty('--bar-color', r.color);
      if (active && !wasOn){
        bar.classList.remove('on');
        void bar.offsetWidth; // reflow to restart animation
        bar.classList.add('on');
      } else {
        bar.classList.toggle('on', active);
      }
    });

    verdict.textContent = pw.length === 0 ? '— IDLE —' : '— ' + r.label + ' —';
    verdict.style.color = r.color;
    if (r.label !== lastLabel && pw.length > 0){
      verdict.classList.remove('flash');
      void verdict.offsetWidth;
      verdict.classList.add('flash');
    }
    lastLabel = r.label;

    // checklist — replay pop only on newly-passed checks
    const map = { len: r.len >= 8, upper: r.hasUpper, digit: r.hasDigit, symbol: r.hasSymbol };
    checklist.querySelectorAll('.check').forEach(el => {
      const key = el.dataset.k;
      const nowPass = map[key];
      const justPassed = nowPass && !lastPassState[key];
      if (justPassed){
        el.classList.remove('pass');
        void el.offsetWidth;
      }
      el.classList.toggle('pass', nowPass);
      el.classList.toggle('fail', !nowPass);
      lastPassState[key] = nowPass;
    });

    // stats
    statSpace.innerHTML = r.hasUnicode
      ? '143,000 <small>chars (unicode)</small>'
      : r.poolSize + ' <small>chars (ascii)</small>';
    statEntropy.innerHTML = r.entropy + ' <small>bits</small>';

    // breach warning
    breachWarn.classList.toggle('show', r.isLeaked);

    // status line
    if (pw.length === 0){
      statusLine.textContent = 'Awaiting input…';
    } else if (r.len < 8) {
      statusLine.textContent = `Immediate fail — ${8 - r.len} more character(s) needed to clear the length gate.`;
    } else if (r.isLeaked) {
      statusLine.textContent = 'Rejected — string matches a known breached-password corpus.';
    } else {
      const missing = [];
      if (!r.hasUpper) missing.push('an uppercase letter');
      if (!r.hasDigit) missing.push('a number');
      if (!r.hasSymbol) missing.push('a symbol');
      statusLine.textContent = missing.length
        ? `Passed length gate. Add ${missing.join(', ')} to raise strength.`
        : `All checks passed. ${r.entropy}-bit search space — solid.`;
    }
  }

  pwdInput.addEventListener('input', (e) => render(e.target.value));
  render('');
})();

