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
    result: document.getElementById("screen-result")
  };
  const btnHome = document.getElementById("btn-home");

  function showScreen(screenKey) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[screenKey].classList.add("active");
    if (screenKey === "menu") {
      btnHome.classList.add("hidden");
    } else {
      btnHome.classList.remove("hidden");
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
  // EINDSCHERM & CONFETTI
  // ==========================================================================
  function showResultsScreen(score, maxScore, practicedWords) {
    showScreen("result");
    playSoundFanfare();

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
      } else {
        startVariant2();
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
