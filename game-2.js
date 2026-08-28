  };

  const view = document.getElementById("view");
  const overlay = document.getElementById("overlay");
  const modal = document.getElementById("modal");

  function $(id) { return document.getElementById(id); }

  function currentMap() {
    return MAPS[state.mapId] || MAPS.forest;
  }

  function updateTopbar() {
    $("silver").textContent = state.silver;
    $("exp").textContent = state.exp;
    if (state.mode === "combat") {
      $("phase-label").textContent = "战斗 · " + (MAP_NAMES[state.mapId] || "");
    } else if (state.chapterClear) {
      $("phase-label").textContent = "试炼已过";
    } else {
      $("phase-label").textContent = MAP_NAMES[state.mapId] || "探索";
    }
  }

  function key(x, y) { return x + "," + y; }

  function isWalkable(x, y) {
    if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return false;
    const m = currentMap();
    if (m.blocked.has(key(x, y))) return false;
    return true;
  }

  function isAdjacent(x, y) {
    const dx = Math.abs(x - state.px);
    const dy = Math.abs(y - state.py);
    return (dx + dy === 1) && isWalkable(x, y);
  }

  function restorePartyFull() {
    state.party.forEach((p) => {
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      p.tempDef = 0;
    });
  }

  function grantExpToAlly(ally, amount) {
    ally.exp = (ally.exp || 0) + amount;
    state.exp += amount;
    const notes = [];
    while (ally.exp >= 100) {
      ally.exp -= 100;
      ally.level = (ally.level || 1) + 1;
      ally.maxHp += 12;
      ally.hp = Math.min(ally.maxHp, ally.hp + 12);
      ally.atk += 2;
      ally.def = (ally.def || 0) + 1;
      ally.maxMp += 5;
      ally.mp = Math.min(ally.maxMp, ally.mp + 5);
      notes.push(ally.name + " 升至 " + ally.level + " 级！");
    }
    return notes;
  }

  function portraitSrc(u) {
    if (!u) return "assets/portraits/bandit.png";
    if (u.id === "lu") return "assets/portraits/lu-chenzhou.png";
    if (u.id === "su") return "assets/portraits/su-wanqing.png";
    if (u.id === "tie") return "assets/portraits/tie-wusheng.png";
    if (u.id === "chief") return "assets/portraits/bandit-chief.png";
    return "assets/portraits/bandit.png";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }


  var SAVE_KEY = "jianghu-trial-save-v1";

  function serialParty() {
    return state.party.map(function (p) {
      return {
        id: p.id, hp: p.hp, mp: p.mp, maxHp: p.maxHp, maxMp: p.maxMp,
        atk: p.atk, def: p.def, spd: p.spd, level: p.level, exp: p.exp, tempDef: 0
      };
    });
  }

  function saveGame() {
    if (state.mode === "combat") return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        mapId: state.mapId, px: state.px, py: state.py,
        encounterDone: state.encounterDone, eliteDone: state.eliteDone,
        chapterClear: state.chapterClear, boughtBlade: state.boughtBlade,
        hunterTalked: state.hunterTalked, gossipDone: state.gossipDone,
        eliteIntroDone: state.eliteIntroDone, townUnlocked: state.townUnlocked,
        mountainUnlocked: state.mountainUnlocked, silver: state.silver, exp: state.exp,
        openingShown: true, party: serialParty()
      }));
    } catch (e) {}
  }

  function loadGame() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      var d = JSON.parse(raw);
      if (!d || !d.mapId || !MAPS[d.mapId]) return false;
      state.mapId = d.mapId;
      state.px = d.px; state.py = d.py;
      state.encounterDone = !!d.encounterDone;
      state.eliteDone = !!d.eliteDone;
      state.chapterClear = !!d.chapterClear;
      state.boughtBlade = !!d.boughtBlade;
      state.hunterTalked = !!d.hunterTalked;
      state.gossipDone = !!d.gossipDone;
      state.eliteIntroDone = !!d.eliteIntroDone;
      state.townUnlocked = !!d.townUnlocked;
      state.mountainUnlocked = !!d.mountainUnlocked;
      state.silver = d.silver || 0;
      state.exp = d.exp || 0;
      state.openingShown = true;
      state.mode = "map";
      if (d.party && d.party.length) {
        d.party.forEach(function (s) {
          var p = state.party.find(function (x) { return x.id === s.id; });
          if (!p) return;
          p.maxHp = s.maxHp; p.hp = s.hp; p.maxMp = s.maxMp; p.mp = s.mp;
          p.atk = s.atk; p.def = s.def; p.spd = s.spd;
          p.level = s.level; p.exp = s.exp; p.tempDef = 0;
        });
      }
      return true;
    } catch (e) { return false; }
  }

  function enterMap(mapId) {
    state.mapId = mapId;
    state.mode = "map";
    renderMap();
    saveGame();
  }

  function hotspotVisible(h) {
    if (h.id === "bandit" && state.encounterDone) return false;
    if (h.id === "chief" && state.eliteDone) return false;
    if (h.id === "pass" && !state.eliteDone) return false;
    return true;
  }

  function hotspotLocked(h) {
    if (h.id === "gate" && !state.encounterDone) return true;
    return false;
  }

  function renderMap() {
    updateTopbar();
    const m = currentMap();
    let html = '<div class="map-wrap">';
    html += '<div class="map ' + state.mapId + '" aria-label="场景">';
    (m.hotspots || []).forEach(function (h) {
      if (!hotspotVisible(h)) return;
      const locked = hotspotLocked(h);
      html += '<button type="button" class="hotspot' + (locked ? " locked" : "") + '" data-id="' + h.id + '" title="' + escapeHtml(h.label) + '" style="left:' + h.left + '%;top:' + h.top + '%;width:' + h.w + '%;height:' + h.h + '%"></button>';
    });
    html += "</div>";
    html += '<p class="hint">' + escapeHtml(m.enterHint || "") + "</p>";
    if (state.chapterClear) {
      html += '<p class="hint" style="margin-top:8px">本回试炼已过。刷新页面可重开。</p>';
    }

    html += '<div class="party-strip"><h3>同行</h3><div class="party-row">';
    state.party.forEach((p) => {
      const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
      const mpPct = p.maxMp ? Math.max(0, (p.mp / p.maxMp) * 100) : 0;
      html += '<div class="party-card">';
      html += '<img class="portrait" src="' + portraitSrc(p) + '" alt="">';
      html += '<div class="party-info">';
      html += '<div class="pn">' + escapeHtml(p.name) + ' <span class="role">' + escapeHtml(p.role || "") + " · Lv." + (p.level || 1) + "</span></div>";
      html += '<div class="pt">' + escapeHtml(p.tagline || "") + "</div>";
      html += '<div class="row">气血 <div class="bar"><i style="width:' + hpPct + '%"></i></div></div>';
      html += '<div class="row">内力 <div class="bar mp"><i style="width:' + mpPct + '%"></i></div></div>';
      html += "</div></div>";
    });
    html += "</div></div></div>";
    view.innerHTML = html;

    view.querySelectorAll(".hotspot").forEach(function (el) {
      el.addEventListener("click", function () { onHotspot(el.dataset.id); });
