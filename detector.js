// Polidetector: AI-text detector for Spanish and English. Runs entirely in the browser (also loadable from jsc/Node
// for tests). Each prose sentence gets a vector of style features; a logistic model per language, trained on
// labelled corpora (calibracion/entrenar.py, weights in modelo.js), turns them into a score in context.
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
  const LEXWORD = /[\p{L}]+(?:['’][\p{L}]+)?/gu;

  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
  const stdev = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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
        while (j < text.length && '.!?…"»”’\')]'.includes(text[j])) j++;
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
    // Spanish dialogue opens with an em dash. Style rules cannot tell human from AI dialogue, so it is
    // left out instead of being counted as human.
    if (/^\s*—/u.test(line)) return 'diálogo';
    // The private-use range holds the bullets Word draws with its Symbol and Wingdings fonts.
    if (/^\s*(?:[-*•·▪◦–—-]\s|\d+[.)]\s|[a-z][.)]\s)/iu.test(line)) return 'lista';
    if (/^\s*#{1,6}\s/u.test(line)) return 'título';
    // Columns are separated by a tab or by a run of spaces; one run in a long line is just uneven spacing.
    if (/\t|\|/.test(line) || (line.trim().match(/\S {3,}(?=\S)/g) || []).length >= 2) return 'tabla';
    const letters = (s.match(/\p{L}/gu) || []).length;
    if (/[{}=<>^\\]|\);?$/.test(s) || letters / Math.max(s.replace(/\s/g, '').length, 1) < 0.5) return 'fórmula o código';
    if (!/[.!?…:;"»”)]$/u.test(line.trim()) && words < 12) return 'título';
    if (words < 3) return 'fragmento';
    return null;
  }

  // Settings that are not learned. The model (weights, sentence threshold) comes from modelo.js.
  const DEFAULTS = {
    minWords: 300,
    maxWords: 30000,
    // Band cuts over the % of AI sentences. Chosen on the calibration half so that almost no human text reaches
    // bandDudoso (see calibracion/INFORME-2026-11.md). Below it the text is reported as having no clear signs of AI.
    bandDudoso: 40,
    bandFuerte: 60,
    // Turnitin reports more false positives in generic intro/conclusion sentences and raised the bar there.
    edgeExtra: 0.1,
    edge: 2,
    edgeMinSentences: 10,
    ownWeight: 0.6,
    context: 3,
  };

  // Evasion tricks that break word matching without changing how the text looks (RAID and SilverSpeak
  // report homoglyph attacks sending detectors to chance): invisible characters, decomposed accents, and
  // Cyrillic or Greek look-alikes inside otherwise Latin words. Real Greek or Cyrillic words are left alone.
  const INVISIBLE = /[\u00AD\u200B-\u200F\u2060-\u2064\uFEFF]/g;
  const LOOKALIKE = {
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'һ': 'h',
    'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X', 'І': 'I', 'Ј': 'J', 'Ѕ': 'S',
    'ο': 'o', 'α': 'a', 'ν': 'v', 'ι': 'i', 'κ': 'k', 'ρ': 'p', 'τ': 't', 'υ': 'u',
    'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H', 'Ι': 'I', 'Κ': 'K', 'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Υ': 'Y', 'Χ': 'X',
  };
  const LOOKALIKE_RE = new RegExp('[' + Object.keys(LOOKALIKE).join('') + ']', 'g');

  // Text pasted from Word, Google Docs, e-mail or a PDF carries layout that is not part of the writing: tab or
  // space indents, non-breaking spaces, line separators other than \n and lines cut mid-sentence. Left alone, a
  // leading tab made the whole text look like a table and nothing was evaluated.
  function tidyLayout(text) {
    return text
      .replace(/\r\n?|[\u2028\u2029\u000B\u000C\u0085]/g, '\n')
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      .replace(/[\u2010\u2011\u2012]/g, '-')
      .replace(/[ \t]+$/gm, '')
      .replace(/^[ \t]+/gm, '')
      // A tab used as the space after a full stop is not a table column.
      .replace(/([.!?…]["»”’)]?)\t+(?=\S)/g, '$1 ')
      .replace(/([.!?…:;)”"»]) {3,}(?=\S)/g, '$1  ')
      // A line that does not end a sentence and is followed by a lowercase one was cut by the page width.
      .replace(/([^\n.!?…:;"»”’)\]])\n(?=\p{Ll})/gu, '$1 ');
  }

  function clean(text) {
    const invisible = (text.match(INVISIBLE) || []).length;
    let out = tidyLayout(text.replace(INVISIBLE, '')).normalize('NFC');
    let lookalikes = 0;
    out = out.replace(/\p{L}+/gu, (w) => {
      if (!/\p{Script=Latin}/u.test(w) || !/[\p{Script=Cyrillic}\p{Script=Greek}]/u.test(w)) return w;
      return w.replace(LOOKALIKE_RE, (c) => { lookalikes++; return LOOKALIKE[c]; });
    });
    return { text: out, invisible, lookalikes };
  }

  // Language from the most frequent function words. Only Spanish and English are supported.
  const ES_WORDS = new Set(['de', 'la', 'que', 'el', 'en', 'y', 'los', 'se', 'del', 'las', 'por', 'un', 'para', 'con', 'una', 'su', 'al', 'es', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también']);
  const EN_WORDS = new Set(['the', 'of', 'and', 'to', 'in', 'a', 'is', 'that', 'for', 'it', 'as', 'with', 'was', 'on', 'be', 'by', 'at', 'this', 'are', 'from', 'or', 'an', 'but', 'not', 'have', 'they', 'which', 'you', 'were', 'their', 'has', 'had', 'his', 'her', 'we', 'he']);
  function detectLang(text) {
    let es = 0;
    let en = 0;
    (text.toLowerCase().match(LEXWORD) || []).slice(0, 3000).forEach((w) => { if (ES_WORDS.has(w)) es++; if (EN_WORDS.has(w)) en++; });
    return es >= en ? 'es' : 'en';
  }

  // Function words, the classic authorship signal: their rates hardly depend on the topic and LLMs overuse
  // some and avoid others. Their rate per 100 words of prose enters the model as d_fw_N, N being the list position.
  const FW = {
    es: ["de", "la", "que", "el", "en", "y", "a", "los", "se", "del", "las", "un", "por", "con", "no", "una", "su", "para", "es", "al", "lo", "como", "más", "pero", "sus", "le", "ya", "o", "este", "sí", "porque", "esta", "entre", "cuando", "muy", "sin", "sobre", "también", "me", "hasta", "hay", "donde", "quien", "desde", "todo", "nos", "durante", "todos", "uno", "les", "ni", "contra", "otros", "ese", "eso", "ante", "ellos", "e", "esto", "mí", "antes", "algunos", "qué", "unos", "yo", "otro", "otras", "otra", "él", "tanto", "esa", "estos", "mucho", "quienes", "nada", "muchos", "cual", "poco", "ella", "estar", "estas", "algunas", "algo", "nosotros", "mi", "mis", "tú", "te", "ti", "tu", "tus", "ellas", "nosotras", "vosotros", "os", "mío", "mía", "tuyo", "suyo", "suya", "nuestro", "nuestra", "cada", "mismo", "misma", "así", "aunque", "mientras", "sino", "pues", "luego", "entonces", "aún", "además", "tal", "incluso", "solo", "bien", "ahora", "hoy", "siempre", "nunca", "aquí", "allí", "ser", "son", "fue", "era", "han", "ha", "había", "tiene", "tienen", "hace", "puede", "pueden", "debe", "hacer", "cómo"],
    en: ["the", "of", "and", "to", "a", "in", "that", "is", "it", "for", "as", "with", "was", "on", "be", "by", "at", "this", "are", "from", "or", "an", "but", "not", "have", "they", "which", "you", "were", "their", "has", "had", "his", "her", "we", "he", "she", "its", "been", "there", "would", "will", "can", "more", "one", "all", "about", "if", "so", "what", "when", "who", "no", "out", "up", "them", "than", "some", "could", "into", "only", "other", "also", "my", "me", "i", "our", "us", "your", "do", "does", "did", "just", "because", "then", "these", "those", "very", "much", "such", "how", "most", "even", "should", "may", "might", "must", "any", "each", "both", "many", "while", "where", "over", "after", "before", "through", "between", "however", "although", "though", "yet", "it's", "don't", "i'm", "can't", "didn't", "doesn't", "isn't", "that's", "there's", "i've", "you're", "won't"],
  };
  const FW_N = Math.max(FW.es.length, FW.en.length);

  // First words of sentences: LLMs reuse a few openings ("This", "These", "Additionally", "Este", "Además").
  const STARTS = {
    es: ["el", "la", "los", "las", "en", "este", "esta", "estos", "estas", "es", "un", "una", "su", "sus", "por", "para", "con", "además", "sin", "pero", "aunque", "así", "también", "no", "se", "lo", "como", "cuando", "si", "y", "de", "al", "ya", "hoy"],
    en: ["the", "this", "these", "it", "in", "as", "a", "an", "its", "their", "they", "there", "we", "i", "he", "she", "but", "however", "additionally", "furthermore", "moreover", "while", "by", "for", "with", "when", "if", "one", "such", "that", "our"],
  };
  const ST_N = Math.max(STARTS.es.length, STARTS.en.length);
  // Punctuation per 100 words of prose.
  const PUNCT = [/;/g, /:/g, /\(/g, /[«»“”"]/g, /[—–]/g, / - /g, /[?¿]/g, /[!¡]/g];

  // Feature names, in the order of the vectors dumped for training. s_* belong to the sentence, d_* to the text.
  const FEATS = [
    's_lexai', 's_lexhum', 's_phrase', 's_buzz', 's_dash', 's_opener', 's_triad', 's_notx', 's_bold',
    's_typical', 's_short', 's_long', 's_loglen', 's_wlen', 's_comma', 's_informal', 's_filler', 's_expr',
    's_lower', 's_first', 's_names', 's_figure', 's_year', 's_digits', 's_paren', 's_quote', 's_colon',
    's_question', 's_imperfect', 's_cvflat', 's_cvreg', 's_cvvar',
    'd_cv', 'd_meanlen', 'd_lex', 'd_lexai', 'd_mattr', 'd_comma', 'd_names', 'd_figure', 'd_question', 'd_first',
    'd_informal', 'd_short', 'd_long', 'd_opener', 'd_wlen', 'd_paren', 'd_quote', 'd_colon',
  ].concat(Array.from({ length: FW_N }, (_, i) => 'd_fw_' + String(i).padStart(3, '0')))
    .concat(Array.from({ length: ST_N }, (_, i) => 'd_st_' + String(i).padStart(2, '0')))
    .concat(PUNCT.map((_, i) => 'd_pu_' + i));

  const SFEATS = FEATS.filter((k) => k.startsWith('s_'));

  // How each feature is explained to the person. Labels with a tip in sugerencias.js keep their old wording.
  const LABELS = {
    s_lexai: 'Palabras comodín', s_buzz: 'Palabras comodín', s_phrase: 'Frases hechas típicas de IA',
    s_dash: 'Rayas (—) como pausa', s_opener: 'Empieza con conector formal', s_triad: 'Enumeración de tres elementos',
    s_notx: 'Estructura «no es X, sino Y»', s_bold: 'Negritas dentro del texto', s_typical: 'Longitud de frase típica de IA',
    s_cvflat: 'Frases vecinas de longitud casi idéntica', s_cvreg: 'Frases vecinas de longitud regular',
    s_cvvar: 'Frases vecinas de longitud muy variada', s_wlen: 'Vocabulario largo y formal',
    s_lexhum: 'Palabras corrientes o datos concretos', s_names: 'Nombres o cifras concretas', s_figure: 'Nombres o cifras concretas',
    s_year: 'Nombres o cifras concretas', s_digits: 'Nombres o cifras concretas', s_informal: 'Tono coloquial',
    s_filler: 'Muletillas de conversación', s_expr: 'Puntuación expresiva (!!, ...)', s_lower: 'Empieza en minúscula',
    s_first: 'Habla en primera persona', s_short: 'Frase muy corta', s_long: 'Frase muy larga y enredada',
    s_loglen: 'Longitud de la frase', s_comma: 'Comas por palabra', s_imperfect: 'Erratas de tecleo',
    s_paren: 'Paréntesis', s_quote: 'Citas entre comillas', s_colon: 'Dos puntos o punto y coma', s_question: 'Pregunta',
    d_cv: 'Frases de longitud muy pareja en todo el texto', d_meanlen: 'Longitud media de las frases',
    d_lex: 'Vocabulario típico de IA en todo el texto', d_lexai: 'Vocabulario típico de IA en todo el texto', d_mattr: 'Variedad de vocabulario del texto',
    d_comma: 'Comas en todo el texto', d_names: 'Pocos nombres propios en todo el texto',
    d_figure: 'Pocas cifras o fechas en todo el texto', d_question: 'Preguntas en el texto', d_first: 'Primera persona en el texto',
    d_informal: 'Tono coloquial en el texto', d_short: 'Frases cortas en el texto', d_long: 'Frases largas en el texto',
    d_opener: 'Conectores formales al empezar frase', d_wlen: 'Palabras largas en todo el texto',
    d_paren: 'Paréntesis en el texto', d_quote: 'Citas entre comillas en el texto', d_colon: 'Dos puntos o punto y coma en el texto',
  };

  // Function words, sentence openings and punctuation enter the model one by one; they are explained as groups.
  function labelFor(k) {
    if (k.startsWith('d_fw_')) return 'Palabras gramaticales en proporciones típicas de IA';
    if (k.startsWith('d_st_')) return 'Comienzos de frase típicos de IA';
    if (k.startsWith('d_pu_')) return 'Uso de la puntuación típico de IA';
    return LABELS[k];
  }

  function model() {
    return root.PolidetectorModelo || { es: { bias: 0, w: {}, threshold: 0.5 }, en: { bias: 0, w: {}, threshold: 0.5 }, lexico: { es: {}, en: {} } };
  }

  // Moving-average type-token ratio over 50-word windows: vocabulary variety that does not depend on length.
  function mattr(tokens, win) {
    if (tokens.length < win) return tokens.length ? new Set(tokens).size / tokens.length : 0;
    const counts = new Map();
    let distinct = 0;
    let total = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      counts.set(t, (counts.get(t) || 0) + 1);
      if (counts.get(t) === 1) distinct++;
      if (i >= win) {
        const o = tokens[i - win];
        counts.set(o, counts.get(o) - 1);
        if (counts.get(o) === 0) distinct--;
      }
      if (i >= win - 1) total += distinct / win;
    }
    return total / (tokens.length - win + 1);
  }

  function sentenceFeatures(s, text, lex) {
    const t = s.text;
    const words = s.words;
    const hits = [];
    const f = {};
    const details = {};
    const lw = (t.match(LEXWORD) || []);
    let lexAi = 0;
    let lexHum = 0;
    const aiWords = [];
    LEXWORD.lastIndex = 0;
    let m;
    while ((m = LEXWORD.exec(t)) !== null) {
      // Own keys only: a plain object lookup would return inherited members such as lex['constructor'].
      const k = m[0].toLowerCase();
      const w = Object.prototype.hasOwnProperty.call(lex, k) ? lex[k] : 0;
      if (typeof w !== 'number' || !w) continue;
      if (w > 0) {
        lexAi += w;
        if (w >= 0.6) { aiWords.push(m[0]); hits.push({ from: m.index, to: m.index + m[0].length, kind: 'buzz' }); }
      } else lexHum += w;
    }
    const norm = Math.sqrt(Math.max(lw.length, 1));
    f.s_lexai = clamp(lexAi / norm, 0, 3);
    f.s_lexhum = clamp(lexHum / norm, -3, 0);
    if (aiWords.length) details.s_lexai = aiWords.join(', ');

    const phrases = collect(PHRASES, t, 'phrase', hits);
    f.s_phrase = Math.min(phrases.length, 3);
    if (phrases.length) details.s_phrase = phrases.join(', ');
    const buzz = collect(BUZZ, t, 'buzz', hits).filter((b) => !phrases.some((p) => p.toLowerCase().includes(b.toLowerCase())));
    f.s_buzz = Math.min(buzz.length, 3);
    if (buzz.length) details.s_buzz = buzz.join(', ');
    f.s_dash = Math.min(collect(DASH, t, 'dash', hits).length, 2);
    f.s_opener = OPENERS.test(t) ? 1 : 0;
    if (f.s_opener) details.s_opener = t.match(OPENERS)[0];
    f.s_triad = TRIAD.test(t) ? 1 : 0;
    f.s_notx = NOT_X_BUT_Y.test(t) ? 1 : 0;
    f.s_bold = /\*\*[^*]+\*\*/.test(t) ? 1 : 0;
    f.s_typical = words >= 14 && words <= 32 ? 1 : 0;
    f.s_short = words < 6 ? 1 : 0;
    f.s_long = words > 40 ? 1 : 0;
    f.s_loglen = clamp(Math.log(Math.max(words, 1)) - Math.log(20), -2, 2);
    const letters = (t.match(/\p{L}/gu) || []).length;
    f.s_wlen = clamp(letters / Math.max(words, 1) - 5, -2, 3);
    f.s_comma = clamp(((t.match(/,/g) || []).length / Math.max(words, 1)) * 10, 0, 3);
    const informal = collect(INFORMAL_STRONG, t, 'human', hits).concat(collect(LAUGH, t, 'human', hits));
    f.s_informal = Math.min(informal.length, 2);
    if (informal.length) details.s_informal = informal.join(', ');
    const weak = collect(INFORMAL_WEAK, t, 'human', hits);
    f.s_filler = Math.min(weak.length, 2);
    if (weak.length) details.s_filler = weak.join(', ');
    f.s_expr = /[!?]{2,}|\.{3}|…/.test(t) ? 1 : 0;
    f.s_lower = /^[\p{Ll}]/u.test(t) ? 1 : 0;
    FIRST_PERSON.lastIndex = 0;
    f.s_first = FIRST_PERSON.test(t) ? 1 : 0;
    FIRST_PERSON.lastIndex = 0;
    // Capitalised words mid-sentence (names), exact figures (decimals, thousands, percentages) and years.
    const names = (t.slice(1).match(/(?<![.!?:«“"]\s)(?<=\s)\p{Lu}\p{Ll}+/gu) || []).length;
    f.s_names = Math.min(names, 4);
    f.s_figure = /\d[.,]\d|\d\s?%/.test(t) ? 1 : 0;
    f.s_year = /(?<!\d)(?:1[5-9]|20)\d{2}(?!\d)/.test(t) ? 1 : 0;
    f.s_digits = /\d/.test(t) ? 1 : 0;
    f.s_paren = /\(/.test(t) ? 1 : 0;
    f.s_quote = /[«»“”"]/.test(t) ? 1 : 0;
    f.s_colon = /[:;]/.test(t) ? 1 : 0;
    f.s_question = /[?¿]/.test(t) ? 1 : 0;
    // Typing slips LLMs never make: double spaces, a doubled word, a space before punctuation.
    const gap = text.slice(Math.max(0, s.start - 3), s.start);
    f.s_imperfect = / {2}/.test(gap) || /\S {2,}\S/.test(t) || /(?<![\p{L}])(\p{L}+) \1(?![\p{L}])/iu.test(t) || / [,.;:]/.test(t) ? 1 : 0;
    return { f, hits, details };
  }

  function analyze(text, opts) {
    const C = Object.assign({}, DEFAULTS, opts);
    const cleaned = clean(text || '');
    text = cleaned.text;
    const sentences = segment(text);
    const totalWords = (text.match(WORD) || []).length;
    const lang = C.lang || detectLang(text);
    const M = model();
    const LM = M[lang] || {};
    const lex = (M.lexico && M.lexico[lang]) || {};
    const DW = Object.assign({}, (LM.doc && LM.doc.w) || {}, C.docW || {});
    const DMU = (LM.doc && LM.doc.mu) || {};
    const SW = Object.assign({}, (LM.sent && LM.sent.w) || {}, C.sentW || {});
    const docBias = C.docBias !== undefined ? C.docBias : (LM.doc ? LM.doc.bias : 0);
    const alpha = C.alpha !== undefined ? C.alpha : (LM.alpha !== undefined ? LM.alpha : 1);
    const threshold = C.threshold !== undefined ? C.threshold : (LM.threshold !== undefined ? LM.threshold : 0.5);

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
        // Word and Google Docs separate paragraphs with a single line break, so one that follows a finished sentence counts.
        if (/\n\s*\n\s*$/.test(text.slice(0, ls)) || /[.!?…:;"»”’)]\n$/.test(text.slice(0, ls)) || lastLine === -1) para++;
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

    // Sentence features, then the local length rhythm (humans vary sentence length much more than LLMs do).
    const per = prose.map((s) => sentenceFeatures(s, text, lex));
    const lens = prose.map((s) => s.words);
    per.forEach((p, i) => {
      const win = lens.slice(Math.max(0, i - 2), i + 3);
      const cv = win.length >= 4 ? stdev(win) / mean(win) : 0.55;
      p.f.s_cvflat = cv < 0.25 ? 1 : 0;
      p.f.s_cvreg = cv >= 0.25 && cv < 0.4 ? 1 : 0;
      p.f.s_cvvar = cv > 0.7 ? 1 : 0;
    });

    // Whole-text features, shared by every sentence.
    const share = (k) => (per.length ? mean(per.map((p) => (p.f[k] ? 1 : 0))) : 0);
    const tokens = prose.map((s) => (s.text.toLowerCase().match(LEXWORD) || [])).flat();
    const proseLetters = prose.reduce((n, s) => n + (s.text.match(/\p{L}/gu) || []).length, 0);
    const D = {
      d_cv: lens.length > 1 ? clamp(stdev(lens) / mean(lens), 0, 1.5) : 0.55,
      d_meanlen: clamp(Math.log(Math.max(mean(lens), 1)) - Math.log(20), -2, 2),
      d_lex: per.length ? mean(per.map((p) => p.f.s_lexai + p.f.s_lexhum)) : 0,
      d_lexai: per.length ? mean(per.map((p) => p.f.s_lexai)) : 0,
      d_mattr: tokens.length ? mattr(tokens, 50) - 0.7 : 0,
      d_comma: clamp((prose.reduce((n, s) => n + (s.text.match(/,/g) || []).length, 0) / Math.max(proseWords, 1)) * 10, 0, 3),
      d_names: per.length ? clamp(mean(per.map((p) => p.f.s_names)), 0, 4) : 0,
      d_figure: per.length ? mean(per.map((p) => (p.f.s_figure || p.f.s_year || p.f.s_digits ? 1 : 0))) : 0,
      d_question: share('s_question'),
      d_first: share('s_first'),
      d_informal: per.length ? mean(per.map((p) => (p.f.s_informal || p.f.s_filler ? 1 : 0))) : 0,
      d_short: per.length ? mean(lens.map((n) => (n < 8 ? 1 : 0))) : 0,
      d_long: per.length ? mean(lens.map((n) => (n > 35 ? 1 : 0))) : 0,
      d_opener: share('s_opener'),
      d_wlen: clamp(proseLetters / Math.max(proseWords, 1) - 5, -2, 3),
      d_paren: share('s_paren'),
      d_quote: share('s_quote'),
      d_colon: share('s_colon'),
    };
    const fwCount = new Map();
    tokens.forEach((t) => { const k = t.replace(/’/g, "'"); fwCount.set(k, (fwCount.get(k) || 0) + 1); });
    const fwList = FW[lang] || FW.es;
    for (let i = 0; i < FW_N; i++) {
      D['d_fw_' + String(i).padStart(3, '0')] = i < fwList.length && tokens.length ? Math.sqrt((100 * (fwCount.get(fwList[i]) || 0)) / tokens.length) : 0;
    }
    const stList = STARTS[lang] || STARTS.es;
    const firsts = prose.map((s) => ((s.text.match(LEXWORD) || [''])[0] || '').toLowerCase());
    for (let i = 0; i < ST_N; i++) {
      D['d_st_' + String(i).padStart(2, '0')] = i < stList.length && firsts.length ? firsts.filter((w) => w === stList[i]).length / firsts.length : 0;
    }
    const proseText = prose.map((s) => s.text).join(' ');
    PUNCT.forEach((re, i) => { D['d_pu_' + i] = clamp((100 * (proseText.match(re) || []).length) / Math.max(proseWords, 1), 0, 20); });
    // Text-level logit. The model sees the mean of each sentence feature (m_*) and the whole-text features (d_*).
    // Reasons compare the text with the average training text, so they say what this text has more of.
    SFEATS.forEach((k) => { D['m_' + k] = per.length ? mean(per.map((p) => p.f[k])) : 0; });
    let docX = docBias;
    const byDoc = {};
    Object.keys(DW).forEach((k) => {
      const v = D[k] || 0;
      docX += DW[k] * v;
      const rel = DW[k] * (v - (DMU[k] || 0));
      const label = labelFor(k.startsWith('m_') ? k.slice(2) : k);
      if (label && rel > 0) byDoc[label] = (byDoc[label] || 0) + rel;
    });
    const docReasons = Object.entries(byDoc).filter(([, w]) => w >= 0.3).map(([label, weight]) => ({ label, weight }))
      .sort((a, b) => b.weight - a.weight).slice(0, 5);

    const signals = {};
    const tally = (label) => { signals[label] = (signals[label] || 0) + 1; };

    // Sentence-level logit from the sentence's own features. Only its distance from the text's mean counts, so a
    // sentence rises or falls around the level the whole text sets.
    prose.forEach((s, i) => {
      const { f, hits, details } = per[i];
      let x = 0;
      const byLabel = {};
      Object.keys(f).forEach((k) => {
        const c = (SW[k] || 0) * f[k];
        x += c;
        if (Math.abs(alpha * c) < 0.1) return;
        const label = LABELS[k];
        const r = byLabel[label] || (byLabel[label] = { label, weight: 0, detail: undefined });
        r.weight += alpha * c;
        if (details[k]) r.detail = r.detail ? r.detail + ', ' + details[k] : details[k];
      });
      const reasons = Object.values(byLabel).filter((r) => Math.abs(r.weight) >= 0.1);
      Object.assign(s, { sx: x, reasons, hits, f });
    });
    const meanSx = mean(prose.map((s) => s.sx));
    prose.forEach((s) => { s.dev = s.sx - meanSx; s.x = docX + alpha * s.dev; });

    // Turnitin scores each sentence "in context with the surrounding text" using overlapping
    // segments of a few sentences, so blend each sentence with its neighbours in the same paragraph.
    prose.forEach((s, i) => {
      const win = prose.slice(Math.max(0, i - C.context), i + C.context + 1).filter((o) => o.para === s.para);
      const ctx = mean(win.map((o) => o.dev));
      // z is the score before the sigmoid. Near 0 or 1 probabilities saturate, so the humanizer compares z.
      s.z = clamp(docX + alpha * (C.ownWeight * s.dev + (1 - C.ownWeight) * ctx), -30, 30);
      s.p = sigmoid(s.z);
      s.own = sigmoid(clamp(s.x, -30, 30));
      // In short texts nearly every sentence is an edge one, so the stricter bar only applies to longer texts.
      s.edge = prose.length >= C.edgeMinSentences && (i < C.edge || i >= prose.length - C.edge);
      s.threshold = Math.min(0.99, s.edge ? threshold + C.edgeExtra : threshold);
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
    let band = null;
    if (status === 'ok' || status === 'low') band = raw >= C.bandFuerte ? 'fuerte' : raw >= C.bandDudoso ? 'dudoso' : 'sin-conclusion';

    const excludedBy = {};
    sentences.filter((s) => s.excluded).forEach((s) => { excludedBy[s.excluded] = (excludedBy[s.excluded] || 0) + 1; });

    const out = {
      text,
      lang,
      tampering: { invisible: cleaned.invisible, lookalikes: cleaned.lookalikes },
      sentences,
      status,
      band,
      percentAI: raw,
      aiSentences: aiCount,
      evaluatedSentences: prose.length,
      proseWords,
      wordCount: totalWords,
      excludedBy,
      signals,
      docReasons,
      docScore: docX,
      minWords: C.minWords,
    };
    if (C.features) {
      out.features = {
        doc: FEATS.filter((k) => k[0] === 'd').map((k) => D[k]),
        s: prose.map((s) => FEATS.filter((k) => k[0] === 's').map((k) => s.f[k])),
        para: prose.map((s) => s.para),
      };
    }
    return out;
  }

  // Same cleaning analyze() applies first, for the page to normalise pasted text.
  const tidy = (text) => tidyLayout((text || '').replace(INVISIBLE, '')).normalize('NFC');
  const api = { analyze, segment, tidy, detectLang, DEFAULTS, FEATS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Polidetector = api;
})(typeof window !== 'undefined' ? window : globalThis);
