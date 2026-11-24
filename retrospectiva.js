(function () {
  "use strict";

  var collaborators = [];
  var form = document.getElementById("accessForm");
  var nameInput = document.getElementById("employeeName");
  var nameSuggestions = document.getElementById("nameSuggestions");
  var nameSearchStatus = document.getElementById("nameSearchStatus");
  var sectorSelect = document.getElementById("employeeSector");
  var accessButton = document.getElementById("accessButton");
  var formStatus = document.getElementById("formStatus");
  var accessPanel = document.getElementById("accessPanel");
  var resultSection = document.getElementById("resultSection");
  var videoGrid = document.getElementById("videoGrid");
  var emptyAccess = document.getElementById("emptyAccess");
  var activeSuggestion = -1;
  var selectedCollaborator = null;
  var releaseStorageKey = "gi_retrospective_release_at";
  var releasePanel = document.getElementById("releasePanel");
  var releaseTitle = document.getElementById("releaseTitle");
  var releaseMessage = document.getElementById("releaseMessage");
  var releaseDateLabel = document.getElementById("releaseDateLabel");
  var collaboratorsLoaded = false;

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

  function closeSuggestions() {
    nameSuggestions.hidden = true;
    nameInput.setAttribute("aria-expanded", "false");
    nameInput.removeAttribute("aria-activedescendant");
    activeSuggestion = -1;
  }

  function selectCollaborator(person) {
    selectedCollaborator = person;
    nameInput.value = person.nome;
    sectorSelect.value = person.setor;
    nameSearchStatus.textContent = "";
    setStatus("");
    closeSuggestions();
  }

  function renderSuggestions() {
    var query = normalize(nameInput.value);
    nameSuggestions.innerHTML = "";
    activeSuggestion = -1;

    if (query.length < 2) {
      nameSearchStatus.textContent = "";
      closeSuggestions();
      return;
    }

    var matches = collaborators.filter(function (person) {
      return normalize(person.nome).indexOf(query) !== -1;
    }).slice(0, 8);

    if (!matches.length) {
      nameSearchStatus.textContent = "Nenhum colaborador encontrado.";
      closeSuggestions();
      return;
    }

    matches.forEach(function (person, index) {
      var option = document.createElement("li");
      option.id = "nameSuggestion" + index;
      option.className = "name-suggestion";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.dataset.index = String(index);

      var name = document.createElement("span");
      name.textContent = person.nome;
      var sector = document.createElement("span");
      sector.className = "name-suggestion-sector";
      sector.textContent = person.setor;
      option.appendChild(name);
      option.appendChild(sector);
      nameSuggestions.appendChild(option);
    });

    nameSuggestions.hidden = false;
    nameInput.setAttribute("aria-expanded", "true");
    nameSearchStatus.textContent = matches.length === 8
      ? "Mais de 8 resultados. Continue digitando para refinar."
      : matches.length + (matches.length === 1 ? " colaborador encontrado." : " colaboradores encontrados.");
  }

  function setActiveSuggestion(index) {
    var options = nameSuggestions.querySelectorAll('[role="option"]');
    if (!options.length) return;
    activeSuggestion = (index + options.length) % options.length;
    Array.prototype.forEach.call(options, function (option, optionIndex) {
      var active = optionIndex === activeSuggestion;
      option.setAttribute("aria-selected", active ? "true" : "false");
      if (active) {
        nameInput.setAttribute("aria-activedescendant", option.id);
        option.scrollIntoView({ block: "nearest" });
      }
    });
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

        var sectors = Array.from(new Set(collaborators.map(function (item) {
          return String(item.setor || "").trim();
        }).filter(Boolean))).sort(function (a, b) {
          return a.localeCompare(b, "pt-BR");
        });

        sectorSelect.innerHTML = '<option value="">Selecione seu setor</option>';
        sectors.forEach(function (sector) {
          var option = document.createElement("option");
          option.value = sector;
          option.textContent = sector;
          sectorSelect.appendChild(option);
        });
        accessButton.disabled = false;
        sectorSelect.disabled = false;
        nameInput.disabled = false;
        collaboratorsLoaded = true;
      })
      .catch(function (error) {
        sectorSelect.innerHTML = '<option value="">Indisponível</option>';
        setStatus(error.message + " Atualize a página ou contate a equipe de TI.");
      });
  }

  function updateReleaseState() {
    var timestamp;
    try {
      timestamp = Number(localStorage.getItem(releaseStorageKey));
    } catch (error) {
      releasePanel.hidden = false;
      accessPanel.hidden = true;
      releaseTitle.textContent = "Não foi possível verificar a liberação";
      releaseMessage.textContent = "O navegador não permitiu consultar o agendamento. Habilite o armazenamento local e atualize a página.";
      document.getElementById("countdown").hidden = true;
      return false;
    }

    if (!timestamp || !isFinite(timestamp)) {
      releasePanel.hidden = false;
      accessPanel.hidden = true;
      releaseTitle.textContent = "A divulgação ainda não foi agendada";
      releaseMessage.textContent = "A busca será liberada após a definição da data pela equipe responsável.";
      document.getElementById("countdown").hidden = true;
      releaseDateLabel.textContent = "";
      return false;
    }

    var releaseDate = new Date(timestamp);
    var remaining = timestamp - Date.now();
    if (remaining <= 0) {
      releasePanel.hidden = true;
      accessPanel.hidden = false;
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
  window.addEventListener("storage", function (event) {
    if (event.key === releaseStorageKey) updateReleaseState();
  });

  nameInput.addEventListener("input", function () {
    if (selectedCollaborator && normalize(nameInput.value) !== normalize(selectedCollaborator.nome)) {
      selectedCollaborator = null;
      sectorSelect.value = "";
    }
    setStatus("");
    renderSuggestions();
  });

  nameInput.addEventListener("keydown", function (event) {
    if (event.key === "ArrowDown" && !nameSuggestions.hidden) {
      event.preventDefault();
      setActiveSuggestion(activeSuggestion + 1);
    } else if (event.key === "ArrowUp" && !nameSuggestions.hidden) {
      event.preventDefault();
      setActiveSuggestion(activeSuggestion < 0 ? nameSuggestions.children.length - 1 : activeSuggestion - 1);
    } else if (event.key === "Enter" && activeSuggestion >= 0 && !nameSuggestions.hidden) {
      event.preventDefault();
      selectCollaborator(collaborators.filter(function (person) {
        return normalize(person.nome).indexOf(normalize(nameInput.value)) !== -1;
      })[activeSuggestion]);
    } else if (event.key === "Escape") {
      closeSuggestions();
    }
  });

  nameSuggestions.addEventListener("mousedown", function (event) {
    event.preventDefault();
  });

  nameSuggestions.addEventListener("click", function (event) {
    var option = event.target.closest('[role="option"]');
    if (!option) return;
    var query = normalize(nameInput.value);
    var matches = collaborators.filter(function (person) {
      return normalize(person.nome).indexOf(query) !== -1;
    }).slice(0, 8);
    selectCollaborator(matches[Number(option.dataset.index)]);
  });

  nameInput.addEventListener("blur", function () {
    window.setTimeout(closeSuggestions, 120);
  });

  function getAnimationUrl(key, person) {
    if (key === "demandas-ti") {
      return "pipefy/setores.html?setor=" + encodeURIComponent(person.setor);
    }

    if (key === "impressoras") {
      var printerBySector = {
        almoxarifado: "impressora-03",
        recepcao: "impressora-01",
        cqb: "impressora-02"
      };
      var normalizedSector = normalize(person.setor).replace(/\s/g, "");
      var printer = printerBySector[normalizedSector];
      return "impressoras/index.html?stories=1" + (printer ? "&printer=" + encodeURIComponent(printer) : "");
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

    var enteredName = normalize(nameInput.value);
    var enteredSector = normalize(sectorSelect.value);

    if (!enteredName || !enteredSector) {
      setStatus("Informe seu nome completo e selecione seu setor.");
      return;
    }

    var person = collaborators.find(function (item) {
      return normalize(item.nome) === enteredName && normalize(item.setor) === enteredSector;
    });

    if (!person) {
      setStatus("Não encontramos uma correspondência para esse nome e setor. Confira os dados e tente novamente.");
      return;
    }

    showRetrospective(person);
  });

  document.getElementById("changeUser").addEventListener("click", function () {
    resultSection.hidden = true;
    accessPanel.hidden = false;
    videoGrid.innerHTML = "";
    nameInput.value = "";
    selectedCollaborator = null;
    nameSearchStatus.textContent = "";
    closeSuggestions();
    sectorSelect.value = "";
    setStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    nameInput.focus();
  });

  nameInput.disabled = true;
})();
