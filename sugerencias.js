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
    'Coletilla con gerundio («…, highlighting»)': 'Quita la coletilla final con gerundio («…, highlighting…», «…, ensuring…») o conviértela en una frase aparte que diga quién hace qué.',
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
    'multifacético': ['variado'], 'multifacética': ['variada'],
    primordial: ['lo primero', 'principal'], enriquecedor: ['útil', 'que aporta'], enriquecedora: ['útil'], invaluable: ['muy útil'],
    vibrante: ['con mucha vida'], apasionante: ['interesante'], fascinante: ['interesante', 'curioso'],
    meticuloso: ['cuidadoso'], meticulosa: ['cuidadosa'], exhaustivo: ['completo', 'a fondo'], exhaustiva: ['completa'],
    notable: ['importante', 'claro'], notablemente: ['bastante', 'mucho'], indudablemente: ['', 'claramente'], asimismo: ['también', ''],
    sostenible: ['que aguanta', 'que dura'], eficiente: ['que funciona bien', 'rápido'], 'dinámico': ['activo', 'que cambia'],
    'además,': ['', 'y', 'también'], 'sin embargo': ['pero'], 'por otro lado': ['', 'pero'], 'por otra parte': ['', 'pero'], 'en primer lugar': ['', 'primero'],
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
    vital: ['important'], seamless: ['smooth'], seamlessly: ['smoothly'], leverage: ['use'], leveraging: ['using'],
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
    // Most of the score comes from the text as a whole, so say which whole-text traits weigh most.
    if (s.ai && doc && doc.docReasons && doc.docReasons.length) {
      const names = doc.docReasons.slice(0, 3).map((d) => d.label.charAt(0).toLowerCase() + d.label.slice(1));
      tips.push({ label: 'Pesa el texto entero', tip: `Buena parte de la puntuación viene del texto en conjunto: ${names.join('; ')}. Cambiar frases sueltas ayuda poco si el resto sigue igual; varía también cómo empiezan las frases y las palabras que más repites.`, alts: [] });
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
  // Words that can open a clause with its own subject. Prepositions are not here: "personales y de obligaciones"
  // is one list, not two clauses.
  const SUBJ_OK = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
    'su', 'sus', 'mi', 'mis', 'esto', 'eso', 'ello', 'se', 'nadie', 'todos', 'muchos', 'muchas', 'algunos', 'algunas', 'otros', 'otras', 'cada',
    'the', 'a', 'an', 'this', 'that', 'these', 'those', 'it', 'they', 'he', 'she', 'we', 'i', 'you', 'there', 'their', 'its', 'his', 'her', 'our',
    'many', 'some', 'most', 'each', 'no', 'nobody', 'everyone']);
  const SUBORD = /^\s*(?:cuando|si|aunque|mientras|como|porque|ya que|dado que|puesto que|al|tras|when|if|although|though|while|because|since|as|after|before|once|unless)\b/i;
  const CONJ = /^, (?:y|e|and) $/;
  // The same joints without the conjunction ("A, y B" -> "A. B"): a sentence that starts with "Y" or "And" is itself a
  // habit the model weighs, so both forms are tried.
  const SPLITS_BARE = [[', y ', '. '], [', and ', '. '], [', mientras que ', '. '], [', while ', '. ']];
  // Low-information adverbs that can go without changing what the sentence says.
  // Only intensifiers that add nothing: words of frequency, degree or doubt ("often", "casi", "quizá") change what is claimed.
  const ADVERBS = ['básicamente', 'realmente', 'simplemente', 'sencillamente', 'en realidad', 'de hecho', 'sin duda', 'por supuesto',
    // en
    'really', 'actually', 'basically', 'essentially', 'simply', 'in fact', 'of course'];
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

  const contractionsIf = (t) => (isEnglish(t) ? contractions(t) : t);
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
    list.push((t) => dashes(t));
    list.push((t) => t.replace(/no se trata (?:solo |solamente |únicamente )?de ([^,;.]+),\s?sino (?:de )?([^.;]+)/i,
      (m, x, y) => (/^que\s/i.test(x) ? `no es tanto ${x} como ${/^que\s/i.test(y) ? '' : 'que '}${y}` : `más que ${x}, es ${y}`)));
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
          const nextWord = (t.slice(i + from.length).match(/^\p{L}+/u) || [''])[0].toLowerCase();
          const badConj = CONJ.test(from) && (!SUBJ_OK.has(nextWord) || SUBORD.test(t));
          if (a >= 5 && b >= 5 && !closesList && !badConj && (!best || off < best.off)) best = { off, s: t.slice(0, i) + to + t.slice(i + from.length) };
          i = t.toLowerCase().indexOf(from, i + 1);
        }
      });
      return best ? best.s : t;
    });
    list.push((t) => {
      let best = null;
      SPLITS_BARE.forEach(([from, to]) => {
        const i = t.toLowerCase().indexOf(from);
        if (i <= 0) return;
        const a = wc(t.slice(0, i));
        const rest = t.slice(i + from.length);
        const b = wc(rest);
        const first = (rest.match(/^\p{L}+/u) || [''])[0].toLowerCase();
        const closesList = t.slice(0, i).includes(',');
        if (a >= 6 && b >= 6 && !closesList && SUBJ_OK.has(first) && !SUBORD.test(t) && (!best || Math.abs(a - b) < best.off)) best = { off: Math.abs(a - b), s: t.slice(0, i) + to + rest };
      });
      return best ? best.s : t;
    });
    // Shortening edits come last: they lose a little information, so they only apply when nothing gentler works.
    const shorter = (f) => (t) => { const r = f(t); return wc(r) >= 6 ? r : t; };
    ADVERBS.filter((a) => termRe(a).test(text)).forEach((a) => {
      const re = new RegExp('(,\\s*)?(?<![\\p{L}\\p{N}])' + esc(a) + '(?![\\p{L}\\p{N}])(\\s*,)?', 'iu');
      list.push(shorter((t) => t.replace(re, (m, before, after) => (before && after ? ',' : ' '))));
    });
    list.push((t) => gerundTails(ingTails(t)));
    list.push((t) => (isEnglish(t) ? notX(t) : t));
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
          if (a >= 5 && b >= 5 && SUBJ_OK.has(first) && !SUBORD.test(t) && !t.slice(0, i).includes(',') && !isEnglish(t) && (!best || off < best.off)) best = { off, s: t.slice(0, i) + to + rest };
          i = t.toLowerCase().indexOf(from, i + 1);
        }
      });
      return best ? best.s : t;
    });
    list.push((t) => contractionsIf(t));
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
      z: hit.length ? Math.max(...hit.map((o) => o.z)) : Infinity,
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
    const start = { p: s.p, z: s.z, ai: s.ai, frac: base.evaluatedSentences ? base.aiSentences / base.evaluatedSentences : 0, pct: base.percentAI };
    // Compared on z, the score before the sigmoid: when the whole text scores high, p saturates near 1 and real
    // improvements to the sentence would look like nothing.
    const ok = (a, b) => a.frac <= b.frac + 1e-9 && a.z < b.z - 0.02;
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
          if (isFinite(sc.z) && !sc.ai && sc.frac <= start.frac + 1e-9) { cur = Object.assign({ text: c2 }, sc); break search; }
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
        if (isFinite(sc.z) && !sc.ai && sc.frac <= start.frac + 1e-9) {
          cur = Object.assign({ text: joined }, sc);
          span = { start: from, end: to, merged: true };
          break;
        }
      }
    }
    const original = text.slice(span.start, span.end);
    return { text: cur.text, before: start, after: cur, changed: cur.text !== original, solved: !cur.ai, start: span.start, end: span.end, merged: span.merged };
  }

  // ---------- Whole-text style passes. Each one changes the same habit everywhere in the text, the way a person
  // revising their own draft would: contractions, formal connectors, participle tails, inflated vocabulary,
  // dashes. A pass is kept only if the detector does not score the text higher afterwards.
  const keepCase = (hit, rep) => (rep && /^\p{Lu}/u.test(hit) ? cap(rep) : rep);
  // Whole-word replacement of a map of terms (longest first), keeping a leading capital.
  function replaceTerms(text, map) {
    const keys = Object.keys(map).sort((a, b) => b.length - a.length);
    const re = new RegExp('(?<![\\p{L}\\p{N}\'’-])(?:' + keys.map(esc).join('|') + ')(?![\\p{L}\\p{N}\'’-])', 'giu');
    return text.replace(re, (hit) => { const v = map[hit.toLowerCase()]; return keepCase(hit, Array.isArray(v) ? v[0] : v); });
  }
  // One term, every occurrence, with one alternative. An English "a"/"an" right before it follows the new word.
  const anFor = (w) => (/^(?:[aeio]|u(?!s|ni|ra|re|ro|ti))/i.test(w) || /^hour|^honest/i.test(w) ? 'an' : 'a');
  function replaceOne(text, key, alt) {
    const re = new RegExp('(?<![\\p{L}\\p{N}\'’-])(?:(a|an|A|An)(\\s+))?(' + esc(key) + ')(?![\\p{L}\\p{N}\'’-])', 'giu');
    return text.replace(re, (m, art, sp, hit) => {
      const rep = keepCase(hit, alt);
      if (!art) return rep;
      if (!rep) return art + sp;
      const a = anFor(rep);
      return (/^A/.test(art) ? cap(a) : a) + sp + rep;
    });
  }
  // Contractions only before another word, so "as it is." keeps its full form.
  const CONTR = {
    'it is': "it's", 'that is': "that's", 'there is': "there's", 'what is': "what's", 'who is': "who's", 'here is': "here's",
    'do not': "don't", 'does not': "doesn't", 'did not': "didn't", 'is not': "isn't", 'are not': "aren't", 'was not': "wasn't",
    'were not': "weren't", 'cannot': "can't", 'can not': "can't", 'will not': "won't", 'would not': "wouldn't", 'should not': "shouldn't",
    'could not': "couldn't", 'have not': "haven't", 'has not': "hasn't", 'had not': "hadn't", 'they are': "they're", 'we are': "we're",
    'you are': "you're", 'i am': "I'm", 'let us': "let's", 'they have': "they've", 'we have': "we've", 'you have': "you've",
  };
  function contractions(text, only) {
    const keys = only ? [only] : Object.keys(CONTR).sort((a, b) => b.length - a.length);
    const re = new RegExp('(?<![\\p{L}\'’-])(' + keys.map(esc).join('|') + ')(?=\\s+\\p{L})', 'giu');
    // "they have" only when "have" is the auxiliary: "they have been", not "they have two dogs".
    return text.replace(re, (hit, k, off, all) => {
      const key = k.toLowerCase().replace(/\s+/g, ' ');
      if (/ have$/.test(key) && !/^\s+(?:been|had|done|made|seen|become|shown|taken|given|found|already|never|always|just|not)\b/i.test(all.slice(off + hit.length))) return hit;
      return keepCase(hit, CONTR[key]);
    });
  }
  // Formal sentence openers. The replacement keeps the link when it carries meaning (contrast, consequence).
  const OPEN_EN = {
    'additionally, ': '', 'moreover, ': '', 'furthermore, ': '', 'in addition, ': 'Also, ', 'however, ': 'But ', 'nevertheless, ': 'Still, ',
    'nonetheless, ': 'Still, ', 'consequently, ': 'So ', 'therefore, ': 'So ', 'thus, ': 'So ', 'hence, ': 'So ', 'as a result, ': 'So ',
    'in conclusion, ': '', 'to conclude, ': '', 'in summary, ': '', 'overall, ': '', 'ultimately, ': 'In the end, ', 'notably, ': '',
    'importantly, ': '', 'interestingly, ': '', 'essentially, ': '', 'indeed, ': '', 'similarly, ': 'In the same way, ', 'conversely, ': 'On the other hand, ',
    'subsequently, ': 'Later, ', 'in essence, ': '', 'in today\'s world, ': 'Today, ', 'in today’s world, ': 'Today, ',
  };
  const OPEN_ES = {
    'además, ': '', 'asimismo, ': 'También ', 'por otro lado, ': '', 'por otra parte, ': '', 'sin embargo, ': 'Pero ', 'no obstante, ': 'Pero ',
    'por lo tanto, ': 'Así que ', 'por tanto, ': 'Así que ', 'por consiguiente, ': 'Así que ', 'en conclusión, ': '', 'en resumen, ': '',
    'en definitiva, ': '', 'en síntesis, ': '', 'finalmente, ': 'Al final, ', 'en última instancia, ': 'Al final, ', 'de este modo, ': 'Así, ',
    'de esta manera, ': 'Así, ', 'en este sentido, ': '', 'en este contexto, ': '', 'cabe destacar que ': '', 'es importante destacar que ': '',
    'es importante señalar que ': '', 'es importante tener en cuenta que ': '', 'en la actualidad, ': 'Hoy ', 'hoy en día, ': 'Hoy ',
  };
  function openers(text, map) {
    const keys = Object.keys(map).sort((a, b) => b.length - a.length);
    const re = new RegExp('(^|[.!?…]["»”’)]*\\s+|\\n\\s*)(' + keys.map(esc).join('|') + ')(\\p{L})', 'giu');
    return text.replace(re, (m, pre, op, first) => {
      const rep = map[op.toLowerCase()];
      return pre + (rep ? rep + first : first.toUpperCase());
    });
  }
  // ", highlighting X." becomes ". That highlights X." with the verb in the present tense.
  // Only verbs whose natural subject is the fact just stated ("…, highlighting X" -> "That highlights X"). Verbs where a
  // person acts ("…, shaping the next generation", "…, helping others") are left alone: "That" would change who does it.
  const ING_VERB = {
    highlighting: 'highlights', underscoring: 'underscores', emphasizing: 'emphasizes', emphasising: 'emphasises', making: 'makes',
    allowing: 'allows', enabling: 'enables', reflecting: 'reflects', leading: 'leads', resulting: 'results', paving: 'paves',
    signaling: 'signals', signalling: 'signals', marking: 'marks', prompting: 'prompts', raising: 'raises', suggesting: 'suggests',
    indicating: 'shows', illustrating: 'shows', demonstrating: 'shows', revealing: 'reveals', sparking: 'sparks', fueling: 'fuels',
    fuelling: 'fuels', reinforcing: 'reinforces', adding: 'adds', giving: 'gives', bringing: 'brings',
    // effects of the action just described, where "That" is the action itself
    ensuring: 'guarantees', providing: 'gives', creating: 'creates', offering: 'offers', fostering: 'encourages', contributing: 'contributes',
    helping: 'helps', promoting: 'promotes', improving: 'improves', reducing: 'cuts', increasing: 'raises', driving: 'drives',
    influencing: 'affects', transforming: 'changes', enhancing: 'improves', setting: 'sets', turning: 'turns', solidifying: 'cements',
  };
  const ING_SPLIT = new RegExp(',\\s+(' + Object.keys(ING_VERB).join('|') + ')\\s+([^,;.!?]{6,}?)([.!?])(?=["»”’)]*(?:\\s|$))', 'g');
  function ingTails(text) {
    return text.replace(ING_SPLIT, (m, verb, rest, end) => `. That ${ING_VERB[verb]} ${rest}${end}`);
  }
  // Inflated vocabulary, with the plain word a person would usually write. Only swaps that keep the grammar
  // (same part of speech, number and, in Spanish, gender) are listed.
  const VOCAB_EN = {
    'a testament to': 'proof of', 'serves as a': 'is a', 'serves as an': 'is an', 'serve as a': 'are a', 'plays a crucial role in': 'matters a lot for',
    'plays a vital role in': 'matters a lot for', 'plays a key role in': 'matters a lot for', 'plays a significant role in': 'matters a lot for',
    'plays a pivotal role in': 'matters a lot for', 'a wide range of': 'many', 'a myriad of': 'many', 'a plethora of': 'many', 'a variety of': 'many',
    'in order to': 'to', 'due to the fact that': 'because', 'it is important to note that ': '', "it's important to note that ": '',
    'it is worth noting that ': '', "it's worth noting that ": '', 'when it comes to': 'with', 'in the realm of': 'in',
    profound: ['deep', 'strong'], profoundly: 'deeply', intricate: 'complicated', interplay: 'relationship', multifaceted: 'varied', nuanced: 'subtle',
    foster: 'encourage', fosters: 'encourages', fostered: 'encouraged', fostering: 'encouraging', navigate: 'handle', navigates: 'handles',
    navigated: 'handled', navigating: 'handling', thrive: 'do well', thrives: 'does well', mitigate: 'reduce',
    mitigates: 'reduces', mitigated: 'reduced', mitigating: 'reducing', comprehensive: ['complete', 'full', 'thorough'], crucial: ['important', 'key'], essential: ['important', 'needed'],
    significantly: ['greatly', 'a lot', 'clearly'], significant: ['major', 'important'], increasingly: 'more and more', innovative: 'new',
    enhance: 'improve', enhances: 'improves', enhanced: 'improved', enhancing: 'improving', ensure: 'guarantee', ensures: 'guarantees',
    ensuring: 'guaranteeing', utilize: 'use', utilizes: 'uses', utilized: 'used', utilizing: 'using', leverage: 'use', leveraging: 'using',
    underscores: 'shows', underscore: 'show', underscored: 'showed', vast: ['huge', 'large', 'wide'], broader: 'wider', inherent: 'built-in',
    alongside: 'along with', individuals: 'people', ultimately: 'in the end', thereby: 'and so', societal: 'social', pivotal: 'key',
    vital: 'important', seamless: 'smooth', seamlessly: 'smoothly', realm: 'field', embark: 'start', embarked: 'started',
    vibrant: 'lively', bustling: ['crowded', 'lively', 'busy'], meticulous: 'careful', meticulously: 'carefully', invaluable: 'very useful', transformative: 'big',
    paramount: 'most important', notably: 'especially', delve: 'look', delves: 'looks', delved: 'looked', delving: 'looking',
    showcasing: 'showing', showcase: 'show', showcases: 'shows', boasts: 'has', commence: 'start', commenced: 'started', endeavor: 'effort',
    endeavors: 'efforts', facilitate: 'help', facilitates: 'helps', facilitated: 'helped', facilitating: 'helping', myriad: 'many',
    tapestry: 'mix', elevate: 'raise', elevates: 'raises', empower: 'help', empowers: 'helps', empowering: 'helping', holistic: 'whole',
    insights: ['ideas', 'lessons'], stark: ['clear', 'plain', 'sharp'], enduring: 'lasting', ongoing: 'continuing', diverse: 'varied', strive: 'try', strives: 'tries',
    striving: 'trying', 'commitment to': 'dedication to', heightened: 'higher', bolster: 'support', bolsters: 'supports', bolstering: 'supporting',
    shift: 'change', shifts: 'changes', shifted: 'changed', shifting: 'changing', landscape: 'scene', engagement: 'involvement',
    collaboration: 'cooperation', highlight: 'show', highlights: 'shows', highlighted: 'showed', highlighting: 'showing', initiatives: 'projects',
    addressing: 'tackling', promote: 'support', promotes: 'supports', promoting: 'supporting', promoted: 'supported', maintaining: 'keeping',
    embrace: 'accept', embraces: 'accepts', embraced: 'accepted', embracing: 'accepting', powerful: 'strong', explore: 'look at',
    explores: 'looks at', explored: 'looked at', exploring: 'looking at', within: 'in', provide: 'give', provides: 'gives',
    'such as': 'like', including: ['like', 'among them'], typically: 'usually', 'in summary': 'all in all', 'which can': 'that can',
    providing: 'giving', particularly: 'especially', 'a significant': 'a big', 'significant impact': 'big effect', 'a profound impact': 'a deep effect',
  };
  const VOCAB_ES = {
    'juega un papel fundamental': 'pesa mucho', 'juega un papel crucial': 'pesa mucho', 'juega un papel clave': 'pesa mucho',
    'desempeña un papel fundamental': 'pesa mucho', 'desempeña un papel crucial': 'pesa mucho', 'juegan un papel fundamental': 'pesan mucho',
    'una amplia gama de': 'todo tipo de', 'un amplio abanico de': 'todo tipo de', 'una gran variedad de': 'todo tipo de', 'un sinfín de': 'muchos',
    'pone de manifiesto': 'muestra', 'ponen de manifiesto': 'muestran', 'a lo largo de la historia': 'siempre',
    fortalecer: 'reforzar', fortalece: 'refuerza', fortalecen: 'refuerzan', garantizar: 'asegurar', garantiza: 'asegura', garantizan: 'aseguran',
    significativo: 'importante', significativa: 'importante', significativos: 'importantes', significativas: 'importantes',
    significativamente: 'bastante', crucial: 'importante', cruciales: 'importantes', fundamental: 'importante', fundamentales: 'importantes',
    esencial: 'importante', esenciales: 'importantes', indispensable: 'imprescindible', desafío: 'reto', desafíos: 'retos', enfoque: 'planteamiento',
    perspectiva: 'mirada', optimizar: 'mejorar', potenciar: 'mejorar', potencia: 'mejora', fomentar: 'favorecer', fomenta: 'favorece',
    fomentan: 'favorecen', abordar: 'tratar', aborda: 'trata', abordan: 'tratan', impulsar: 'empujar', primordial: 'principal',
    exhaustivo: 'completo', exhaustiva: 'completa', fascinante: 'interesante', fascinantes: 'interesantes', multifacético: 'variado',
    multifacética: 'variada', holístico: 'completo', holística: 'completa', innovador: 'nuevo', innovadora: 'nueva', innovadores: 'nuevos',
    innovadoras: 'nuevas', explorar: 'estudiar', profundamente: 'mucho', notablemente: 'bastante', indudablemente: 'claramente',
    consolidar: 'afianzar', consolida: 'afianza', consolidó: 'afianzó', resiliencia: 'resistencia', constituye: 'es', constituyen: 'son',
    transforma: 'cambia', transforman: 'cambian', transformó: 'cambió', transformar: 'cambiar', profunda: 'honda', profundo: 'hondo',
    profundas: 'hondas', profundos: 'hondos', implementación: 'puesta en marcha', ofrecer: 'dar', ofrece: 'da', ofrecen: 'dan',
    contribuye: 'ayuda', contribuyen: 'ayudan', fortalecimiento: 'refuerzo', optimización: 'mejora',
  };
  const GER_ES = {
    'dando lugar a': 'da lugar a', 'lo que permite': 'permite', 'lo cual permite': 'permite', 'permitiendo': 'permite', 'facilitando': 'facilita',
    'garantizando': 'asegura', 'asegurando': 'asegura', 'fomentando': 'favorece', 'promoviendo': 'promueve', 'contribuyendo a': 'contribuye a',
    'ayudando a': 'ayuda a', 'favoreciendo': 'favorece', 'generando': 'genera', 'provocando': 'provoca', 'reflejando': 'refleja',
    'mostrando': 'muestra', 'marcando': 'marca', 'impulsando': 'impulsa', 'reforzando': 'refuerza', 'consolidando': 'consolida',
    'subrayando': 'subraya', 'evidenciando': 'muestra', 'poniendo de manifiesto': 'muestra', 'lo que supone': 'supone', 'lo que implica': 'implica',
  };
  const GER_SPLIT = new RegExp(',\\s+(' + Object.keys(GER_ES).map(esc).join('|') + ')\\s+([^,;.!?]{6,}?)([.!?])(?=["»”’)]*(?:\\s|$))', 'giu');
  function gerundTails(text) {
    return text.replace(GER_SPLIT, (m, g, rest, end) => `. Eso ${GER_ES[g.toLowerCase()]} ${rest}${end}`);
  }
  // "It's not X, it's Y" says Y by denying an X nobody claimed: "It's Y, more than X" keeps both.
  const NOTX_EN = /\b(it's|it is|this is|that's|that is)\s+not\s+(just\s+|only\s+|merely\s+)?(about\s+)?([^.;!?,—–]{1,50}?)\s*[,;—–]\s*(?:it's|it is|but)\s+(?:(?:also|rather)\s+)?(about\s+)?([^.;!?]{2,80}?)([.;!?])/giu;
  function notX(text) {
    return text.replace(NOTX_EN, (m, lead, lim, ab1, x, ab2, y, end) => `${lead} ${ab2 || ''}${y}, more than ${x}${end}`);
  }
  function dashes(text) {
    // "1845–1925" and "Madrid-Barcelona" style ranges keep their dash; only dashes used as pauses become commas.
    return text.replace(/(?<!\d)\s*—\s*(?!\d)|\s+–\s+/g, ', ').replace(/,\s*,/g, ',').replace(/,\s*([.;:!?])/g, '$1');
  }
  function unbold(text) {
    return text.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  }
  // Groups of alternative rewrites for one habit in one text: each vocabulary term, connector or contraction on its
  // own, so a swap that happens to read as AI does not drag the good ones down with it.
  function groups(lang, text) {
    const out = [];
    const vocab = lang === 'en' ? VOCAB_EN : VOCAB_ES;
    const has = (k) => new RegExp('(?<![\\p{L}\\p{N}\'’-])' + esc(k) + '(?![\\p{L}\\p{N}\'’-])', 'iu').test(text);
    Object.keys(vocab).sort((a, b) => b.length - a.length).forEach((k) => {
      if (!has(k)) return;
      const alts = [].concat(vocab[k]);
      out.push(['vocabulario', alts.map((a) => (t) => replaceOne(t, k, a))]);
    });
    const open = lang === 'en' ? OPEN_EN : OPEN_ES;
    Object.keys(open).forEach((k) => {
      if (text.toLowerCase().includes(k)) out.push(['conectores', [(t) => openers(t, { [k]: open[k] })]]);
    });
    if (lang === 'en') {
      out.push(['coletillas', [ingTails]], ['no-x-sino-y', [notX]]);
      Object.keys(CONTR).forEach((k) => {
        if (has(k)) out.push(['contracciones', [(t) => contractions(t, k)]]);
      });
    } else out.push(['coletillas', [gerundTails]]);
    out.push(['rayas', [dashes]], ['negritas', [unbold]]);
    return out;
  }
  function passes(lang) {
    if (lang === 'en') {
      return [
        ['vocabulario', (t) => replaceTerms(t, VOCAB_EN)], ['conectores', (t) => openers(t, OPEN_EN)], ['coletillas', ingTails],
        ['contracciones', contractions], ['rayas', dashes], ['negritas', unbold],
      ];
    }
    return [['vocabulario', (t) => replaceTerms(t, VOCAB_ES)], ['conectores', (t) => openers(t, OPEN_ES)], ['coletillas', gerundTails], ['rayas', dashes], ['negritas', unbold]];
  }
  // Sentence-level diff of two versions, for the page: each changed run of sentences with its old text.
  function diffChanges(a, b) {
    const A = root.Polidetector.analyze(a).sentences;
    const B = root.Polidetector.analyze(b).sentences;
    const n = A.length;
    const m = B.length;
    const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i].text === B[j].text ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = [];
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && A[i].text === B[j].text) { i++; j++; continue; }
      const i0 = i;
      const j0 = j;
      while ((i < n || j < m) && !(i < n && j < m && A[i].text === B[j].text)) {
        if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) j++; else i++;
      }
      if (j > j0) {
        out.push({ start: B[j0].start, end: B[j - 1].end, before: i > i0 ? a.slice(A[i0].start, A[i - 1].end) : '', after: b.slice(B[j0].start, B[j - 1].end), solved: true, merged: i - i0 > 1 && j - j0 === 1 });
      }
    }
    return out;
  }

  // Rewrites only the sentences flagged as AI. It goes from the last to the first so earlier offsets stay valid,
  // and reads the text again after each one: a change can clear a neighbour that was flagged only by its context.
  // A rewrite is kept when it clears the flag or lowers the sentence's score clearly.
  async function humanizeAll(text, onProgress) {
    const first = root.Polidetector.analyze(text);
    let cur = text;
    let base = first;
    // 1. Whole-text passes, kept only when the text does not score higher (percentage first, then text score).
    const applied = [];
    // root.PolidetectorHumanizarSin lists passes to leave out (calibracion/humanizar2.js, to test each one).
    const skip = root.PolidetectorHumanizarSin || [];
    {
      for (const [name, alts] of groups(first.lang, cur).filter(([n]) => !skip.includes(n))) {
        let best = null;
        for (const fn of alts) {
          const cand = fn(cur);
          if (cand === cur) continue;
          const r = root.Polidetector.analyze(cand);
          if (r.status !== base.status) continue;
          if (!best || r.percentAI < best.r.percentAI || (r.percentAI === best.r.percentAI && r.docScore < best.r.docScore)) best = { cand, r };
        }
        if (best && (best.r.percentAI < base.percentAI || (best.r.percentAI === base.percentAI && best.r.docScore <= base.docScore))) {
          cur = best.cand;
          base = best.r;
          if (!applied.includes(name)) applied.push(name);
        }
      }
    }
    // 2. Every prose sentence, last to first: the first edit that lowers the whole text's score is kept. The text
    // score weighs how all sentences start, their length and commas, so unflagged sentences matter too.
    if (!skip.includes('frases')) {
      const better = (r) => r.status === base.status && (r.percentAI < base.percentAI || (r.percentAI === base.percentAI && r.docScore < base.docScore - 0.01));
      for (let round = 0; round < 3; round++) {
        let moved = false;
        const sents = base.sentences.filter((o) => !o.excluded).map((o) => [o.start, o.end, o.para]);
        for (let k = sents.length - 1; k >= 0; k--) {
          const [from, to0] = sents[k];
          let to = to0;
          let original = cur.slice(from, to);
          if (onProgress) onProgress(sents.length - 1 - k, sents.length);
          if (k % 8 === 0) await new Promise((r) => setTimeout(r, 0));
          // several edits may stack on one sentence, each judged on the whole text
          for (const edit of edits(original)) {
            const c = tidy(edit(original));
            if (!c || c === original || wc(c) < 3) continue;
            const cand = cur.slice(0, from) + c + cur.slice(to);
            const r = root.Polidetector.analyze(cand);
            if (better(r)) {
              cur = cand;
              base = r;
              moved = true;
              to = from + c.length;
              original = c;
            }
          }
          // two short neighbours in the same paragraph can become one sentence
          const next = sents[k + 1];
          if (next && next[2] === sents[k][2] && wc(original) <= 14) {
            const nextText = base.sentences.find((o) => !o.excluded && o.start >= to && o.start <= to + 3);
            if (nextText && /^\s+$/.test(cur.slice(to, nextText.start)) && wc(nextText.text) <= 14) {
              const joined = join(original, nextText.text);
              if (joined) {
                const cand = cur.slice(0, from) + joined + cur.slice(nextText.end);
                const r = root.Polidetector.analyze(cand);
                if (better(r)) { cur = cand; base = r; moved = true; }
              }
            }
          }
        }
        if (!moved) break;
      }
    }
    // 3. Sentence by sentence, on what is still flagged.
    const targets = base.sentences.filter((s) => s.ai).map((s) => s.start);
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
      if (res.changed && !swallows && (res.solved || res.before.z - res.after.z >= 0.3)) {
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
    return {
      text: cur,
      changes: cur === text ? [] : diffChanges(text, cur),
      passes: applied,
      left,
      flagged: first.aiSentences,
      before: { pct: first.percentAI, ai: first.aiSentences, n: first.evaluatedSentences },
      after: { pct: last.percentAI, ai: last.aiSentences, n: last.evaluatedSentences },
    };
  }

  root.PolidetectorTips = { suggest, propose, humanizeAll, TIPS, ALTS,
    // For calibracion/pruebas-humanizador.js.
    _interno: { SUBJ_OK, notX, replaceOne, groups, contractions, openers, ingTails, gerundTails, replaceTerms, dashes, diffChanges, edits, VOCAB_EN, VOCAB_ES, OPEN_EN, OPEN_ES } };
})(typeof window !== 'undefined' ? window : globalThis);
