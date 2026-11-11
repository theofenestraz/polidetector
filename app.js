(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const input = $('input');
  const marked = $('marked');
  let last = null;
  let revealed = false;
  let current = -1;
  const history = [];
  let proposal = null;
  let boxSpan = null;
  let fresh = [];
  let busy = false;

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
  const updateCount = () => {
    const n = words(input.value);
    $('count').textContent = n === 1 ? '1 palabra' : n + ' palabras';
    $('analyze').disabled = n === 0;
    $('clear').disabled = n === 0;
  };

  const EXCL = { lista: 'lista', 'título': 'título', referencias: 'línea de referencias', tabla: 'tabla', 'fórmula o código': 'fórmula o código', fragmento: 'fragmento suelto', 'diálogo': 'línea de diálogo' };

  // Rebuild the original text with each sentence wrapped and, when shown, its flagged terms underlined.
  function renderMarked(text, res, showMarks) {
    marked.textContent = '';
    let pos = 0;
    res.sentences.forEach((s, i) => {
      if (s.start > pos) marked.append(text.slice(pos, s.start));
      const span = document.createElement('span');
      span.dataset.i = i;
      if (s.excluded) {
        span.className = 's excl';
        span.title = 'No evaluada: ' + EXCL[s.excluded];
        span.textContent = s.text;
      } else {
        span.className = 's ' + (showMarks ? (s.ai ? 'ai' : 'human') : 'plain');
        span.tabIndex = 0;
        span.title = 'Puntuación ' + s.p.toFixed(2);
        if (fresh.some((c) => s.start >= c.start && s.start < c.end)) { span.classList.add('new'); span.title += '. Reescrita por «Humanizar todo»'; }
        const ranges = showMarks ? s.hits.filter((h) => h.kind !== 'human').sort((a, b) => a.from - b.from) : [];
        let p = 0;
        for (const r of ranges) {
          if (r.from < p) continue;
          if (r.from > p) span.append(s.text.slice(p, r.from));
          const t = document.createElement('span');
          t.className = 't';
          t.textContent = s.text.slice(r.from, r.to);
          span.append(t);
          p = r.to;
        }
        span.append(s.text.slice(p));
      }
      marked.append(span);
      pos = s.end;
    });
    if (pos < text.length) marked.append(text.slice(pos));
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

  function plural(n, one, many) { return n === 1 ? '1 ' + one : n + ' ' + many; }

  const BAND_NAMES = { fuerte: 'Indicio fuerte', dudoso: 'Dudoso', 'sin-conclusion': 'Sin conclusión' };

  function renderPanel(r) {
    $('empty').hidden = true;
    $('result').hidden = false;
    $('detail').hidden = true;

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
      verdict = `Turnitin solo da porcentaje con al menos ${r.minWords} palabras de prosa y aquí hay ${r.proseWords}. Con menos texto el resultado es poco fiable y tiende a ser «todo o nada».`;
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
        : r.band === 'dudoso' ? 'Una parte de la prosa tiene rasgos de IA, pero este rango no permite decidir en ningún sentido. Revisa las frases marcadas en rojo. Es un indicio, no una prueba.'
        : r.percentAI === 0 ? 'Ninguna frase supera el umbral. Eso no demuestra que sea humano: un texto de IA sin muletillas o retocado a mano puede pasar desapercibido.'
        : 'Pocas frases superan el umbral, pero esto no demuestra que sea humano: también hay textos de IA en este rango.';
    }
    $('verdict').textContent = verdict;
    $('bandName').textContent = BAND_NAMES[r.band] || 'Sin veredicto';
    const stamp = $('stamp');
    stamp.dataset.state = r.band === 'fuerte' ? 'ai' : r.band === 'dudoso' ? 'doubt' : 'none';

    const shownPct = r.status === 'ok' || revealed ? r.percentAI : 0;
    $('segAI').style.width = shownPct + '%';
    $('segHuman').style.width = (r.evaluatedSentences ? 100 - shownPct : 0) + '%';
    $('bar').setAttribute('aria-label', `IA ${r.percentAI}%, humana ${100 - r.percentAI}%`);
    $('bar').hidden = r.status !== 'ok' && !revealed;

    $('reveal').hidden = r.status === 'ok' || revealed || !r.evaluatedSentences;
    $('humanizeBox').hidden = !r.aiSentences;
    $('signalsBox').hidden = !marksShown;
    $('hint').hidden = !marksShown;
    if (revealed && r.status !== 'ok') {
      $('verdict').textContent = verdict + ` Mostrando igualmente las frases: ${r.aiSentences} de ${r.evaluatedSentences} superan el umbral (${r.percentAI} %).`;
    }

    const list = $('signals');
    list.textContent = '';
    r.docReasons.forEach((d) => list.append(li(d.label, 'todo el texto')));
    Object.entries(r.signals).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .forEach(([l, n]) => list.append(li(l, plural(n, 'frase', 'frases'))));
    if (!list.children.length) list.append(li('Ninguna frase supera el umbral', ''));
  }

  function showDetail(i) {
    const s = last.sentences[i];
    if (s.excluded || !(last.status === 'ok' || revealed)) return;
    marked.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel'));
    marked.querySelector(`[data-i="${i}"]`).classList.add('sel');
    $('detail').hidden = false;
    const snippet = s.text.length > 140 ? s.text.slice(0, 140) + '…' : s.text;
    $('detailP').textContent = `«${snippet}». Puntuación en contexto ${s.p.toFixed(2)}, umbral ${s.threshold.toFixed(2)}${s.edge ? ' (más alto por estar al principio o al final)' : ''}: ${s.ai ? 'IA' : 'humana'}.`;
    const ul = $('detailList');
    ul.textContent = '';
    s.reasons.slice().sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
      .forEach((x) => ul.append(li(x.label, (x.weight > 0 ? '+' : '') + x.weight.toFixed(1), x.detail, x.weight < 0)));
    last.docReasons.forEach((d) => ul.append(li(d.label + ' (todo el texto)', '+' + d.weight.toFixed(1))));
    if (!ul.children.length) ul.append(li('Sin rasgos especiales en esta frase; pesa el contexto', ''));
    renderFix(s);
    current = i;
    $('delta').hidden = true;
    if (window.matchMedia('(max-width: 860px)').matches) $('detail').scrollIntoView({ block: 'nearest' });
  }

  // Guided rewriting: tips for the selected sentence and a box to rewrite it. Nothing is rewritten automatically.
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

  const fmt2 = (p) => p.toFixed(2).replace('.', ',');
  // What the percentage reads as on screen: Turnitin-style rules hide the figure between 1 % and 19 %.
  const shownPct = (pct) => (pct === 0 ? '0 %' : pct < 20 ? 'menos del 20 %' : pct + ' %');

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

  // Puts `next` where text[start, end) was and reads the text again. `s` is the sentence the change started from.
  function applyChange(s, start, end, next) {
    const before = { p: s.p, ai: s.ai, count: last.aiSentences, total: last.evaluatedSentences, pct: last.percentAI, status: last.status };
    history.push(input.value);
    input.value = last.text.slice(0, start) + next + last.text.slice(end);
    updateCount();
    // Rewrites usually shorten the text; if it drops under the word minimum, keep the marks visible anyway.
    if (last.status === 'ok') revealed = true;
    last = window.Polidetector.analyze(input.value);
    resetBulk();
    render();
    $('undo').hidden = false;
    // The rewrite may have split or merged sentences: select the first one that starts where the old one did.
    const j = last.sentences.findIndex((o) => !o.excluded && o.end > start);
    if (j < 0) return;
    showDetail(j);
    const now = last.sentences[j];
    const fmt = (p, ai) => fmt2(p) + (ai ? ' (IA)' : ' (humana)');
    const rose = before.status !== 'short' && last.status !== 'short' && last.percentAI > before.pct;
    say(`Puntuación de la frase: ${fmt(before.p, before.ai)} → ${fmt(now.p, now.ai)}. Frases como IA en el texto: ${before.count} de ${before.total} → ${last.aiSentences} de ${last.evaluatedSentences}. IA en el texto: ${shownPct(before.pct)} → ${shownPct(last.percentAI)}.${rose ? ' Ojo: con este cambio el porcentaje ha subido. Puedes volver atrás con «Deshacer cambio».' : ''}`, rose);
  }

  function applyRewrite() {
    const s = last.sentences[current];
    if (!s) { say('Toca primero una frase marcada del texto.', true); return; }
    const span = boxSpan || { start: s.start, end: s.end };
    const next = $('rewrite').value.trim();
    if (!next) { say('El cuadro está vacío. Escribe la nueva versión de la frase.', true); return; }
    if (next === last.text.slice(span.start, span.end)) { say('La frase del cuadro es igual que la del texto. Cambia algo o usa el ejemplo.', true); return; }
    applyChange(s, span.start, span.end, next);
  }

  // One click: the example replaces the sentence (or the pair it joins) without going through the box.
  function applyExample() {
    const s = last.sentences[current];
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

  // "Humanizar todo": rewrites only the flagged sentences, in one go, and can be undone like any other change.
  async function humanizeAll() {
    if (!last || busy) return;
    const snapshot = last;
    busy = true;
    ['humanizeAll', 'humanize', 'apply', 'applyExample', 'useExample', 'undo'].forEach((id) => { $(id).disabled = true; });
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
        $('bulkSummary').textContent = 'No he podido reescribir ninguna frase marcada sin empeorar el resto del texto. Prueba «Humanizar frase por frase»: ahí tienes consejos con cifras para cada una.';
        return;
      }
      history.push(input.value);
      input.value = res.text;
      updateCount();
      if (snapshot.status === 'ok') revealed = true;
      last = window.Polidetector.analyze(input.value);
      fresh = res.changes;
      $('bulk').hidden = false;
      render();
      $('undo').hidden = false;
      const joined = res.changes.filter((c) => c.merged).length;
      $('bulkSummary').hidden = false;
      $('bulkSummary').textContent = `He reescrito ${plural(res.changes.length, 'frase', 'frases')} de las ${res.flagged} marcadas${joined ? ` (${plural(joined, 'unión de dos frases', 'uniones de dos frases')})` : ''}. IA en el texto: ${shownPct(res.before.pct)} → ${shownPct(res.after.pct)}. Las demás frases no se han tocado. Están subrayadas en el texto y puedes volver atrás con «Deshacer cambio».${last.status === 'short' ? ` El texto se ha quedado por debajo de ${last.minWords} palabras de prosa, así que ya no se muestra el porcentaje.` : ''}`;
      const items = $('bulkItems');
      items.textContent = '';
      res.changes.forEach((c) => {
        const li2 = document.createElement('li');
        const was = document.createElement('div');
        was.className = 'was';
        was.textContent = c.before;
        const now = document.createElement('div');
        now.className = 'now';
        now.textContent = c.after;
        li2.append(was, now);
        items.append(li2);
      });
      $('bulkList').hidden = false;
      if (res.after.ai) {
        $('bulkLeft').hidden = false;
        $('bulkLeft').textContent = `Siguen marcadas ${plural(res.after.ai, 'frase', 'frases')} que no se pueden cambiar solas sin empeorar el texto. Revísalas con «Humanizar frase por frase».`;
      }
    } finally {
      busy = false;
      ['humanizeAll', 'humanize', 'apply', 'applyExample', 'useExample', 'undo'].forEach((id) => { $(id).disabled = false; });
    }
  }

  function nextFlagged() {
    const n = last.sentences.length;
    for (let k = 1; k <= n; k++) {
      const j = (current + k) % n;
      if (last.sentences[j].ai) {
        showDetail(j);
        // Jump to the tips and rewrite box, not to the sentence: the detail already quotes it, and on a
        // phone the text sits above the panel, so scrolling there hid everything the button had just opened.
        $('detail').scrollIntoView({ block: 'start', behavior: 'smooth' });
        return;
      }
    }
  }

  function undo() {
    if (!history.length) return;
    input.value = history.pop();
    updateCount();
    last = window.Polidetector.analyze(input.value);
    resetBulk();
    render();
    $('undo').hidden = !history.length;
  }

  function render() {
    renderMarked(last.text, last, last.status === 'ok' || revealed);
    renderPanel(last);
  }

  function run() {
    if (!words(input.value)) return;
    revealed = false;
    history.length = 0;
    current = -1;
    resetBulk();
    $('undo').hidden = true;
    last = window.Polidetector.analyze(input.value);
    render();
    // Replay the stamp landing on every new analysis (not on "Ver las frases igualmente").
    const stamp = $('stamp');
    stamp.classList.remove('land');
    void stamp.offsetWidth;
    stamp.classList.add('land');
    $('editor').hidden = true;
    marked.hidden = false;
    $('edit').hidden = false;
    $('analyze').hidden = true;
  }

  function edit() {
    marked.hidden = true;
    $('editor').hidden = false;
    $('edit').hidden = true;
    $('analyze').hidden = false;
    input.focus();
  }

  function clear() {
    input.value = '';
    last = null;
    current = -1;
    resetBulk();
    marked.textContent = '';
    $('result').hidden = true;
    $('empty').hidden = false;
    updateCount();
    edit();
  }

  $('analyze').addEventListener('click', run);
  $('edit').addEventListener('click', edit);
  $('clear').addEventListener('click', clear);
  $('reveal').addEventListener('click', () => { revealed = true; render(); });
  // Entry point to the guided mode: show the marks if Turnitin's rules would hide them, then open the first flagged sentence.
  $('humanize').addEventListener('click', () => {
    if (last.status !== 'ok' && !revealed) { revealed = true; render(); }
    current = -1;
    nextFlagged();
    // On a phone focusing would pop the keyboard over the tips.
    if (!window.matchMedia('(max-width: 860px)').matches) $('rewrite').focus({ preventScroll: true });
  });
  $('apply').addEventListener('click', applyRewrite);
  $('useExample').addEventListener('click', copyExample);
  $('applyExample').addEventListener('click', applyExample);
  $('humanizeAll').addEventListener('click', humanizeAll);
  $('next').addEventListener('click', nextFlagged);
  $('undo').addEventListener('click', undo);
  $('rewrite').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) applyRewrite(); });
  $('sample').addEventListener('click', () => { input.value = SAMPLE; updateCount(); run(); });
  input.addEventListener('input', updateCount);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(); });
  marked.addEventListener('click', (e) => { const s = e.target.closest('.s'); if (s) showDetail(+s.dataset.i); });
  marked.addEventListener('keydown', (e) => {
    const s = e.target.closest('.s');
    if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showDetail(+s.dataset.i); }
  });
  updateCount();
})();
