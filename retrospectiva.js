(function () {
  "use strict";

  var collaborators = [];
  var form = document.getElementById("accessForm");
  var codeInputs = Array.prototype.slice.call(document.querySelectorAll(".code-digit"));
  var accessButton = document.getElementById("accessButton");
  var formStatus = document.getElementById("formStatus");
  var accessPanel = document.getElementById("accessPanel");
  var resultSection = document.getElementById("resultSection");
  var videoGrid = document.getElementById("videoGrid");
  var emptyAccess = document.getElementById("emptyAccess");
  var releasePanel = document.getElementById("releasePanel");
  var releaseTitle = document.getElementById("releaseTitle");
  var releaseMessage = document.getElementById("releaseMessage");
  var releaseDateLabel = document.getElementById("releaseDateLabel");
  var collaboratorsLoaded = false;
  var releaseConfig = String(window.GI_RETROSPECTIVE_RELEASE_AT || "").trim();
  var releaseTimestamp = releaseConfig ? Date.parse(releaseConfig) : null;
  var releaseConfigInvalid = Boolean(releaseConfig) &&
    (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(releaseConfig) || !Number.isFinite(releaseTimestamp));

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase("pt-BR");
  }

  function setStatus(message) {
    formStatus.textContent = message || "";
  }

  function getEnteredCode() {
    return codeInputs.map(function (input) {
      return input.value;
    }).join("");
  }

  function loadCollaborators() {
    fetch("colaboradores.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Não foi possível carregar a lista de colaboradores.");
        return response.json();
      })
      .then(function (data) {
        collaborators = Array.isArray(data.colaboradores) ? data.colaboradores : [];
        if (!collaborators.length) throw new Error("A lista de colaboradores está vazia ou em formato inválido.");

        codeInputs.forEach(function (input) {
          input.disabled = false;
        });
        accessButton.disabled = false;
        collaboratorsLoaded = true;
        var codeFromUrl = new URLSearchParams(window.location.search).get("codigo") || "";
        var normalizedCode = codeFromUrl.replace(/\D/g, "");
        if (/^\d{5}$/.test(normalizedCode)) {
          normalizedCode.split("").forEach(function (digit, index) {
            codeInputs[index].value = digit;
          });
          setStatus("Código preenchido pelo QR Code. Toque em acessar para continuar.");
        }
      })
      .catch(function (error) {
        setStatus(error.message + " Atualize a página ou contate a equipe de TI.");
      });
  }

  function updateReleaseState() {
    if (releaseConfigInvalid) {
      releasePanel.hidden = false;
      accessPanel.hidden = true;
      releaseTitle.textContent = "Data de divulgação inválida";
      releaseMessage.textContent = "A equipe responsável precisa definir GI_RETROSPECTIVE_RELEASE_AT em config-publico.js no formato ISO 8601 com fuso horário.";
      document.getElementById("countdown").hidden = true;
      releaseDateLabel.textContent = "";
      return false;
    }

    if (releaseTimestamp === null) {
      releasePanel.hidden = false;
      accessPanel.hidden = true;
      releaseTitle.textContent = "A divulgação ainda não foi agendada";
      releaseMessage.textContent = "A busca será liberada após a definição da data pela equipe responsável.";
      document.getElementById("countdown").hidden = true;
      releaseDateLabel.textContent = "";
      return false;
    }

    var releaseDate = new Date(releaseTimestamp);
    var remaining = releaseTimestamp - Date.now();
    if (remaining <= 0) {
      releasePanel.hidden = true;
      accessPanel.hidden = !resultSection.hidden;
      if (!collaboratorsLoaded) loadCollaborators();
      return true;
    }

    releasePanel.hidden = false;
    accessPanel.hidden = true;
    releaseTitle.textContent = "Aguarde a divulgação";
    releaseMessage.textContent = "A busca será liberada quando a contagem regressiva chegar ao fim.";
    document.getElementById("countdown").hidden = false;
    var seconds = Math.floor(remaining / 1000);
    document.getElementById("countdownDays").textContent = String(Math.floor(seconds / 86400)).padStart(2, "0");
    document.getElementById("countdownHours").textContent = String(Math.floor((seconds % 86400) / 3600)).padStart(2, "0");
    document.getElementById("countdownMinutes").textContent = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    document.getElementById("countdownSeconds").textContent = String(seconds % 60).padStart(2, "0");
    releaseDateLabel.textContent = "Liberação prevista para " + releaseDate.toLocaleString("pt-BR") + ".";
    return false;
  }

  updateReleaseState();
  window.setInterval(updateReleaseState, 1000);

  codeInputs.forEach(function (input, index) {
    input.addEventListener("input", function () {
      var digits = input.value.replace(/\D/g, "");
      input.value = digits.charAt(0);
      digits.slice(1, codeInputs.length - index).split("").forEach(function (digit, offset) {
        codeInputs[index + offset + 1].value = digit;
      });
      setStatus("");
      var nextIndex = Math.min(index + digits.length, codeInputs.length - 1);
      if (input.value && nextIndex !== index) codeInputs[nextIndex].focus();
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Backspace" && !input.value && codeInputs[index - 1]) {
        event.preventDefault();
        codeInputs[index - 1].value = "";
        codeInputs[index - 1].focus();
      } else if (event.key === "ArrowLeft" && codeInputs[index - 1]) {
        event.preventDefault();
        codeInputs[index - 1].focus();
      } else if (event.key === "ArrowRight" && codeInputs[index + 1]) {
        event.preventDefault();
        codeInputs[index + 1].focus();
      }
    });

    input.addEventListener("paste", function (event) {
      var pasted = event.clipboardData.getData("text").replace(/\D/g, "");
      if (!pasted) return;
      event.preventDefault();
      pasted.slice(0, codeInputs.length - index).split("").forEach(function (digit, offset) {
        codeInputs[index + offset].value = digit;
      });
      setStatus("");
      codeInputs[Math.min(index + pasted.length, codeInputs.length - 1)].focus();
    });
  });

  function getAnimationUrl(key, person) {
    if (key === "demandas-ti") {
      return "pipefy/setores.html?setor=" + encodeURIComponent(person.setor);
    }

    if (key === "impressoras") {
      var printerBySector = {
        almoxarifado: "impressora-03",
        recepcao: "impressora-01",
        cqb: "impressora-02",
        contabilidade: "impressora-04",
        producaoarmazem: "impressora-05",
        producaocampo: "impressora-06"
      };
      var normalizedSector = normalize(person.setor).replace(/[^a-z0-9]/g, "");
      var printer = printerBySector[normalizedSector];
      return printer
        ? "impressoras/index.html?stories=1&printer=" + encodeURIComponent(printer)
        : "";
    }

    return "";
  }

  function buildVideoCard(key, video, person) {
    var card = document.createElement("article");
    card.className = "video-card";

    var icon = document.createElement("div");
    icon.className = "video-card-icon";
    icon.textContent = key === "impressoras" ? "▤" : "⌘";

    var title = document.createElement("h3");
    title.textContent = video.titulo || (key === "impressoras" ? "Retrospectiva das Impressoras" : "Retrospectiva das Demandas de TI");

    var description = document.createElement("p");
    description.textContent = video.descricao || "Conteúdo da retrospectiva disponibilizado pela equipe de TI.";

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(description);

    var animationUrl = getAnimationUrl(key, person);
    if (animationUrl) {
      var animationFrame = document.createElement("div");
      animationFrame.className = "animation-frame";

      var player = document.createElement("iframe");
      player.className = "animation-player";
      player.src = animationUrl;
      player.title = title.textContent;
      player.loading = "lazy";
      player.allowFullscreen = true;
      animationFrame.appendChild(player);
      card.appendChild(animationFrame);
    }

    if (video.url && /^https?:\/\//i.test(video.url)) {
      if (video.modo === "video") {
        var sharedVideo = document.createElement("video");
        sharedVideo.className = "video-player";
        sharedVideo.controls = true;
        sharedVideo.preload = "metadata";
        sharedVideo.playsInline = true;
        sharedVideo.src = video.url;
        sharedVideo.style.width = "100%";
        sharedVideo.style.borderRadius = "10px";
        card.appendChild(sharedVideo);
      } else {
        var link = document.createElement("a");
        link.className = "video-action";
        link.href = video.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Abrir versão compartilhada ↗";
        card.appendChild(link);
      }
    }

    return card;
  }

  function showRetrospective(person) {
    var permissions = Array.isArray(person.retrospectivas) ? person.retrospectivas : [];
    var videoConfig = window.GI_RETROSPECTIVAS_VIDEOS || {};

    document.getElementById("welcomeTitle").textContent = "Olá, " + person.nome + "!";
    document.getElementById("welcomeSector").textContent = "Setor: " + person.setor;
    videoGrid.innerHTML = "";

    var allowed = permissions.filter(function (key) {
      return Object.prototype.hasOwnProperty.call(videoConfig, key);
    });

    allowed.forEach(function (key) {
      videoGrid.appendChild(buildVideoCard(key, videoConfig[key], person));
    });

    emptyAccess.hidden = allowed.length > 0;
    resultSection.hidden = false;
    accessPanel.hidden = true;
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    setStatus("");
    if (!updateReleaseState()) {
      setStatus("A pesquisa ainda não foi liberada.");
      return;
    }

    var enteredCode = getEnteredCode();
    if (!/^\d{5}$/.test(enteredCode)) {
      setStatus("Digite os cinco números do seu código de acesso.");
      return;
    }

    var person = collaborators.find(function (item) {
      return String(item.codigo || "").replace(/\D/g, "") === enteredCode;
    });

    if (!person) {
      setStatus("Código não encontrado. Confira os números e tente novamente.");
      return;
    }

    showRetrospective(person);
  });

  document.getElementById("changeUser").addEventListener("click", function () {
    resultSection.hidden = true;
    accessPanel.hidden = false;
    videoGrid.innerHTML = "";
    codeInputs.forEach(function (input) {
      input.value = "";
    });
    setStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    codeInputs[0].focus();
  });
})();
