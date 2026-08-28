        if (t.hp <= 0) pushLog("sys", t.name + " 倒下了！");
      });
    } else if (attacker.id === "su" && slot === 1) {
      const t = targetOrNull;
      if (!t || !alive(t)) return false;
      const heal = 45;
      const before = t.hp;
      t.hp = Math.min(t.maxHp, t.hp + heal);
      noteFx(t.id, t.hp - before, "heal");
      pushLog("heal", attacker.name + " 施展「止血」，为 " + t.name + " 回复 " + (t.hp - before) + " 气血！");
    } else if (attacker.id === "su" && slot === 2) {
      pushLog("sys", "金疮散开，血止住了。");
      state.party.filter(alive).forEach(function (t) {
        const before = t.hp;
        t.hp = Math.min(t.maxHp, t.hp + 22);
        noteFx(t.id, t.hp - before, "heal");
        pushLog("heal", attacker.name + "「金疮」护住 " + t.name + "，回复 " + (t.hp - before) + " 气血！");
      });
    } else if (attacker.id === "tie" && slot === 1) {
      const t = targetOrNull;
      if (!t || !alive(t)) return false;
      const dmg = Math.max(1, Math.floor(attacker.atk * 1.3) - effectiveDef(t));
      t.hp = Math.max(0, t.hp - dmg);
      noteFx(t.id, dmg, "dmg");
      applyTempDef(attacker, 4);
      pushLog("dmg", attacker.name + " 施展「开路」！" + t.name + " 受到 " + dmg + " 伤害，无声守势更坚（防+4）！");
      if (t.hp <= 0) pushLog("sys", t.name + " 倒下了！");
    } else if (attacker.id === "tie" && slot === 2) {
      const t = targetOrNull;
      if (!t || !alive(t)) return false;
      applyTempDef(t, 6);
      pushLog("heal", "铁无声横刀挡在" + t.name + "身前。");
    }
    return true;
  }

  function pushLog(cls, text) {
    state.log.push({ cls: cls, text: text });
    if (state.log.length > 40) state.log.shift();
  }

  function combatTurnText(actor) {
    if (state.actingAlly && alive(state.actingAlly) && state.combatPhase === "pickAction") {
      return escapeHtml(state.actingAlly.name) + " 的回合 · 选动作";
    }
    if (state.combatPhase === "pickTarget" || state.combatPhase === "pickTargetSkill") {
      return "点选一个敌人";
    }
    if (state.combatPhase === "pickTargetHeal" || state.combatPhase === "pickTargetAlly") {
      return "点选一名友方";
    }
    if (state.combatPhase === "enemyTurn" && actor) {
      return escapeHtml(actor.name) + " 行动中……";
    }
    return state.combatKind === "mountain" ? "精英战" : "遭遇战";
  }

  function renderCombat() {
    updateTopbar();
    const actor = state.actingAlly || (state.combatPhase === "enemyTurn" ? currentActor() : null);
    const fieldKind = state.combatKind === "mountain" ? "mountain" : "forest";
    const slots = COMBAT_SLOTS[fieldKind] || COMBAT_SLOTS.forest;

    let html = '<div class="map-wrap">';
    html += '<div class="map ' + fieldKind + ' fighting" aria-label="战斗">';
    html += '<div class="turn">' + combatTurnText(actor) + "</div>";

    state.party.forEach(function (p) {
      const cls = ["unit"];
      if (!alive(p)) cls.push("down");
      if (actor && actor.id === p.id) cls.push("active");
      if ((state.combatPhase === "pickTargetHeal" || state.combatPhase === "pickTargetAlly") && alive(p)) {
        cls.push("selectable");
      }
      html += unitCard(p, cls.join(" "), false, slots.ally[p.id]);
    });
    state.enemies.forEach(function (e, i) {
      const cls = ["unit"];
      if (!alive(e)) cls.push("down");
      if (actor && actor.id === e.id) cls.push("active");
      if ((state.combatPhase === "pickTarget" || state.combatPhase === "pickTargetSkill") && alive(e)) {
        cls.push("selectable");
      }
      const pos = slots.foe[i] || slots.foe[slots.foe.length - 1];
      html += unitCard(e, cls.join(" "), true, pos);
    });

    html += '<div class="actions" id="combat-actions">';
    if (state.combatPhase === "pickAction" && state.actingAlly && alive(state.actingAlly)) {
      const a = state.actingAlly;
      html += '<button type="button" class="btn btn-primary" id="btn-atk">普攻</button>';
      const can1 = a.mp >= a.skill1.cost;
      const can2 = a.mp >= a.skill2.cost;
      html += '<button type="button" class="btn" id="btn-skill1" ' + (can1 ? "" : "disabled") + ">技能1 · " + escapeHtml(a.skill1.name) + "（" + a.skill1.cost + "）</button>';
      html += '<button type="button" class="btn" id="btn-skill2" ' + (can2 ? "" : "disabled") + ">技能2 · " + escapeHtml(a.skill2.name) + "（" + a.skill2.cost + "）</button>';
      html += '<span class="hint-inline">' + escapeHtml(a.skill1.desc) + " ／ " + escapeHtml(a.skill2.desc) + "</span>";
    } else if (state.combatPhase === "pickTarget" || state.combatPhase === "pickTargetSkill") {
      html += '<span class="hint-inline" style="margin-left:0">点选一个敌人</span>';
      html += '<button type="button" class="btn" id="btn-cancel">取消</button>';
    } else if (state.combatPhase === "pickTargetHeal" || state.combatPhase === "pickTargetAlly") {
      html += '<span class="hint-inline" style="margin-left:0">点选一名友方</span>';
      html += '<button type="button" class="btn" id="btn-cancel">取消</button>';
    } else if (state.combatPhase === "enemyTurn") {
      html += '<span class="hint-inline" style="margin-left:0">敌方行动中……</span>';
    }
    html += "</div></div>";

    html += '<div class="log" id="combat-log">';
    state.log.forEach(function (l) {
      html += '<p class="' + l.cls + '">' + escapeHtml(l.text) + "</p>";
    });
    html += "</div></div>";

    view.innerHTML = html;
    const logEl = $("combat-log");
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
    bindCombatEvents();
    if (state.fx && state.fx.length) {
      setTimeout(function () { state.fx = []; }, 720);
    }
  }

  function unitCard(u, cls, isEnemy, pos) {
    const hpPct = Math.max(0, (u.hp / u.maxHp) * 100);
    const hits = (state.fx || []).filter(function (f) { return f.id === u.id; });
    if (hits.some(function (f) { return f.kind === "dmg"; })) cls += " hit";
    let style = "";
    if (pos) {
      style = ' style="left:' + pos.left + '%;top:' + pos.top + '%;width:' + pos.w + '%;height:' + pos.h + '%"';
    }
    let html = '<div class="' + cls + '" data-id="' + u.id + '"' + style + ">";
    html += '<div class="sprite">';
    hits.forEach(function (f) {
      const sign = f.kind === "heal" ? "+" : "-";
      html += '<span class="fx-float ' + f.kind + '">' + sign + f.n + "</span>";
    });
    html += '<img class="portrait" src="' + portraitSrc(u) + '" alt="">';
    html += "</div>";
    html += '<div class="name">' + escapeHtml(u.name) + '<span class="role">' + escapeHtml(u.role || "") + "</span></div>";
    html += '<div class="row">气血 <div class="bar"><i style="width:' + hpPct + '%"></i></div></div>';
    html += "</div>";
    return html;
  }

  function bindCombatEvents() {
    const btnAtk = $("btn-atk");
    const btnSkill1 = $("btn-skill1");
    const btnSkill2 = $("btn-skill2");
    const btnCancel = $("btn-cancel");

    if (btnAtk) {
      btnAtk.addEventListener("click", function () {
        state.pendingAction = "attack";
        state.pendingSkillSlot = null;
        state.combatPhase = "pickTarget";
        renderCombat();
      });
    }

    function startSkill(slot) {
      const a = state.actingAlly;
      if (!a) return;
      state.pendingAction = "skill";
      state.pendingSkillSlot = slot;
      if (a.id === "lu" && slot === 2) {
        const ok = doSkill(a, 2, null);
        renderCombat();
        if (ok) setTimeout(finishActorTurn, 450);
        else {
          state.combatPhase = "pickAction";
          renderCombat();
        }
        return;
      }
      if (a.id === "su" && slot === 2) {
        const ok = doSkill(a, 2, null);
        renderCombat();
        if (ok) setTimeout(finishActorTurn, 450);
        else {
          state.combatPhase = "pickAction";
          renderCombat();
        }
        return;
      }
      if (a.id === "su" && slot === 1) {
        state.combatPhase = "pickTargetHeal";
      } else if (a.id === "tie" && slot === 2) {
        state.combatPhase = "pickTargetAlly";
      } else {
        state.combatPhase = "pickTargetSkill";
      }
      renderCombat();
    }

    if (btnSkill1) btnSkill1.addEventListener("click", function () { startSkill(1); });
