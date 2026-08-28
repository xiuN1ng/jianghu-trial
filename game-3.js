    });
  }

  function onHotspot(id) {
    if (state.mode !== "map") return;
    if (state.mapId === "forest") {
      if (id === "hunter") { showHunterDialogue(); return; }
      if (id === "bandit") { if (!state.encounterDone) startCombat("forest"); return; }
      if (id === "gate") {
        if (state.encounterDone) {
          state.townUnlocked = true;
          enterMap("town");
          showToast("出了林道，官道尽头是城镇。", "进城");
        } else {
          showToast("林中尚有贼影，官道未开。", "知道了");
        }
        return;
      }
    }
    if (state.mapId === "town") {
      if (id === "herb") { showHerbShop(); return; }
      if (id === "blade") { showBladeShop(); return; }
      if (id === "tea") { showGossipDialogue(); return; }
      if (id === "gateOut") {
        state.mountainUnlocked = true;
        enterMap("mountain");
        showToast("出东口，山路渐陡。", "上路");
        return;
      }
      if (id === "gateBack") {
        enterMap("forest");
        showToast("折回林道。", "继续");
        return;
      }
    }
    if (state.mapId === "mountain") {
      if (id === "chief") { if (!state.eliteDone && !state.chapterClear) maybeEliteIntroThenFight(); return; }
      if (id === "pass") {
        showToast("路开了。本回试炼已过。", "收刀");
        return;
      }
      if (id === "gateBack") {
        enterMap("town");
        showToast("折回城镇。", "继续");
        return;
      }
    }
  }

  function showGossipDialogue() {
    if (state.gossipDone) {
      showToast("茶客已经把话说完了。线索：刀疤客第二刀是拦路斩。", "离开");
      return;
    }
    const lines =
      '<p class="dialogue-line">茶客：「北坡那刀疤，第一刀试你，第二刀才要命。」</p>' +
      '<p class="dialogue-line">苏：「你怎么知道？」</p>' +
      '<p class="dialogue-line">茶客：「活着回来的人，都这么说。唧，碎银四两，当我买你们去探探。」</p>';
    showModal("城镇·茶摊", lines, "收下", function () {
      hideModal();
      state.gossipDone = true;
      state.silver += 4;
      updateTopbar();
      renderMap();
      saveGame();
      showToast("银两 +4。线索：刀疤客第二刀是拦路斩。", "记下了");
    });
  }

  function showHunterDialogue() {
    state.hunterTalked = true;
    const lines =
      '<p class="dialogue-line">猎户：「林子里有刀疤脚印，别往深处走。」</p>' +
      '<p class="dialogue-line">陆：「多谢。前面可通官道？」</p>' +
      '<p class="dialogue-line">猎户：「通。通，却不一定活着到。」</p>';
    showModal("林道·猎户", lines, "告辞", () => {
      hideModal();
      renderMap();
    });
  }

  function showHerbShop() {
    const lines =
      '<p class="dialogue-line">掌柜：「伤药八两一包。刀钝了？隔壁铁铺。」</p>' +
      '<p class="dialogue-line">苏：「药要新的。过期的我认得。」</p>' +
      '<p class="dialogue-line">掌柜：「……姑娘好眼力。」</p>' +
      '<div class="shop-actions">' +
      '<button type="button" class="btn btn-primary" id="buy-heal">伤药 8两</button>' +
      '<button type="button" class="btn" id="shop-leave">离开</button>' +
      "</div>";
    modal.className = "modal";
    modal.innerHTML = "<h2>城镇·药铺</h2>" + lines;
    overlay.classList.remove("hidden");
    $("buy-heal").addEventListener("click", () => {
      if (state.silver < 8) {
        showToast("银两不够。伤药要八两。", "知道了");
        return;
      }
      state.silver -= 8;
      state.party.forEach((p) => {
        if (p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + 50);
      });
      updateTopbar();
      hideModal();
      renderMap();
      saveGame();
      showToast("伤药入喉，众人气血各回五十。", "继续");
    });
    $("shop-leave").addEventListener("click", () => {
      hideModal();
      renderMap();
    });
  }

  function showBladeShop() {
    const lines =
      '<p class="dialogue-line">铁匠：「利刃十二两。磨快了，本回够用。」</p>' +
      '<p class="dialogue-line">铁：「磨。钝刀会误事。」</p>' +
      '<p class="dialogue-line">铁匠：「人倒痛快。」</p>' +
      '<div class="shop-actions">' +
      '<button type="button" class="btn btn-primary" id="buy-blade"' + (state.boughtBlade ? " disabled" : "") + '>利刃 12两</button>' +
      '<button type="button" class="btn" id="shop-leave">离开</button>' +
      "</div>";
    modal.className = "modal";
    modal.innerHTML = "<h2>城镇·铁铺</h2>" + lines;
    overlay.classList.remove("hidden");
    $("buy-blade").addEventListener("click", () => {
      if (state.boughtBlade) return;
      if (state.silver < 12) {
        showToast("银两不够。利刃要十二两。", "知道了");
        return;
      }
      state.silver -= 12;
      state.boughtBlade = true;
      state.party.forEach((p) => { p.atk += 2; });
      updateTopbar();
      hideModal();
      renderMap();
      saveGame();
      showToast("利刃过手，本回全员攻击+2。", "继续");
    });
    $("shop-leave").addEventListener("click", () => {
      hideModal();
      renderMap();
    });
  }

  function maybeEliteIntroThenFight() {
    if (state.eliteIntroDone) {
      startCombat("mountain");
      return;
    }
    state.eliteIntroDone = true;
    const lines =
      '<p class="dialogue-line">铁：「这人站得稳。不是杂兵。」</p>' +
      '<p class="dialogue-line">陆：「报上名来。」</p>' +
      '<p class="dialogue-line">精英：「过路费，或者命。」</p>';
    showModal("山路·拦路", lines, "拔刀", () => {
      hideModal();
      startCombat("mountain");
    });
  }

  function startCombat(kind) {
    state.party.forEach((p) => { p.tempDef = 0; });
    state.combatKind = kind || "forest";
    if (state.combatKind === "mountain") {
      state.enemies = [makeChief()];
    } else {
      state.enemies = makeForestEnemies();
    }
    state.fightSize = state.enemies.length;
    state.log = [];
    state.mode = "combat";
    state.combatPhase = "wait";
    pushLog("sys", state.combatKind === "mountain" ? "刀疤客拦路。" : "刀声起了。");
    buildTurnQueue();
    renderCombat();
    setTimeout(nextTurn, 400);
  }

  function alive(u) { return u && u.hp > 0; }

  function buildTurnQueue() {
    const all = state.party.concat(state.enemies).filter(alive);
    all.sort(function (a, b) {
      return b.spd - a.spd || a.name.localeCompare(b.name, "zh");
    });
    state.turnQueue = all.map(function (u) { return u.id; });
    state.turnIndex = 0;
  }

  function findUnit(id) {
    return (
      state.party.find(function (p) { return p.id === id; }) ||
