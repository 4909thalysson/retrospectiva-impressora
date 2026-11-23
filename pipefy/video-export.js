/* Exportação de retrospectivas para vídeo (MP4 quando suportado; WebM como alternativa). */
(function () {
  'use strict';
  var WIDTH = 720, HEIGHT = 1280, FPS = 30, SLIDE_MS = 3400, FADE_MS = 420;
  var cached = null;

  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function nextFrame() { return new Promise(function (resolve) { requestAnimationFrame(function () { resolve(); }); }); }
  function mimeType() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
    var types = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    for (var i = 0; i < types.length; i++) {
      try { if (MediaRecorder.isTypeSupported(types[i])) return types[i]; } catch (_) {}
    }
    return null;
  }
  function captureSlides(slides, frame, onProgress) {
    if (!window.html2canvas) return Promise.reject(new Error('O componente de captura não carregou. Atualize a página e tente novamente.'));
    if (!slides || !slides.length || !frame) return Promise.reject(new Error('Não foi possível localizar os slides da retrospectiva.'));
    var snapshots = slides.map(function (el) {
      return {
        className: el.className,
        style: el.getAttribute('style'),
        aria: el.getAttribute('aria-hidden'),
        countValues: [].map.call(el.querySelectorAll('[data-count]'), function (node) {
          return { node: node, text: node.textContent };
        })
      };
    });
    var frameClass = frame.className;
    var frameStyle = frame.getAttribute('style');
    var frameWidth = Math.round(frame.clientWidth);
    var frameHeight = Math.round(frame.clientHeight);
    if (!frameWidth || !frameHeight) return Promise.reject(new Error('A apresentação está sem dimensões válidas para captura.'));

    var style = document.createElement('style');
    style.textContent = [
      '.video-capture .slide{transition:none!important;animation:none!important;}',
      '.video-capture .slide .rise{opacity:1!important;visibility:visible!important;transform:none!important;animation:none!important;transition:none!important;}',
      '.video-capture .slide .chart .col i{height:var(--h)!important;transition:none!important;animation:none!important;}',
      '.video-capture .slide .rank .bar i{width:var(--w)!important;transition:none!important;animation:none!important;}',
      '.video-capture .slide .stack i{transform:none!important;transition:none!important;animation:none!important;}',
      '.video-capture .progress,.video-capture .topbar,.video-capture .zone,.video-capture .toast,',
      '.video-capture .actions,.video-capture .replay{display:none!important;}'
    ].join('\n');
    document.head.appendChild(style);
    frame.classList.add('video-capture');
    frame.style.width = frameWidth + 'px';
    frame.style.height = frameHeight + 'px';

    var bitmaps = [];
    var chain = Promise.resolve();
    if (document.fonts && document.fonts.ready) chain = chain.then(function () { return document.fonts.ready; });

    slides.forEach(function (slide, index) {
      chain = chain.then(function () {
        // Exibe apenas o slide atual. visibility/opacity isoladamente mantém
        // os demais elementos no layout e pode provocar sobreposição na captura.
        slides.forEach(function (item) {
          item.classList.remove('active');
          item.style.setProperty('display', 'none', 'important');
          item.style.setProperty('visibility', 'hidden', 'important');
          item.style.setProperty('opacity', '0', 'important');
        });

        slide.style.setProperty('display', 'flex', 'important');
        slide.style.setProperty('position', 'absolute', 'important');
        slide.style.setProperty('inset', '0', 'important');
        slide.style.setProperty('width', frameWidth + 'px', 'important');
        slide.style.setProperty('height', frameHeight + 'px', 'important');
        slide.style.setProperty('box-sizing', 'border-box', 'important');
        slide.style.setProperty('visibility', 'visible', 'important');
        slide.style.setProperty('opacity', '1', 'important');
        slide.classList.add('active');
        slide.setAttribute('aria-hidden', 'false');

        // Finaliza os contadores no valor real antes de capturar.
        [].forEach.call(slide.querySelectorAll('[data-count]'), function (node) {
          var target = Number(node.getAttribute('data-count'));
          if (isFinite(target)) node.textContent = new Intl.NumberFormat('pt-BR').format(Math.round(target));
        });

        if (onProgress) onProgress('Preparando slide ' + (index + 1) + ' de ' + slides.length + '…');
        return nextFrame().then(nextFrame).then(function () { return wait(350); }).then(function () {
          return window.html2canvas(slide, {
            scale: 2,
            backgroundColor: null,
            useCORS: true,
            logging: false,
            width: frameWidth,
            height: frameHeight,
            windowWidth: Math.max(document.documentElement.clientWidth, frameWidth),
            windowHeight: Math.max(document.documentElement.clientHeight, frameHeight),
            onclone: function (clonedDocument) {
              var clonedFrame = clonedDocument.getElementById('frame');
              if (clonedFrame) {
                clonedFrame.style.setProperty('width', frameWidth + 'px', 'important');
                clonedFrame.style.setProperty('height', frameHeight + 'px', 'important');
                clonedFrame.style.setProperty('container-type', 'size', 'important');
              }
              var clonedSlides = clonedDocument.querySelectorAll('#frame .slide');
              Array.prototype.forEach.call(clonedSlides, function (item) {
                var isTarget = item.getAttribute('data-i') === slide.getAttribute('data-i');
                item.style.setProperty('display', isTarget ? 'flex' : 'none', 'important');
                item.style.setProperty('visibility', isTarget ? 'visible' : 'hidden', 'important');
                item.style.setProperty('opacity', isTarget ? '1' : '0', 'important');
                if (isTarget) {
                  item.style.setProperty('position', 'absolute', 'important');
                  item.style.setProperty('inset', '0', 'important');
                  item.style.setProperty('width', frameWidth + 'px', 'important');
                  item.style.setProperty('height', frameHeight + 'px', 'important');
                  item.style.setProperty('box-sizing', 'border-box', 'important');
                  item.classList.add('active');
                  [].forEach.call(item.querySelectorAll('[data-count]'), function (node) {
                    var target = Number(node.getAttribute('data-count'));
                    if (isFinite(target)) node.textContent = new Intl.NumberFormat('pt-BR').format(Math.round(target));
                  });
                }
              });
            }
          });
        }).then(function (canvas) {
          if (!canvas || !canvas.width || !canvas.height) throw new Error('Falha ao capturar o slide ' + (index + 1) + '.');
          bitmaps.push(canvas);
        });
      });
    });

    return chain.then(function () { return bitmaps; }).finally(function () {
      slides.forEach(function (el, i) {
        el.className = snapshots[i].className;
        if (snapshots[i].style === null) el.removeAttribute('style');
        else el.setAttribute('style', snapshots[i].style);
        if (snapshots[i].aria === null) el.removeAttribute('aria-hidden');
        else el.setAttribute('aria-hidden', snapshots[i].aria);
        snapshots[i].countValues.forEach(function (entry) { entry.node.textContent = entry.text; });
      });
      frame.className = frameClass;
      if (frameStyle === null) frame.removeAttribute('style');
      else frame.setAttribute('style', frameStyle);
      style.remove();
    });
  }
  function create(slides, frame, filename, onProgress) {
    cached = null;
    var mime = mimeType();
    if (!mime) return Promise.reject(new Error('Este navegador não oferece gravação de vídeo. Use o Chrome ou Edge atualizado.'));
    var ext = /mp4/i.test(mime) ? 'mp4' : 'webm';
    return captureSlides(slides, frame, onProgress).then(function (bitmaps) {
      return new Promise(function (resolve, reject) {
        var canvas = document.createElement('canvas');
        canvas.width = WIDTH; canvas.height = HEIGHT;
        var ctx = canvas.getContext('2d');
        var stream = canvas.captureStream(FPS);
        var recorder;
        try { recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5500000 }); }
        catch (error) { stream.getTracks().forEach(function (track) { track.stop(); }); reject(error); return; }
        var chunks = [], total = bitmaps.length * SLIDE_MS + 500;
        recorder.ondataavailable = function (event) { if (event.data && event.data.size) chunks.push(event.data); };
        recorder.onerror = function () { stream.getTracks().forEach(function (track) { track.stop(); }); reject(new Error('Falha durante a gravação do vídeo.')); };
        recorder.onstop = function () {
          stream.getTracks().forEach(function (track) { track.stop(); });
          var blob = new Blob(chunks, { type: mime.split(';')[0] });
          if (!blob.size) { reject(new Error('O navegador não gerou um arquivo de vídeo válido.')); return; }
          cached = { blob: blob, ext: ext, filename: filename + '.' + ext };
          resolve(cached);
        };
        function drawOne(bitmap, alpha, zoom) {
          var scale = Math.min(WIDTH / bitmap.width, HEIGHT / bitmap.height) * zoom;
          var w = bitmap.width * scale, h = bitmap.height * scale;
          ctx.save(); ctx.globalAlpha = alpha;
          ctx.drawImage(bitmap, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
          ctx.restore();
        }
        function paint(t) {
          var i = Math.min(bitmaps.length - 1, Math.floor(t / SLIDE_MS));
          var local = t - i * SLIDE_MS;
          ctx.fillStyle = '#080b10'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
          var zoom = 1.025 - 0.025 * Math.min(1, local / SLIDE_MS);
          if (i > 0 && local < FADE_MS) {
            drawOne(bitmaps[i - 1], 1, 1);
            drawOne(bitmaps[i], Math.min(1, local / FADE_MS), zoom);
          } else drawOne(bitmaps[i], 1, zoom);
          ctx.fillStyle = 'rgba(255,255,255,.28)';
          var margin = 20, gap = 5, barW = (WIDTH - margin * 2 - gap * (bitmaps.length - 1)) / bitmaps.length;
          for (var k = 0; k < bitmaps.length; k++) {
            var x = margin + k * (barW + gap);
            ctx.fillRect(x, 22, barW, 4);
            if (k < i) { ctx.fillStyle = '#fff'; ctx.fillRect(x, 22, barW, 4); ctx.fillStyle = 'rgba(255,255,255,.28)'; }
            else if (k === i) { ctx.fillStyle = '#fff'; ctx.fillRect(x, 22, barW * Math.min(1, local / SLIDE_MS), 4); ctx.fillStyle = 'rgba(255,255,255,.28)'; }
          }
        }
        try {
          paint(0);
          recorder.start(250);
          var start = performance.now();
          (function tick() {
            var elapsed = performance.now() - start;
            if (elapsed >= total) {
              paint(total - 1);
              setTimeout(function () { if (recorder.state !== 'inactive') recorder.stop(); }, 180);
              return;
            }
            paint(elapsed);
            if (onProgress) onProgress('Gerando vídeo… ' + Math.round(elapsed / total * 100) + '%. Mantenha esta aba aberta.');
            requestAnimationFrame(tick);
          })();
        } catch (error) {
          try { recorder.stop(); } catch (_) {}
          stream.getTracks().forEach(function (track) { track.stop(); });
          reject(error);
        }
      });
    });
  }
  window.GIVideoExport = { create: create };
})();