// ============================================================================
// LEKKER LEZEN! - Lijn 3 Leesspel (Variant 1 & Variant 2)
// Geschikt voor tablet / iPad (touch drag-and-drop + tikken) en desktop
// ============================================================================

(() => {
  // --- Spelstatus ---
  const state = {
    level: "1",           // '1', '2', '3', of 'all'
    soundEnabled: true,
    currentVariant: null, // 1 of 2

    // Variant 1 status (10 rondes, 1 punt per ronde)
    v1: {
      totalRounds: 10,
      roundIndex: 0,
      score: 0,
      words: [],
      canScoreThisRound: true,
      roundFinished: false,
      results: [] // 'full' | 'lost'
    },

    // Variant 2 status (5 rondes, 2 punten per ronde)
    v2: {
      mode: "drag",       // 'drag' (10 letters slepen) of 'type' (zelf typen)
      useDigraphs: true,  // Lijn 3 tweeletterklanken standaard als 1 blokje
      totalRounds: 5,
      roundIndex: 0,
      score: 0,
      words: [],
      targetUnits: [],    // letters of klankblokjes van het huidige woord
      bankTiles: [],      // 10 items: { id, text, used }
      slotValues: [],     // array met { tileId, text, locked } of null per vakje
      typedText: "",      // voor 'type' modus
      mistakesThisRound: 0,
      roundFinished: false,
      results: []         // 'full' (2pt) | 'half' (1pt) | 'lost' (0pt)
    },

    // Variant 3 status (Ruimte-Mijnwerker: oneindig totdat de 3 schilden op zijn)
    v3: {
      maxShields: 3,
      shields: 3,
      score: 0,
      destroyedCount: 0,
      useDigraphs: true,
      asteroids: [],          // 1 t/m 3 actieve asteroïden: { id, wordObj, crystal, remainingMs, totalMs, driftingOut }
      selectedAsteroidId: null,
      targetUnits: [],
      bankTiles: [],          // 12 letters/klankblokjes op het dashboard
      slotValues: [],         // array met { tileId, text, locked } of null
      busy: false,
      practicedWords: [],
      nextSpawnAt: 0,
      warpUntil: 0
    }
  };

  // Nederlandse tweeletterklanken volgens Lijn 3
  const LIJN3_DIGRAPHS = [
    "sch", "aa", "ee", "oo", "uu", "oe", "eu", "ie", "ij", "ei", "ui", "ou", "au", "ng", "nk"
  ];

  const ALPHABET_LETTERS = "aaeeooiijkmnsprtvbdzhlwgfuk".split("");
  const ONSCREEN_KB_ROWS = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["z", "x", "c", "v", "b", "n", "m", "⌫"]
  ];

  // --- Audio & Spraak (Web Audio API + Web Speech API) ---
  let audioCtx = null;

  function ensureAudioCtx() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function playTone(freq, durationMs, type = "sine", delayMs = 0, gainVal = 0.14) {
    if (!state.soundEnabled) return;
    ensureAudioCtx();
    if (!audioCtx) return;

    setTimeout(() => {
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + durationMs / 1000);
      } catch (_) {}
    }, delayMs);
  }

  function playSoundSuccess() {
    playTone(523.25, 130, "triangle", 0);    // C5
    playTone(659.25, 130, "triangle", 110);  // E5
    playTone(783.99, 240, "triangle", 220);  // G5
  }

  function playSoundFanfare() {
    playTone(523.25, 140, "triangle", 0);
    playTone(659.25, 140, "triangle", 130);
    playTone(783.99, 140, "triangle", 260);
    playTone(1046.5, 380, "triangle", 390);
  }

  function playSoundWrong() {
    playTone(300, 160, "sawtooth", 0, 0.08);
    playTone(240, 220, "sawtooth", 140, 0.08);
  }

  function playSoundPop() {
    playTone(600, 55, "sine", 0, 0.09);
  }

  function playSoundLaser() {
    // Coole sci-fi laser + kristal-ontploffing
    playTone(980, 90, "sawtooth", 0, 0.12);
    playTone(640, 90, "sawtooth", 60, 0.12);
    playTone(320, 150, "triangle", 120, 0.14);
    playTone(587.33, 140, "sine", 240, 0.12);
    playTone(880, 220, "sine", 340, 0.14);
  }

  function playSoundWarp() {
    // Hyperspace sector-sprong geluid
    playTone(330, 110, "sine", 0, 0.1);
    playTone(494, 110, "sine", 90, 0.11);
    playTone(659, 140, "triangle", 180, 0.12);
    playTone(987, 260, "triangle", 280, 0.13);
  }

  function playSoundCrash() {
    // Botsing op het ruimteschip-schild
    playTone(160, 220, "sawtooth", 0, 0.16);
    playTone(115, 280, "square", 120, 0.14);
    playTone(90, 320, "sawtooth", 240, 0.14);
  }

  let currentWordAudio = null;

  function speakFallbackTTS(text) {
    if (!("speechSynthesis" in window)) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "nl-NL";
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    } catch (_) {}
  }

  function speakText(text) {
    if (!state.soundEnabled || !text) return;
    const cleanWord = text.trim().toLowerCase();

    try {
      if (currentWordAudio) {
        currentWordAudio.pause();
        currentWordAudio.currentTime = 0;
      }
      const audio = new Audio(`audio/${encodeURIComponent(cleanWord)}.mp3`);
      currentWordAudio = audio;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          speakFallbackTTS(cleanWord);
        });
      }
    } catch (_) {
      speakFallbackTTS(cleanWord);
    }
  }

  // --- Hulpfuncties ---
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getFilteredWords() {
    if (state.level === "all") {
      return [...WORDS_DATA];
    }
    const targetLevel = parseInt(state.level, 10);
    return WORDS_DATA.filter(w => w.level === targetLevel);
  }

  function renderPictureHTML(wordObj) {
    if (wordObj.customSvg && CUSTOM_SVGS[wordObj.customSvg]) {
      return `<div class="pic-svg">${CUSTOM_SVGS[wordObj.customSvg]}</div>`;
    }
    return `<span class="pic-emoji" role="img" aria-label="${wordObj.word}">${wordObj.emoji}</span>`;
  }

  // Splits een woord in losse letters of in Lijn 3 klankblokjes
  function splitWordIntoUnits(word, useDigraphs) {
    if (!useDigraphs) {
      return word.split("");
    }
    const units = [];
    let i = 0;
    while (i < word.length) {
      let matched = null;
      for (const dg of LIJN3_DIGRAPHS) {
        if (word.startsWith(dg, i)) {
          matched = dg;
          break;
        }
      }
      if (matched) {
        units.push(matched);
        i += matched.length;
      } else {
        units.push(word[i]);
        i += 1;
      }
    }
    return units;
  }

  // --- Schermnavigatie ---
  const screens = {
    menu: document.getElementById("screen-menu"),
    v2Setup: document.getElementById("screen-v2-setup"),
    gameV1: document.getElementById("screen-game-v1"),
    gameV2: document.getElementById("screen-game-v2"),
    gameV3: document.getElementById("screen-game-v3"),
    result: document.getElementById("screen-result")
  };
  const btnHome = document.getElementById("btn-home");

  function showScreen(screenKey) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[screenKey].classList.add("active");
    document.body.classList.toggle("cockpit-fullscreen", screenKey === "gameV3");
    if (screenKey === "menu") {
      btnHome.classList.add("hidden");
    } else {
      btnHome.classList.remove("hidden");
    }
    if (screenKey !== "gameV3") {
      stopVariant3Loops();
    }
    stopConfetti();
  }

  function renderProgressDots(containerId, total, currentIdx, results) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const dot = document.createElement("div");
      dot.className = "progress-dot";
      if (i < results.length) {
        if (results[i] === "full") dot.classList.add("won-full");
        else if (results[i] === "half") dot.classList.add("won-half");
        else dot.classList.add("lost");
      } else if (i === currentIdx) {
        dot.classList.add("current");
      }
      container.appendChild(dot);
    }
  }

  // ==========================================================================
  // VARIANT 1: Woord lezen & juiste plaatje aanklikken (10 rondes, 1 pt/ronde)
  // ==========================================================================
  function startVariant1() {
    state.currentVariant = 1;
    const pool = shuffle(getFilteredWords());
    state.v1.words = pool.slice(0, state.v1.totalRounds);
    state.v1.roundIndex = 0;
    state.v1.score = 0;
    state.v1.results = [];
    showScreen("gameV1");
    loadVariant1Round();
  }

  function loadVariant1Round() {
    const v1 = state.v1;
    const currentWordObj = v1.words[v1.roundIndex];
    v1.canScoreThisRound = true;
    v1.roundFinished = false;

    // HUD bijwerken
    document.getElementById("v1-round-text").textContent = `${v1.roundIndex + 1} / ${v1.totalRounds}`;
    document.getElementById("v1-score-text").textContent = v1.score;
    renderProgressDots("v1-progress-dots", v1.totalRounds, v1.roundIndex, v1.results);

    // Doelwoord tonen
    document.getElementById("v1-target-word").textContent = currentWordObj.word;

    const statusPill = document.getElementById("v1-round-points-status");
    statusPill.textContent = "🌟 1 punt te verdienen";
    statusPill.className = "points-status-pill";

    const feedbackBar = document.getElementById("v1-feedback-bar");
    feedbackBar.textContent = "Tik op het plaatje dat bij het woord hoort!";
    feedbackBar.className = "feedback-bar";

    // Kies 3 foute plaatjes (afleiders) met een ander woord & icoon
    const distractors = shuffle(
      WORDS_DATA.filter(w => w.word !== currentWordObj.word && w.emoji !== currentWordObj.emoji)
    ).slice(0, 3);

    const options = shuffle([currentWordObj, ...distractors]);
    const grid = document.getElementById("v1-pictures-grid");
    grid.innerHTML = "";

    options.forEach(opt => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "pic-card";
      card.style.backgroundColor = opt.bg || "#FFFFFF";
      card.innerHTML = renderPictureHTML(opt);
      card.addEventListener("click", () => handleVariant1Pick(card, opt, currentWordObj));
      grid.appendChild(card);
    });
  }

  function handleVariant1Pick(cardEl, pickedObj, targetObj) {
    const v1 = state.v1;
    if (v1.roundFinished || cardEl.classList.contains("faded")) return;

    const feedbackBar = document.getElementById("v1-feedback-bar");
    const statusPill = document.getElementById("v1-round-points-status");

    if (pickedObj.word === targetObj.word) {
      // Goede plaatje gekozen!
      v1.roundFinished = true;
      cardEl.classList.add("correct");
      playSoundSuccess();
      speakText(targetObj.word);

      // Laat de overige foute plaatjes ook rustig vervagen
      document.querySelectorAll("#v1-pictures-grid .pic-card").forEach(el => {
        if (el !== cardEl) el.classList.add("faded");
      });

      if (v1.canScoreThisRound) {
        v1.score += 1;
        v1.results.push("full");
        document.getElementById("v1-score-text").textContent = v1.score;
        feedbackBar.textContent = `Goed zo! Dat is "${targetObj.word}"! +1 punt ⭐`;
        feedbackBar.className = "feedback-bar good";
      } else {
        v1.results.push("lost");
        feedbackBar.textContent = `Gevonden! Dat is "${targetObj.word}". Op naar de volgende!`;
        feedbackBar.className = "feedback-bar";
      }

      renderProgressDots("v1-progress-dots", v1.totalRounds, v1.roundIndex, v1.results);

      setTimeout(() => {
        v1.roundIndex += 1;
        if (v1.roundIndex < v1.totalRounds) {
          loadVariant1Round();
        } else {
          showResultsScreen(v1.score, v1.totalRounds, v1.words);
        }
      }, 1250);
    } else {
      // Foute plaatje gekozen -> vervaagt zodat alleen de andere opties overblijven, geen punt meer deze ronde
      cardEl.classList.add("faded");
      v1.canScoreThisRound = false;
      playSoundWrong();

      statusPill.textContent = "Geen punt meer deze ronde • Zoek het goede plaatje!";
      statusPill.className = "points-status-pill no-points";

      feedbackBar.textContent = "Oeps, dat is een ander plaatje! Kijk goed naar de overgebleven plaatjes.";
      feedbackBar.className = "feedback-bar warn";
    }
  }

  // ==========================================================================
  // VARIANT 2: Plaatje kijken & zelf woord maken (5 rondes, 2 pt/ronde)
  // ==========================================================================
  function startVariant2() {
    state.currentVariant = 2;
    const pool = shuffle(getFilteredWords());
    state.v2.words = pool.slice(0, state.v2.totalRounds);
    state.v2.roundIndex = 0;
    state.v2.score = 0;
    state.v2.results = [];
    showScreen("gameV2");
    loadVariant2Round();
  }

  function loadVariant2Round() {
    const v2 = state.v2;
    const currentWordObj = v2.words[v2.roundIndex];
    v2.mistakesThisRound = 0;
    v2.roundFinished = false;
    v2.typedText = "";

    // HUD bijwerken
    document.getElementById("v2-round-text").textContent = `${v2.roundIndex + 1} / ${v2.totalRounds}`;
    document.getElementById("v2-score-text").textContent = v2.score;
    renderProgressDots("v2-progress-dots", v2.totalRounds, v2.roundIndex, v2.results);

    // Plaatje tonen
    const picBox = document.getElementById("v2-picture-box");
    picBox.style.backgroundColor = currentWordObj.bg || "#FFF";
    picBox.innerHTML = renderPictureHTML(currentWordObj);

    // Punten-badge en instructie
    updateVariant2StatusUI();

    const feedbackBar = document.getElementById("v2-feedback-bar");
    feedbackBar.textContent = "";
    feedbackBar.className = "feedback-bar";

    // Knoppen tonen/verbergen
    document.getElementById("btn-v2-check").classList.remove("hidden");
    document.getElementById("btn-v2-next").classList.add("hidden");

    // Woord opdelen in letters (of klankblokjes in drag-modus indien aangevinkt)
    const useDigraphsNow = v2.mode === "drag" && v2.useDigraphs;
    v2.targetUnits = splitWordIntoUnits(currentWordObj.word, useDigraphsNow);
    v2.slotValues = new Array(v2.targetUnits.length).fill(null);

    if (v2.mode === "drag") {
      document.getElementById("v2-letter-bank-wrapper").classList.remove("hidden");
      document.getElementById("v2-keyboard-wrapper").classList.add("hidden");
      buildVariant2BankTiles(v2.targetUnits, useDigraphsNow);
      renderVariant2DragUI();
    } else {
      document.getElementById("v2-letter-bank-wrapper").classList.add("hidden");
      document.getElementById("v2-keyboard-wrapper").classList.remove("hidden");
      const textInput = document.getElementById("v2-text-input");
      if (textInput) textInput.value = "";
      renderVariant2TypeSlots();
    }
  }

  function updateVariant2StatusUI() {
    const v2 = state.v2;
    const badge = document.getElementById("v2-points-badge");
    const instr = document.getElementById("v2-instruction-text");

    if (v2.mistakesThisRound === 0) {
      badge.textContent = "🌟🌟 2 punten waard";
      badge.className = "points-status-pill points-2";
      instr.textContent =
        v2.mode === "drag"
          ? "Sleep de letters in de juiste volgorde naar de vakjes!"
          : "Typ de letters van het woord met het toetsenbord!";
    } else if (v2.mistakesThisRound === 1) {
      badge.textContent = "🌟 Verbeter voor 1 punt!";
      badge.className = "points-status-pill points-1";
      instr.textContent =
        v2.mode === "drag"
          ? "Verbeter de lege vakjes om alsnog 1 punt te scoren!"
          : "Typ de ontbrekende letter(s) om alsnog 1 punt te scoren!";
    } else {
      badge.textContent = "Geen punten meer deze ronde";
      badge.className = "points-status-pill no-points";
    }
  }

  // Genereer 10 letters (waarvan de benodigde letters voor het woord + afleiders)
  function buildVariant2BankTiles(targetUnits, useDigraphs) {
    const totalTilesCount = 10;
    const tiles = targetUnits.map((unit, idx) => ({
      id: `tile-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      text: unit,
      used: false
    }));

    const distractorPool = useDigraphs
      ? [...ALPHABET_LETTERS, "aa", "ee", "oo", "oe", "ij", "ui", "eu", "ie"]
      : ALPHABET_LETTERS;

    while (tiles.length < totalTilesCount) {
      const randomChar = distractorPool[Math.floor(Math.random() * distractorPool.length)];
      tiles.push({
        id: `tile-dist-${tiles.length}-${Math.random().toString(36).slice(2, 6)}`,
        text: randomChar,
        used: false
      });
    }

    state.v2.bankTiles = shuffle(tiles);
  }

  function renderVariant2DragUI() {
    const v2 = state.v2;
    const slotsContainer = document.getElementById("v2-word-slots");
    const bankContainer = document.getElementById("v2-letter-bank");

    slotsContainer.innerHTML = "";
    v2.slotValues.forEach((slotVal, slotIdx) => {
      const slotEl = document.createElement("div");
      slotEl.className = "letter-slot";
      slotEl.dataset.slotIndex = slotIdx;

      if (slotVal) {
        slotEl.textContent = slotVal.text;
        slotEl.classList.add("filled");
        if (slotVal.locked) {
          slotEl.classList.add("slot-correct");
        } else {
          // Zowel slepen vanuit een vakje als tikken om te verwijderen
          attachSlotPointerEvents(slotEl, slotIdx);
        }
      }
      slotsContainer.appendChild(slotEl);
    });

    bankContainer.innerHTML = "";
    v2.bankTiles.forEach(tile => {
      const tileEl = document.createElement("div");
      tileEl.className = "letter-tile" + (tile.used ? " used" : "");
      tileEl.textContent = tile.text;
      tileEl.dataset.tileId = tile.id;

      if (!tile.used && !v2.roundFinished) {
        attachBankTilePointerEvents(tileEl, tile);
      }
      bankContainer.appendChild(tileEl);
    });
  }

  // --- Touch & Mouse Drag-and-Drop Engine (PointerEvents) ---
  let dragContext = null;

  function attachBankTilePointerEvents(tileEl, tile) {
    tileEl.addEventListener("pointerdown", e => {
      if (state.v2.roundFinished || tile.used) return;
      e.preventDefault();
      startPointerDrag(e, {
        sourceType: "bank",
        tileId: tile.id,
        text: tile.text,
        sourceSlotIndex: null
      });
    });
  }

  function attachSlotPointerEvents(slotEl, slotIdx) {
    slotEl.addEventListener("pointerdown", e => {
      const slotVal = state.v2.slotValues[slotIdx];
      if (state.v2.roundFinished || !slotVal || slotVal.locked) return;
      e.preventDefault();
      startPointerDrag(e, {
        sourceType: "slot",
        tileId: slotVal.tileId,
        text: slotVal.text,
        sourceSlotIndex: slotIdx
      });
    });
  }

  function startPointerDrag(e, info) {
    const startX = e.clientX;
    const startY = e.clientY;

    const ghost = document.createElement("div");
    ghost.className = "dragging-ghost";
    ghost.textContent = info.text;
    ghost.style.left = `${startX}px`;
    ghost.style.top = `${startY}px`;
    ghost.style.display = "none";
    document.body.appendChild(ghost);

    dragContext = {
      ...info,
      startX,
      startY,
      hasMoved: false,
      ghost,
      hoveredSlotIndex: null
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(e) {
    if (!dragContext) return;
    e.preventDefault();
    const dx = e.clientX - dragContext.startX;
    const dy = e.clientY - dragContext.startY;

    if (!dragContext.hasMoved && Math.hypot(dx, dy) > 8) {
      dragContext.hasMoved = true;
      dragContext.ghost.style.display = "flex";
    }

    if (dragContext.hasMoved) {
      dragContext.ghost.style.left = `${e.clientX}px`;
      dragContext.ghost.style.top = `${e.clientY}px`;

      // Kijk welk doelvakje onder de vinger zit
      const slotEls = document.querySelectorAll("#v2-word-slots .letter-slot");
      let foundIdx = null;
      slotEls.forEach(el => {
        el.classList.remove("highlight-drop");
        const idx = parseInt(el.dataset.slotIndex, 10);
        const existing = state.v2.slotValues[idx];
        if (existing && existing.locked) return;

        const rect = el.getBoundingClientRect();
        // Ruime marge zodat kinderen op een iPad makkelijk raak slepen
        if (
          e.clientX >= rect.left - 10 &&
          e.clientX <= rect.right + 10 &&
          e.clientY >= rect.top - 14 &&
          e.clientY <= rect.bottom + 14
        ) {
          foundIdx = idx;
        }
      });

      if (foundIdx !== null) {
        slotEls[foundIdx].classList.add("highlight-drop");
      }
      dragContext.hoveredSlotIndex = foundIdx;
    }
  }

  function onPointerUp(e) {
    if (!dragContext) return;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);

    const ctx = dragContext;
    dragContext = null;
    if (ctx.ghost && ctx.ghost.parentNode) {
      ctx.ghost.parentNode.removeChild(ctx.ghost);
    }
    document.querySelectorAll("#v2-word-slots .letter-slot").forEach(el => {
      el.classList.remove("highlight-drop");
    });

    const v2 = state.v2;

    // Geval 1: Kind tikt kort op een letter (zonder slepen)
    if (!ctx.hasMoved) {
      if (ctx.sourceType === "bank") {
        const firstEmptyIdx = v2.slotValues.findIndex(val => val === null);
        if (firstEmptyIdx !== -1) {
          placeTileInSlot(ctx.tileId, ctx.text, firstEmptyIdx);
        }
      } else if (ctx.sourceType === "slot") {
        removeTileFromSlot(ctx.sourceSlotIndex);
      }
      return;
    }

    // Geval 2: Kind heeft de letter gesleept
    if (ctx.hoveredSlotIndex !== null) {
      const targetIdx = ctx.hoveredSlotIndex;
      if (ctx.sourceType === "bank") {
        placeTileInSlot(ctx.tileId, ctx.text, targetIdx);
      } else if (ctx.sourceType === "slot") {
        swapOrMoveSlotTile(ctx.sourceSlotIndex, targetIdx);
      }
      return;
    }

    // Als vanuit de letterbank richting de woordbalk is gesleept, maar net naast een vakje losgelaten:
    const slotsBox = document.querySelector(".word-slots-container");
    if (ctx.sourceType === "bank" && slotsBox) {
      const boxRect = slotsBox.getBoundingClientRect();
      if (
        e.clientY >= boxRect.top - 30 &&
        e.clientY <= boxRect.bottom + 30 &&
        e.clientX >= boxRect.left - 30 &&
        e.clientX <= boxRect.right + 30
      ) {
        const firstEmptyIdx = v2.slotValues.findIndex(val => val === null);
        if (firstEmptyIdx !== -1) {
          placeTileInSlot(ctx.tileId, ctx.text, firstEmptyIdx);
          return;
        }
      }
    }

    // Als vanuit een vakje terug naar beneden (buiten de vakjes) is gesleept -> terug naar letterbank
    if (ctx.sourceType === "slot") {
      removeTileFromSlot(ctx.sourceSlotIndex);
    }
  }

  function placeTileInSlot(tileId, text, slotIdx) {
    const v2 = state.v2;
    const existing = v2.slotValues[slotIdx];
    if (existing && existing.locked) return;

    // Als er al een niet-vergrendelde letter stond, geef die vrij in de letterbank
    if (existing) {
      const oldBankTile = v2.bankTiles.find(t => t.id === existing.tileId);
      if (oldBankTile) oldBankTile.used = false;
    }

    const bankTile = v2.bankTiles.find(t => t.id === tileId);
    if (bankTile) bankTile.used = true;

    v2.slotValues[slotIdx] = { tileId, text, locked: false };
    playSoundPop();
    renderVariant2DragUI();
  }

  function removeTileFromSlot(slotIdx) {
    const v2 = state.v2;
    const existing = v2.slotValues[slotIdx];
    if (!existing || existing.locked) return;

    const bankTile = v2.bankTiles.find(t => t.id === existing.tileId);
    if (bankTile) bankTile.used = false;

    v2.slotValues[slotIdx] = null;
    playSoundPop();
    renderVariant2DragUI();
  }

  function swapOrMoveSlotTile(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const v2 = state.v2;
    const fromVal = v2.slotValues[fromIdx];
    const toVal = v2.slotValues[toIdx];
    if (!fromVal || fromVal.locked || (toVal && toVal.locked)) return;

    v2.slotValues[toIdx] = fromVal;
    v2.slotValues[fromIdx] = toVal || null;
    playSoundPop();
    renderVariant2DragUI();
  }

  // --- Variant 2: Zelf typen modus (toetsenbord) ---
  function renderVariant2TypeSlots() {
    const v2 = state.v2;
    const slotsContainer = document.getElementById("v2-word-slots");
    slotsContainer.innerHTML = "";

    v2.slotValues.forEach((slotVal, idx) => {
      const slotEl = document.createElement("div");
      slotEl.className = "letter-slot";
      slotEl.dataset.slotIndex = idx;

      if (slotVal) {
        slotEl.textContent = slotVal.text;
        slotEl.classList.add("filled");
        if (slotVal.locked) {
          slotEl.classList.add("slot-correct");
        } else {
          // Tik op een ingevuld vakje om die letter te wissen
          slotEl.addEventListener("click", () => {
            if (v2.roundFinished) return;
            v2.slotValues[idx] = null;
            playSoundPop();
            syncTypeInputFromSlots();
            renderVariant2TypeSlots();
          });
        }
      }
      slotsContainer.appendChild(slotEl);
    });
  }

  function syncTypeInputFromSlots() {
    const textInput = document.getElementById("v2-text-input");
    if (textInput) {
      textInput.value = state.v2.slotValues.map(s => (s ? s.text : "·")).join("");
    }
  }

  function buildOnscreenKeyboard() {
    const container = document.getElementById("v2-onscreen-keyboard");
    container.innerHTML = "";
    ONSCREEN_KB_ROWS.forEach(row => {
      const rowEl = document.createElement("div");
      rowEl.className = "kb-row";
      row.forEach(key => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "kb-key" + (key === "⌫" ? " kb-wide" : "");
        btn.textContent = key === "⌫" ? "⌫ Wis" : key;
        btn.addEventListener("click", () => handleTypeKeyInput(key));
        rowEl.appendChild(btn);
      });
      container.appendChild(rowEl);
    });
  }

  function handleTypeKeyInput(key) {
    const v2 = state.v2;
    if (v2.roundFinished || v2.mode !== "type") return;

    if (key === "⌫" || key === "Backspace") {
      // Wis het laatst ingevulde vakje dat nog niet vergrendeld (groen) is
      for (let i = v2.slotValues.length - 1; i >= 0; i--) {
        if (v2.slotValues[i] && !v2.slotValues[i].locked) {
          v2.slotValues[i] = null;
          playSoundPop();
          break;
        }
      }
    } else if (/^[a-z]$/i.test(key)) {
      const char = key.toLowerCase();
      const firstEmptyIdx = v2.slotValues.findIndex(val => val === null);
      if (firstEmptyIdx !== -1) {
        v2.slotValues[firstEmptyIdx] = { tileId: null, text: char, locked: false };
        playSoundPop();
      }
    }
    syncTypeInputFromSlots();
    renderVariant2TypeSlots();
  }

  // --- Controleer het gemaakte woord in Variant 2 ---
  function checkVariant2Word() {
    const v2 = state.v2;
    if (v2.roundFinished) return;

    const currentWordObj = v2.words[v2.roundIndex];
    const targetWord = currentWordObj.word;
    const feedbackBar = document.getElementById("v2-feedback-bar");

    const isComplete = v2.slotValues.every(v => v !== null);
    const formedWord = v2.slotValues.map(v => (v ? v.text : "")).join("");

    if (!isComplete) {
      playSoundWrong();
      feedbackBar.textContent = "Vul eerst alle vakjes in voordat je controleert!";
      feedbackBar.className = "feedback-bar warn";
      return;
    }

    // Is het woord helemaal goed?
    if (formedWord === targetWord) {
      v2.roundFinished = true;
      const pointsEarned = v2.mistakesThisRound === 0 ? 2 : 1;
      v2.score += pointsEarned;
      v2.results.push(pointsEarned === 2 ? "full" : "half");

      document.getElementById("v2-score-text").textContent = v2.score;
      renderProgressDots("v2-progress-dots", v2.totalRounds, v2.roundIndex, v2.results);

      // Markeer alle vakjes groen
      v2.slotValues.forEach(s => {
        if (s) s.locked = true;
      });
      if (v2.mode === "drag") {
        renderVariant2DragUI();
      } else {
        renderVariant2TypeSlots();
      }

      playSoundSuccess();
      speakText(targetWord);

      feedbackBar.textContent =
        pointsEarned === 2
          ? `Superknap! In één keer "${targetWord}"! +2 punten 🌟🌟`
          : `Knap verbeterd! Het is "${targetWord}"! +1 punt 🌟`;
      feedbackBar.className = "feedback-bar good";

      document.getElementById("btn-v2-check").classList.add("hidden");
      setTimeout(() => {
        advanceVariant2Round();
      }, 1450);
      return;
    }

    // Er is een foutje gemaakt!
    v2.mistakesThisRound += 1;
    playSoundWrong();

    if (v2.mistakesThisRound === 1) {
      // Eerste foutje: kind mag het verbeteren om alsnog 1 punt te scoren!
      updateVariant2StatusUI();
      feedbackBar.textContent =
        "Bijna goed! De groene letters staan goed. Verbeter de andere voor 1 punt!";
      feedbackBar.className = "feedback-bar warn";

      const slotEls = document.querySelectorAll("#v2-word-slots .letter-slot");
      v2.slotValues.forEach((slotVal, idx) => {
        if (slotVal && slotVal.text === v2.targetUnits[idx]) {
          slotVal.locked = true;
          slotEls[idx].classList.add("slot-correct");
        } else {
          slotEls[idx].classList.add("slot-wrong");
        }
      });

      // Laat de foute letters even rood schudden en maak die vakjes dan leeg zodat het kind ze kan verbeteren
      setTimeout(() => {
        v2.slotValues.forEach((slotVal, idx) => {
          if (slotVal && !slotVal.locked) {
            if (v2.mode === "drag") {
              const bankTile = v2.bankTiles.find(t => t.id === slotVal.tileId);
              if (bankTile) bankTile.used = false;
            }
            v2.slotValues[idx] = null;
          }
        });
        if (v2.mode === "drag") {
          renderVariant2DragUI();
        } else {
          syncTypeInputFromSlots();
          renderVariant2TypeSlots();
        }
      }, 650);
    } else {
      // Tweede foutje: 0 punten deze ronde, toon het juiste antwoord en ga door
      v2.roundFinished = true;
      v2.results.push("lost");
      updateVariant2StatusUI();
      renderProgressDots("v2-progress-dots", v2.totalRounds, v2.roundIndex, v2.results);

      // Toon het juiste woord in de vakjes
      v2.slotValues = v2.targetUnits.map(u => ({
        tileId: null,
        text: u,
        locked: true
      }));

      if (v2.mode === "drag") {
        renderVariant2DragUI();
      } else {
        syncTypeInputFromSlots();
        renderVariant2TypeSlots();
      }

      speakText(targetWord);
      feedbackBar.textContent = `Het juiste woord is "${targetWord}". Kijk maar goed, dan weet je hem de volgende keer!`;
      feedbackBar.className = "feedback-bar warn";

      document.getElementById("btn-v2-check").classList.add("hidden");
      document.getElementById("btn-v2-next").classList.remove("hidden");
    }
  }

  function advanceVariant2Round() {
    const v2 = state.v2;
    v2.roundIndex += 1;
    if (v2.roundIndex < v2.totalRounds) {
      loadVariant2Round();
    } else {
      showResultsScreen(v2.score, v2.totalRounds * 2, v2.words);
    }
  }

  // ==========================================================================
  // VARIANT 3: RUIMTE-MIJNWERKER (3D Cockpit, Automatische Opbouw & Dynamische Asteroïden)
  // ==========================================================================
  const V3_CRYSTALS = [
    { type: "blue", icon: "💎", points: 10, className: "crystal-blue" },
    { type: "purple", icon: "🔮", points: 20, className: "crystal-purple" },
    { type: "gold", icon: "🌟", points: 30, className: "crystal-gold" }
  ];

  let v3SpaceAnimId = null;
  let v3DriftIntervalId = null;
  let v3Stars = [];

  function stopVariant3Loops() {
    if (v3SpaceAnimId) {
      cancelAnimationFrame(v3SpaceAnimId);
      v3SpaceAnimId = null;
    }
    if (v3DriftIntervalId) {
      clearInterval(v3DriftIntervalId);
      v3DriftIntervalId = null;
    }
  }

  function startVariant3() {
    state.currentVariant = 3;
    const v3 = state.v3;
    v3.shields = v3.maxShields;
    v3.score = 0;
    v3.destroyedCount = 0;
    v3.busy = false;
    v3.practicedWords = [];
    v3.asteroids = [];
    v3.selectedAsteroidId = null;
    v3.warpUntil = Date.now() + 900;

    const chk = document.getElementById("chk-v3-digraphs");
    if (chk) v3.useDigraphs = chk.checked;

    showScreen("gameV3");
    startVariant3SpaceCanvas();
    updateVariant3HUD();

    // Start rustig met 1 asteroïde; na een paar seconden zweeft er vanzelf een 2e (en later 3e) bij
    spawnSingleV3Asteroid();
    v3.nextSpawnAt = Date.now() + 5500;
    v3.selectedAsteroidId = v3.asteroids[0].id;
    setupVariant3Target(false);
    renderVariant3Asteroids();

    if (v3DriftIntervalId) clearInterval(v3DriftIntervalId);
    v3DriftIntervalId = setInterval(tickVariant3Asteroids, 200);
  }

  // --- Bewegende 3D Sterrenhemel & Warp-effect in het Cockpitraam ---
  function startVariant3SpaceCanvas() {
    const canvas = document.getElementById("v3-space-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.max(320, Math.floor(rect.width));
      canvas.height = Math.max(180, Math.floor(rect.height));
    }
    resize();

    v3Stars = Array.from({ length: 70 }, () => ({
      x: (Math.random() - 0.5) * canvas.width * 1.6,
      y: (Math.random() - 0.5) * canvas.height * 1.6,
      z: Math.random() * canvas.width,
      hue: Math.random() < 0.3 ? 195 : Math.random() < 0.5 ? 270 : 45
    }));

    function renderSpace() {
      if (!screens.gameV3.classList.contains("active")) return;
      if (
        canvas.parentElement &&
        (Math.abs(canvas.width - canvas.parentElement.clientWidth) > 20 ||
          Math.abs(canvas.height - canvas.parentElement.clientHeight) > 20)
      ) {
        resize();
      }

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const isWarping = Date.now() < state.v3.warpUntil;
      const speed = isWarping ? 16 : 1.7;

      ctx.fillStyle = isWarping ? "rgba(4, 9, 26, 0.35)" : "rgba(4, 9, 26, 0.78)";
      ctx.fillRect(0, 0, w, h);

      v3Stars.forEach(s => {
        const prevZ = s.z;
        s.z -= speed;
        if (s.z <= 2) {
          s.x = (Math.random() - 0.5) * w * 1.6;
          s.y = (Math.random() - 0.5) * h * 1.6;
          s.z = w;
          return;
        }

        const sx = cx + (s.x / s.z) * (w * 0.55);
        const sy = cy + (s.y / s.z) * (h * 0.55);
        const radius = Math.max(0.8, (1 - s.z / w) * 2.8);
        const alpha = Math.min(1, (1 - s.z / w) * 1.25);

        if (isWarping) {
          const px = cx + (s.x / prevZ) * (w * 0.55);
          const py = cy + (s.y / prevZ) * (h * 0.55);
          ctx.strokeStyle = `hsla(${s.hue}, 95%, 85%, ${alpha})`;
          ctx.lineWidth = radius;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        } else {
          ctx.fillStyle = `hsla(${s.hue}, 90%, 88%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      v3SpaceAnimId = requestAnimationFrame(renderSpace);
    }

    if (v3SpaceAnimId) cancelAnimationFrame(v3SpaceAnimId);
    v3SpaceAnimId = requestAnimationFrame(renderSpace);
  }

  // --- Automatische Lijn 3 moeilijkheidsopbouw op basis van voortgang ---
  function pickProgressiveV3Word() {
    const v3 = state.v3;
    const destroyed = v3.destroyedCount;
    const activeWords = new Set(v3.asteroids.map(a => a.wordObj.word));

    // Bepaal kansverdeling tussen Start (1), Midden (2) en Verder (3)
    let allowedLevels = [1];
    if (destroyed < 3) {
      // Sector 1: Alleen makkelijke korte woorden (Start - Thema 1-3)
      allowedLevels = [1];
    } else if (destroyed < 6) {
      // Sector 2: Mix van Start (1) en Midden (2)
      allowedLevels = Math.random() < 0.55 ? [1] : [2];
    } else if (destroyed < 10) {
      // Sector 3: Vooral Midden (2), af en toe Verder (3) of Start (1)
      const r = Math.random();
      allowedLevels = r < 0.2 ? [1] : r < 0.78 ? [2] : [3];
    } else {
      // Sector 4+: Uitdagende mix van Midden (2) en Verder (3)
      allowedLevels = Math.random() < 0.45 ? [2] : [3];
    }

    let candidates = WORDS_DATA.filter(
      w => allowedLevels.includes(w.level) && !activeWords.has(w.word)
    );
    if (candidates.length === 0) {
      candidates = WORDS_DATA.filter(w => !activeWords.has(w.word));
    }
    return candidates[Math.floor(Math.random() * candidates.length)] || WORDS_DATA[0];
  }

  function pickCrystalForWord(wordObj) {
    // Moeilijkere woorden of latere sectoren geven vaker paarse of gouden kristallen!
    const r = Math.random();
    if (wordObj.level === 3) {
      return r < 0.55 ? V3_CRYSTALS[2] : V3_CRYSTALS[1];
    }
    if (wordObj.level === 2) {
      return r < 0.25 ? V3_CRYSTALS[2] : r < 0.75 ? V3_CRYSTALS[1] : V3_CRYSTALS[0];
    }
    return r < 0.12 ? V3_CRYSTALS[2] : r < 0.38 ? V3_CRYSTALS[1] : V3_CRYSTALS[0];
  }

  function spawnSingleV3Asteroid() {
    const v3 = state.v3;
    const activeAsteroids = v3.asteroids.filter(a => !a.driftingOut);
    if (activeAsteroids.length >= 3) return null;

    const wordObj = pickProgressiveV3Word();
    const crystal = pickCrystalForWord(wordObj);
    // Elke asteroïde blijft ~25 tot 34 seconden in beeld zweven
    const totalMs = 25000 + Math.floor(Math.random() * 9000);
    const newAst = {
      id: `ast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      wordObj,
      crystal,
      remainingMs: totalMs,
      totalMs,
      driftingOut: false
    };
    v3.asteroids.push(newAst);
    return newAst;
  }

  // --- Periodieke tick: laat ongeraakte asteroïden wegdrijven en nieuwe binnenzweven (1, 2 of 3) ---
  function tickVariant3Asteroids() {
    const v3 = state.v3;
    if (v3.busy || !screens.gameV3.classList.contains("active")) return;

    const now = Date.now();
    const hasPlacedLetters = v3.slotValues.some(s => s !== null);
    const activeList = v3.asteroids.filter(a => !a.driftingOut);

    // 1. Laat af en toe een extra asteroïde binnenzweven (zodat er soms 1, soms 2 en soms 3 zijn)
    const maxCap = v3.destroyedCount === 0 ? 2 : 3;
    if (activeList.length === 0 || (activeList.length < maxCap && now >= v3.nextSpawnAt)) {
      const spawned = spawnSingleV3Asteroid();
      // Kies een willekeurig interval (4 tot 9 sec) voor de volgende asteroïde zodat het aantal organisch wisselt
      v3.nextSpawnAt = now + 4200 + Math.floor(Math.random() * 5200);

      if (spawned) {
        if (!v3.selectedAsteroidId || !v3.asteroids.some(a => a.id === v3.selectedAsteroidId && !a.driftingOut)) {
          v3.selectedAsteroidId = spawned.id;
          setupVariant3Target(false);
        } else {
          // Voeg de letters van de nieuwe asteroïde stilletjes toe aan ongebruikte plekken op het dashboard
          ensureBankCoversVisibleAsteroids();
          renderVariant3DashboardUI();
        }
        renderVariant3Asteroids();
      }
    }

    // 2. Werk de zweeftijd van elke asteroïde bij
    activeList.forEach(ast => {
      const isTargeted = ast.id === v3.selectedAsteroidId;
      // Als het kind al bezig is met letters leggen voor het doelwit, wacht deze asteroïde geduldig!
      if (isTargeted && hasPlacedLetters) {
        ast.remainingMs = Math.max(ast.remainingMs, ast.totalMs * 0.35);
      } else {
        // Gerichte asteroïde drijft langzamer weg dan niet-geselecteerde asteroïden
        ast.remainingMs -= isTargeted ? 130 : 210;
      }

      // Update het kleine balkje onder de asteroïde zonder de hele DOM opnieuw te bouwen
      const fillEl = document.querySelector(
        `#v3-asteroids-stage .asteroid-card[data-asteroid-id="${ast.id}"] .asteroid-drift-fill`
      );
      if (fillEl) {
        const pct = Math.max(0, Math.min(100, (ast.remainingMs / ast.totalMs) * 100));
        fillEl.style.width = `${pct.toFixed(1)}%`;
        fillEl.classList.toggle("low-time", pct < 30);
      }

      if (ast.remainingMs <= 0) {
        driftAwayV3Asteroid(ast.id);
      }
    });
  }

  function driftAwayV3Asteroid(asteroidId) {
    const v3 = state.v3;
    const ast = v3.asteroids.find(a => a.id === asteroidId);
    if (!ast || ast.driftingOut) return;

    ast.driftingOut = true;
    const cardEl = document.querySelector(
      `#v3-asteroids-stage .asteroid-card[data-asteroid-id="${asteroidId}"]`
    );
    if (cardEl) {
      cardEl.classList.add("drifting-away");
    }

    // Als er nog maar 1 asteroïde was en die drijft weg, laat meteen een verse binnenzweven
    const remainingActive = v3.asteroids.filter(a => !a.driftingOut);
    if (remainingActive.length === 0) {
      spawnSingleV3Asteroid();
    }

    // Plan de volgende spawn over een paar seconden zodat er weer 2 of 3 komen
    v3.nextSpawnAt = Date.now() + 3200 + Math.floor(Math.random() * 4500);

    setTimeout(() => {
      const wasSelected = v3.selectedAsteroidId === asteroidId;
      v3.asteroids = v3.asteroids.filter(a => a.id !== asteroidId);

      if (v3.asteroids.length === 0) {
        spawnSingleV3Asteroid();
      }
      if (wasSelected && v3.asteroids.length > 0) {
        v3.selectedAsteroidId = v3.asteroids[0].id;
        setupVariant3Target(false);
      }
      renderVariant3Asteroids();
    }, 680);
  }

  function selectVariant3Asteroid(asteroidId, shouldSpeak = true) {
    const v3 = state.v3;
    if (v3.busy) return;
    const found = v3.asteroids.find(a => a.id === asteroidId && !a.driftingOut);
    if (!found) return;

    // Geef een pas aangeklikte asteroïde weer wat extra tijd
    found.remainingMs = Math.max(found.remainingMs, found.totalMs * 0.65);

    const changed = v3.selectedAsteroidId !== asteroidId;
    v3.selectedAsteroidId = asteroidId;

    if (changed) {
      setupVariant3Target(false);
      renderVariant3Asteroids();
    }
    if (shouldSpeak) {
      speakText(found.wordObj.word);
    }
  }

  function setupVariant3Target(keepExistingTiles = false) {
    const v3 = state.v3;
    const activeAsteroids = v3.asteroids.filter(a => !a.driftingOut);
    const targetAst =
      activeAsteroids.find(a => a.id === v3.selectedAsteroidId) || activeAsteroids[0];
    if (!targetAst) return;
    v3.selectedAsteroidId = targetAst.id;

    v3.targetUnits = splitWordIntoUnits(targetAst.wordObj.word, v3.useDigraphs);
    v3.slotValues = new Array(v3.targetUnits.length).fill(null);

    // Update Doelwit HUD plaatje
    const hudPic = document.getElementById("v3-hud-pic");
    if (hudPic) {
      hudPic.style.backgroundColor = targetAst.wordObj.bg || "#FFF";
      hudPic.innerHTML = renderPictureHTML(targetAst.wordObj);
    }

    const fb = document.getElementById("v3-feedback-bar");
    if (fb) {
      fb.textContent = `Richt op de asteroïde (${targetAst.crystal.icon} +${targetAst.crystal.points}) en laad je laser!`;
      fb.className = "cockpit-feedback";
    }

    if (!keepExistingTiles) {
      buildVariant3DashboardLetters();
    }
    renderVariant3DashboardUI();
  }

  // Zorg dat bij het binnenzweven van een extra asteroïde de benodigde letters altijd op het dashboard liggen
  // zonder de letters die het kind al in de vakjes heeft gelegd te verstoren
  function ensureBankCoversVisibleAsteroids() {
    const v3 = state.v3;
    const neededCounts = {};
    v3.targetUnits.forEach(u => {
      neededCounts[u] = (neededCounts[u] || 0) + 1;
    });
    v3. bankTiles.forEach(t => {
      if (neededCounts[t.text]) {
        neededCounts[t.text] -= 1;
      }
    });
    Object.entries(neededCounts).forEach(([unit, missing]) => {
      for (let i = 0; i < missing; i++) {
        const unusedTile = v3.bankTiles.find(
          t => !t.used && !v3.targetUnits.includes(t.text)
        );
        if (unusedTile) {
          unusedTile.text = unit;
        }
      }
    });
  }

  // Bouw 12 letters/klankblokjes op het dashboard (bevat altijd de klanken van de gerichte asteroïde + andere zichtbare asteroïden)
  function buildVariant3DashboardLetters() {
    const v3 = state.v3;
    const totalCount = 12;
    const tiles = [];

    // Voeg eerst alle eenheden van de geselecteerde asteroïde toe
    v3.targetUnits.forEach((unit, idx) => {
      tiles.push({
        id: `v3-tile-main-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        text: unit,
        used: false
      });
    });

    // Voeg zo veel mogelijk eenheden van de andere zichtbare asteroïden toe
    v3.asteroids
      .filter(a => !a.driftingOut && a.id !== v3.selectedAsteroidId)
      .forEach(ast => {
        const units = splitWordIntoUnits(ast.wordObj.word, v3.useDigraphs);
        units.forEach((u, idx) => {
          if (tiles.length < totalCount) {
            tiles.push({
              id: `v3-tile-other-${idx}-${Math.random().toString(36).slice(2, 6)}`,
              text: u,
              used: false
            });
          }
        });
      });

    // Vul aan tot 12 met afleiders
    const distractorPool = v3.useDigraphs
      ? [...ALPHABET_LETTERS, "aa", "ee", "oo", "oe", "ij", "ui", "eu", "ie"]
      : ALPHABET_LETTERS;

    while (tiles.length < totalCount) {
      const randomChar = distractorPool[Math.floor(Math.random() * distractorPool.length)];
      tiles.push({
        id: `v3-tile-dist-${tiles.length}-${Math.random().toString(36).slice(2, 6)}`,
        text: randomChar,
        used: false
      });
    }

    v3.bankTiles = shuffle(tiles);
  }

  function getPilotRankTitle(sector) {
    if (sector <= 1) return "🧑‍🚀 Ruimte-Kadet";
    if (sector === 2) return "🚀 Sterren-Verkenner";
    if (sector === 3) return "🛸 Laser-Piloot";
    if (sector === 4) return "💎 Kristal-Jager";
    return "👑 Melkweg-Commandant";
  }

  function updateVariant3HUD() {
    const v3 = state.v3;
    const shieldsEl = document.getElementById("v3-shields");
    if (shieldsEl) {
      let html = "";
      for (let i = 0; i < v3.maxShields; i++) {
        html += `<span class="${i < v3.shields ? "" : "shield-lost"}">🛡️</span>`;
      }
      shieldsEl.innerHTML = html;
    }

    const sector = 1 + Math.floor(v3.destroyedCount / 3);
    const sectorEl = document.getElementById("v3-sector-text");
    if (sectorEl) sectorEl.textContent = `🚀 Sector ${sector}`;

    const rankEl = document.getElementById("v3-rank-badge");
    if (rankEl) rankEl.textContent = getPilotRankTitle(sector);

    const destroyedEl = document.getElementById("v3-destroyed-text");
    if (destroyedEl) destroyedEl.textContent = `☄️ ${v3.destroyedCount}`;

    const scoreEl = document.getElementById("v3-score-text");
    if (scoreEl) scoreEl.textContent = v3.score;
  }

  function updateVariant3ChargeBar() {
    const v3 = state.v3;
    const total = v3.slotValues.length || 1;
    const filled = v3.slotValues.filter(v => v !== null).length;
    const pct = Math.round((filled / total) * 100);

    const chargeFill = document.getElementById("v3-charge-fill");
    if (chargeFill) {
      chargeFill.style.width = `${pct}%`;
    }

    const fireBtn = document.getElementById("btn-v3-fire");
    if (fireBtn) {
      fireBtn.classList.toggle("laser-ready", filled === total && total > 0);
    }
  }

  function renderVariant3Asteroids() {
    const v3 = state.v3;
    const stage = document.getElementById("v3-asteroids-stage");
    if (!stage) return;
    stage.innerHTML = "";

    v3.asteroids.forEach(ast => {
      const card = document.createElement("div");
      const crystalClass = ast.crystal ? ast.crystal.className : "crystal-blue";
      card.className =
        `asteroid-card ${crystalClass}` +
        (ast.id === v3.selectedAsteroidId ? " targeted" : "") +
        (ast.driftingOut ? " drifting-away" : "");
      card.dataset.asteroidId = ast.id;

      const pct = Math.max(0, Math.min(100, (ast.remainingMs / ast.totalMs) * 100));
      const lowClass = pct < 30 ? " low-time" : "";

      card.innerHTML = `
        <div class="asteroid-reticle">🎯 DOELWIT</div>
        <div class="asteroid-crystal-badge">${ast.crystal.icon} +${ast.crystal.points}</div>
        <div class="asteroid-pic-bubble" style="background-color: ${ast.wordObj.bg || "#FFF"}">
          ${renderPictureHTML(ast.wordObj)}
        </div>
        <div class="asteroid-speak-mini">🔊</div>
        <div class="asteroid-drift-bar" title="Tijd voordat deze asteroïde voorbij zweeft">
          <div class="asteroid-drift-fill${lowClass}" style="width: ${pct.toFixed(1)}%"></div>
        </div>
      `;

      card.addEventListener("click", () => {
        selectVariant3Asteroid(ast.id, true);
      });

      stage.appendChild(card);
    });
  }

  function renderVariant3DashboardUI() {
    const v3 = state.v3;
    const slotsContainer = document.getElementById("v3-word-slots");
    const bankContainer = document.getElementById("v3-letter-bank");
    if (!slotsContainer || !bankContainer) return;

    slotsContainer.innerHTML = "";
    v3.slotValues.forEach((slotVal, slotIdx) => {
      const slotEl = document.createElement("div");
      slotEl.className = "letter-slot";
      slotEl.dataset.slotIndex = slotIdx;

      if (slotVal) {
        slotEl.textContent = slotVal.text;
        slotEl.classList.add("filled");
        if (slotVal.locked) {
          slotEl.classList.add("slot-correct");
        } else if (!v3.busy) {
          slotEl.addEventListener("pointerdown", e => {
            e.preventDefault();
            startV3PointerDrag(e, {
              sourceType: "slot",
              tileId: slotVal.tileId,
              text: slotVal.text,
              sourceSlotIndex: slotIdx
            });
          });
        }
      }
      slotsContainer.appendChild(slotEl);
    });

    bankContainer.innerHTML = "";
    v3.bankTiles.forEach(tile => {
      const tileEl = document.createElement("div");
      tileEl.className = "letter-tile" + (tile.used ? " used" : "");
      tileEl.textContent = tile.text;
      tileEl.dataset.tileId = tile.id;

      if (!tile.used && !v3.busy) {
        tileEl.addEventListener("pointerdown", e => {
          e.preventDefault();
          startV3PointerDrag(e, {
            sourceType: "bank",
            tileId: tile.id,
            text: tile.text,
            sourceSlotIndex: null
          });
        });
      }
      bankContainer.appendChild(tileEl);
    });

    updateVariant3ChargeBar();
  }

  // --- Touch & Mouse Drag-and-Drop voor het Cockpit Dashboard (Variant 3) ---
  let v3DragCtx = null;

  function startV3PointerDrag(e, info) {
    const startX = e.clientX;
    const startY = e.clientY;

    const ghost = document.createElement("div");
    ghost.className = "dragging-ghost";
    ghost.textContent = info.text;
    ghost.style.left = `${startX}px`;
    ghost.style.top = `${startY}px`;
    ghost.style.display = "none";
    document.body.appendChild(ghost);

    v3DragCtx = {
      ...info,
      startX,
      startY,
      hasMoved: false,
      ghost,
      hoveredSlotIndex: null
    };

    window.addEventListener("pointermove", onV3PointerMove, { passive: false });
    window.addEventListener("pointerup", onV3PointerUp);
    window.addEventListener("pointercancel", onV3PointerUp);
  }

  function onV3PointerMove(e) {
    if (!v3DragCtx) return;
    e.preventDefault();
    const dx = e.clientX - v3DragCtx.startX;
    const dy = e.clientY - v3DragCtx.startY;

    if (!v3DragCtx.hasMoved && Math.hypot(dx, dy) > 8) {
      v3DragCtx.hasMoved = true;
      v3DragCtx.ghost.style.display = "flex";
    }

    if (v3DragCtx.hasMoved) {
      v3DragCtx.ghost.style.left = `${e.clientX}px`;
      v3DragCtx.ghost.style.top = `${e.clientY}px`;

      const slotEls = document.querySelectorAll("#v3-word-slots .letter-slot");
      let foundIdx = null;
      slotEls.forEach(el => {
        el.classList.remove("highlight-drop");
        const idx = parseInt(el.dataset.slotIndex, 10);
        const existing = state.v3.slotValues[idx];
        if (existing && existing.locked) return;

        const rect = el.getBoundingClientRect();
        if (
          e.clientX >= rect.left - 10 &&
          e.clientX <= rect.right + 10 &&
          e.clientY >= rect.top - 14 &&
          e.clientY <= rect.bottom + 14
        ) {
          foundIdx = idx;
        }
      });

      if (foundIdx !== null) {
        slotEls[foundIdx].classList.add("highlight-drop");
      }
      v3DragCtx.hoveredSlotIndex = foundIdx;
    }
  }

  function onV3PointerUp(e) {
    if (!v3DragCtx) return;
    window.removeEventListener("pointermove", onV3PointerMove);
    window.removeEventListener("pointerup", onV3PointerUp);
    window.removeEventListener("pointercancel", onV3PointerUp);

    const ctx = v3DragCtx;
    v3DragCtx = null;
    if (ctx.ghost && ctx.ghost.parentNode) {
      ctx.ghost.parentNode.removeChild(ctx.ghost);
    }
    document.querySelectorAll("#v3-word-slots .letter-slot").forEach(el => {
      el.classList.remove("highlight-drop");
    });

    const v3 = state.v3;

    if (!ctx.hasMoved) {
      if (ctx.sourceType === "bank") {
        const firstEmptyIdx = v3.slotValues.findIndex(val => val === null);
        if (firstEmptyIdx !== -1) {
          placeV3TileInSlot(ctx.tileId, ctx.text, firstEmptyIdx);
        }
      } else if (ctx.sourceType === "slot") {
        removeV3TileFromSlot(ctx.sourceSlotIndex);
      }
      return;
    }

    if (ctx.hoveredSlotIndex !== null) {
      const targetIdx = ctx.hoveredSlotIndex;
      if (ctx.sourceType === "bank") {
        placeV3TileInSlot(ctx.tileId, ctx.text, targetIdx);
      } else if (ctx.sourceType === "slot") {
        swapOrMoveV3SlotTile(ctx.sourceSlotIndex, targetIdx);
      }
      return;
    }

    const slotsArea = document.querySelector(".dashboard-slots-area");
    if (ctx.sourceType === "bank" && slotsArea) {
      const boxRect = slotsArea.getBoundingClientRect();
      if (
        e.clientY >= boxRect.top - 25 &&
        e.clientY <= boxRect.bottom + 25 &&
        e.clientX >= boxRect.left - 25 &&
        e.clientX <= boxRect.right + 25
      ) {
        const firstEmptyIdx = v3.slotValues.findIndex(val => val === null);
        if (firstEmptyIdx !== -1) {
          placeV3TileInSlot(ctx.tileId, ctx.text, firstEmptyIdx);
          return;
        }
      }
    }

    if (ctx.sourceType === "slot") {
      removeV3TileFromSlot(ctx.sourceSlotIndex);
    }
  }

  function placeV3TileInSlot(tileId, text, slotIdx) {
    const v3 = state.v3;
    const existing = v3.slotValues[slotIdx];
    if (existing && existing.locked) return;

    if (existing) {
      const oldTile = v3.bankTiles.find(t => t.id === existing.tileId);
      if (oldTile) oldTile.used = false;
    }

    const bankTile = v3.bankTiles.find(t => t.id === tileId);
    if (bankTile) bankTile.used = true;

    v3.slotValues[slotIdx] = { tileId, text, locked: false };
    playSoundPop();
    renderVariant3DashboardUI();
  }

  function removeV3TileFromSlot(slotIdx) {
    const v3 = state.v3;
    const existing = v3.slotValues[slotIdx];
    if (!existing || existing.locked) return;

    const bankTile = v3.bankTiles.find(t => t.id === existing.tileId);
    if (bankTile) bankTile.used = false;

    v3.slotValues[slotIdx] = null;
    playSoundPop();
    renderVariant3DashboardUI();
  }

  function swapOrMoveV3SlotTile(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const v3 = state.v3;
    const fromVal = v3.slotValues[fromIdx];
    const toVal = v3.slotValues[toIdx];
    if (!fromVal || fromVal.locked || (toVal && toVal.locked)) return;

    v3.slotValues[toIdx] = fromVal;
    v3.slotValues[fromIdx] = toVal || null;
    playSoundPop();
    renderVariant3DashboardUI();
  }

  // --- Laser afvuren in Variant 3 ---
  function fireVariant3Laser() {
    const v3 = state.v3;
    if (v3.busy) return;

    const fb = document.getElementById("v3-feedback-bar");
    const isComplete = v3.slotValues.every(v => v !== null);
    if (!isComplete) {
      playSoundWrong();
      fb.textContent = "Leg eerst alle klankblokjes in de laser-lader voordat je schiet!";
      fb.className = "cockpit-feedback warn";
      return;
    }

    const formedWord = v3.slotValues.map(v => (v ? v.text : "")).join("");
    const activeAsteroids = v3.asteroids.filter(a => !a.driftingOut);
    const targetedAst =
      activeAsteroids.find(a => a.id === v3.selectedAsteroidId) || activeAsteroids[0];
    if (!targetedAst) return;

    // Kijk of het gemaakte woord overeenkomt met de gerichte asteroïde (of een andere zichtbare asteroïde!)
    let hitAsteroid = null;
    if (formedWord === targetedAst.wordObj.word) {
      hitAsteroid = targetedAst;
    } else {
      hitAsteroid = activeAsteroids.find(a => a.wordObj.word === formedWord) || null;
    }

    if (hitAsteroid) {
      // RAAK! Schiet de asteroïde kapot met de dubbele boordkanonnen!
      v3.busy = true;
      v3.selectedAsteroidId = hitAsteroid.id;
      v3.slotValues.forEach(s => {
        if (s) s.locked = true;
      });
      renderVariant3DashboardUI();

      const oldSector = 1 + Math.floor(v3.destroyedCount / 3);
      const pointsEarned = hitAsteroid.crystal ? hitAsteroid.crystal.points : 10;
      const crystalIcon = hitAsteroid.crystal ? hitAsteroid.crystal.icon : "💎";
      v3.score += pointsEarned;
      v3.destroyedCount += 1;
      const newSector = 1 + Math.floor(v3.destroyedCount / 3);

      if (!v3.practicedWords.some(w => w.word === hitAsteroid.wordObj.word)) {
        v3.practicedWords.push(hitAsteroid.wordObj);
      }

      playSoundLaser();
      speakText(hitAsteroid.wordObj.word);
      animateLaserBeamToAsteroid(hitAsteroid.id, `+${pointsEarned} ${crystalIcon}`);

      if (newSector > oldSector) {
        v3.warpUntil = Date.now() + 1300;
        setTimeout(() => playSoundWarp(), 280);
        fb.textContent = `🚀 HYPERSPRONG NAAR SECTOR ${newSector}! "${hitAsteroid.wordObj.word}" gekraakt! +${pointsEarned} ${crystalIcon}`;
      } else {
        fb.textContent = `💥 VOLTREFFER! "${hitAsteroid.wordObj.word}" gekraakt! +${pointsEarned} ${crystalIcon}`;
      }
      fb.className = "cockpit-feedback good";
      updateVariant3HUD();

      setTimeout(() => {
        v3.asteroids = v3.asteroids.filter(a => a.id !== hitAsteroid.id);
        const remaining = v3.asteroids.filter(a => !a.driftingOut);

        // Als het raam nu leeg is (of bij hogere sectoren), laat 1 of 2 nieuwe asteroïden binnenzweven
        if (remaining.length === 0) {
          spawnSingleV3Asteroid();
          if (v3.destroyedCount >= 2 && Math.random() < 0.65) {
            spawnSingleV3Asteroid();
          }
        } else if (remaining.length === 1 && v3.destroyedCount >= 4 && Math.random() < 0.5) {
          spawnSingleV3Asteroid();
        }

        v3.nextSpawnAt = Date.now() + 3800 + Math.floor(Math.random() * 4500);
        const currentActive = v3.asteroids.filter(a => !a.driftingOut);
        if (currentActive.length > 0) {
          v3.selectedAsteroidId = currentActive[0].id;
        }
        v3.busy = false;
        setupVariant3Target(false);
        renderVariant3Asteroids();
      }, 720);
    } else {
      // MIS! Asteroïde botst tegen het ruimteschip -> 1 schildpunt kwijt!
      v3.busy = true;
      v3.shields = Math.max(0, v3.shields - 1);
      playSoundCrash();
      updateVariant3HUD();

      const shell = document.getElementById("v3-cockpit-shell");
      if (shell) {
        shell.classList.remove("cockpit-hit");
        void shell.offsetWidth;
        shell.classList.add("cockpit-hit");
      }

      const astCard = document.querySelector(
        `#v3-asteroids-stage .asteroid-card[data-asteroid-id="${targetedAst.id}"]`
      );
      if (astCard) {
        astCard.classList.add("crashing");
        setTimeout(() => astCard.classList.remove("crashing"), 600);
      }

      // Laat zien welke letters wel/niet goed staan
      const slotEls = document.querySelectorAll("#v3-word-slots .letter-slot");
      v3.slotValues.forEach((slotVal, idx) => {
        if (slotVal && slotVal.text === v3.targetUnits[idx]) {
          slotVal.locked = true;
          if (slotEls[idx]) slotEls[idx].classList.add("slot-correct");
        } else if (slotEls[idx]) {
          slotEls[idx].classList.add("slot-wrong");
        }
      });

      if (v3.shields <= 0) {
        fb.textContent = `🚨 BOEM! Alle schilden zijn op! Het woord was "${targetedAst.wordObj.word}".`;
        fb.className = "cockpit-feedback warn";
        speakText(targetedAst.wordObj.word);

        setTimeout(() => {
          v3.busy = false;
          showVariant3ResultScreen();
        }, 1450);
      } else {
        fb.textContent = `🚨 BOEM! Schild geraakt! Nog ${v3.shields} schild${v3.shields === 1 ? "" : "en"} over. Verbeter het woord!`;
        fb.className = "cockpit-feedback warn";

        setTimeout(() => {
          v3.slotValues.forEach((slotVal, idx) => {
            if (slotVal && !slotVal.locked) {
              const bankTile = v3.bankTiles.find(t => t.id === slotVal.tileId);
              if (bankTile) bankTile.used = false;
              v3.slotValues[idx] = null;
            }
          });
          v3.busy = false;
          renderVariant3DashboardUI();
        }, 650);
      }
    }
  }

  function animateLaserBeamToAsteroid(asteroidId, rewardLabel) {
    const viewport = document.getElementById("v3-viewport");
    const astCard = document.querySelector(
      `#v3-asteroids-stage .asteroid-card[data-asteroid-id="${asteroidId}"]`
    );
    const beamLeft = document.getElementById("v3-laser-left");
    const beamRight = document.getElementById("v3-laser-right");
    const glowLeft = document.getElementById("v3-laser-left-glow");
    const glowRight = document.getElementById("v3-laser-right-glow");
    const cannonLeft = document.getElementById("v3-cannon-left");
    const cannonRight = document.getElementById("v3-cannon-right");
    const fxLayer = document.getElementById("v3-fx-layer");

    if (astCard) {
      astCard.classList.add("exploding");
    }

    if (cannonLeft && cannonRight) {
      cannonLeft.classList.add("recoil");
      cannonRight.classList.add("recoil");
      setTimeout(() => {
        cannonLeft.classList.remove("recoil");
        cannonRight.classList.remove("recoil");
      }, 280);
    }

    if (viewport && astCard && beamLeft && beamRight) {
      const vpRect = viewport.getBoundingClientRect();
      const astRect = astCard.getBoundingClientRect();
      const centerX = astRect.left + astRect.width / 2 - vpRect.left;
      const centerY = astRect.top + astRect.height / 2 - vpRect.top;

      const targetX = (centerX / vpRect.width) * 800;
      const targetY = (centerY / vpRect.height) * 320;

      [beamLeft, beamRight, glowLeft, glowRight].forEach(line => {
        if (!line) return;
        line.setAttribute("x2", targetX.toFixed(1));
        line.setAttribute("y2", targetY.toFixed(1));
        line.classList.add("firing");
      });

      if (fxLayer && rewardLabel) {
        const gemEl = document.createElement("div");
        gemEl.className = "flying-gem";
        gemEl.textContent = rewardLabel;
        gemEl.style.left = `${centerX}px`;
        gemEl.style.top = `${centerY}px`;
        fxLayer.appendChild(gemEl);
        setTimeout(() => {
          if (gemEl.parentNode) gemEl.parentNode.removeChild(gemEl);
        }, 900);
      }

      setTimeout(() => {
        [beamLeft, beamRight, glowLeft, glowRight].forEach(line => {
          if (line) line.classList.remove("firing");
        });
      }, 360);
    }
  }

  function showVariant3ResultScreen() {
    const v3 = state.v3;
    showScreen("result");
    playSoundFanfare();

    document.getElementById("result-score").textContent = v3.score;
    const divider = document.querySelector(".score-divider");
    const maxScoreEl = document.getElementById("result-max-score");
    if (divider) divider.classList.add("hidden");
    if (maxScoreEl) maxScoreEl.classList.add("hidden");

    const titleEl = document.getElementById("result-title");
    const subEl = document.getElementById("result-subtitle");
    const trophyEl = document.getElementById("result-trophy");
    const starsEl = document.getElementById("result-stars");

    const sector = 1 + Math.floor(v3.destroyedCount / 3);
    const rankTitle = getPilotRankTitle(sector);
    trophyEl.textContent = "🚀";
    titleEl.textContent = `Missie Voltooid: ${rankTitle}!`;
    subEl.textContent = `Je hebt ${v3.destroyedCount} asteroïde${v3.destroyedCount === 1 ? "" : "n"} gekraakt en Sector ${sector} bereikt!`;

    if (v3.destroyedCount >= 10) {
      starsEl.textContent = "⭐⭐⭐⭐⭐";
      startConfetti();
    } else if (v3.destroyedCount >= 5) {
      starsEl.textContent = "⭐⭐⭐⭐";
      startConfetti();
    } else if (v3.destroyedCount >= 2) {
      starsEl.textContent = "⭐⭐⭐";
    } else {
      starsEl.textContent = "⭐⭐";
    }

    const wordsListEl = document.getElementById("result-words-list");
    wordsListEl.innerHTML = "";
    v3.practicedWords.forEach(w => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "word-chip";
      chip.innerHTML = `<span>${w.emoji.trim()}</span> <span>${w.word}</span>`;
      chip.addEventListener("click", () => speakText(w.word));
      wordsListEl.appendChild(chip);
    });
  }

  // ==========================================================================
  // EINDSCHERM & CONFETTI (Variant 1 & 2)
  // ==========================================================================
  function showResultsScreen(score, maxScore, practicedWords) {
    showScreen("result");
    playSoundFanfare();

    const divider = document.querySelector(".score-divider");
    const maxScoreEl = document.getElementById("result-max-score");
    if (divider) divider.classList.remove("hidden");
    if (maxScoreEl) maxScoreEl.classList.remove("hidden");

    document.getElementById("result-score").textContent = score;
    document.getElementById("result-max-score").textContent = maxScore;

    const ratio = score / maxScore;
    const titleEl = document.getElementById("result-title");
    const subEl = document.getElementById("result-subtitle");
    const trophyEl = document.getElementById("result-trophy");
    const starsEl = document.getElementById("result-stars");

    if (ratio === 1) {
      trophyEl.textContent = "🏆";
      titleEl.textContent = "Wauw, alles goed!";
      subEl.textContent = "Je bent een echte Lijn 3 lees-kampioen!";
      starsEl.textContent = "⭐⭐⭐⭐⭐";
      startConfetti();
    } else if (ratio >= 0.7) {
      trophyEl.textContent = "🎉";
      titleEl.textContent = "Super knap gedaan!";
      subEl.textContent = "Je hebt al heel veel woordjes goed gelezen!";
      starsEl.textContent = "⭐⭐⭐⭐";
      startConfetti();
    } else if (ratio >= 0.4) {
      trophyEl.textContent = "👍";
      titleEl.textContent = "Goed geoefend!";
      subEl.textContent = "Elke keer dat je oefent gaat het lezen beter!";
      starsEl.textContent = "⭐⭐⭐";
    } else {
      trophyEl.textContent = "🌱";
      titleEl.textContent = "Knap geprobeerd!";
      subEl.textContent = "Samen oefenen maakt je supersterk in lezen!";
      starsEl.textContent = "⭐⭐";
    }

    const wordsListEl = document.getElementById("result-words-list");
    wordsListEl.innerHTML = "";
    practicedWords.forEach(w => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "word-chip";
      chip.innerHTML = `<span>${w.emoji.trim()}</span> <span>${w.word}</span>`;
      chip.addEventListener("click", () => speakText(w.word));
      wordsListEl.appendChild(chip);
    });
  }

  // --- Eenvoudige Confetti op het eindscherm ---
  let confettiAnimId = null;
  function startConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#22C55E", "#3B82F6", "#F97316", "#FACC15", "#EC4899", "#A855F7"];
    const pieces = Array.from({ length: 75 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      size: 8 + Math.random() * 8,
      speedY: 2.5 + Math.random() * 3.5,
      speedX: (Math.random() - 0.5) * 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.15
    }));

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.angle += p.spin;
        if (p.y > canvas.height + 20) {
          p.y = -15;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        ctx.restore();
      });
      confettiAnimId = requestAnimationFrame(frame);
    }
    frame();
  }

  function stopConfetti() {
    if (confettiAnimId) {
      cancelAnimationFrame(confettiAnimId);
      confettiAnimId = null;
    }
    const canvas = document.getElementById("confetti-canvas");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ==========================================================================
  // EVENT LISTENERS & INITIALISATIE
  // ==========================================================================
  function init() {
    buildOnscreenKeyboard();

    // Niveau-knoppen (Lijn 3 Thema's)
    document.querySelectorAll(".level-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".level-pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.level = btn.dataset.level;
        playSoundPop();
      });
    });

    // Geluid aan/uit
    const soundBtn = document.getElementById("btn-sound-toggle");
    soundBtn.addEventListener("click", () => {
      state.soundEnabled = !state.soundEnabled;
      soundBtn.textContent = state.soundEnabled ? "🔊" : "🔇";
    });

    // Home knop
    btnHome.addEventListener("click", () => {
      showScreen("menu");
    });

    // Start Variant 1
    document.getElementById("btn-start-v1").addEventListener("click", () => {
      playSoundPop();
      startVariant1();
    });

    // Open instellingen Variant 2
    document.getElementById("btn-open-v2-options").addEventListener("click", () => {
      playSoundPop();
      showScreen("v2Setup");
    });

    // Start Variant 3 (Ruimte-Mijnwerker)
    const startV3Btn = document.getElementById("btn-start-v3");
    if (startV3Btn) {
      startV3Btn.addEventListener("click", () => {
        playSoundPop();
        startVariant3();
      });
    }

    // Variant 3 Cockpit knoppen
    const v3SpeakBtn = document.getElementById("btn-v3-speak");
    if (v3SpeakBtn) {
      v3SpeakBtn.addEventListener("click", () => {
        const targetAst =
          state.v3.asteroids.find(a => a.id === state.v3.selectedAsteroidId) ||
          state.v3.asteroids[0];
        if (targetAst) speakText(targetAst.wordObj.word);
      });
    }

    const v3HudPic = document.getElementById("v3-hud-pic");
    if (v3HudPic) {
      v3HudPic.addEventListener("click", () => {
        const targetAst =
          state.v3.asteroids.find(a => a.id === state.v3.selectedAsteroidId) ||
          state.v3.asteroids[0];
        if (targetAst) speakText(targetAst.wordObj.word);
      });
    }

    const v3ClearBtn = document.getElementById("btn-v3-clear");
    if (v3ClearBtn) {
      v3ClearBtn.addEventListener("click", () => {
        const v3 = state.v3;
        if (v3.busy) return;
        v3.slotValues.forEach((slotVal, idx) => {
          if (slotVal && !slotVal.locked) {
            const tile = v3.bankTiles.find(t => t.id === slotVal.tileId);
            if (tile) tile.used = false;
            v3.slotValues[idx] = null;
          }
        });
        playSoundPop();
        renderVariant3DashboardUI();
      });
    }

    const v3FireBtn = document.getElementById("btn-v3-fire");
    if (v3FireBtn) {
      v3FireBtn.addEventListener("click", () => {
        fireVariant3Laser();
      });
    }

    const v3DigraphsChk = document.getElementById("chk-v3-digraphs");
    if (v3DigraphsChk) {
      v3DigraphsChk.addEventListener("change", e => {
        state.v3.useDigraphs = e.target.checked;
        setupVariant3Target(false);
      });
    }

    // Keuze tussen Letters slepen en Zelf typen in Variant 2
    const modeDragBtn = document.getElementById("btn-v2-mode-drag");
    const modeTypeBtn = document.getElementById("btn-v2-mode-type");
    const digraphBox = document.getElementById("v2-digraph-option");

    modeDragBtn.addEventListener("click", () => {
      state.v2.mode = "drag";
      modeDragBtn.classList.add("selected");
      modeTypeBtn.classList.remove("selected");
      digraphBox.classList.remove("hidden");
      playSoundPop();
    });

    modeTypeBtn.addEventListener("click", () => {
      state.v2.mode = "type";
      modeTypeBtn.classList.add("selected");
      modeDragBtn.classList.remove("selected");
      digraphBox.classList.add("hidden");
      playSoundPop();
    });

    document.getElementById("chk-digraphs").addEventListener("change", e => {
      state.v2.useDigraphs = e.target.checked;
    });

    document.getElementById("btn-back-to-menu").addEventListener("click", () => {
      showScreen("menu");
    });

    document.getElementById("btn-start-v2").addEventListener("click", () => {
      playSoundPop();
      startVariant2();
    });

    // Variant 2 knoppen tijdens het spel
    document.getElementById("btn-v2-speak").addEventListener("click", () => {
      const currentWordObj = state.v2.words[state.v2.roundIndex];
      if (currentWordObj) speakText(currentWordObj.word);
    });

    document.getElementById("v2-picture-box").addEventListener("click", () => {
      const currentWordObj = state.v2.words[state.v2.roundIndex];
      if (currentWordObj) speakText(currentWordObj.word);
    });

    document.getElementById("btn-v2-clear").addEventListener("click", () => {
      const v2 = state.v2;
      if (v2.roundFinished) return;
      v2.slotValues.forEach((slotVal, idx) => {
        if (slotVal && !slotVal.locked) {
          if (v2.mode === "drag") {
            const tile = v2.bankTiles.find(t => t.id === slotVal.tileId);
            if (tile) tile.used = false;
          }
          v2.slotValues[idx] = null;
        }
      });
      if (v2.mode === "drag") {
        renderVariant2DragUI();
      } else {
        syncTypeInputFromSlots();
        renderVariant2TypeSlots();
      }
      playSoundPop();
    });

    document.getElementById("btn-v2-check").addEventListener("click", () => {
      checkVariant2Word();
    });

    document.getElementById("btn-v2-next").addEventListener("click", () => {
      advanceVariant2Round();
    });

    // Fysiek toetsenbord ondersteuning bij Variant 2 ('type' modus)
    window.addEventListener("keydown", e => {
      if (!screens.gameV2.classList.contains("active") || state.v2.mode !== "type") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (!state.v2.roundFinished) {
          checkVariant2Word();
        } else {
          advanceVariant2Round();
        }
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleTypeKeyInput("Backspace");
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleTypeKeyInput(e.key.toLowerCase());
      }
    });

    // Eindscherm knoppen
    document.getElementById("btn-play-again").addEventListener("click", () => {
      playSoundPop();
      if (state.currentVariant === 1) {
        startVariant1();
      } else if (state.currentVariant === 2) {
        startVariant2();
      } else {
        startVariant3();
      }
    });

    document.getElementById("btn-result-menu").addEventListener("click", () => {
      showScreen("menu");
    });

    // --- PWA Service Worker & Installatie Knop ---
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }

    const installBtn = document.getElementById("btn-install-pwa");
    const installModal = document.getElementById("install-modal");
    const closeInstallModalBtn = document.getElementById("btn-close-install-modal");
    let deferredInstallPrompt = null;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    // Toon op iPad/iOS alvast de installeerknop als hij nog niet als losse app draait
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (!isStandalone && isIOS && installBtn) {
      installBtn.classList.remove("hidden");
    }

    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (!isStandalone && installBtn) {
        installBtn.classList.remove("hidden");
      }
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      if (installBtn) installBtn.classList.add("hidden");
    });

    if (installBtn) {
      installBtn.addEventListener("click", async () => {
        playSoundPop();
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          const { outcome } = await deferredInstallPrompt.userChoice;
          if (outcome === "accepted") {
            installBtn.classList.add("hidden");
          }
          deferredInstallPrompt = null;
        } else if (installModal) {
          installModal.classList.remove("hidden");
        }
      });
    }

    if (closeInstallModalBtn && installModal) {
      closeInstallModalBtn.addEventListener("click", () => {
        playSoundPop();
        installModal.classList.add("hidden");
      });
      installModal.addEventListener("click", e => {
        if (e.target === installModal) {
          installModal.classList.add("hidden");
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
