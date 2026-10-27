// Polidetector: heuristic AI-text detector. Runs entirely in the browser (also loadable from Node for tests).
(function (root) {
  'use strict';

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // \b does not work with accented letters, so use Unicode letter lookarounds instead
  const wordRe = (list) =>
    new RegExp('(?<![\\p{L}\\p{N}])(?:' + list.map(esc).sort((a, b) => b.length - a.length).join('|') + ')(?![\\p{L}\\p{N}])', 'giu');

  const PHRASES = wordRe([
    // es
    'es importante destacar', 'es importante señalar', 'es importante tener en cuenta', 'es importante mencionar',
    'cabe destacar', 'cabe señalar', 'cabe mencionar', 'cabe resaltar', 'vale la pena mencionar', 'vale la pena destacar',
    'en conclusión', 'en resumen', 'en definitiva', 'en última instancia', 'en pocas palabras', 'en síntesis',
    'en el mundo actual', 'en el mundo de hoy', 'en el panorama actual', 'en la era digital', 'en la sociedad actual',
    'juega un papel', 'desempeña un papel', 'papel fundamental', 'papel crucial', 'papel clave', 'papel esencial',
    'sin lugar a dudas', 'sin duda alguna', 'a lo largo de la historia', 'en este sentido', 'dicho esto',
    'en otras palabras', 'de manera significativa', 'de manera efectiva', 'de forma significativa', 'de manera integral',
    'una amplia gama', 'un amplio abanico', 'una gran variedad de', 'un sinfín de', 'una miríada de',
    'adentrarnos en', 'sumergirnos en', 'profundizar en', 'en el ámbito de', 'en el contexto de',
    'un aspecto clave', 'es fundamental', 'es crucial', 'es esencial', 'resulta fundamental', 'resulta esencial',
    'pone de manifiesto', 'cobra especial relevancia', 'en constante evolución', 'en continua evolución',
    'ofrece una visión', 'abre la puerta a', 'marca un antes y un después', 'no solo', 'sino también',
    'espero que esto te ayude', 'espero que te sea útil', 'aquí tienes', 'por supuesto,', 'claro que sí',
    'teniendo en cuenta', 'de cara al futuro', 'un mundo cada vez más', 'cada vez más importante',
    'pieza clave', 'resulta clave', 'resultan fundamentales', 'resultan esenciales', 'apuesta por', 'coinciden en que',
    'en este contexto', 'ponen de manifiesto', 'todo ello',
    // es, storytelling
    'sin pensarlo dos veces', 'latió con fuerza', 'latía con fuerza', 'lágrimas en los ojos', 'desde aquel día',
    'desde ese día', 'a partir de aquel día', 'aprendió que', 'comprendió que', 'con pasos firmes', 'un tesoro',
    'en un instante', 'un susurro',
    // en
    "it's important to note", 'it is important to note', 'it is worth noting', "it's worth noting", 'it is essential to',
    'in conclusion', 'in summary', 'to sum up', "in today's", 'fast-paced', 'ever-evolving', 'ever-changing',
    'plays a crucial role', 'plays a vital role', 'plays a pivotal role', 'plays a key role', 'a testament to',
    'in the realm of', 'delve into', 'dive into', "let's dive", 'navigate the', 'a wide range of', 'a myriad of',
    'a plethora of', 'not only', 'but also', 'when it comes to', 'in other words', 'in essence', 'rich tapestry',
    'stands as a', 'serves as a', 'highlights the importance', 'underscores the importance', 'i hope this helps',
    'great question', "here's a", 'at its core', 'paving the way', 'in the digital age',
  ]);

  const BUZZ = wordRe([
    // es
    'crucial', 'cruciales', 'fundamental', 'fundamentales', 'esencial', 'esenciales', 'significativo', 'significativa',
    'significativos', 'significativas', 'holístico', 'holística', 'integral', 'innovador', 'innovadora', 'innovadores',
    'transformador', 'transformadora', 'fomentar', 'fomenta', 'potenciar', 'potencia', 'abordar', 'aborda', 'optimizar',
    'impulsar', 'impulsa', 'garantizar', 'panorama', 'ámbito', 'ámbitos', 'sinergia', 'paradigma', 'intrínseco',
    'multifacético', 'multifacética', 'robusto', 'robusta', 'primordial', 'enriquecedor', 'enriquecedora', 'invaluable',
    'vibrante', 'apasionante', 'fascinante', 'meticuloso', 'meticulosa', 'exhaustivo', 'exhaustiva', 'notable',
    'notablemente', 'indudablemente', 'asimismo', 'sostenible', 'eficiente', 'dinámico', 'dinámica',
    // en
    'delve', 'delves', 'tapestry', 'landscape', 'pivotal', 'crucial', 'vital', 'seamless', 'seamlessly', 'robust',
    'leverage', 'leveraging', 'foster', 'fostering', 'empower', 'empowering', 'unlock', 'elevate', 'enhance', 'enhancing',
    'streamline', 'comprehensive', 'multifaceted', 'holistic', 'nuanced', 'intricate', 'realm', 'testament', 'embark',
    'vibrant', 'bustling', 'meticulous', 'invaluable', 'transformative', 'innovative', 'paramount', 'notably',
    'profound', 'moreover', 'furthermore', 'additionally', 'ultimately', 'utilize', 'showcasing', 'boasts',
  ]);

  const OPENERS = new RegExp('^(?:' + [
    'además', 'asimismo', 'por otro lado', 'por otra parte', 'en primer lugar', 'en segundo lugar', 'en tercer lugar',
    'finalmente', 'por último', 'en conclusión', 'en resumen', 'no obstante', 'sin embargo', 'por lo tanto',
    'de este modo', 'de esta manera', 'así pues', 'en definitiva', 'en este sentido', 'por consiguiente',
    'moreover', 'furthermore', 'additionally', 'however', 'firstly', 'secondly', 'finally', 'overall',
    'ultimately', 'in addition', 'consequently', 'therefore',
  ].map(esc).join('|') + ')(?![\\p{L}])', 'iu');

  const INFORMAL_STRONG = wordRe([
    'jeje', 'jiji', 'xd', 'lol', 'lmao', 'idk', 'tbh', 'omg', 'o sea', 'en plan', 'tío', 'tía', 'ni idea', 'flipar',
    'flipé', 'flipando', 'mola', 'molaba', 'guay', 'curro', 'chaval', 'ostras', 'joder', 'hostia', 'madre mía', 'buah',
    'porfa', 'finde', 'xq', 'pq', 'tb', 'tmb', 'q', 'kinda', 'gonna', 'wanna', 'gotta', 'nah', 'dude', 'ugh', 'yeah',
    'cutre', 'rollo', 'menudo', 'menuda', 'peña', 'pasada', 'bua', 'uf', 'puf', 'vamos que', 'pues nada',
  ]);
  const LAUGH = /(?<![\p{L}])(?:ja){2,}|(?:je){2,}|(?:ha){2,}(?![\p{L}])/giu;
  const INFORMAL_WEAK = wordRe(['vale', 'bueno', 'pues', 'la verdad', 'igual', 'eh', 'vamos', 'honestly', 'okay', 'ok', 'anyway']);
  const FIRST_PERSON = wordRe(['yo', 'me', 'mi', 'mis', 'conmigo', 'i', "i'm", "i've", 'my', 'me']);

  const DASH = /[—–]/g;
  const TRIAD = /(?<![\p{L}])[\p{L}]+(?:\s[\p{L}]+)?,\s[\p{L}]+(?:\s[\p{L}]+)?,?\s(?:y|e|o|and|or)\s[\p{L}]+/iu;
  const NOT_X_BUT_Y = /(?:no\s(?:se\strata|es)\s[^.;]{1,60},\s?sino)|(?:(?:it's|it\sis)\snot\s(?:just\s|only\s|about\s)?[^.;]{1,50}[,;—–]\s?(?:it's|it\sis|but))/iu;
  const WORD = /[\p{L}\p{N}'’-]+/gu;

  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
  const stdev = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };

  // Split into sentences keeping character offsets so the UI can highlight the original text.
  function segment(text) {
    const out = [];
    let start = 0;
    const push = (end) => {
      const raw = text.slice(start, end);
      const lead = raw.length - raw.trimStart().length;
      const t = raw.trim();
      if (t) out.push({ text: t, start: start + lead, end: start + lead + t.length });
    };
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '\n') { push(i); start = i + 1; continue; }
      if ('.!?…'.includes(c)) {
        if (c === '.' && /\d/.test(text[i + 1] || '') && /\d/.test(text[i - 1] || '')) continue;
        let j = i + 1;
        while (j < text.length && '.!?…"»”\')]'.includes(text[j])) j++;
        if (j >= text.length || /\s/.test(text[j])) { push(j); start = j; i = j - 1; }
      }
    }
    push(text.length);
    return out;
  }

  function collect(re, s, kind, hits) {
    re.lastIndex = 0;
    let m;
    const found = [];
    while ((m = re.exec(s)) !== null) {
      found.push(m[0]);
      hits.push({ from: m.index, to: m.index + m[0].length, kind });
      if (m[0].length === 0) re.lastIndex++;
    }
    return found;
  }

  // Turnitin's published rules (guides.turnitin.com, "AI writing detection capabilities FAQs" and
  // "File requirements"): only prose sentences in long-form writing are evaluated; lists, headers,
  // references, tables, formulas and code are dropped and do not count towards the percentage.
  const REF_HEADING = /^\s*(?:#+\s*)?(?:referencias(?: bibliográficas)?|bibliografía|webgrafía|fuentes|references|bibliography|works cited|sources)\s*:?\s*$/iu;
  const CITATION = /(?:\(\d{4}[a-z]?\)|\b(?:19|20)\d{2}\)?\.\s|doi:|https?:\/\/|www\.|et al\.)/iu;

  function exclusion(line, s, words) {
    if (/^\s*(?:[-*•·▪◦–—]\s|\d+[.)]\s|[a-z][.)]\s)/iu.test(line)) return 'lista';
    if (/^\s*#{1,6}\s/u.test(line)) return 'título';
    if (/\t|\|/.test(line) || / {3,}\S/.test(line.trim())) return 'tabla';
    const letters = (s.match(/\p{L}/gu) || []).length;
    if (/[{}=<>^\\]|\);?$/.test(s) || letters / Math.max(s.replace(/\s/g, '').length, 1) < 0.5) return 'fórmula o código';
    if (!/[.!?…:;"»”)]$/u.test(line.trim()) && words < 12) return 'título';
    if (words < 3) return 'fragmento';
    return null;
  }

  // Every weight and threshold lives here so calibrar.html can tune them against a labelled corpus.
  // Values from the 2026-10-27 calibration (12 AI texts, 6 human): spanish dashes, openers and triads
  // turned out to be as common in human prose, so they barely count; human texts stand out by long,
  // comma-heavy sentences, concrete names and figures, and typing slips.
  const DEFAULTS = {
    minWords: 300,
    maxWords: 30000,
    base: -0.2,
    threshold: 0.6,
    // Turnitin reports more false positives in generic intro/conclusion sentences and raised the bar there.
    edgeThreshold: 0.7,
    edge: 2,
    ownWeight: 0.55,
    context: 3,
    paraUniform: 0.3,
    phrase: 1.1,
    buzz: 0.55,
    dash: 0.2,
    opener: 0.2,
    triad: 0.2,
    notXbutY: 0.9,
    bold: 0.6,
    burstFlat: 0.6,
    burstRegular: 0.25,
    burstVaried: -0.5,
    typicalLength: 0.35,
    longVocab: 0.35,
    informal: -1.4,
    filler: -0.45,
    expressive: -0.6,
    lowercase: -0.6,
    firstPerson: -0.5,
    veryShort: -0.4,
    veryLong: -0.6,
    longWords: 40,
    commaDense: -0.8,
    specific: -0.8,
    imperfect: -0.8,
  };

  function analyze(text, opts) {
    const C = Object.assign({}, DEFAULTS, opts);
    text = text || '';
    const sentences = segment(text);
    const totalWords = (text.match(WORD) || []).length;

    // Tag each sentence with its paragraph and whether it qualifies as prose.
    let inRefs = false;
    let para = 0;
    let lastLine = -1;
    sentences.forEach((s) => {
      const ls = text.lastIndexOf('\n', s.start - 1) + 1;
      let le = text.indexOf('\n', s.end);
      if (le < 0) le = text.length;
      const line = text.slice(ls, le);
      if (ls !== lastLine) {
        if (/\n\s*\n\s*$/.test(text.slice(0, ls)) || lastLine === -1) para++;
        lastLine = ls;
        if (REF_HEADING.test(line)) inRefs = true;
      }
      s.para = para;
      s.words = (s.text.match(WORD) || []).length;
      const refLike = CITATION.test(line) && /^\s*\p{Lu}[\p{L}'’-]+,\s\p{Lu}\./u.test(line);
      s.excluded = inRefs || refLike ? 'referencias' : exclusion(line, s.text, s.words);
    });
    const prose = sentences.filter((s) => !s.excluded);
    const proseWords = prose.reduce((n, s) => n + s.words, 0);

    // Burstiness: humans vary sentence length much more than LLMs do.
    const lens = prose.map((s) => s.words);
    const burst = lens.map((_, i) => {
      const win = lens.slice(Math.max(0, i - 2), i + 3);
      if (win.length < 4) return null;
      const cv = stdev(win) / mean(win);
      if (cv < 0.25) return { label: 'Frases vecinas de longitud casi idéntica', weight: C.burstFlat };
      if (cv < 0.4) return { label: 'Frases vecinas de longitud regular', weight: C.burstRegular };
      if (cv > 0.7) return { label: 'Frases vecinas de longitud muy variada', weight: C.burstVaried };
      return null;
    });
    const docReasons = [];
    let docBias = 0;
    const paraWords = {};
    prose.forEach((s) => { paraWords[s.para] = (paraWords[s.para] || 0) + s.words; });
    const paras = Object.values(paraWords).filter((n) => n > 15);
    if (paras.length >= 3 && stdev(paras) / mean(paras) < 0.2) {
      docBias += C.paraUniform; docReasons.push({ label: 'Párrafos de tamaño casi idéntico', weight: C.paraUniform });
    }

    const signals = {};
    const tally = (label) => { signals[label] = (signals[label] || 0) + 1; };

    prose.forEach((s, i) => {
      const t = s.text;
      const words = s.words;
      const reasons = [];
      const hits = [];
      let x = C.base + docBias;
      const add = (label, w, detail) => { x += w; reasons.push({ label, weight: w, detail }); };

      const phrases = collect(PHRASES, t, 'phrase', hits);
      if (phrases.length) add('Frases hechas típicas de IA', Math.min(phrases.length, 3) * C.phrase, phrases.join(', '));
      const buzz = collect(BUZZ, t, 'buzz', hits).filter((b) => !phrases.some((p) => p.toLowerCase().includes(b.toLowerCase())));
      if (buzz.length) add('Palabras comodín', Math.min(buzz.length, 3) * C.buzz, buzz.join(', '));
      const dashes = collect(DASH, t, 'dash', hits);
      if (dashes.length) add('Rayas (—) como pausa', Math.min(dashes.length, 2) * C.dash);
      if (OPENERS.test(t)) add('Empieza con conector formal', C.opener, t.match(OPENERS)[0]);
      if (TRIAD.test(t)) add('Enumeración de tres elementos', C.triad, t.match(TRIAD)[0]);
      if (NOT_X_BUT_Y.test(t)) add('Estructura «no es X, sino Y»', C.notXbutY);
      if (/\*\*[^*]+\*\*/.test(t)) add('Negritas dentro del texto', C.bold);
      if (burst[i]) add(burst[i].label, burst[i].weight);
      if (words >= 14 && words <= 32) add('Longitud de frase típica de IA', C.typicalLength);
      const letters = (t.match(/\p{L}/gu) || []).length;
      if (words >= 6 && letters / words > 5.6) add('Vocabulario largo y formal', C.longVocab);

      const informal = collect(INFORMAL_STRONG, t, 'human', hits).concat(collect(LAUGH, t, 'human', hits));
      if (informal.length) add('Tono coloquial', C.informal * Math.min(informal.length, 2), informal.join(', '));
      const weak = collect(INFORMAL_WEAK, t, 'human', hits);
      if (weak.length) add('Muletillas de conversación', C.filler * Math.min(weak.length, 2), weak.join(', '));
      if (/[!?]{2,}|\.{3}|…/.test(t)) add('Puntuación expresiva (!!, ...)', C.expressive);
      if (/^[\p{Ll}]/u.test(t)) add('Empieza en minúscula', C.lowercase);
      FIRST_PERSON.lastIndex = 0;
      if (FIRST_PERSON.test(t)) add('Habla en primera persona', C.firstPerson);
      FIRST_PERSON.lastIndex = 0;
      if (words < 6) add('Frase muy corta', C.veryShort);
      if (words > C.longWords) add('Frase muy larga y enredada', C.veryLong);
      // Students and journalists chain clauses with commas; LLM prose keeps about one comma per clause.
      const commas = (t.match(/,/g) || []).length;
      if (C.commaDense && words >= 10 && commas / words >= 0.12) add('Muchas comas encadenadas', C.commaDense);
      // Concrete names and figures: capitalised words mid-sentence or numbers with 3+ digits.
      const names = (t.slice(1).match(/(?<![.!?:«“"]\s)(?<=\s)\p{Lu}\p{Ll}+/gu) || []).length;
      if (C.specific && (names >= 2 || /\d[\d.,]{2,}/.test(t))) add('Nombres o cifras concretas', C.specific);
      // Typing slips LLMs never make: double spaces, a doubled word, a space before punctuation.
      const gap = text.slice(Math.max(0, s.start - 3), s.start);
      if (C.imperfect && (/ {2}/.test(gap) || /\S {2,}\S/.test(t) || /(?<![\p{L}])(\p{L}+) \1(?![\p{L}])/iu.test(t) || / [,.;:]/.test(t))) {
        add('Erratas de tecleo', C.imperfect);
      }

      Object.assign(s, { x, reasons, hits });
    });

    // Turnitin scores each sentence "in context with the surrounding text" using overlapping
    // segments of a few sentences, so blend each sentence with its neighbours in the same paragraph.
    prose.forEach((s, i) => {
      const win = prose.slice(Math.max(0, i - C.context), i + C.context + 1).filter((o) => o.para === s.para);
      const ctx = mean(win.map((o) => o.x));
      s.p = sigmoid(C.ownWeight * s.x + (1 - C.ownWeight) * ctx);
      s.own = sigmoid(s.x);
      s.edge = i < C.edge || i >= prose.length - C.edge;
      s.threshold = s.edge ? C.edgeThreshold : C.threshold;
      s.ai = s.p >= s.threshold;
      if (s.ai) s.reasons.filter((r) => r.weight > 0).forEach((r) => tally(r.label));
    });
    sentences.forEach((s) => { if (s.excluded) Object.assign(s, { p: null, ai: false, reasons: [], hits: [] }); });

    const aiCount = prose.filter((s) => s.ai).length;
    const raw = prose.length ? Math.round((aiCount / prose.length) * 100) : 0;
    let status = 'ok';
    if (proseWords < C.minWords) status = 'short';
    else if (proseWords > C.maxWords) status = 'long';
    else if (raw >= 1 && raw < 20) status = 'low';

    const excludedBy = {};
    sentences.filter((s) => s.excluded).forEach((s) => { excludedBy[s.excluded] = (excludedBy[s.excluded] || 0) + 1; });

    return {
      sentences,
      status,
      percentAI: raw,
      aiSentences: aiCount,
      evaluatedSentences: prose.length,
      proseWords,
      wordCount: totalWords,
      excludedBy,
      signals,
      docReasons,
      minWords: C.minWords,
    };
  }

  const api = { analyze, segment, DEFAULTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Polidetector = api;
})(typeof window !== 'undefined' ? window : globalThis);
