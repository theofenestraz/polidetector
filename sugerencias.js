// Polidetector: writing tips for a flagged sentence. It only suggests; the user rewrites the sentence.
(function (root) {
  'use strict';

  // One tip per reason label from detector.js. Only reasons that push towards AI get a tip.
  const TIPS = {
    'Frases hechas típicas de IA': 'Quita la fórmula o di directamente lo que querías señalar. Si la frase se sostiene sin ella, sobraba.',
    'Palabras comodín': 'Cámbiala por una palabra más corriente o, mejor, por el dato o el ejemplo concreto que hay detrás.',
    'Rayas (—) como pausa': 'Usa una coma, un punto o un paréntesis en lugar de la raya.',
    'Empieza con conector formal': 'Empieza por el sujeto o por lo que pasa. Si la relación con la frase anterior ya se entiende, el conector sobra.',
    'Enumeración de tres elementos': '¿Hacen falta los tres? Quédate con los que aportan algo o desarrolla uno con un ejemplo.',
    'Estructura «no es X, sino Y»': 'Di directamente lo que es, sin negar antes algo que nadie había dicho.',
    'Negritas dentro del texto': 'Quita las negritas del texto corrido.',
    'Frases vecinas de longitud casi idéntica': 'Varía la longitud: parte esta frase en dos o únela con la siguiente.',
    'Frases vecinas de longitud regular': 'Alterna frases cortas y largas en este tramo. Una frase breve después de una larga basta.',
    'Longitud de frase típica de IA': 'Tiene la longitud media en la que suele escribir la IA (entre 14 y 32 palabras). Prueba a acortarla mucho o a encadenarle otra idea.',
    'Vocabulario largo y formal': 'Cambia los términos largos y abstractos por otros más corrientes, los que usarías al explicarlo en voz alta.',
  };

  // Plain alternatives for common flagged terms. An empty string means "just remove it".
  const ALTS_ES = {
    'es importante destacar': ['', 'ojo:'], 'es importante señalar': [''], 'es importante tener en cuenta': ['', 'hay que contar con'],
    'es importante mencionar': [''], 'cabe destacar': [''], 'cabe señalar': [''], 'cabe mencionar': [''], 'cabe resaltar': [''],
    'vale la pena mencionar': [''], 'vale la pena destacar': [''],
    'en conclusión': ['', 'al final', 'así que'], 'en resumen': ['', 'total, que'], 'en definitiva': ['', 'al final'],
    'en última instancia': ['al final'], 'en síntesis': [''], 'en pocas palabras': [''],
    'en el mundo actual': ['hoy', 'ahora'], 'en el mundo de hoy': ['hoy'], 'en el panorama actual': ['ahora'],
    'en la era digital': ['ahora', 'con internet'], 'en la sociedad actual': ['hoy'],
    'juega un papel': ['influye', 'pesa'], 'desempeña un papel': ['influye', 'sirve'],
    'papel fundamental': ['mucho peso'], 'papel crucial': ['mucho peso'], 'papel clave': ['mucho peso'], 'papel esencial': ['mucho peso'],
    'sin lugar a dudas': ['', 'claramente'], 'sin duda alguna': [''], 'a lo largo de la historia': ['siempre', 'desde hace siglos'],
    'en este sentido': [''], 'dicho esto': ['', 'aun así'], 'en otras palabras': ['', 'o sea'],
    'de manera significativa': ['', 'bastante'], 'de forma significativa': ['', 'bastante'],
    'de manera efectiva': ['bien'], 'de manera integral': ['entero', 'del todo'],
    'una amplia gama': ['todo tipo'], 'un amplio abanico': ['todo tipo'], 'una gran variedad de': ['todo tipo de'],
    'un sinfín de': ['mil'], 'una miríada de': ['mil'],
    'adentrarnos en': ['ver', 'meternos en'], 'sumergirnos en': ['ver'], 'profundizar en': ['ver más a fondo'],
    'en el ámbito de': ['en'], 'en el contexto de': ['en'], 'un aspecto clave': ['lo principal'],
    'es fundamental': ['hace falta', 'hay que'], 'es crucial': ['hace falta', 'hay que'], 'es esencial': ['hace falta', 'hay que'],
    'resulta fundamental': ['hace falta'], 'resulta esencial': ['hace falta'], 'resulta clave': ['importa mucho'],
    'pone de manifiesto': ['muestra', 'deja ver'], 'ponen de manifiesto': ['muestran'], 'cobra especial relevancia': ['importa más'],
    'en constante evolución': ['que cambia mucho'], 'en continua evolución': ['que cambia mucho'],
    'abre la puerta a': ['permite'], 'marca un antes y un después': ['cambia mucho'],
    'teniendo en cuenta': ['viendo'], 'de cara al futuro': ['más adelante'], 'un mundo cada vez más': ['un mundo más'],
    'cada vez más importante': ['más importante'], 'pieza clave': ['parte importante'], 'apuesta por': ['elige', 'prefiere'],
    'en este contexto': ['', 'aquí'], 'todo ello': ['esto'],
    // First alternative keeps gender and number, because the example generator always tries it first.
    crucial: ['importante', 'clave'], cruciales: ['importantes'], fundamental: ['importante', 'clave'], fundamentales: ['importantes'],
    esencial: ['clave', 'importante'], esenciales: ['importantes'], significativo: ['grande', 'claro'], significativa: ['grande', 'clara'],
    significativos: ['grandes'], significativas: ['grandes'], 'holístico': ['completo'], 'holística': ['completa'], integral: ['global'],
    innovador: ['nuevo'], innovadora: ['nueva'], innovadores: ['nuevos'], transformador: ['que cambia mucho'],
    fomentar: ['favorecer', 'animar a'], fomenta: ['favorece'], potenciar: ['mejorar', 'reforzar'], potencia: ['mejora', 'refuerza'],
    abordar: ['tratar', 'resolver'], aborda: ['trata'], optimizar: ['mejorar', 'agilizar'], impulsar: ['empujar', 'ayudar a'],
    impulsa: ['empuja', 'ayuda a'], garantizar: ['asegurar'], panorama: ['escenario'], 'ámbito': ['campo', 'terreno'],
    'ámbitos': ['campos', 'sectores'], sinergia: ['colaboración'], paradigma: ['modelo', 'forma de pensar'], 'intrínseco': ['propio'],
    'multifacético': ['variado'], 'multifacética': ['variada'], robusto: ['sólido', 'fiable'], robusta: ['sólida', 'fiable'],
    primordial: ['lo primero', 'principal'], enriquecedor: ['útil', 'que aporta'], enriquecedora: ['útil'], invaluable: ['muy útil'],
    vibrante: ['con mucha vida'], apasionante: ['interesante'], fascinante: ['interesante', 'curioso'],
    meticuloso: ['cuidadoso'], meticulosa: ['cuidadosa'], exhaustivo: ['completo', 'a fondo'], exhaustiva: ['completa'],
    notable: ['importante', 'claro'], notablemente: ['bastante', 'mucho'], indudablemente: ['', 'claramente'], asimismo: ['también', ''],
    sostenible: ['que aguanta', 'que dura'], eficiente: ['que funciona bien', 'rápido'], 'dinámico': ['activo', 'que cambia'],
    'además': ['', 'y', 'también'], 'sin embargo': ['pero'], 'por otro lado': ['', 'pero'], 'por otra parte': ['', 'pero'], 'en primer lugar': ['', 'primero'],
    'en segundo lugar': ['', 'luego'], 'en tercer lugar': ['', 'y'], finalmente: ['', 'al final'], 'por último': ['', 'y'],
    'no obstante': ['pero'], 'por lo tanto': ['así que'], 'de este modo': ['así'], 'de esta manera': ['así'],
    'así pues': ['así que'], 'por consiguiente': ['así que'],
  };
  const ALTS_EN = {
    "it's important to note": [''], 'it is important to note': [''], 'it is worth noting': [''], "it's worth noting": [''],
    'in conclusion': ['', 'so'], 'in summary': ['', 'so'], 'to sum up': [''], 'plays a crucial role': ['matters a lot'],
    'plays a vital role': ['matters a lot'], 'plays a key role': ['matters a lot'], 'plays a pivotal role': ['matters a lot'],
    'delve into': ['look at'], 'dive into': ['look at'], 'a wide range of': ['many'], 'a myriad of': ['many'], 'a plethora of': ['many'],
    'when it comes to': ['with', 'for'], 'in other words': ['', 'so'], 'in essence': [''], 'a testament to': ['proof of'],
    'in the realm of': ['in'], delve: ['look'], tapestry: ['mix'], landscape: ['field', 'scene'], pivotal: ['key', 'important'],
    vital: ['important'], seamless: ['smooth'], seamlessly: ['smoothly'], robust: ['solid'], leverage: ['use'], leveraging: ['using'],
    foster: ['encourage'], fostering: ['encouraging'], empower: ['help'], unlock: ['open', 'allow'], elevate: ['raise', 'improve'],
    enhance: ['improve'], enhancing: ['improving'], streamline: ['simplify'], comprehensive: ['full', 'complete'],
    multifaceted: ['varied'], holistic: ['whole'], nuanced: ['subtle'], intricate: ['complex'], realm: ['field'], embark: ['start'],
    vibrant: ['lively'], bustling: ['busy'], meticulous: ['careful'], invaluable: ['very useful'], transformative: ['big'],
    innovative: ['new'], paramount: ['most important'], notably: ['especially'], profound: ['deep'], moreover: ['also', ''],
    furthermore: ['also', ''], additionally: ['also', ''], ultimately: ['in the end'], utilize: ['use'], showcasing: ['showing'], boasts: ['has'],
  };
  const ALTS = Object.assign({}, ALTS_ES, ALTS_EN);
  const EN_WORDS = new Set(['the', 'of', 'and', 'to', 'is', 'that', 'it', 'for', 'was', 'with', 'as', 'are', 'this', 'which', 'their', 'they', 'by', 'from', 'have', 'has', 'be', 'on', 'can', 'may', 'an']);
  const ES_WORDS = new Set(['de', 'la', 'que', 'el', 'en', 'y', 'los', 'del', 'las', 'por', 'una', 'con', 'para', 'es', 'se', 'su', 'al', 'lo', 'como', 'más']);
  // Sentence language, so Spanish alternatives are never offered inside an English sentence or the other way round.
  function isEnglish(t) {
    let en = 0;
    let es = 0;
    (t.toLowerCase().match(/\p{L}+/gu) || []).forEach((w) => { if (EN_WORDS.has(w)) en++; if (ES_WORDS.has(w)) es++; });
    return en > es;
  }

  function alternatives(terms) {
    const seen = new Set();
    const out = [];
    (terms || '').split(', ').forEach((t) => {
      const k = t.toLowerCase();
      if (!k || seen.has(k) || !ALTS[k]) return;
      seen.add(k);
      out.push({ term: t, alts: ALTS[k].map((a) => a || 'quitarlo') });
    });
    return out;
  }

  // Lengths of the prose sentences next to s, so the tips can name real numbers.
  function neighbourLengths(s, doc) {
    const prose = (doc && doc.sentences ? doc.sentences : []).filter((o) => !o.excluded);
    const i = prose.indexOf(s);
    return i < 0 ? [] : prose.slice(Math.max(0, i - 2), i + 3).filter((o) => o !== s).map((o) => o.words);
  }

  // Tips for one analysed sentence, strongest reason first. `doc` is the whole analysis, used for numbers.
  function suggest(s, doc) {
    if (!s || s.excluded) return [];
    const near = neighbourLengths(s, doc);
    const tipFor = (label) => {
      if (label === 'Longitud de frase típica de IA') {
        return `Tiene ${s.words} palabras, dentro del rango en el que suele escribir la IA (de 14 a 32). Déjala en 13 o menos quitando lo que no aporte, o llévala a 33 o más uniendo otra idea.`;
      }
      if ((label === 'Frases vecinas de longitud casi idéntica' || label === 'Frases vecinas de longitud regular') && near.length) {
        return `Las frases de alrededor miden ${near.join(', ')} palabras y esta ${s.words}. Haz esta claramente más corta (de 5 a 8 palabras) o más larga (35 o más) que ellas.`;
      }
      return TIPS[label];
    };
    const tips = s.reasons
      .filter((r) => r.weight > 0 && TIPS[r.label])
      .sort((a, b) => b.weight - a.weight)
      .map((r) => {
        const t = { label: r.label, tip: tipFor(r.label), alts: [] };
        if (r.label === 'Frases hechas típicas de IA' || r.label === 'Palabras comodín' || r.label === 'Empieza con conector formal') {
          t.alts = alternatives(r.detail);
        }
        return t;
      });
    // Flagged mostly because of its neighbours: own score below the bar, context pushes it over.
    if (s.ai && doc && doc.docReasons && doc.docReasons.length) {
      tips.push({ label: 'Párrafos de tamaño casi idéntico', tip: 'Todos los párrafos miden casi lo mismo. Alarga uno de ellos o acorta otro, aunque sea uniendo dos.', alts: [] });
    }
    if (s.ai && s.own < s.threshold) {
      tips.push({ label: 'Pesa el contexto', tip: 'Esta frase por sí sola no llega al umbral; la arrastran las de alrededor. Revisa también las frases vecinas marcadas.', alts: [] });
    }
    return tips;
  }

  // Example rewrite built from the same rules: try each edit in turn and keep it only when the detector
  // scores the sentence lower. It cannot check grammar or meaning, so the UI shows it as a draft to revise.
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const termRe = (k) => new RegExp('(?<![\\p{L}\\p{N}])' + esc(k) + '(?![\\p{L}\\p{N}])', 'iu');
  // Role phrases are rewritten whole, verb included; the bare keys would leave "influye fundamental".
  const SKIP = /^(?:juega|desempeña|papel) /;
  const ROLE = /(?<![\p{L}])(juega|juegan|desempeña|desempeñan|tiene|tienen|cumple|cumplen) un papel(?: (?:muy )?(?:fundamental|crucial|clave|esencial|importante|decisivo|central|relevante|vital|determinante))?(?![\p{L}])/iu;
  const SPLITS = [
    [', y ', '. Y '], [', pero ', '. Pero '], ['; ', '. '], [', aunque ', '. Aunque '], [', ya que ', '. Es que '],
    [', lo que ', '. Eso '], [', porque ', '. Porque '], [', mientras que ', '. En cambio, '], [', por lo que ', '. Así que '],
    [', de modo que ', '. Así, '], [', así que ', '. Así que '], [', es decir, ', '. Es decir, '], [', sin embargo, ', '. Sin embargo, '],
    [', dado que ', '. Es que '], [', puesto que ', '. Es que '], [', y por eso ', '. Por eso '], [', y por ello ', '. Por ello '],
    [', y además ', '. Además '], [', y también ', '. También '], [', por tanto, ', '. Por tanto, '], [', de ahí que ', '. De ahí que '],
    [', which ', '. That '], [', but ', '. But '], [', and ', '. And '], [', so ', '. So '], [', although ', '. Although '],
  ];
  // Low-information adverbs that can go without changing what the sentence says.
  const ADVERBS = ['con frecuencia', 'a menudo', 'en gran medida', 'en general', 'en la actualidad', 'hoy en día', 'actualmente',
    'generalmente', 'habitualmente', 'principalmente', 'especialmente', 'particularmente', 'básicamente', 'realmente', 'claramente',
    'simplemente', 'sencillamente', 'prácticamente', 'bastante', 'muy', 'casi', 'incluso', 'tal vez', 'quizá', 'quizás', 'en realidad',
    'de hecho', 'sin duda', 'por supuesto', 'todavía',
    // en
    'very', 'really', 'quite', 'actually', 'basically', 'generally', 'typically', 'particularly', 'especially', 'essentially', 'simply',
    'clearly', 'often', 'almost', 'currently', 'in general', 'in fact', 'of course'];
  // Closing clauses that only decorate the main one ("..., dando lugar a una estructura blanda").
  const TAIL = /,\s+(?:dando lugar|lo que permite|lo cual|permitiendo|facilitando|garantizando|asegurando|fomentando|promoviendo|contribuyendo|ayudando|favoreciendo|convirtiéndose|haciendo que|generando|provocando|dejando|situándose|marcando|constituyendo|representando|suponiendo|reflejando|mostrando|poniendo|allowing|enabling|making|helping|ensuring|providing|leading|creating|offering|which means|which allows|which makes)(?![\p{L}])[^,;.!?]*(?=[.!?…]+["»”’)]*$)/iu;
  // Looser closing clauses (relative, concessive, hedges). Dropping them loses more, so they come after TAIL.
  const TAIL2 = /,\s+(?:que|donde|cuando|cuyo|cuya|cuyos|cuyas|tal vez|quizá|quizás|probablemente|sobre todo|incluso|según|como|aunque|mientras)(?![\p{L}])[^;.!?]*(?=[.!?…]+["»”’)]*$)/iu;
  // An aside between two commas that starts like an apposition or a participle clause.
  const ASIDE = /,\s+((?:como|según|incluyendo|es decir|por ejemplo|en particular|sobre todo|tanto|especialmente|\p{L}+(?:ado|ada|ados|adas|ido|ida|idos|idas|ante|ando|iendo))\s[^,;.!?]{8,90}),\s+/iu;
  const FRONT = /^((?:en|a|durante|hoy|con|por|desde|tras|según|gracias|ante|hasta|hace|para)\s[^,]{3,45}),\s+(?=\p{L})/iu;
  const wc = (t) => (t.match(/[\p{L}\p{N}'’-]+/gu) || []).length;

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function tidy(s) {
    let t = s
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\s+([,.;:])/g, '$1')
      .replace(/,\s*,/g, ',')
      .replace(/,\s*([.;:])/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s,;:]+/, '')
      .trim();
    // Removing "Es importante destacar" or "cabe señalar" leaves a dangling "que".
    t = t.replace(/^que\s+/i, '').replace(/([.;]\s+)que\s+/gi, '$1');
    t = t.replace(/^(Pero|Y|Así que|Así|También|Al final|Hoy|Ahora|And|But|So),\s/, '$1 ');
    t = t.replace(/([.!?]\s+)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
    return cap(t);
  }

  function edits(text) {
    const list = [];
    const dict = isEnglish(text) ? ALTS_EN : ALTS_ES;
    const keys = Object.keys(dict).filter((k) => !SKIP.test(k)).sort((a, b) => b.length - a.length);
    const m = text.match(ROLE);
    if (m) {
      const plural = /n$/i.test(m[1]);
      (plural ? ['influyen mucho', 'pesan mucho'] : ['influye mucho', 'pesa mucho'])
        .forEach((a) => list.push((t) => t.replace(ROLE, (hit) => (/^\p{Lu}/u.test(hit) ? cap(a) : a))));
    }
    keys.forEach((k) => {
      const re = termRe(k);
      if (!re.test(text)) return;
      dict[k].forEach((a) => list.push((t) => t.replace(re, (hit) => (a && /^\p{Lu}/u.test(hit) ? cap(a) : a))));
    });
    list.push((t) => t.replace(/\s*[—–]\s*/g, ', '));
    list.push((t) => t.replace(/no se trata (?:solo |solamente |únicamente )?de ([^,;.]+),\s?sino (?:de )?([^.;]+)/i, 'más que $1, es $2'));
    list.push((t) => t.replace(/no es (?:solo |solamente )?([^,;.]+),\s?sino ([^.;]+)/i, 'es $2, más que $1'));
    list.push((t) => t.replace(/no solo ([^,;.]+?),?\s+sino también ([^.;]+)/i, '$1 y también $2'));
    // Split a long sentence at the joint closest to its middle; both halves need a few words.
    list.push((t) => {
      let best = null;
      SPLITS.forEach(([from, to]) => {
        let i = t.toLowerCase().indexOf(from);
        while (i > 0) {
          const a = t.slice(0, i).split(/\s+/).length;
          const b = t.slice(i + from.length).split(/\s+/).length;
          const off = Math.abs(a - b);
          // "A, B, y C" closes a list: splitting there leaves C stranded.
          const closesList = /^, (?:y|and|e|o|or) $/.test(from) && t.slice(0, i).includes(',');
          if (a >= 5 && b >= 5 && !closesList && (!best || off < best.off)) best = { off, s: t.slice(0, i) + to + t.slice(i + from.length) };
          i = t.toLowerCase().indexOf(from, i + 1);
        }
      });
      return best ? best.s : t;
    });
    // Shortening edits come last: they lose a little information, so they only apply when nothing gentler works.
    const shorter = (f) => (t) => { const r = f(t); return wc(r) >= 6 ? r : t; };
    ADVERBS.filter((a) => termRe(a).test(text)).forEach((a) => {
      const re = new RegExp('(,\\s*)?(?<![\\p{L}\\p{N}])' + esc(a) + '(?![\\p{L}\\p{N}])(\\s*,)?', 'iu');
      list.push(shorter((t) => t.replace(re, (m, before, after) => (before && after ? ',' : ' '))));
    });
    list.push(shorter((t) => t.replace(TAIL, '')));
    // "A y el debate cambió" can become two sentences, but only when the second half brings its own subject.
    list.push((t) => {
      let best = null;
      [[' y ', '. Y '], [' pero ', '. Pero ']].forEach(([from, to]) => {
        let i = t.toLowerCase().indexOf(from);
        while (i > 0) {
          const rest = t.slice(i + from.length);
          const first = (rest.match(/^\p{L}+/u) || [''])[0].toLowerCase();
          const a = wc(t.slice(0, i));
          const b = wc(rest);
          const off = Math.abs(a - b);
          if (a >= 5 && b >= 5 && LOWER_OK.has(first) && !t.slice(0, i).includes(',') && !isEnglish(t) && (!best || off < best.off)) best = { off, s: t.slice(0, i) + to + rest };
          i = t.toLowerCase().indexOf(from, i + 1);
        }
      });
      return best ? best.s : t;
    });
    list.push(shorter((t) => t.replace(ASIDE, ' ')));
    list.push(shorter((t) => t.replace(TAIL2, '')));
    list.push(shorter((t) => { const m = t.match(FRONT); return m && wc(m[1]) <= 6 ? t.slice(m[0].length) : t; }));
    return list;
  }

  // First words that stay the same when they move from the start of a sentence to the middle of one.
  const LOWER_OK = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos',
    'esas', 'su', 'sus', 'mi', 'mis', 'en', 'de', 'a', 'con', 'por', 'para', 'sin', 'sobre', 'tras', 'ante', 'durante', 'desde', 'hasta',
    'según', 'entre', 'esto', 'eso', 'ello', 'lo', 'se', 'cuando', 'aunque', 'mientras', 'si', 'como', 'cada', 'todo', 'todos', 'todas',
    'muchos', 'muchas', 'algunos', 'algunas', 'otros', 'otras', 'también', 'además', 'así', 'pero', 'no', 'aun', 'hoy', 'ahora',
    'the', 'a', 'an', 'this', 'that', 'these', 'those', 'in', 'on', 'at', 'with', 'for', 'from', 'by', 'it', 'they', 'he', 'she', 'we', 'however',
    'also', 'but', 'so', 'as', 'when', 'while', 'if', 'many', 'some', 'most', 'there', 'their', 'its', 'his', 'her', 'our', 'these', 'such']);
  // Two sentences as one, with a semicolon. Null when the second one starts with a name or something unknown.
  function join(a, b) {
    const first = (b.match(/^\p{L}+/u) || [''])[0];
    if (!/[.]$/.test(a) || !/[.!?…]$/.test(b) || /^[¿¡]/.test(b) || !LOWER_OK.has(first.toLowerCase()) || first !== first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()) return null;
    return a.replace(/[.]+$/, '') + '; ' + b.charAt(0).toLowerCase() + b.slice(1);
  }

  // Scores a candidate sentence placed back in the whole text: the sentences it covers and the share of flagged
  // sentences in the document, because a rewrite also changes how its neighbours are read.
  function scoreCandidate(text, from, to, cand) {
    const r = root.Polidetector.analyze(text.slice(0, from) + cand + text.slice(to));
    const end = from + cand.length;
    const hit = r.sentences.filter((o) => !o.excluded && o.end > from && o.start < end);
    return {
      p: hit.length ? Math.max(...hit.map((o) => o.p)) : Infinity,
      ai: hit.some((o) => o.ai),
      frac: r.evaluatedSentences ? r.aiSentences / r.evaluatedSentences : 0,
      pct: r.percentAI,
    };
  }

  // Looks for a rewrite of the flagged sentence s that lowers its score without raising the share of flagged
  // sentences in the text. It stops at the first rewrite that clears the flag, so changes stay as small as
  // possible: single edits first, then pairs of edits when no single one is enough.
  function propose(text, base, s, budget) {
    const limit = budget || 500;
    let evals = 0;
    const score = (cand) => { evals++; return scoreCandidate(text, s.start, s.end, cand); };
    const start = { p: s.p, ai: s.ai, frac: base.evaluatedSentences ? base.aiSentences / base.evaluatedSentences : 0, pct: base.percentAI };
    const ok = (a, b) => a.frac <= b.frac + 1e-9 && a.p < b.p - 0.005;
    const valid = (c, from) => c && c !== from && wc(c) >= 3;
    let cur = Object.assign({ text: s.text }, start);
    for (let pass = 0; pass < 3 && cur.ai; pass++) {
      let moved = false;
      for (const edit of edits(cur.text)) {
        if (evals >= limit) break;
        const c = tidy(edit(cur.text));
        if (!valid(c, cur.text)) continue;
        const sc = score(c);
        if (ok(sc, cur)) { cur = Object.assign({ text: c }, sc); moved = true; if (!cur.ai) break; }
      }
      if (!moved) break;
    }
    if (cur.ai) {
      search: for (const e1 of edits(s.text)) {
        const c1 = tidy(e1(s.text));
        if (!valid(c1, s.text)) continue;
        for (const e2 of edits(c1)) {
          if (evals >= limit) break search;
          const c2 = tidy(e2(c1));
          if (!valid(c2, c1)) continue;
          const sc = score(c2);
          if (isFinite(sc.p) && !sc.ai && sc.frac <= start.frac + 1e-9) { cur = Object.assign({ text: c2 }, sc); break search; }
        }
      }
    }
    let span = { start: s.start, end: s.end, merged: false };
    // Last resort: join it with a neighbouring sentence that is flagged too, so only flagged sentences change.
    if (cur.ai) {
      const i = base.sentences.indexOf(s);
      for (const n of [base.sentences[i + 1], base.sentences[i - 1]]) {
        if (!n || n.excluded || !n.ai || n.para !== s.para) continue;
        const after = n.start > s.start;
        const joined = after ? join(s.text, n.text) : join(n.text, s.text);
        if (!joined) continue;
        const from = after ? s.start : n.start;
        const to = after ? n.end : s.end;
        const sc = scoreCandidate(text, from, to, joined);
        if (isFinite(sc.p) && !sc.ai && sc.frac <= start.frac + 1e-9) {
          cur = Object.assign({ text: joined }, sc);
          span = { start: from, end: to, merged: true };
          break;
        }
      }
    }
    const original = text.slice(span.start, span.end);
    return { text: cur.text, before: start, after: cur, changed: cur.text !== original, solved: !cur.ai, start: span.start, end: span.end, merged: span.merged };
  }

  // Rewrites only the sentences flagged as AI. It goes from the last to the first so earlier offsets stay valid,
  // and reads the text again after each one: a change can clear a neighbour that was flagged only by its context.
  // A rewrite is kept when it clears the flag or lowers the sentence's score clearly.
  async function humanizeAll(text, onProgress) {
    const first = root.Polidetector.analyze(text);
    const targets = first.sentences.filter((s) => s.ai).map((s) => s.start);
    let cur = text;
    let base = first;
    const changes = [];
    const left = [];
    for (let k = targets.length - 1; k >= 0; k--) {
      if (onProgress) onProgress(targets.length - 1 - k, targets.length);
      await new Promise((r) => setTimeout(r, 0));
      if (k < targets.length - 1) base = root.Polidetector.analyze(cur);
      const s = base.sentences.find((o) => !o.excluded && o.start === targets[k]);
      if (!s || !s.ai) continue;
      const res = propose(cur, base, s);
      // A join must not swallow a sentence that was already rewritten.
      const swallows = res.merged && changes.some((c) => c.start >= res.start && c.start < res.end);
      if (res.changed && !swallows && (res.solved || res.before.p - res.after.p >= 0.05)) {
        const before = cur.slice(res.start, res.end);
        cur = cur.slice(0, res.start) + res.text + cur.slice(res.end);
        const delta = res.text.length - before.length;
        changes.forEach((c) => { c.start += delta; c.end += delta; });
        changes.push({ start: res.start, end: res.start + res.text.length, before, after: res.text, solved: res.solved, merged: res.merged });
      } else {
        left.push(s.text);
      }
    }
    const last = root.Polidetector.analyze(cur);
    changes.sort((a, b) => a.start - b.start);
    return {
      text: cur,
      changes,
      left,
      flagged: targets.length,
      before: { pct: first.percentAI, ai: first.aiSentences, n: first.evaluatedSentences },
      after: { pct: last.percentAI, ai: last.aiSentences, n: last.evaluatedSentences },
    };
  }

  root.PolidetectorTips = { suggest, propose, humanizeAll, TIPS, ALTS };
})(typeof window !== 'undefined' ? window : globalThis);
