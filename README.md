# Cabanas Meio do Mato

Site de uma página para as cabanas de vidro Aurora e Concept, em Barra de Guaratiba (RJ). Feito primeiro para o celular.

- `index.html`: estrutura e textos
- `css/site.css`: visual (cores, fontes, layout do celular e do computador)
- `js/site.js`: movimento (GSAP + ScrollTrigger + SplitText + Lenis, pelo CDN jsDelivr) e a reserva pelo WhatsApp
- `media/heroi/video.h264` e `video.json`: o vídeo da abertura (720×1280, 30 quadros/s) e o índice dos quadros. O site decodifica com WebCodecs e desenha num canvas conforme a rolagem
- `media/heroi/m` e `media/heroi/d`: a mesma abertura em fotos (480 e 720 px), usada só se o navegador não tiver WebCodecs
- `media/cenas`: trechos curtos do reel em loop (ida e volta), com a primeira imagem de cada um
- `fotos/800` e `fotos/1400`: fotos do site oficial em dois tamanhos

Para ver com todo o movimento num computador com "menos movimento" ligado, abra o endereço com `?movimento` no final.

Preço (R$ 1.440/noite) e alguns textos ainda são de referência.
