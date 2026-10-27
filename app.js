(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const input = $('input');
  const marked = $('marked');
  let last = null;
  let revealed = false;

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
      verdict = 'En este rango Turnitin no muestra cifra ni subraya frases, porque los falsos positivos son más probables.';
    } else {
      pct.textContent = r.percentAI; unit.textContent = '%';
      label.textContent = 'de la prosa evaluada tiene rasgos de IA';
      verdict = r.percentAI === 0 ? 'Ninguna frase supera el umbral, así que no hay indicios de IA. Eso no demuestra que sea humano: un texto de IA sin muletillas o retocado a mano puede pasar desapercibido.'
        : r.percentAI >= 70 ? 'La mayor parte de la prosa tiene rasgos de IA. Es un indicio, no una prueba.'
        : 'Una parte de la prosa tiene rasgos de IA. Revisa las frases marcadas en rojo. Es un indicio, no una prueba.';
    }
    $('verdict').textContent = verdict;
    const stamp = $('stamp');
    stamp.dataset.state = r.status === 'short' || r.status === 'long' ? 'none' : r.status === 'ok' && r.percentAI === 0 ? 'clean' : 'ai';

    const shownPct = r.status === 'ok' || revealed ? r.percentAI : 0;
    $('segAI').style.width = shownPct + '%';
    $('segHuman').style.width = (r.evaluatedSentences ? 100 - shownPct : 0) + '%';
    $('bar').setAttribute('aria-label', `IA ${r.percentAI}%, humana ${100 - r.percentAI}%`);
    $('bar').hidden = r.status !== 'ok' && !revealed;

    $('reveal').hidden = r.status === 'ok' || revealed || !r.evaluatedSentences;
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
    if (window.matchMedia('(max-width: 860px)').matches) $('detail').scrollIntoView({ block: 'nearest' });
  }

  function render() {
    renderMarked(last.text, last, last.status === 'ok' || revealed);
    renderPanel(last);
  }

  function run() {
    if (!words(input.value)) return;
    revealed = false;
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
