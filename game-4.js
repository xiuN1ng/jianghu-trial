      state.enemies.find(function (e) { return e.id === id; })
    );
  }

  function currentActor() {
    if (!state.turnQueue.length) return null;
    const id = state.turnQueue[state.turnIndex % state.turnQueue.length];
    return findUnit(id);
  }

  function advanceTurnIndex() {
    const len = state.turnQueue.length;
    for (let i = 0; i < len; i++) {
      state.turnIndex = (state.turnIndex + 1) % len;
      const u = findUnit(state.turnQueue[state.turnIndex]);
      if (alive(u)) return;
    }
  }

  function checkEnd() {
    const partyAlive = state.party.some(alive);
    const enemyAlive = state.enemies.some(alive);
    if (!enemyAlive) {
      endCombat(true);
      return true;
    }
    if (!partyAlive) {
      endCombat(false);
      return true;
    }
    return false;
  }

  function nextTurn() {
    if (state.mode !== "combat") return;
    if (checkEnd()) return;

    let actor = currentActor();
    let guard = 0;
    while (actor && !alive(actor) && guard < 20) {
      advanceTurnIndex();
      actor = currentActor();
      guard++;
    }
    if (!actor || !alive(actor)) {
      buildTurnQueue();
      actor = currentActor();
    }
    if (!actor) return;

    if (actor.isEnemy) {
      state.combatPhase = "enemyTurn";
      state.actingAlly = null;
      renderCombat();
      setTimeout(function () { enemyAct(actor); }, 600);
    } else {
      state.actingAlly = actor;
      state.combatPhase = "pickAction";
      state.pendingAction = null;
      state.pendingSkillSlot = null;
      pushLog("sys", "轮到 " + actor.name + "（" + actor.role + "）");
      renderCombat();
    }
  }

  function enemyAct(enemy) {
    if (state.mode !== "combat" || !alive(enemy)) {
      finishActorTurn();
      return;
    }
    const targets = state.party.filter(alive);
    if (!targets.length) {
      finishActorTurn();
      return;
    }
    targets.sort(function (a, b) { return a.hp - b.hp; });
    const t = targets[0];

    if (enemy.id === "chief") {
      enemy.actionCount = (enemy.actionCount || 0) + 1;
      if (enemy.actionCount % 2 === 0) {
        const mitigated = Math.max(0, effectiveDef(t) - 2);
        const dmg = Math.max(1, Math.floor(enemy.atk * 1.4) - mitigated);
        t.hp = Math.max(0, t.hp - dmg);
        noteFx(t.id, dmg, "dmg");
        pushLog("dmg", enemy.name + "「拦路斩」劈向 " + t.name + "，造成 " + dmg + " 伤害！");
      } else {
        const dmg = normalDamage(enemy, t);
        t.hp = Math.max(0, t.hp - dmg);
        noteFx(t.id, dmg, "dmg");
        pushLog("dmg", enemy.name + "「索命刀」砍向 " + t.name + "，造成 " + dmg + " 伤害！");
      }
    } else {
      const dmg = normalDamage(enemy, t);
      t.hp = Math.max(0, t.hp - dmg);
      noteFx(t.id, dmg, "dmg");
      pushLog("dmg", enemy.name + " 挥刀砍向 " + t.name + "，造成 " + dmg + " 伤害！");
    }
    if (t.hp <= 0) pushLog("sys", t.name + " 力竭倒下……");
    renderCombat();
    setTimeout(finishActorTurn, 500);
  }

  function clearExpiredTempDef() {
    function tick(u) {
      if (!u) return;
      if ((u.tempDefPersist || 0) > 0) {
        u.tempDefPersist -= 1; // persist>0 这轮先留着
      } else {
        u.tempDef = 0;
      }
    }
    state.party.forEach(tick);
    state.enemies.forEach(tick);
  }

  function casterIsLastAlive() {
    const caster = state.actingAlly;
    if (!caster) return false;
    const q = state.turnQueue;
    const idx = q.indexOf(caster.id);
    if (idx < 0) return false;
    // 只看队列后半段，不绕回队头
    for (let i = idx + 1; i < q.length; i++) {
      if (alive(findUnit(q[i]))) return false;
    }
    return true;
  }

  function applyTempDef(target, amount) {
    if (!target) return;
    target.tempDef = (target.tempDef || 0) + amount;
    target.tempDefPersist = casterIsLastAlive() ? 1 : 0;
  }

  function finishActorTurn() {
    if (checkEnd()) return;
    const prevId = state.turnQueue[state.turnIndex];
    advanceTurnIndex();
    const still = state.turnQueue.some(function (id) { return alive(findUnit(id)); });
    if (!still) {
      buildTurnQueue();
    } else {
      const firstAlive = state.turnQueue.find(function (id) { return alive(findUnit(id)); });
      if (state.turnQueue[state.turnIndex] === firstAlive && prevId !== firstAlive) {
        clearExpiredTempDef();
      }
    }
    setTimeout(nextTurn, 350);
  }

  function noteFx(id, n, kind) {
    if (!state.fx) state.fx = [];
    state.fx.push({ id: id, n: n, kind: kind });
  }

  function doAttack(attacker, target) {
    const dmg = normalDamage(attacker, target);
    target.hp = Math.max(0, target.hp - dmg);
    noteFx(target.id, dmg, "dmg");
    const an = attacker.attackName || "普攻";
    pushLog("dmg", attacker.name + "「" + an + "」攻向 " + target.name + "，造成 " + dmg + " 伤害！");
    if (target.hp <= 0) pushLog("sys", target.name + " 倒下了！");
  }

  function getSkill(attacker, slot) {
    return slot === 2 ? attacker.skill2 : attacker.skill1;
  }

  function doSkill(attacker, slot, targetOrNull) {
    const sk = getSkill(attacker, slot);
    if (!sk) return false;
    if (attacker.mp < sk.cost) {
      pushLog("sys", attacker.name + " 内力不足，无法施展「" + sk.name + "」！");
      return false;
    }
    attacker.mp -= sk.cost;

    if (attacker.id === "lu" && slot === 1) {
      const t = targetOrNull;
      if (!t || !alive(t)) return false;
      const mitigated = Math.max(0, effectiveDef(t) - 3);
      const dmg = Math.max(1, Math.floor(attacker.atk * 1.6) - mitigated);
      t.hp = Math.max(0, t.hp - dmg);
      noteFx(t.id, dmg, "dmg");
      pushLog("dmg", attacker.name + " 施展「破风斩」！" + t.name + " 受到 " + dmg + " 重创！");
      if (t.hp <= 0) pushLog("sys", t.name + " 倒下了！");
    } else if (attacker.id === "lu" && slot === 2) {
      pushLog("sys", "横剑一扫，风从刃上过。");
      const living = state.enemies.filter(alive);
      living.forEach(function (t) {
        const dmg = Math.max(1, Math.floor(attacker.atk * 0.8));
        t.hp = Math.max(0, t.hp - dmg);
        noteFx(t.id, dmg, "dmg");
        pushLog("dmg", attacker.name + "「横剑」扫过 " + t.name + "，造成 " + dmg + " 伤害！");
