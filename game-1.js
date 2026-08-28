(function () {
  "use strict";

  const MAP_SIZE = 5;
  const MAP_NAMES = { forest: "林道", town: "城镇", mountain: "山路" };

  const MAPS = {
    forest: {
      id: "forest",
      enterHint: "官道入林，青石还湿。西边有炊烟。",
      hotspots: [
        { id: "hunter", left: 5, top: 52, w: 18, h: 32, label: "猎户" },
        { id: "bandit", left: 50, top: 46, w: 12, h: 26, label: "拦路刀客" },
        { id: "gate", left: 78, top: 6, w: 18, h: 20, label: "通城" }
      ]
    },
    town: {
      id: "town",
      enterHint: "石板镇，药香混着打铁声。",
      hotspots: [
        { id: "gateBack", left: 0, top: 22, w: 18, h: 42, label: "回林道" },
        { id: "herb", left: 26, top: 38, w: 16, h: 26, label: "药铺" },
        { id: "blade", left: 54, top: 40, w: 14, h: 24, label: "铁铺" },
        { id: "tea", left: 58, top: 66, w: 24, h: 30, label: "茶摊" },
        { id: "gateOut", left: 86, top: 26, w: 14, h: 20, label: "通山" }
      ]
    },
    mountain: {
      id: "mountain",
      enterHint: "路窄了。北坡风硬，那刀疤多半在前头。",
      hotspots: [
        { id: "chief", left: 42, top: 22, w: 16, h: 48, label: "刀疤客" },
        { id: "pass", left: 48, top: 0, w: 12, h: 16, label: "过关" },
        { id: "gateBack", left: 38, top: 78, w: 24, h: 18, label: "折回城镇" }
      ]
    }
  };

  const COMBAT_SLOTS = {
    forest: {
      ally: {
        lu:  { left: 6, top: 52, w: 10, h: 22 },
        su:  { left: 2, top: 62, w: 10, h: 22 },
        tie: { left: 14, top: 62, w: 10, h: 22 }
      },
      foe: [
        { left: 48, top: 46, w: 10, h: 22 },
        { left: 60, top: 50, w: 10, h: 22 },
        { left: 54, top: 38, w: 10, h: 22 }
      ]
    },
    mountain: {
      ally: {
        lu:  { left: 8, top: 58, w: 10, h: 22 },
        su:  { left: 4, top: 62, w: 10, h: 22 },
        tie: { left: 16, top: 62, w: 10, h: 22 }
      },
      foe: [
        { left: 42, top: 22, w: 12, h: 28 }
      ]
    }
  };

  const OPENING_LINES = [
    "城门之外，青石尚湿。",
    "陆沉舟按了按剑柄，剑是新的，心却比剑更急。",
    "苏晚晴把药包往袖里一塞：「先别逞能，伤药有限。」",
    "铁无声只嗯了一声，刀背朝外，人站在最险的那侧。",
    "官道向北，林影里有人声。",
    "沉舟道：「走。今日便见见江湖。」",
    "晚晴冷笑：「见江湖容易，活着回来难。」",
    "无声抬刀，示意前路。",
    "风过林梢，像有人磨刀。",
    "往前走，踩到异样处，便是一战。",
  ];

  function baseParty() {
    return [
      {
        id: "lu",
        name: "陆沉舟",
        role: "少侠",
        tagline: "刚出江湖的少侠，剑还新，心比剑更急，总想先挡在人前。",
        maxHp: 120, hp: 120,
        maxMp: 40, mp: 40,
        atk: 18, def: 8, spd: 12,
        level: 1, exp: 0,
        attackName: "拔剑",
        skill1: { name: "破风斩", cost: 12, desc: "单体重击，无视对方3点防御" },
        skill2: { name: "横剑", cost: 16, desc: "攻击全体敌人，各造成约八成攻击力伤害" },
        tempDef: 0,
      },
      {
        id: "su",
        name: "苏晚晴",
        role: "医女",
        tagline: "走方医女，嘴上不饶人，袖里伤药从不离身。",
        maxHp: 90, hp: 90,
        maxMp: 60, mp: 60,
        atk: 10, def: 6, spd: 14,
        level: 1, exp: 0,
        attackName: "点穴",
        skill1: { name: "止血", cost: 15, desc: "治疗一名友方45点气血" },
        skill2: { name: "金疮", cost: 20, desc: "全体友方回复22点气血" },
        tempDef: 0,
      },
      {
        id: "tie",
        name: "铁无声",
        role: "刀客",
        tagline: "过路刀客，话少得像哑了，人却总站在最险的那一侧。",
        maxHp: 160, hp: 160,
        maxMp: 30, mp: 30,
        atk: 22, def: 14, spd: 8,
        level: 1, exp: 0,
        attackName: "横刀",
        skill1: { name: "开路", cost: 10, desc: "单体1.3倍攻击，本回合自身防御+4" },
        skill2: { name: "挡刀", cost: 12, desc: "指定一名友方，本回合临时防御+6" },
        tempDef: 0,
      },
    ];
  }

  function makeForestEnemies() {
    const names = ["杂兵甲", "杂兵乙", "杂兵丙"];
    const count = Math.random() < 0.5 ? 2 : 3;
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: "minion" + i,
        name: names[i] || "杂兵",
        role: "杂兵",
        maxHp: 80, hp: 80,
        maxMp: 0, mp: 0,
        atk: 14, def: 5, spd: 10,
        tempDef: 0,
        isEnemy: true,
        attackName: "挥刀",
      });
    }
    return list;
  }

  function makeChief() {
    return {
      id: "chief",
      name: "刀疤客",
      role: "精英",
      maxHp: 220, hp: 220,
      maxMp: 0, mp: 0,
      atk: 20, def: 10, spd: 11,
      tempDef: 0,
      isEnemy: true,
      attackName: "索命刀",
      actionCount: 0,
    };
  }

  function effectiveDef(u) {
    return (u.def || 0) + (u.tempDef || 0);
  }

  function normalDamage(attacker, target) {
    return Math.max(1, attacker.atk - effectiveDef(target));
  }

  const state = {
    mode: "map",
    mapId: "forest",
    px: 0,
    py: 0,
    encounterDone: false,
    eliteDone: false,
    chapterClear: false,
    boughtBlade: false,
    hunterTalked: false,
    gossipDone: false,
    eliteIntroDone: false,
    townUnlocked: false,
    mountainUnlocked: false,
    silver: 0,
    exp: 0,
    party: baseParty(),
    openingShown: false,
    enemies: [],
    fightSize: 0,
    combatKind: null,
    turnQueue: [],
    turnIndex: 0,
    combatPhase: null,
    actingAlly: null,
    pendingAction: null,
    pendingSkillSlot: null,
    log: [],
    fx: [],
