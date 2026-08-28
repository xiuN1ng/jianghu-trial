    if (btnSkill2) btnSkill2.addEventListener("click", function () { startSkill(2); });

    if (btnCancel) {
      btnCancel.addEventListener("click", function () {
        state.pendingAction = null;
        state.pendingSkillSlot = null;
        state.combatPhase = "pickAction";
        renderCombat();
      });
    }

    view.querySelectorAll(".unit.selectable").forEach(function (el) {
      el.addEventListener("click", function () {
        const id = el.dataset.id;
        const a = state.actingAlly;
        if (!a) return;

        if (state.combatPhase === "pickTarget") {
          const t = state.enemies.find(function (e) { return e.id === id; });
          if (!t || !alive(t)) return;
          doAttack(a, t);
          renderCombat();
          setTimeout(finishActorTurn, 450);
        } else if (state.combatPhase === "pickTargetSkill") {
          const t = state.enemies.find(function (e) { return e.id === id; });
          if (!t || !alive(t)) return;
          const ok = doSkill(a, state.pendingSkillSlot || 1, t);
          renderCombat();
          if (ok) setTimeout(finishActorTurn, 450);
          else {
            state.combatPhase = "pickAction";
            renderCombat();
          }
        } else if (state.combatPhase === "pickTargetHeal" || state.combatPhase === "pickTargetAlly") {
          const t = state.party.find(function (p) { return p.id === id; });
          if (!t || !alive(t)) return;
          const ok = doSkill(a, state.pendingSkillSlot || 1, t);
          renderCombat();
          if (ok) setTimeout(finishActorTurn, 450);
          else {
            state.combatPhase = "pickAction";
            renderCombat();
          }
        }
      });
    });
  }

  function endCombat(won) {
    state.mode = "result";
    state.combatPhase = null;
    const kind = state.combatKind;

    if (won) {
      if (kind === "mountain") {
        state.eliteDone = true;
        state.chapterClear = true;
        state.silver += 20;
        const levelNotes = [];
        state.party.forEach(function (p) {
          if (alive(p)) levelNotes.push.apply(levelNotes, grantExpToAlly(p, 50));
        });
        updateTopbar();
        state.mode = "map";
        renderMap();
        let msg = "刀疤客跪地：「……路，你们过。」　银两 +20　经验 +50";
        if (levelNotes.length) msg += "　" + levelNotes.join("；");
        msg += "　本回试炼已过。";
        saveGame();
        showToast(msg, "收刀");
        return;
      }

      // forest win — keep wounds, unlock town gate
      state.encounterDone = true;
      state.townUnlocked = true;
      const n = state.fightSize || state.enemies.length;
      const perExp = n >= 3 ? 30 : 20;
      const silverGain = n >= 3 ? 12 : 8;
      state.silver += silverGain;
      const levelNotes = [];
      state.party.forEach(function (p) {
        if (alive(p)) levelNotes.push.apply(levelNotes, grantExpToAlly(p, perExp));
      });
      updateTopbar();
      state.mode = "map";
      renderMap();
      let msg = "这一仗过了。伤口还在，城口已开。　银两 +" + silverGain + "　经验 +" + perExp;
      if (levelNotes.length) msg += "　" + levelNotes.join("；");
      saveGame();
      showToast(msg, "继续");
    } else {
      state.silver = Math.max(0, state.silver - 2);
      restorePartyFull();
      updateTopbar();
      state.mode = "map";
      renderMap();
      const backMsg =
        state.mapId === "mountain"
          ? "撑不住。先退回山路入口。　银两 " + state.silver
          : state.mapId === "town"
            ? "撑不住。先退回城口。　银两 " + state.silver
            : "撑不住。先退回林道入口。　银两 " + state.silver;
      showToast(backMsg, "回入口");
    }
  }

  function showToast(msg, btnText) {
    const el = $("toast");
    $("toast-msg").textContent = msg;
    $("toast-btn").textContent = btnText || "继续";
    el.classList.add("show");
    el.hidden = false;
    $("toast-btn").onclick = function () { hideToast(); };
  }

  function hideToast() {
    const el = $("toast");
    el.classList.remove("show");
    el.hidden = true;
  }

  function showModal(title, bodyHtml, btnText, onClick, extraClass) {
    modal.className = "modal" + (extraClass ? " " + extraClass : "");
    modal.innerHTML = "<h2>" + escapeHtml(title) + "</h2>" + bodyHtml +
      '<br><button type="button" class="btn btn-primary" id="modal-btn">' + escapeHtml(btnText) + "</button>";
    overlay.classList.remove("hidden");
    $("modal-btn").addEventListener("click", onClick);
  }

  function hideModal() {
    overlay.classList.add("hidden");
    modal.className = "modal";
    modal.innerHTML = "";
  }

  function showOpening() {
    const linesHtml =
      '<div class="opening-lines">' +
      OPENING_LINES.map(function (line) { return "<p>" + escapeHtml(line) + "</p>"; }).join("") +
      "</div>";
    showModal(
      "出城",
      linesHtml,
      "上路",
      function () {
        hideModal();
        state.openingShown = true;
        state.mode = "map";
        renderMap();
      },
      "opening"
    );
  }

  function resetGame() {
    state.mode = "map";
    state.mapId = "forest";
    state.px = 0;
    state.py = 0;
    state.encounterDone = false;
    state.eliteDone = false;
    state.chapterClear = false;
    state.boughtBlade = false;
    state.hunterTalked = false;
    state.gossipDone = false;
    state.eliteIntroDone = false;
    state.townUnlocked = false;
    state.mountainUnlocked = false;
    state.silver = 0;
    state.exp = 0;
    state.party = baseParty();
    state.enemies = [];
    state.log = [];
    state.fightSize = 0;
    state.combatKind = null;
    updateTopbar();
    if (!state.openingShown) {
      showOpening();
    } else {
      renderMap();
    }
  }

  if (!loadGame()) {
    resetGame();
  } else {
    updateTopbar();
    renderMap();
  }
})();
