# Polidetector

Detector de texto generado por IA que funciona entero en el navegador. Pegas un texto y te dice qué porcentaje suena a IA, marca en rojo las frases que suenan a IA y explica por qué (frases hechas, palabras comodín, rayas, enumeraciones de tres, longitud de frase demasiado regular, etc.). Además propone cómo humanizar cada frase marcada con reglas, sin entender el sentido, así que todo es un borrador que hay que revisar. Se puede ir frase por frase o pulsar «Humanizar todo», que reescribe solo las frases marcadas y se puede deshacer. Un cambio solo se acepta si no sube el porcentaje de IA del texto. Al pegar desde Word se limpian las sangrías y saltos de línea para que el texto no se tome por una tabla.

Sigue las reglas que Turnitin publica sobre su detector: solo evalúa frases de prosa (quita listas, títulos, referencias, tablas y código), puntúa cada frase en contexto con sus vecinas y la clasifica como IA o humana según un umbral, da el porcentaje como proporción de frases evaluadas, exige al menos 300 palabras de prosa y muestra «*%» entre el 1 y el 19 %. El modelo de Turnitin es privado y no es parte de este proyecto. No es un producto de Turnitin ni está relacionado con él.

La puntuación sale de dos modelos logísticos pequeños por idioma, uno para el texto entero y otro para cada frase (`detector.js`, con los pesos en `modelo.js`). Están entrenados con textos públicos etiquetados de unos 30 modelos de IA (entre otros GPT-4o, GPT-5 mini, Gemini 2.5 Flash, DeepSeek-V3, Qwen-Max, Claude, Llama y Mistral, de los datasets DetectRL-X, HAP-ES, HAP-E, DACTYL y M4GT-Bench) y con textos humanos escritos antes de la IA generativa (El País, BBC Mundo, Agencia SINC, The Conversation, Wikipedia, ensayos de estudiantes y otros). Usan rasgos de estilo: palabras que la IA usa de más, proporción de palabras gramaticales, cómo empiezan las frases, variedad del vocabulario, ritmo de longitudes, puntuación, tono coloquial y erratas.

La prioridad es no acusar a textos humanos. El umbral se eligió para que, incluso con tipos de texto que el modelo no había visto, como mucho un 1 % de los humanos llegue al 40 %. En una prueba con 5.782 textos que no se usaron para ajustarlo, llegaron al 40 % el 0,3 % de los humanos en español y el 0,2 % en inglés, y el 85 % de la IA en español y el 44 % en inglés. El resultado se resume en tres bandas: sin conclusión (menos del 40 %), dudoso (del 40 % al 59 %) e indicio fuerte (60 % o más). Un resultado bajo no demuestra que el texto sea humano.

No usa ningún servidor: el texto no sale del navegador.

Para probarlo en local:

```bash
python3 -m http.server 8765
```

Las tipografías (Libre Franklin, Source Serif 4 y Spline Sans Mono, con licencia SIL Open Font License) se sirven desde la carpeta `fonts/`, así que la página no pide nada a servidores externos.
