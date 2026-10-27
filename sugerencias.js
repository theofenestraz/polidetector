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
  const ALTS = {
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
    // en
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

  // Tips for one analysed sentence, strongest reason first.
  function suggest(s) {
    if (!s || s.excluded) return [];
    const tips = s.reasons
      .filter((r) => r.weight > 0 && TIPS[r.label])
      .sort((a, b) => b.weight - a.weight)
      .map((r) => {
        const t = { label: r.label, tip: TIPS[r.label], alts: [] };
        if (r.label === 'Frases hechas típicas de IA' || r.label === 'Palabras comodín' || r.label === 'Empieza con conector formal') {
          t.alts = alternatives(r.detail);
        }
        return t;
      });
    // Flagged mostly because of its neighbours: own score below the bar, context pushes it over.
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
    [', which ', '. That '], [', but ', '. But '], [', and ', '. And '],
  ];

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
    const keys = Object.keys(ALTS).filter((k) => !SKIP.test(k)).sort((a, b) => b.length - a.length);
    const m = text.match(ROLE);
    if (m) {
      const plural = /n$/i.test(m[1]);
      (plural ? ['influyen mucho', 'pesan mucho'] : ['influye mucho', 'pesa mucho'])
        .forEach((a) => list.push((t) => t.replace(ROLE, (hit) => (/^\p{Lu}/u.test(hit) ? cap(a) : a))));
    }
    keys.forEach((k) => {
      const re = termRe(k);
      if (!re.test(text)) return;
      ALTS[k].forEach((a) => list.push((t) => t.replace(re, (hit) => (a && /^\p{Lu}/u.test(hit) ? cap(a) : a))));
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
          if (a >= 5 && b >= 5 && (!best || off < best.off)) best = { off, s: t.slice(0, i) + to + t.slice(i + from.length) };
          i = t.toLowerCase().indexOf(from, i + 1);
        }
      });
      return best ? best.s : t;
    });
    return list;
  }

  // score(candidate) returns { p, ai } for the candidate placed back in the text.
  function humanize(text, score) {
    let best = text;
    let bestScore = score(text);
    const start = bestScore;
    for (let pass = 0; pass < 2; pass++) {
      for (const edit of edits(best)) {
        const c = tidy(edit(best));
        if (!c || c === best || c.split(/\s+/).length < 3) continue;
        const sc = score(c);
        if (sc.p < bestScore.p - 0.005) { best = c; bestScore = sc; }
      }
    }
    return { text: best, before: start, after: bestScore, changed: best !== text };
  }

  root.PolidetectorTips = { suggest, humanize, TIPS, ALTS };
})(typeof window !== 'undefined' ? window : globalThis);
