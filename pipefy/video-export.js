/* Exportação de retrospectivas para vídeo (MP4 quando suportado; WebM como alternativa). */
(function () {
  'use strict';

  var WIDTH = 720, HEIGHT = 1280, FPS = 30, SLIDE_MS = 3400, FADE_MS = 420;
  var cached = null;

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function nextFrame() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () { resolve(); });
    });
  }

  function mimeType() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
    var types = [
      'video/mp4;codecs=avc1.42E01E', 'video/mp4',
      'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'
    ];
    for (var i = 0; i < types.length; i++) {
      try {
        if (MediaRecorder.isTypeSupported(types[i])) return types[i];
      } catch (_) {}
    }
    return null;
  }

  function captureSlides(slides, frame, onProgress) {
    if (!window.html2canvas) {
      return Promise.reject(new Error('O componente de captura não carregou. Atualize a página e tente novamente.'));
    }
    if (!slides || !slides.length || !frame) {
      return Promise.reject(new Error('Não foi possível localizar os slides da retrospectiva.'));
    }

    var frameClass = frame.className;
    var snapshots = slides.map(function (el) {
      return {
        className: el.className,
        style: el.getAttribute('style'),
        aria: el.getAttribute('aria-hidden')
      };
    });

    var frameWidth = Math.round(frame.clientWidth);
    var frameHeight = Math.round(frame.clientHeight);
    if (!frameWidth || !frameHeight) {
      return Promise.reject(new Error('A apresentação está sem dimensões válidas para captura.'));
    }

    var style = document.createElement('style');
    style.textContent = [
      '.video-capture .slide{transition:none!important;}',
      '.video-capture .slide .rise{opacity:1!important;transform:none!important;animation:none!important;}',
      '.video-capture .slide .chart .col i{height:var(--h)!important;transition:none!important;}',
      '.video-capture .slide .rank .bar i{width:var(--w)!important;transition:none!important;}',
      '.video-capture .slide .stack i{transform:none!important;transition:none!important;}',
      '.video-capture .progress,.video-capture .topbar,.video-capture .zone,.video-capture .toast,',
      '.video-capture .actions,.video-capture .replay{visibility:hidden!important;opacity:0!important;}'
    ].join('\n');
    document.head.appendChild(style);
    frame.classList.add('video-capture');

    var bitmaps = [];
    var chain = Promise.resolve();
    if (document.fonts && document.fonts.ready) {
      chain = chain.then(function () { return document.fonts.ready; });
    }

    slides.forEach(function (slide, index) {
      chain = chain.then(function () {
        /*
         * display:none remove os outros slides do layout e da árvore de pintura.
         * Apenas opacity/visibility não é suficiente em algumas clonagens do
         * html2canvas quando os artigos absolutos ocupam a mesma área.
         */
        slides.forEach(function (item) {
          item.classList.remove('active');
          item.style.display = 'none';
          item.style.visibility = 'hidden';
          item.style.opacity = '0';
        });

        slide.style.display = 'flex';
        slide.style.position = 'absolute';
        slide.style.inset = '0';
        slide.style.width = frameWidth + 'px';
        slide.style.height = frameHeight + 'px';
        slide.style.boxSizing = 'border-box';
        slide.style.visibility = 'visible';
        slide.style.opacity = '1';
        slide.style.transition = 'none';
        slide.classList.add('active');
        slide.setAttribute('aria-hidden', 'false');

        if (onProgress) {
          onProgress('Preparando slide ' + (index + 1) + ' de ' + slides.length + '…');
        }

        return nextFrame().then(nextFrame).then(function () { return wait(180); }).then(function () {
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
              var clonedSlides = clonedDocument.querySelectorAll('#frame .slide');
              Array.prototype.forEach.call(clonedSlides, function (item) {
                var isTarget = item.getAttribute('data-i') === slide.getAttribute('data-i');
                item.style.setProperty('display', isTarget ? 'flex' : 'none', 'important');
                if (isTarget) {
                  item.style.setProperty('position', 'absolute', 'important');
                  item.style.setProperty('inset', '0', 'important');
                  item.style.setProperty('width', frameWidth + 'px', 'important');
                  item.style.setProperty('height', frameHeight + 'px', 'important');
                  item.style.setProperty('visibility', 'visible', 'important');
                  item.style.setProperty('opacity', '1', 'important');
                  item.classList.add('active');
                }
              });
              var clonedFrame = clonedDocument.getElementById('frame');
              if (clonedFrame) {
                clonedFrame.style.setProperty('width', frameWidth + 'px', 'important');
                clonedFrame.style.setProperty('height', frameHeight + 'px', 'important');
                clonedFrame.style.setProperty('container-type', 'size', 'important');
              }
            }
          });
        }).then(function (canvas) {
          bitmaps.push(canvas);
        });
      });
    });

    return chain.then(function () {
      return bitmaps;
    }).finally(function () {
      slides.forEach(function (el, i) {
        el.className = snapshots[i].className;
        if (snapshots[i].style === null) el.removeAttribute('style');
        else el.setAttribute('style', snapshots[i].style);
        if (snapshots[i].aria === null) el.removeAttribute('aria-hidden');
        else el.setAttribute('aria-hidden', snapshots[i].aria);
      });
      frame.className = frameClass;
      style.remove();
    });
  }

  function create(slides, frame, filename, onProgress) {
    cached = null;
    var mime = mimeType();
    if (!mime) {
      return Promise.reject(new Error('Este navegador não oferece gravação de vídeo. Use o Chrome ou Edge atualizado.'));
    }

    var ext = /mp4/i.test(mime) ? 'mp4' : 'webm';
    return captureSlides(slides, frame, onProgress).then(function (bitmaps) {
      return new Promise(function (resolve, reject) {
        var canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        var ctx = canvas.getContext('2d');
        var stream = canvas.captureStream(FPS);
        var recorder;

        try {
          recorder = new MediaRecorder(stream, {
            mimeType: mime,
            videoBitsPerSecond: 5500000
          });
        } catch (error) {
          stream.getTracks().forEach(function (track) { track.stop(); });
          reject(error);
          return;
        }

        var chunks = [];
        var total = bitmaps.length * SLIDE_MS + 500;
        recorder.ondataavailable = function (event) {
          if (event.data && event.data.size) chunks.push(event.data);
        };
        recorder.onerror = function () {
          stream.getTracks().forEach(function (track) { track.stop(); });
          reject(new Error('Falha durante a gravação do vídeo.'));
        };
        recorder.onstop = function () {
          stream.getTracks().forEach(function (track) { track.stop(); });
          var blob = new Blob(chunks, { type: mime.split(';')[0] });
          if (!blob.size) {
            reject(new Error('O navegador não gerou um arquivo de vídeo válido.'));
            return;
          }
          cached = { blob: blob, ext: ext, filename: filename + '.' + ext };
          resolve(cached);
        };

        function drawOne(bitmap, alpha, zoom) {
          var scale = Math.min(WIDTH / bitmap.width, HEIGHT / bitmap.height) * zoom;
          var w = bitmap.width * scale;
          var h = bitmap.height * scale;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.drawImage(bitmap, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
          ctx.restore();
        }

        function paint(t) {
          var i = Math.min(bitmaps.length - 1, Math.floor(t / SLIDE_MS));
          var local = t - i * SLIDE_MS;
          ctx.fillStyle = '#080b10';
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
          var zoom = 1.025 - 0.025 * Math.min(1, local / SLIDE_MS);
          if (i > 0 && local < FADE_MS) {
            drawOne(bitmaps[i - 1], 1, 1);
            drawOne(bitmaps[i], Math.min(1, local / FADE_MS), zoom);
          } else {
            drawOne(bitmaps[i], 1, zoom);
          }

          ctx.fillStyle = 'rgba(255,255,255,.28)';
          var margin = 20;
          var gap = 5;
          var barW = (WIDTH - margin * 2 - gap * (bitmaps.length - 1)) / bitmaps.length;
          for (var k = 0; k < bitmaps.length; k++) {
            var x = margin + k * (barW + gap);
            ctx.fillRect(x, 22, barW, 4);
            if (k < i) {
              ctx.fillStyle = '#fff';
              ctx.fillRect(x, 22, barW, 4);
              ctx.fillStyle = 'rgba(255,255,255,.28)';
            } else if (k === i) {
              ctx.fillStyle = '#fff';
              ctx.fillRect(x, 22, barW * Math.min(1, local / SLIDE_MS), 4);
              ctx.fillStyle = 'rgba(255,255,255,.28)';
            }
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
              setTimeout(function () {
                if (recorder.state !== 'inactive') recorder.stop();
              }, 180);
              return;
            }
            paint(elapsed);
            if (onProgress) {
              onProgress('Gerando vídeo… ' + Math.round(elapsed / total * 100) + '%. Mantenha esta aba aberta.');
            }
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