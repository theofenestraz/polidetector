# Polidetector

Detector de texto generado por IA que funciona entero en el navegador. Pegas un texto y te dice qué porcentaje suena a IA, marca en rojo las frases que suenan a IA y explica por qué (frases hechas, palabras comodín, rayas, enumeraciones de tres, longitud de frase demasiado regular, etc.). No reescribe nada: sirve para encontrar las frases que conviene revisar.

Sigue las reglas que Turnitin publica sobre su detector: solo evalúa frases de prosa (quita listas, títulos, referencias, tablas y código), puntúa cada frase en contexto con sus vecinas y la clasifica como IA o humana según un umbral, da el porcentaje como proporción de frases evaluadas, exige al menos 300 palabras de prosa y muestra «*%» entre el 1 y el 19 %. El modelo de Turnitin es privado, así que la puntuación de cada frase sale de reglas de estilo para español e inglés (`detector.js`) y el resultado es orientativo. No es un producto de Turnitin ni está relacionado con él.

El resultado se resume en tres bandas provisionales: sin conclusión (menos del 30 %), dudoso (del 30 % al 69 %) e indicio fuerte (70 % o más). Un resultado bajo no demuestra que el texto sea humano.

No usa ningún servidor: el texto no sale del navegador.

Para probarlo en local:

```bash
python3 -m http.server 8765
```
