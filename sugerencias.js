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
    'de manera significativa': ['bastante', 'mucho'], 'de forma significativa': ['bastante', 'mucho'],
    'de manera efectiva': ['bien'], 'de manera integral': ['entero', 'del todo'],
    'una amplia gama': ['muchos', 'varios'], 'un amplio abanico': ['muchos', 'varios'], 'una gran variedad de': ['muchos', 'varios'],
    'un sinfín de': ['muchos'], 'una miríada de': ['muchos'],
    'adentrarnos en': ['ver', 'meternos en'], 'sumergirnos en': ['ver'], 'profundizar en': ['ver más a fondo'],
    'en el ámbito de': ['en'], 'en el contexto de': ['en'], 'un aspecto clave': ['lo principal'],
    'es fundamental': ['hace falta', 'hay que'], 'es crucial': ['hace falta', 'hay que'], 'es esencial': ['hace falta', 'hay que'],
    'resulta fundamental': ['hace falta'], 'resulta esencial': ['hace falta'], 'resulta clave': ['importa mucho'],
    'pone de manifiesto': ['muestra', 'deja ver'], 'ponen de manifiesto': ['muestran'], 'cobra especial relevancia': ['importa más'],
    'en constante evolución': ['que cambia mucho'], 'en continua evolución': ['que cambia mucho'],
    'abre la puerta a': ['permite'], 'marca un antes y un después': ['cambia mucho'],
    'teniendo en cuenta': ['como', 'ya que'], 'de cara al futuro': ['más adelante'], 'un mundo cada vez más': ['un mundo más'],
    'cada vez más importante': ['más importante'], 'pieza clave': ['parte importante'], 'apuesta por': ['elige', 'prefiere'],
    'en este contexto': ['', 'aquí'], 'todo ello': ['esto'],
    crucial: ['importante', 'clave'], cruciales: ['importantes'], fundamental: ['básico', 'importante'], fundamentales: ['básicos', 'importantes'],
    esencial: ['necesario', 'básico'], esenciales: ['necesarios'], significativo: ['grande', 'notable'], significativa: ['grande'],
    significativos: ['grandes'], significativas: ['grandes'], 'holístico': ['completo'], 'holística': ['completa'], integral: ['completo'],
    innovador: ['nuevo'], innovadora: ['nueva'], innovadores: ['nuevos'], transformador: ['que cambia mucho'],
    fomentar: ['animar a', 'favorecer'], fomenta: ['favorece'], potenciar: ['mejorar', 'reforzar'], potencia: ['mejora', 'refuerza'],
    abordar: ['tratar', 'resolver'], aborda: ['trata'], optimizar: ['mejorar', 'agilizar'], impulsar: ['empujar', 'ayudar a'],
    impulsa: ['empuja', 'ayuda a'], garantizar: ['asegurar'], panorama: ['situación'], 'ámbito': ['campo', 'terreno'],
    'ámbitos': ['campos', 'sectores'], sinergia: ['colaboración'], paradigma: ['modelo', 'forma de pensar'], 'intrínseco': ['propio'],
    'multifacético': ['variado'], 'multifacética': ['variada'], robusto: ['sólido', 'fiable'], robusta: ['sólida', 'fiable'],
    primordial: ['lo primero', 'principal'], enriquecedor: ['útil', 'que aporta'], enriquecedora: ['útil'], invaluable: ['muy útil'],
    vibrante: ['animado', 'vivo'], apasionante: ['interesante'], fascinante: ['curioso', 'interesante'],
    meticuloso: ['cuidadoso'], meticulosa: ['cuidadosa'], exhaustivo: ['completo', 'a fondo'], exhaustiva: ['completa'],
    notable: ['claro', 'grande'], notablemente: ['bastante', 'mucho'], indudablemente: ['', 'claramente'], asimismo: ['también', ''],
    sostenible: ['que aguanta', 'que dura'], eficiente: ['que funciona bien', 'rápido'], 'dinámico': ['activo', 'que cambia'], 'dinámica': ['activa'],
    'además': ['', 'y', 'también'], 'por otro lado': ['', 'pero'], 'por otra parte': ['', 'pero'], 'en primer lugar': ['', 'primero'],
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

  root.PolidetectorTips = { suggest, TIPS, ALTS };
})(typeof window !== 'undefined' ? window : globalThis);
