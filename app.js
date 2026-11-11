(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const input = $('input');
  const mirror = $('mirror');
  const IDLE = 450;

  let last = null;       // analysis of the cleaned text
  let marks = [];        // sentence spans placed on the text in the box: { i, a, b, hits }
  let revealed = false;
  let current = -1;      // sentence under the caret
  let proposal = null;
  let boxSpan = null;
  let fresh = [];        // ranges rewritten by "Humanizar todo", underlined until the next edit
  let busy = false;
  let timer = null;
  let selTimer = null;
  let prevRaw = '';
  let blocks = [];
  let verdictInView = true;
  const history = [];

  const SAMPLE = `La inteligencia artificial en la universidad

En el mundo actual, la inteligencia artificial juega un papel fundamental en la transformación de numerosos sectores. Es importante destacar que su impacto abarca ámbitos tan diversos como la medicina, la educación y la industria. Además, estas tecnologías permiten optimizar procesos y fomentar la innovación de manera significativa. Asimismo, su capacidad para analizar grandes volúmenes de datos abre la puerta a descubrimientos que antes resultaban impensables.

Por otro lado, cabe señalar que su adopción plantea desafíos éticos que deben abordarse con responsabilidad. No se trata solo de una herramienta tecnológica, sino de un cambio de paradigma que redefine nuestra relación con el conocimiento. En este sentido, resulta esencial garantizar la transparencia, la equidad y la protección de los datos personales. Sin lugar a dudas, las instituciones educativas tienen la responsabilidad de formar a los estudiantes para un entorno en constante evolución.

Entre sus principales ventajas destacan:
- Tutorías personalizadas
- Corrección automática de ejercicios
- Acceso a información en cualquier momento

Yo la uso sobre todo para repasar antes de los parciales. A veces me explica bien las integrales, otras veces se inventa cosas y me toca comprobarlo con los apuntes de clase. El otro día me dio un resultado que estaba mal. Lo vi porque no cuadraban las unidades jaja.

En el grupo de prácticas cada uno la usa a su manera. Mi compañera Lucía no se fía nada y solo la abre para traducir algún párrafo en inglés del libro. Otro chico del grupo le pega el enunciado entero y copia lo que sale, y luego en el examen no sabe ni por dónde empezar. Yo creo que el problema no es la herramienta. El problema es usarla para no pensar, que al final es lo mismo que copiar del de al lado pero con más pasos.

Ahora estoy intentando usarla de otra forma: primero hago el ejercicio yo, aunque me equivoque, y luego le pregunto dónde está el fallo. Tardo más, pero me entero mucho mejor.`;

  const words = (t) => (t.match(/[\p{L}\p{N}'’-]+/gu) || []).length;
  const plural = (n, one, many) => (n === 1 ? '1 ' + one : n + ' ' + many);
  const fmt2 = (p) => p.toFixed(2).replace('.', ',');
  // What the figure reads as on screen: Turnitin-style rules hide it between 1 % and 19 %.
  const shownPct = (pct) => (pct === 0 ? '0 %' : pct < 20 ? 'menos del 20 %' : pct + ' %');
  const EXCL = { lista: 'lista', 'título': 'título', referencias: 'línea de referencias', tabla: 'tabla', 'fórmula o código': 'fórmula o código', fragmento: 'fragmento suelto', 'diálogo': 'línea de diálogo' };
  const BAND_NAMES = { fuerte: 'Indicio fuerte', dudoso: 'Dudoso', 'sin-conclusion': 'Sin conclusión' };

  const updateCount = () => {
    const n = words(input.value);
    $('count').textContent = n === 1 ? '1 palabra' : n + ' palabras';
    $('clear').disabled = n === 0;
    $('page').classList.toggle('empty', n === 0);
  };

  // The analysis works on a cleaned copy of the text. This maps each offset of that copy back to the box, so the
  // marks land on the right characters even when the box still holds tabs, trailing spaces or odd line breaks.
  function offsetMap(raw, cleaned) {
    if (raw === cleaned) return (x) => x;
    const map = new Array(cleaned.length);
    const ws = (c) => /\s/.test(c);
    let j = 0;
    for (let i = 0; i < cleaned.length; i++) {
      const c = cleaned[i];
      while (j < raw.length && raw[j] !== c && !(ws(raw[j]) && ws(c))) j++;
      if (j >= raw.length) return null;
      map[i] = j++;
    }
    return (x) => map[x];
  }

  function placeMarks() {
    marks = [];
    if (!last) return;
    const to = offsetMap(input.value, last.text);
    if (!to) return;
    last.sentences.forEach((s, i) => {
      const hits = s.excluded ? [] : s.hits.filter((h) => h.kind !== 'human')
        .map((h) => ({ a: to(s.start + h.from), b: to(s.start + h.to - 1) + 1 })).sort((x, y) => x.a - y.a);
      marks.push({ i, a: to(s.start), b: to(s.end - 1) + 1, hits });
    });
  }

  // While the person types, the marks follow the edit instead of vanishing until the next analysis.
  function shiftMarks(oldRaw, newRaw) {
    if (!marks.length) return;
    const max = Math.min(oldRaw.length, newRaw.length);
    let p = 0;
    while (p < max && oldRaw[p] === newRaw[p]) p++;
    let q = 0;
    while (q < max - p && oldRaw[oldRaw.length - 1 - q] === newRaw[newRaw.length - 1 - q]) q++;
    const oldEnd = oldRaw.length - q;
    const newEnd = newRaw.length - q;
    const delta = newRaw.length - oldRaw.length;
    const sh = (x) => (x <= p ? x : x >= oldEnd ? x + delta : newEnd);
    marks = marks.map((m) => ({ i: m.i, a: sh(m.a), b: sh(m.b), hits: m.hits.map((h) => ({ a: sh(h.a), b: sh(h.b) })).filter((h) => h.b > h.a) }))
      .filter((m) => m.b > m.a);
  }

  const showMarks = () => !!last && (last.status === 'ok' || revealed);

  function syncMirror() {
    mirror.style.width = input.clientWidth + 'px';
    mirror.style.transform = `translateY(${-input.scrollTop}px)`;
    // On a phone the leaf also holds the panel, so the edge is sized to the text pane alone.
    const tabs = $('tabs');
    if (window.matchMedia('(max-width: 860px)').matches) {
      const r = $('page').getBoundingClientRect();
      const l = tabs.parentElement.getBoundingClientRect();
      tabs.style.top = (r.top - l.top) + 'px';
      tabs.style.height = r.height + 'px';
      tabs.style.bottom = 'auto';
    } else {
      tabs.style.top = '';
      tabs.style.height = '';
      tabs.style.bottom = '';
    }
  }

  function renderMirror() {
    const raw = input.value;
    mirror.textContent = '';
    const show = showMarks();
    let pos = 0;
    marks.forEach((m) => {
      const s = last.sentences[m.i];
      if (!s || m.a < pos) return;
      if (m.a > pos) mirror.append(raw.slice(pos, m.a));
      const span = document.createElement('span');
      span.dataset.i = m.i;
      span.className = s.excluded ? 's ex' : 's ' + (show ? (s.ai ? 'ai' : 'ok') : 'plain');
      if (s.excluded) span.title = 'No evaluada: ' + EXCL[s.excluded];
      if (m.i === current && show && !s.excluded) span.classList.add('sel');
      if (show && fresh.some((c) => s.start >= c.start && s.start < c.end)) span.classList.add('new');
      let p = m.a;
      if (show && s.ai && !s.excluded) {
        m.hits.forEach((h) => {
          if (h.a < p || h.b > m.b) return;
          if (h.a > p) span.append(raw.slice(p, h.a));
          const t = document.createElement('span');
          t.className = 't';
          t.textContent = raw.slice(h.a, h.b);
          span.append(t);
          p = h.b;
        });
      }
      span.append(raw.slice(p, m.b));
      mirror.append(span);
      pos = m.b;
    });
    if (pos < raw.length) mirror.append(raw.slice(pos));
    mirror.append('\n');
    syncMirror();
  }

  function li(label, right, detail, negative) {
    const el = document.createElement('li');
    const left = document.createElement('span');
    left.textContent = label;
    if (negative) left.className = 'neg';
    if (detail) { const sm = document.createElement('small'); sm.textContent = detail; left.append(sm); }
    const k = document.createElement('span');
    k.className = 'k';
    k.textContent = right;
    el.append(left, k);
    return el;
  }

  function renderPanel() {
    const r = last;
    $('empty').hidden = !!r;
    $('result').hidden = !r;
    $('dock').hidden = !r || verdictInView;
    const band = !r ? 'none' : r.status === 'short' || r.status === 'long' ? 'short' : r.band;
    $('board').dataset.band = band;
    if (!r) return;

    const marksShown = r.status === 'ok' || revealed;
    const excludedTotal = Object.values(r.excludedBy).reduce((a, b) => a + b, 0);
    let meta = `Frases evaluadas: ${r.evaluatedSentences}, de las que ${plural(r.aiSentences, 'sale', 'salen')} como IA. Palabras de prosa: ${r.proseWords}.`;
    if (excludedTotal) {
      const many = { lista: 'líneas de lista', 'título': 'títulos', referencias: 'líneas de referencias', tabla: 'líneas de tabla', 'fórmula o código': 'líneas de fórmula o código', fragmento: 'fragmentos sueltos', 'diálogo': 'líneas de diálogo' };
      meta += ' No evaluadas: ' + Object.entries(r.excludedBy).map(([k, n]) => (n === 1 ? `1 ${EXCL[k]}` : `${n} ${many[k]}`)).join(', ') + '.';
    }
    const tricks = r.tampering.invisible + r.tampering.lookalikes;
    if (tricks) meta += ` Se han encontrado ${plural(tricks, 'carácter camuflado', 'caracteres camuflados')} (invisibles o letras de otros alfabetos que imitan a las latinas), un truco habitual para engañar a los detectores. Se han corregido antes de analizar.`;
    $('meta').textContent = meta;

    const pct = $('pct');
    const unit = $('unit');
    const label = $('scoreLabel');
    let verdict = '';
    if (r.status === 'short') {
      pct.textContent = '–'; unit.textContent = '';
      label.textContent = 'Texto demasiado corto';
      verdict = `Turnitin solo da porcentaje con al menos ${r.minWords} palabras de prosa. Aquí hay ${r.proseWords} y te faltan ${Math.max(0, r.minWords - r.proseWords)}. Con menos texto el resultado es poco fiable y tiende a ser «todo o nada».`;
    } else if (r.status === 'long') {
      pct.textContent = '–'; unit.textContent = '';
      label.textContent = 'Texto demasiado largo';
      verdict = 'Turnitin no procesa más de 30.000 palabras de prosa. Divide el texto en partes.';
    } else if (r.status === 'low') {
      pct.textContent = '*'; unit.textContent = '%';
      label.textContent = 'IA detectada por debajo del 20 %';
      verdict = 'Pocas frases superan el umbral, pero esto no demuestra que sea humano: también hay textos de IA en este rango. Turnitin no muestra cifra ni subraya frases aquí, porque los falsos positivos son más probables.';
    } else {
      pct.textContent = r.percentAI; unit.textContent = '%';
      label.textContent = 'de la prosa evaluada tiene rasgos de IA';
      verdict = r.band === 'fuerte' ? 'La mayor parte de la prosa tiene rasgos de IA. Es un indicio fuerte, no una prueba.'
        : r.band === 'dudoso' ? 'Una parte de la prosa tiene rasgos de IA, pero este rango no permite decidir en ningún sentido. Revisa las frases subrayadas. Es un indicio, no una prueba.'
        : r.percentAI === 0 ? 'Ninguna frase supera el umbral. Eso no demuestra que sea humano: un texto de IA sin muletillas o retocado a mano puede pasar desapercibido.'
        : 'Pocas frases superan el umbral, pero esto no demuestra que sea humano: también hay textos de IA en este rango.';
    }
    if (revealed && r.status !== 'ok' && r.evaluatedSentences) {
      verdict += ` Mostrando igualmente las frases: ${r.aiSentences} de ${r.evaluatedSentences} superan el umbral (${r.percentAI} %).`;
    }
    $('verdict').textContent = verdict;
    $('bandName').textContent = BAND_NAMES[r.band] || 'Sin veredicto';
    $('stamp').dataset.state = r.band === 'fuerte' ? 'ai' : r.band === 'dudoso' ? 'doubt' : 'none';
    $('dockPct').textContent = pct.textContent;
    $('dockUnit').textContent = unit.textContent;
    $('dockBand').textContent = BAND_NAMES[r.band] || 'Sin veredicto';

    const shown = r.status === 'ok' || revealed ? r.percentAI : 0;
    $('segAI').style.width = shown + '%';
    $('bar').setAttribute('aria-label', `IA ${r.percentAI}%, humana ${100 - r.percentAI}%`);
    $('bar').hidden = r.status !== 'ok' && !revealed;
    $('reveal').hidden = r.status === 'ok' || revealed || !r.evaluatedSentences;
    $('humanizeBox').hidden = !r.aiSentences;
    $('dockAll').hidden = !r.aiSentences;
    $('signalsBox').hidden = !marksShown;
    $('hint').hidden = !marksShown || !r.aiSentences;

    const list = $('signals');
    list.textContent = '';
    r.docReasons.forEach((d) => list.append(li(d.label, 'todo el texto')));
    Object.entries(r.signals).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .forEach(([l, n]) => list.append(li(l, plural(n, 'frase', 'frases'))));
    if (!list.children.length) list.append(li('Ninguna frase supera el umbral', ''));
  }

  // The fore edge: one tab per paragraph, as tall as the paragraph and tinted by its share of flagged sentences.
  function blocksOf(r) {
    const out = [];
    const byPara = new Map();
    r.sentences.forEach((s, i) => {
      let b = byPara.get(s.para);
      if (!b) { b = { first: i, words: 0, n: 0, ai: 0 }; byPara.set(s.para, b); out.push(b); }
      b.words += s.words;
      if (!s.excluded) { b.n++; if (s.ai) b.ai++; }
    });
    if (out.length > 14) {
      // Many paragraphs: merge neighbours so the edge keeps readable tabs.
      const step = Math.ceil(out.length / 14);
      const merged = [];
      for (let i = 0; i < out.length; i += step) {
        const g = out.slice(i, i + step);
        merged.push({ first: g[0].first, words: g.reduce((n, b) => n + b.words, 0), n: g.reduce((n, b) => n + b.n, 0), ai: g.reduce((n, b) => n + b.ai, 0) });
      }
      return merged;
    }
    if (out.length >= 3 || r.sentences.length < 6) return out;
    // A text in one block: cut it in groups of four sentences so the edge still maps the text.
    const groups = [];
    for (let i = 0; i < r.sentences.length; i += 4) {
      const b = { first: i, words: 0, n: 0, ai: 0 };
      r.sentences.slice(i, i + 4).forEach((s) => { b.words += s.words; if (!s.excluded) { b.n++; if (s.ai) b.ai++; } });
      groups.push(b);
    }
    return groups;
  }

  function renderTabs() {
    const nav = $('tabs');
    nav.textContent = '';
    blocks = last && last.sentences.length ? blocksOf(last) : [];
    nav.hidden = !blocks.length;
    const show = showMarks();
    blocks.forEach((b, k) => {
      const share = b.n ? Math.round((b.ai / b.n) * 100) : -1;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab';
      btn.dataset.k = k;
      btn.style.setProperty('--w', Math.max(b.words, 20));
      btn.dataset.share = !b.n ? 'x' : !show ? 'n' : share === 0 ? 'a' : share < 40 ? 'b' : share < 60 ? 'c' : share < 80 ? 'd' : 'e';
      const txt = document.createElement('span');
      txt.append(`¶${k + 1}`);
      if (show && b.n) { const p = document.createElement('span'); p.className = 'p'; p.textContent = ` ${share} %`; txt.append(p); }
      btn.append(txt);
      btn.setAttribute('aria-label', !b.n ? `Párrafo ${k + 1}, sin frases evaluadas. Ir al párrafo.` : show ? `Párrafo ${k + 1}: ${b.ai} de ${b.n} frases marcadas. Ir al párrafo.` : `Párrafo ${k + 1}. Ir al párrafo.`);
      nav.append(btn);
    });
    updateCurTab();
  }

  function updateCurTab() {
    if (!blocks.length) return;
    let k = 0;
    if (current >= 0) {
      blocks.forEach((b, i) => { if (b.first <= current) k = i; });
    } else {
      const top = input.scrollTop + 8;
      blocks.forEach((b, i) => {
        const el = mirror.querySelector(`[data-i="${b.first}"]`);
        if (el && el.offsetTop <= top + 40) k = i;
      });
    }
    $('tabs').querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('cur', i === k));
  }

  function scrollToSentence(i, margin) {
    const el = mirror.querySelector(`[data-i="${i}"]`);
    if (!el) return;
    const top = el.offsetTop;
    if (margin === 'force' || top < input.scrollTop + 16 || top > input.scrollTop + input.clientHeight - 110) input.scrollTop = Math.max(0, top - 40);
  }

  function caretSentence() {
    if (!last || !marks.length) return -1;
    const c = input.selectionStart;
    let hit = -1;
    marks.forEach((m) => { if (hit < 0 && c >= m.a && c <= m.b && !last.sentences[m.i].excluded) hit = m.i; });
    if (hit >= 0) return hit;
    marks.forEach((m) => { if (m.b < c && !last.sentences[m.i].excluded) hit = m.i; });
    return hit;
  }

  // Selected sentence: follows the caret, so clicking, arrowing or typing all move the detail panel.
  function refreshDetail() {
    if (busy || document.activeElement === $('rewrite')) return;
    const i = showMarks() ? caretSentence() : -1;
    mirror.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel'));
    current = i;
    if (i < 0) { $('detail').hidden = true; updateCurTab(); return; }
    const el = mirror.querySelector(`[data-i="${i}"]`);
    if (el) el.classList.add('sel');
    showDetail(i);
    updateCurTab();
  }

  function showDetail(i) {
    const s = last.sentences[i];
    const prose = last.sentences.filter((o) => !o.excluded);
    $('detail').hidden = false;
    $('detailHead').textContent = `Frase ${prose.indexOf(s) + 1} de ${prose.length}`;
    const snippet = s.text.length > 140 ? s.text.slice(0, 140) + '…' : s.text;
    $('detailP').textContent = `«${snippet}». Puntuación en contexto ${fmt2(s.p)}, umbral ${fmt2(s.threshold)}${s.edge ? ' (más alto por estar al principio o al final)' : ''}: ${s.ai ? 'IA' : 'humana'}.`;
    const ul = $('detailList');
    ul.textContent = '';
    s.reasons.slice().sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
      .forEach((x) => ul.append(li(x.label, (x.weight > 0 ? '+' : '') + x.weight.toFixed(1), x.detail, x.weight < 0)));
    last.docReasons.forEach((d) => ul.append(li(d.label + ' (todo el texto)', '+' + d.weight.toFixed(1))));
    if (!ul.children.length) ul.append(li('Sin rasgos especiales en esta frase; pesa el contexto', ''));
    renderFix(s);
    $('delta').hidden = true;
  }

  // Guided rewriting: tips for the selected sentence and a box to rewrite it.
  function renderFix(s) {
    const ul = $('tips');
    ul.textContent = '';
    const tips = window.PolidetectorTips.suggest(s, last);
    tips.forEach((t) => {
      const el = document.createElement('li');
      const b = document.createElement('strong');
      b.textContent = t.label;
      const p = document.createElement('span');
      p.textContent = t.tip;
      el.append(b, p);
      if (t.alts.length) {
        const alts = document.createElement('ul');
        alts.className = 'alts';
        t.alts.forEach((a) => {
          const x = document.createElement('li');
          const term = document.createElement('code');
          term.textContent = a.term;
          x.append(term, ' → ' + a.alts.join(', '));
          alts.append(x);
        });
        el.append(alts);
      }
      ul.append(el);
    });
    if (!tips.length) {
      const el = document.createElement('li');
      el.textContent = s.ai ? 'No hay un rasgo concreto que cambiar; la marcan las frases de alrededor.' : 'Esta frase no tiene rasgos de IA que corregir.';
      ul.append(el);
    }
    renderExample(s);
    $('rewrite').value = s.text;
    boxSpan = null;
    $('next').hidden = !last.sentences.some((o, j) => o.ai && j !== last.sentences.indexOf(s));
  }

  // Rule-based example for a flagged sentence. It is searched against the whole text, so a proposal never raises the
  // share of flagged sentences. When nothing works the box says so and the tips above stay as the way forward.
  function renderExample(s) {
    const box = $('example');
    proposal = null;
    box.hidden = !s.ai;
    if (box.hidden) return;
    const ex = window.PolidetectorTips.propose(last.text, last, s);
    $('applyExample').hidden = !ex.changed;
    $('useExample').hidden = !ex.changed;
    if (!ex.changed) {
      $('exampleText').textContent = 'No he encontrado un cambio automático que baje la puntuación de esta frase sin empeorar el resto del texto. Sigue los consejos de arriba: el cuadro de abajo ya tiene la frase para que la reescribas.';
      $('exampleNote').textContent = '';
      return;
    }
    proposal = ex;
    $('exampleText').textContent = ex.text;
    const join = ex.merged ? `Une esta frase con ${ex.start < s.start ? 'la anterior' : 'la siguiente'}, que también está marcada. ` : '';
    const level = ex.after.ai ? 'sigue por encima del umbral (pesan las frases de alrededor o lo que las reglas no saben cambiar)' : 'ya por debajo del umbral';
    $('exampleNote').textContent = `${join}Puntuación ${fmt2(s.p)} → ${fmt2(ex.after.p)}, ${level}. IA en el texto: ${shownPct(ex.before.pct)} → ${shownPct(ex.after.pct)}. Hecho con reglas, no entiende el sentido: revisa que diga lo mismo y que concuerde. Bajar aquí no garantiza nada en Turnitin.`;
  }

  const say = (msg, warn) => { const d = $('delta'); d.textContent = msg; d.dataset.warn = warn ? '1' : ''; d.hidden = false; };

  function setValue(v) { input.value = v; prevRaw = v; }

  function analyzeNow() {
    clearTimeout(timer);
    timer = null;
    const raw = input.value;
    if (!words(raw)) { last = null; marks = []; current = -1; } else { last = window.Polidetector.analyze(raw); placeMarks(); }
    renderMirror();
    renderPanel();
    renderTabs();
    refreshDetail();
    $('live').textContent = last ? 'Analizado' : '';
  }

  function schedule(now) {
    $('live').textContent = 'Analizando…';
    clearTimeout(timer);
    timer = setTimeout(analyzeNow, now ? 0 : IDLE);
  }

  function onInput() {
    const old = prevRaw;
    const raw = input.value;
    prevRaw = raw;
    fresh = [];
    $('bulk').hidden = true;
    updateCount();
    shiftMarks(old, raw);
    renderMirror();
    schedule(Math.abs(raw.length - old.length) > 40 || !words(raw));
  }

  // Puts `next` where text[start, end) was, in the cleaned text, and reads everything again.
  function applyChange(s, start, end, next) {
    if (timer) { analyzeNow(); say('El texto acababa de cambiar. Vuelve a pulsar para aplicar el cambio.', true); return; }
    const before = { p: s.p, ai: s.ai, count: last.aiSentences, total: last.evaluatedSentences, pct: last.percentAI, status: last.status };
    history.push(input.value);
    setValue(last.text.slice(0, start) + next + last.text.slice(end));
    input.setSelectionRange(start, start);
    updateCount();
    $('undo').hidden = false;
    // Rewrites usually shorten the text; if it drops under the word minimum, keep the marks visible anyway.
    if (before.status === 'ok') revealed = true;
    fresh = [];
    $('bulk').hidden = true;
    analyzeNow();
    scrollToSentence(current < 0 ? 0 : current);
    const now = current >= 0 ? last.sentences[current] : null;
    const fmt = (p, ai) => fmt2(p) + (ai ? ' (IA)' : ' (humana)');
    const rose = before.status !== 'short' && last.status !== 'short' && last.percentAI > before.pct;
    say(`${now ? `Puntuación de la frase: ${fmt(before.p, before.ai)} → ${fmt(now.p, now.ai)}. ` : ''}Frases como IA en el texto: ${before.count} de ${before.total} → ${last.aiSentences} de ${last.evaluatedSentences}. IA en el texto: ${shownPct(before.pct)} → ${shownPct(last.percentAI)}.${rose ? ' Ojo: con este cambio el porcentaje ha subido. Puedes volver atrás con «Deshacer cambio».' : ''}`, rose);
  }

  function applyRewrite() {
    const s = last && last.sentences[current];
    if (!s) { say('Toca primero una frase marcada del texto.', true); return; }
    const span = boxSpan || { start: s.start, end: s.end };
    const next = $('rewrite').value.trim();
    if (!next) { say('El cuadro está vacío. Escribe la nueva versión de la frase.', true); return; }
    if (next === last.text.slice(span.start, span.end)) { say('La frase del cuadro es igual que la del texto. Cambia algo o usa el ejemplo.', true); return; }
    applyChange(s, span.start, span.end, next);
  }

  function applyExample() {
    const s = last && last.sentences[current];
    if (!s || !proposal) return;
    applyChange(s, proposal.start, proposal.end, proposal.text);
  }

  function copyExample() {
    if (!proposal) return;
    $('rewrite').value = proposal.text;
    boxSpan = { start: proposal.start, end: proposal.end };
    say('Copiado al cuadro. Edítalo si quieres y pulsa «Aplicar y volver a analizar».');
    $('rewrite').focus();
  }

  function resetBulk() {
    fresh = [];
    $('bulk').hidden = true;
  }

  // Moves the caret to a sentence: the detail panel and the fore edge follow it.
  function goTo(j) {
    const m = marks.find((x) => x.i === j);
    if (!m) return;
    input.setSelectionRange(m.a, m.a);
    scrollToSentence(j, 'force');
    refreshDetail();
  }

  function nextFlagged() {
    const n = last.sentences.length;
    for (let k = 1; k <= n; k++) {
      const j = (Math.max(current, -1) + k) % n;
      if (last.sentences[j].ai) {
        goTo(j);
        // On a phone the panel sits under the text, so bring the tips and the rewrite box into view.
        if (window.matchMedia('(max-width: 860px)').matches) $('detail').scrollIntoView({ block: 'start', behavior: 'smooth' });
        return;
      }
    }
  }

  function undo() {
    if (!history.length) return;
    setValue(history.pop());
    updateCount();
    resetBulk();
    analyzeNow();
    $('undo').hidden = !history.length;
  }

  function loadText(t) {
    if (input.value && input.value !== t) history.push(input.value);
    setValue(t);
    revealed = false;
    resetBulk();
    updateCount();
    input.setSelectionRange(0, 0);
    input.scrollTop = 0;
    $('undo').hidden = !history.length;
    analyzeNow();
  }

  // "Humanizar todo": rewrites only the flagged sentences, in one go, and can be undone like any other change.
  async function humanizeAll() {
    if (!last || busy) return;
    if (timer) analyzeNow();
    const snapshot = last;
    busy = true;
    ['humanizeAll', 'dockAll', 'humanize', 'apply', 'applyExample', 'useExample', 'undo'].forEach((id) => { $(id).disabled = true; });
    $('bulk').hidden = false;
    $('bulkSummary').hidden = true;
    $('bulkList').hidden = true;
    $('bulkLeft').hidden = true;
    $('bulkProgress').hidden = false;
    $('bulkProgress').textContent = 'Preparando…';
    try {
      const res = await window.PolidetectorTips.humanizeAll(snapshot.text, (i, n) => { $('bulkProgress').textContent = `Humanizando la frase ${i + 1} de ${n}…`; });
      if (last !== snapshot) return;
      $('bulkProgress').hidden = true;
      if (!res.changes.length) {
        $('bulkSummary').hidden = false;
        $('bulkSummary').textContent = 'No he podido reescribir ninguna frase marcada sin empeorar el resto del texto. Prueba «Frase por frase»: ahí tienes consejos con cifras para cada una.';
        return;
      }
      history.push(input.value);
      setValue(res.text);
      updateCount();
      if (snapshot.status === 'ok') revealed = true;
      fresh = res.changes;
      busy = false;
      analyzeNow();
      $('undo').hidden = false;
      $('bulk').hidden = false;
      const joined = res.changes.filter((c) => c.merged).length;
      $('bulkSummary').hidden = false;
      $('bulkSummary').textContent = `He reescrito ${plural(res.changes.length, 'frase', 'frases')} de las ${res.flagged} marcadas${joined ? ` (${plural(joined, 'unión de dos frases', 'uniones de dos frases')})` : ''}. IA en el texto: ${shownPct(res.before.pct)} → ${shownPct(res.after.pct)}. Las demás frases no se han tocado. Están subrayadas en el texto y puedes volver atrás con «Deshacer cambio».${last.status === 'short' ? ` El texto se ha quedado por debajo de ${last.minWords} palabras de prosa, así que ya no se muestra el porcentaje.` : ''}`;
      const items = $('bulkItems');
      items.textContent = '';
      res.changes.forEach((c) => {
        const row = document.createElement('li');
        const was = document.createElement('div');
        was.className = 'was';
        was.textContent = c.before;
        const now = document.createElement('div');
        now.className = 'now';
        now.textContent = c.after;
        row.append(was, now);
        items.append(row);
      });
      $('bulkList').hidden = false;
      if (res.after.ai) {
        $('bulkLeft').hidden = false;
        $('bulkLeft').textContent = `Siguen marcadas ${plural(res.after.ai, 'frase', 'frases')} que no se pueden cambiar solas sin empeorar el texto. Revísalas con «Frase por frase».`;
      }
    } finally {
      busy = false;
      ['humanizeAll', 'dockAll', 'humanize', 'apply', 'applyExample', 'useExample', 'undo'].forEach((id) => { $(id).disabled = false; });
    }
  }

  input.addEventListener('input', onInput);
  input.addEventListener('scroll', () => { syncMirror(); updateCurTab(); }, { passive: true });
  input.addEventListener('paste', (e) => {
    const t = e.clipboardData && e.clipboardData.getData('text/plain');
    if (!t) return;
    e.preventDefault();
    const clean = window.Polidetector.tidy(t);
    if (!document.execCommand('insertText', false, clean)) {
      input.setRangeText(clean, input.selectionStart, input.selectionEnd, 'end');
      onInput();
    }
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); analyzeNow(); } });
  document.addEventListener('selectionchange', () => {
    if (document.activeElement !== input) return;
    clearTimeout(selTimer);
    selTimer = setTimeout(refreshDetail, 140);
  });
  $('tabs').addEventListener('click', (e) => {
    const t = e.target.closest('.tab');
    if (!t || !blocks[+t.dataset.k]) return;
    const first = blocks[+t.dataset.k].first;
    const m = marks.find((x) => x.i === first);
    if (!m) return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(m.a, m.a);
    scrollToSentence(first, 'force');
    refreshDetail();
  });
  $('sample').addEventListener('click', () => loadText(SAMPLE));
  $('sampleBig').addEventListener('click', () => loadText(SAMPLE));
  $('clear').addEventListener('click', () => loadText(''));
  $('undo').addEventListener('click', undo);
  $('reveal').addEventListener('click', () => { revealed = true; analyzeNow(); });
  $('humanizeAll').addEventListener('click', humanizeAll);
  $('dockAll').addEventListener('click', humanizeAll);
  // Entry point to the guided mode: show the marks if Turnitin's rules would hide them, then open the first flagged sentence.
  $('humanize').addEventListener('click', () => {
    if (!last) return;
    if (last.status !== 'ok' && !revealed) { revealed = true; analyzeNow(); }
    current = -1;
    nextFlagged();
  });
  $('useExample').addEventListener('click', copyExample);
  $('applyExample').addEventListener('click', applyExample);
  $('apply').addEventListener('click', applyRewrite);
  $('next').addEventListener('click', nextFlagged);
  $('rewrite').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) applyRewrite(); });
  if (window.ResizeObserver) new ResizeObserver(() => { syncMirror(); updateCurTab(); }).observe(input);
  window.addEventListener('resize', syncMirror);

  // The dock repeats the verdict only once the one in the panel has scrolled out of view.
  if (window.IntersectionObserver) {
    new IntersectionObserver((entries) => { verdictInView = entries[0].isIntersecting; $('dock').hidden = !last || verdictInView; }).observe($('stamp'));
  }
  updateCount();
  renderPanel();
})();
