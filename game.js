// ゲームの状態
let state = {
    resources: {
        gold: 10,
        iron: 0,
        wood: 0,
        mana: 0
    },
    employees: {
        training: 1,
        miner: 0,
        lumberjack: 0,
        manaSearcher: 0
    },
    inventory: [],
    isCrafting: false,
    stats: {
        totalCrafted: 0
    }
};

const recipes = [
    { id: 'iron-dagger', name: '鉄の短剣', reqs: { iron: 5, wood: 2 }, time: 3000, basePower: 10, rarity: 'common' },
    { id: 'longsword', name: 'ロングソード', reqs: { iron: 15, wood: 5 }, time: 8000, basePower: 25, rarity: 'common' },
    { id: 'battle-axe', name: 'バトルアックス', reqs: { iron: 20, wood: 10 }, time: 12000, basePower: 40, rarity: 'rare' },
    { id: 'mana-staff', name: '魔力の杖', reqs: { wood: 15, mana: 5 }, time: 15000, basePower: 35, rarity: 'rare' },
    { id: 'excalibur', name: 'エクスカリバー', reqs: { iron: 50, mana: 20, gold: 100 }, time: 30000, basePower: 100, rarity: 'legendary' }
];

const employeeData = [
    { id: 'training', name: '技術研修', desc: '店主（自分）の腕を磨き、クリック時の獲得量を増やします。', baseCost: 50, factor: 1.5, type: 'click' },
    { id: 'miner', name: '見習い採掘師', desc: '地下室で鉄を掘り続けます（1秒ごとに鉄+1）。', baseCost: 100, factor: 1.6, type: 'auto', resource: 'iron' },
    { id: 'lumberjack', name: '木こりの協力者', desc: '裏山で木材を調達してくれます（1秒ごとに木材+1）。', baseCost: 150, factor: 1.7, type: 'auto', resource: 'wood' },
    { id: 'manaSearcher', name: '魔力探求者', desc: '神秘の森でマナを探してくれます（5秒ごとにマナ+1）。', baseCost: 500, factor: 2.0, type: 'auto', resource: 'mana', interval: 5000 }
];

// DOM要素
const elements = {
    gold: document.getElementById('gold-count'),
    iron: document.getElementById('iron-count'),
    wood: document.getElementById('wood-count'),
    mana: document.getElementById('mana-count'),
    recipeList: document.getElementById('recipe-list'),
    inventoryGrid: document.getElementById('inventory-grid'),
    employeeList: document.getElementById('employee-list'),
    log: document.getElementById('log'),
    craftingStatus: document.getElementById('crafting-status'),
    craftingMsg: document.getElementById('crafting-msg'),
    progressBar: document.getElementById('crafting-progress-inner')
};
// オーディオ管理
const audio = {
    ctx: null,
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    play(freq, type, duration, vol = 0.1) {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    click() { this.play(440, 'sine', 0.1); },
    collect() { this.play(880, 'triangle', 0.1, 0.05); },
    craft() { this.play(220, 'sawtooth', 0.3, 0.05); },
    finish() { 
        this.play(660, 'sine', 0.2);
        setTimeout(() => this.play(880, 'sine', 0.4), 100);
    },
    sell() { this.play(1200, 'sine', 0.1, 0.05); },
    buy() { this.play(523.25, 'square', 0.2, 0.03); }
};

const bgm = {
    isPlaying: false,
    interval: null,
    step: 0,
    // 中世風の旋律 (イ短調)
    melody: [
        220.00, 261.63, 329.63, 293.66, 261.63, 246.94, 220.00, 196.00,
        220.00, 261.63, 293.66, 329.63, 261.63, 246.94, 220.00, 220.00
    ],
    toggle() {
        const btn = document.getElementById('bgm-toggle');
        if (this.isPlaying) {
            this.stop();
            btn.innerText = '🔇';
        } else {
            this.start();
            btn.innerText = '🔊';
        }
    },
    start() {
        if (this.isPlaying) return;
        audio.init();
        this.isPlaying = true;
        this.step = 0;
        this.loop();
    },
    stop() {
        this.isPlaying = false;
        if (this.interval) clearTimeout(this.interval);
    },
    loop() {
        if (!this.isPlaying) return;
        
        const freq = this.melody[this.step];
        this.playNote(freq, 0.6);
        
        this.step = (this.step + 1) % this.melody.length;
        // テンポ: 0.4秒ごとに次の音
        this.interval = setTimeout(() => this.loop(), 400);
    },
    playNote(freq, duration) {
        const osc = audio.ctx.createOscillator();
        const gain = audio.ctx.createGain();
        // 撥弦楽器（リュートやハープ）に近い音色を目指す
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audio.ctx.currentTime);
        
        gain.gain.setValueAtTime(0, audio.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.04, audio.ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audio.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(audio.ctx.destination);
        osc.start();
        osc.stop(audio.ctx.currentTime + duration);
    }
};

// 初期化
function init() {
    loadGame();
    setupTabs();
    setupGathering();
    renderRecipes();
    renderInventory();
    renderEmployees();
    updateUI();

    // BGMの切り替え
    document.getElementById('bgm-toggle').addEventListener('click', () => bgm.toggle());
    
    // 自動生成の開始
    setInterval(autoResourceGen, 1000);
    
    addLog("神秘の鍛冶場へようこそ。BGMをオンにできます。");
}

// タブ管理
function setupTabs() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            audio.click();
            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// リソース収集
function setupGathering() {
    document.getElementById('mine-iron').addEventListener('click', () => collect('iron', state.employees.training, `鉄を${state.employees.training}個獲得しました。`));
    document.getElementById('chop-wood').addEventListener('click', () => collect('wood', state.employees.training, `木材を${state.employees.training}個獲得しました。`));
    document.getElementById('search-mana').addEventListener('click', () => collect('mana', state.employees.training, `マナを${state.employees.training}個獲得しました。`));
}

function collect(resource, amount, msg) {
    audio.collect();
    state.resources[resource] += amount;
    const el = elements[resource];
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
    updateUI();
    if (msg) addLog(msg);
    saveGame();
}

// UI更新
function updateUI() {
    elements.gold.innerText = Math.floor(state.resources.gold);
    elements.iron.innerText = state.resources.iron;
    elements.wood.innerText = state.resources.wood;
    elements.mana.innerText = state.resources.mana;
    
    // 鍛造ボタンの状態更新
    document.querySelectorAll('.craft-btn').forEach(btn => {
        const recipeId = btn.getAttribute('data-recipe');
        const recipe = recipes.find(r => r.id === recipeId);
        btn.disabled = !canCraft(recipe) || state.isCrafting;
    });

    // 雇用ボタンの状態更新
    document.querySelectorAll('.buy-btn').forEach(btn => {
        const upId = btn.getAttribute('data-upgrade');
        const up = employeeData.find(u => u.id === upId);
        const cost = getEmployeeCost(upId);
        btn.innerText = `雇用・研修 (${Math.floor(cost)} G)`;
        btn.disabled = state.resources.gold < cost;
    });
}

function addLog(msg) {
    const p = document.createElement('p');
    p.innerText = `> ${msg}`;
    elements.log.prepend(p);
    if (elements.log.childNodes.length > 20) {
        elements.log.removeChild(elements.log.lastChild);
    }
}

// 鍛造ロジック
function canCraft(recipe) {
    for (const [res, amt] of Object.entries(recipe.reqs)) {
        if (state.resources[res] < amt) return false;
    }
    return true;
}

function renderRecipes() {
    elements.recipeList.innerHTML = '';
    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        let reqsText = Object.entries(recipe.reqs)
            .map(([res, amt]) => {
                let name = res === 'gold' ? 'ゴールド' : res === 'iron' ? '鉄' : res === 'wood' ? '木材' : 'マナ';
                return `${amt} ${name}`;
            })
            .join(', ');
        card.innerHTML = `
            <div class="recipe-info">
                <h3>${recipe.name}</h3>
                <p class="recipe-reqs">必要: ${reqsText}</p>
            </div>
            <button class="craft-btn" data-recipe="${recipe.id}">鍛造</button>
        `;
        card.querySelector('.craft-btn').addEventListener('click', () => startCrafting(recipe));
        elements.recipeList.appendChild(card);
    });
}

function startCrafting(recipe) {
    if (state.isCrafting || !canCraft(recipe)) return;
    audio.craft();
    for (const [res, amt] of Object.entries(recipe.reqs)) {
        state.resources[res] -= amt;
    }
    state.isCrafting = true;
    updateUI();
    elements.craftingStatus.classList.remove('hidden');
    elements.craftingMsg.innerText = `${recipe.name}を鍛造中...`;
    let start = null;
    function animate(timestamp) {
        if (!start) start = timestamp;
        let progress = timestamp - start;
        let percent = Math.min((progress / recipe.time) * 100, 100);
        elements.progressBar.style.width = percent + '%';
        if (progress < recipe.time) {
            requestAnimationFrame(animate);
        } else {
            finishCrafting(recipe);
        }
    }
    requestAnimationFrame(animate);
}

function finishCrafting(recipe) {
    audio.finish();
    state.isCrafting = false;
    elements.craftingStatus.classList.add('hidden');
    elements.progressBar.style.width = '0%';
    const variance = Math.floor(Math.random() * 11) - 5;
    const finalPower = recipe.basePower + variance;
    let rarity = recipe.rarity;
    const roll = Math.random();
    if (roll > 0.95) rarity = 'legendary';
    else if (roll > 0.85) rarity = 'epic';
    else if (roll > 0.70 && rarity === 'common') rarity = 'rare';

    const rarityJp = { common: '一般', rare: '希少', epic: '逸品', legendary: '伝説' };
    const weapon = {
        id: Date.now(),
        name: recipe.name,
        power: finalPower,
        rarity: rarity,
        rarityName: rarityJp[rarity],
        value: Math.floor(finalPower * 1.5)
    };
    state.inventory.push(weapon);
    state.stats.totalCrafted++;
    addLog(`「${weapon.rarityName}の${weapon.name}」を鍛え上げました！（威力: ${weapon.power}）`);
    renderInventory();
    updateUI();
    saveGame();
}

// インベントリロジック
function renderInventory() {
    elements.inventoryGrid.innerHTML = '';
    state.inventory.slice().reverse().forEach(weapon => {
        const card = document.createElement('div');
        card.className = `weapon-card ${weapon.rarity}`;
        card.innerHTML = `
            <div class="weapon-name">${weapon.name}</div>
            <div class="weapon-power">威力: ${weapon.power}</div>
            <div class="weapon-rarity" style="font-size: 0.7rem; color: var(--rarity-${weapon.rarity})">${weapon.rarityName}</div>
            <button class="sell-btn">売却 (${weapon.value} G)</button>
        `;
        card.querySelector('.sell-btn').addEventListener('click', () => sellWeapon(weapon.id));
        elements.inventoryGrid.appendChild(card);
    });
}

function sellWeapon(id) {
    const index = state.inventory.findIndex(w => w.id === id);
    if (index !== -1) {
        audio.sell();
        const weapon = state.inventory[index];
        state.resources.gold += weapon.value;
        state.inventory.splice(index, 1);
        addLog(`「${weapon.name}」を売却して ${weapon.value} G 獲得しました。`);
        renderInventory();
        updateUI();
        saveGame();
    }
}

// 雇用ロジック
function getEmployeeCost(id) {
    const up = employeeData.find(u => u.id === id);
    const level = state.employees[id] || 0;
    // 技術研修はLv1から始まるので調整
    const effectiveLevel = up.type === 'click' ? level - 1 : level;
    return up.baseCost * Math.pow(up.factor, effectiveLevel);
}

function renderEmployees() {
    elements.employeeList.innerHTML = '';
    employeeData.forEach(up => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        const level = state.employees[up.id] || 0;
        card.innerHTML = `
            <div class="upgrade-info">
                <h3>${up.name} (${level}人/回)</h3>
                <p class="upgrade-desc">${up.desc}</p>
            </div>
            <button class="buy-btn" data-upgrade="${up.id}">雇用・研修</button>
        `;
        card.querySelector('.buy-btn').addEventListener('click', () => buyEmployee(up.id));
        elements.employeeList.appendChild(card);
    });
}

function buyEmployee(id) {
    const cost = getEmployeeCost(id);
    if (state.resources.gold >= cost) {
        audio.buy();
        state.resources.gold -= cost;
        state.employees[id] = (state.employees[id] || 0) + 1;
        addLog(`${employeeData.find(u => u.id === id).name}を${id === 'training' ? '強化' : '雇用'}しました。`);
        renderEmployees();
        updateUI();
        saveGame();
    }
}

// 自動生成
function autoResourceGen() {
    let changed = false;
    if (state.employees && state.employees.miner > 0) {
        state.resources.iron += state.employees.miner;
        changed = true;
    }
    if (state.employees && state.employees.lumberjack > 0) {
        state.resources.wood += state.employees.lumberjack;
        changed = true;
    }
    if (state.employees && state.employees.manaSearcher > 0) {
        // 5秒ごとに実行するためのカウンター管理（stateに保存しない簡易版）
        if (!window._manaCounter) window._manaCounter = 0;
        window._manaCounter++;
        if (window._manaCounter >= 5) {
            state.resources.mana += state.employees.manaSearcher;
            window._manaCounter = 0;
            changed = true;
        }
    }
    if (changed) updateUI();
}

// 保存
function saveGame() {
    localStorage.setItem('arcaneForgeSave_Clicker_v2', JSON.stringify(state));
}

function loadGame() {
    const saved = localStorage.getItem('arcaneForgeSave_Clicker_v2');
    if (saved) {
        const loadedState = JSON.parse(saved);
        // 新しい構造（employeesなど）が不足している場合の補完
        state = {
            ...state,
            ...loadedState,
            resources: { ...state.resources, ...loadedState.resources },
            employees: { ...state.employees, ...loadedState.employees },
            inventory: loadedState.inventory || [],
            stats: { ...state.stats, ...loadedState.stats }
        };
        state.isCrafting = false;
    }
}

init();
