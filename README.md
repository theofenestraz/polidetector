# Polidetector

Detector de texto generado por IA que funciona entero en el navegador. Pegas un texto y te dice qué porcentaje suena a IA, marca en rojo las frases que suenan a IA y explica por qué (frases hechas, palabras comodín, rayas, enumeraciones de tres, longitud de frase demasiado regular, etc.). Además propone cómo humanizar cada frase marcada con reglas, sin entender el sentido, así que todo es un borrador que hay que revisar. Se puede ir frase por frase o pulsar «Humanizar todo», que reescribe solo las frases marcadas y se puede deshacer. Un cambio solo se acepta si no sube el porcentaje de IA del texto. Al pegar desde Word se limpian las sangrías y saltos de línea para que el texto no se tome por una tabla.

Sigue las reglas que Turnitin publica sobre su detector: solo evalúa frases de prosa (quita listas, títulos, referencias, tablas y código), puntúa cada frase en contexto con sus vecinas y la clasifica como IA o humana según un umbral, da el porcentaje como proporción de frases evaluadas, exige al menos 300 palabras de prosa y muestra «*%» entre el 1 y el 19 %. El modelo de Turnitin es privado, así que la puntuación de cada frase sale de reglas de estilo para español e inglés (`detector.js`) y el resultado es orientativo. No es un producto de Turnitin ni está relacionado con él.

El resultado se resume en tres bandas provisionales: sin conclusión (menos del 40 %), dudoso (del 40 % al 59 %) e indicio fuerte (60 % o más). Un resultado bajo no demuestra que el texto sea humano.

No usa ningún servidor: el texto no sale del navegador.

Para probarlo en local:

```bash
python3 -m http.server 8765
```
