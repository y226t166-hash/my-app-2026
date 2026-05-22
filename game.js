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
    shopShelf: [], // 陳列棚の商品
    shopName: "神秘の鍛冶場",
    isCrafting: false,
    currentQuestIndex: 0,
    questCompleted: false,
    stats: {
        totalCrafted: 0
    }
};

const shopManager = {
    renderShelf() {
        const shelf = document.getElementById('shop-shelf');
        if (!shelf) return;
        shelf.innerHTML = '';
        
        if (state.shopShelf.length === 0) {
            shelf.innerHTML = '<p class="empty-msg">棚には何も並んでいません。倉庫から商品を並べましょう。</p>';
            return;
        }

        state.shopShelf.forEach(item => {
            const card = document.createElement('div');
            card.className = `weapon-card ${item.rarity}`;
            const typeEmoji = item.type === 'weapon' ? '⚔️' : item.type === 'shield' ? '🛡️' : '🛡️';
            const powerLabel = item.type === 'weapon' ? '攻撃' : '防御';
            
            // 店頭価格は倉庫での即時売却より高い (威力 * 2.5)
            const shelfValue = Math.floor(item.power * 2.5);
            
            card.innerHTML = `
                <div class="weapon-name">${typeEmoji} ${item.name}</div>
                <div class="weapon-power">${powerLabel}: ${item.power}</div>
                <div class="weapon-rarity" style="font-size: 0.7rem; color: var(--rarity-${item.rarity})">${item.rarityName}</div>
                <div class="shelf-price" style="margin-top:5px; font-weight:bold; color: gold;">${shelfValue} G</div>
                <button class="return-to-wh-btn">倉庫へ戻す</button>
            `;
            card.querySelector('.return-to-wh-btn').addEventListener('click', () => this.returnToWarehouse(item.id));
            shelf.appendChild(card);
        });
    },

    listOnShelf(id) {
        if (state.shopShelf.length >= 8) {
            addLog("陳列棚がいっぱいです。");
            return;
        }
        const index = state.inventory.findIndex(item => item.id === id);
        if (index !== -1) {
            const item = state.inventory.splice(index, 1)[0];
            state.shopShelf.push(item);
            addLog(`「${item.name}」を棚に並べました。`);
            renderInventory();
            this.renderShelf();
            saveGame();
        }
    },

    returnToWarehouse(id) {
        const index = state.shopShelf.findIndex(item => item.id === id);
        if (index !== -1) {
            const item = state.shopShelf.splice(index, 1)[0];
            state.inventory.push(item);
            this.renderShelf();
            renderInventory();
            saveGame();
        }
    },

    customerLoop() {
        if (state.shopShelf.length > 0) {
            // 来客チャンス (20%の確率で売れる)
            if (Math.random() > 0.8) {
                this.sellRandomItem();
            }
        }
    },

    sellRandomItem() {
        const randomIndex = Math.floor(Math.random() * state.shopShelf.length);
        const item = state.shopShelf.splice(randomIndex, 1)[0];
        const value = Math.floor(item.power * 2.5);
        state.resources.gold += value;
        
        const customers = ["旅の戦士", "新人冒険者", "街の守備兵", "腕利きの傭兵", "宮廷魔術師", "流浪の騎士"];
        const customer = customers[Math.floor(Math.random() * customers.length)];
        
        const logMsg = `${customer}が「${item.name}」を ${value} G で購入していきました。`;
        this.addShopLog(logMsg);
        addLog(logMsg);
        
        this.renderShelf();
        updateUI();
        saveGame();
    },

    addShopLog(msg) {
        const logEl = document.getElementById('shop-log');
        if (!logEl) return;
        const p = document.createElement('p');
        p.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logEl.prepend(p);
        if (logEl.childNodes.length > 20) logEl.removeChild(logEl.lastChild);
    },

    setupNameEditing() {
        const display = document.getElementById('shop-name-display');
        const input = document.getElementById('shop-name-input');
        const btn = document.getElementById('edit-shop-name');
        
        if (!display || !input || !btn) return;
        
        btn.addEventListener('click', () => {
            if (input.classList.contains('hidden')) {
                input.value = state.shopName;
                input.classList.remove('hidden');
                display.classList.add('hidden');
                btn.innerText = "保存";
            } else {
                state.shopName = input.value || "神秘の鍛冶場";
                display.innerText = state.shopName;
                input.classList.add('hidden');
                display.classList.remove('hidden');
                btn.innerText = "店名変更";
                saveGame();
            }
        });
        
        display.innerText = state.shopName;
    }
};

// ... (rest of the code)

const quests = [
    {
        id: 'start',
        title: '新米鍛冶屋の初仕事',
        client: '村の自警団',
        desc: 'まずは基本の武器「鉄の短剣」を3本用意してくれ。自警団の新人に配るんだ。',
        reqs: [{ type: 'iron-dagger', count: 3 }],
        reward: 50,
        rank: '見習い鍛冶屋'
    },
    {
        id: 'guard-upgrade',
        title: '守りを固めよ',
        client: '守備隊長',
        desc: '最近魔物が増えてきた。新調した「鉄の盾」を5枚、大至急届けてほしい。',
        reqs: [{ type: 'iron-shield', count: 5 }],
        reward: 150,
        rank: '街の鍛冶屋'
    },
    {
        id: 'adventurer-set',
        title: '冒険者への支援',
        client: '冒険者ギルド',
        desc: '期待の新鋭パーティに「ロングソード」2本と「鉄の鎧」2領を提供してくれ。',
        reqs: [
            { type: 'longsword', count: 2 },
            { type: 'iron-armor', count: 2 }
        ],
        reward: 400,
        rank: '熟練の鍛冶師'
    },
    {
        id: 'magic-order',
        title: '魔法学園の依頼',
        client: '学園長',
        desc: '魔力を持つ生徒たちのために「魔力の杖」3本と「銀の胸当て」2領を頼む。',
        reqs: [
            { type: 'mana-staff', count: 3 },
            { type: 'silver-armor', count: 2 }
        ],
        reward: 1200,
        rank: '宮廷鍛冶師'
    },
    {
        id: 'hero-request',
        title: '【最終依頼】伝説をその手に',
        client: '王国騎士団',
        desc: '魔王軍との最終決戦が始まる。伝説の武具「エクスカリバー」と「イージスの盾」を鍛え上げ、勝利を掴み取れ！',
        reqs: [
            { type: 'excalibur', count: 1 },
            { type: 'aegis', count: 1 }
        ],
        reward: 5000,
        rank: '伝説の鍛冶聖'
    }
];

const recipes = [
// ... (rest of the file follows)
    { id: 'iron-dagger', name: '鉄の短剣', type: 'weapon', reqs: { iron: 5, wood: 2 }, time: 3000, basePower: 10, rarity: 'common' },
    { id: 'longsword', name: 'ロングソード', type: 'weapon', reqs: { iron: 15, wood: 5 }, time: 8000, basePower: 25, rarity: 'common' },
    { id: 'iron-shield', name: '鉄の盾', type: 'shield', reqs: { iron: 12, wood: 3 }, time: 6000, basePower: 15, rarity: 'common' },
    { id: 'iron-armor', name: '鉄の鎧', type: 'armor', reqs: { iron: 25 }, time: 10000, basePower: 30, rarity: 'common' },
    { id: 'battle-axe', name: 'バトルアックス', type: 'weapon', reqs: { iron: 20, wood: 10 }, time: 12000, basePower: 40, rarity: 'rare' },
    { id: 'great-shield', name: '大盾', type: 'shield', reqs: { iron: 30, wood: 10 }, time: 15000, basePower: 45, rarity: 'rare' },
    { id: 'mana-staff', name: '魔力の杖', type: 'weapon', reqs: { wood: 15, mana: 5 }, time: 15000, basePower: 35, rarity: 'rare' },
    { id: 'silver-armor', name: '銀の胸当て', type: 'armor', reqs: { iron: 20, mana: 10, gold: 50 }, time: 18000, basePower: 60, rarity: 'rare' },
    { id: 'excalibur', name: 'エクスカリバー', type: 'weapon', reqs: { iron: 50, mana: 20, gold: 100 }, time: 30000, basePower: 100, rarity: 'legendary' },
    { id: 'aegis', name: 'イージスの盾', type: 'shield', reqs: { iron: 40, mana: 30, gold: 120 }, time: 30000, basePower: 90, rarity: 'legendary' }
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

const questManager = {
    render() {
        const container = document.getElementById('current-quest');
        if (!container) return;
        
        if (state.currentQuestIndex >= quests.length) {
            container.innerHTML = `
                <div class="quest-card">
                    <h3>🏆 全ての依頼を達成しました！</h3>
                    <p>あなたは伝説の鍛冶聖として語り継がれるでしょう。</p>
                </div>
            `;
            return;
        }

        const quest = quests[state.currentQuestIndex];
        const reqsHtml = quest.reqs.map(req => {
            const recipe = recipes.find(r => r.id === req.type);
            const currentCount = state.inventory.filter(item => item.name === recipe.name).length;
            const met = currentCount >= req.count;
            return `
                <div class="quest-req-item ${met ? 'met' : ''}">
                    <span>${recipe.name}</span>
                    <span>${currentCount} / ${req.count}</span>
                </div>
            `;
        }).join('');

        const canComplete = this.canComplete(quest);

        container.innerHTML = `
            <div class="quest-card">
                <h3>📜 ${quest.title}</h3>
                <p class="quest-desc"><strong>依頼主: ${quest.client}</strong><br>${quest.desc}</p>
                <div class="quest-requirements">
                    <p style="font-size: 0.8rem; margin-bottom: 10px; opacity: 0.8;">納品が必要なアイテム:</p>
                    ${reqsHtml}
                </div>
                <div class="quest-footer">
                    <span>報酬: <span style="color: gold;">💰 ${quest.reward} G</span></span>
                    <button class="complete-btn" ${canComplete ? '' : 'disabled'}>納品する</button>
                </div>
            </div>
        `;

        container.querySelector('.complete-btn')?.addEventListener('click', () => this.complete(quest));
        this.updateProgress();
    },

    canComplete(quest) {
        return quest.reqs.every(req => {
            const recipe = recipes.find(r => r.id === req.type);
            const currentCount = state.inventory.filter(item => item.name === recipe.name).length;
            return currentCount >= req.count;
        });
    },

    complete(quest) {
        if (!this.canComplete(quest)) return;

        audio.buy(); // 完了音
        quest.reqs.forEach(req => {
            const recipe = recipes.find(r => r.id === req.type);
            for (let i = 0; i < req.count; i++) {
                const index = state.inventory.findIndex(item => item.name === recipe.name);
                if (index !== -1) state.inventory.splice(index, 1);
            }
        });

        state.resources.gold += quest.reward;
        state.currentQuestIndex++;
        
        addLog(`依頼「${quest.title}」を達成し、${quest.reward} G を獲得しました。`);
        
        if (state.currentQuestIndex >= quests.length) {
            this.showVictory();
        }

        renderInventory();
        this.render();
        updateUI();
        saveGame();
    },

    updateProgress() {
        const progressEl = document.getElementById('quest-total-progress');
        const rankEl = document.getElementById('quest-rank-text');
        if (!progressEl || !rankEl) return;

        const progressPercent = (state.currentQuestIndex / quests.length) * 100;
        progressEl.style.width = progressPercent + '%';
        
        const currentRank = state.currentQuestIndex > 0 ? quests[state.currentQuestIndex - 1].rank : '新米鍛冶屋';
        rankEl.innerText = `現在の称号: ${currentRank}`;
    },

    showVictory() {
        const victory = document.createElement('div');
        victory.className = 'victory-screen';
        victory.innerHTML = `
            <div class="victory-content">
                <h2>全依頼達成！</h2>
                <p>あなたは王国一の鍛冶聖となり、世界に平和をもたらしました。<br>その伝説は永遠に語り継がれることでしょう。</p>
                <button class="restart-btn">鍛冶を続ける</button>
            </div>
        `;
        victory.querySelector('.restart-btn').addEventListener('click', () => {
            victory.remove();
        });
        document.body.appendChild(victory);
        audio.finish();
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
    questManager.render();
    shopManager.renderShelf();
    shopManager.setupNameEditing();
    updateUI();

    // BGMの切り替え
    document.getElementById('bgm-toggle').addEventListener('click', () => bgm.toggle());
    
    // 自動生成 & 来客ループ
    setInterval(() => {
        autoResourceGen();
        shopManager.customerLoop();
    }, 1000);
    
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
            
            if (tabId === 'quests') {
                questManager.render();
            }
            if (tabId === 'shop') {
                shopManager.renderShelf();
            }
            if (tabId === 'inventory') {
                renderInventory();
            }
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
    
    const invCount = document.getElementById('inventory-count');
    if (invCount) invCount.innerText = `在庫数: ${state.inventory.length}`;

    // 鍛造ボタンの状態更新
    document.querySelectorAll('.craft-btn').forEach(btn => {
        const recipeId = btn.getAttribute('data-recipe');
        const recipe = recipes.find(r => r.id === recipeId);
        const countInput = document.getElementById(`count-${recipeId}`);
        const count = parseInt(countInput?.value) || 1;
        btn.disabled = !canCraft(recipe, count) || state.isCrafting;
    });

    // 雇用ボタンの状態更新
    document.querySelectorAll('.buy-btn').forEach(btn => {
        const upId = btn.getAttribute('data-upgrade');
        const up = employeeData.find(u => u.id === upId);
        const cost = getEmployeeCost(upId);
        btn.innerText = `雇用・研修 (${Math.floor(cost)} G)`;
        btn.disabled = state.resources.gold < cost;
    });

    // クエスト/店先表示の更新
    if (document.getElementById('quests').classList.contains('active')) {
        questManager.render();
    }
    if (document.getElementById('shop').classList.contains('active')) {
        shopManager.renderShelf();
    }
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
function canCraft(recipe, count = 1) {
    for (const [res, amt] of Object.entries(recipe.reqs)) {
        if (state.resources[res] < amt * count) return false;
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
        
        const typeEmoji = recipe.type === 'weapon' ? '⚔️' : recipe.type === 'shield' ? '🛡️' : '🛡️';
        
        card.innerHTML = `
            <div class="recipe-info">
                <h3>${typeEmoji} ${recipe.name}</h3>
                <p class="recipe-reqs">必要: ${reqsText}</p>
            </div>
            <div class="craft-controls">
                <input type="number" class="craft-count" value="1" min="1" max="99" id="count-${recipe.id}">
                <button class="craft-btn" data-recipe="${recipe.id}">鍛造</button>
            </div>
        `;
        
        const countInput = card.querySelector(`#count-${recipe.id}`);
        const craftBtn = card.querySelector('.craft-btn');
        
        countInput.addEventListener('input', () => {
            const count = parseInt(countInput.value) || 1;
            craftBtn.disabled = !canCraft(recipe, count) || state.isCrafting;
        });

        craftBtn.addEventListener('click', () => {
            const count = parseInt(countInput.value) || 1;
            startCrafting(recipe, count);
        });
        
        elements.recipeList.appendChild(card);
    });
}

function startCrafting(recipe, count = 1) {
    if (state.isCrafting || !canCraft(recipe, count)) return;
    audio.craft();
    for (const [res, amt] of Object.entries(recipe.reqs)) {
        state.resources[res] -= amt * count;
    }
    state.isCrafting = true;
    updateUI();
    elements.craftingStatus.classList.remove('hidden');
    elements.craftingMsg.innerText = `${recipe.name} (${count}個) を鍛造中...`;
    let start = null;
    function animate(timestamp) {
        if (!start) start = timestamp;
        let progress = timestamp - start;
        // 複数個作る場合は時間が少し増えるが、1個あたりの時間は短縮される（ボーナス）
        const totalTime = recipe.time * (1 + (count - 1) * 0.2);
        let percent = Math.min((progress / totalTime) * 100, 100);
        elements.progressBar.style.width = percent + '%';
        if (progress < totalTime) {
            requestAnimationFrame(animate);
        } else {
            finishCrafting(recipe, count);
        }
    }
    requestAnimationFrame(animate);
}

function finishCrafting(recipe, count = 1) {
    audio.finish();
    state.isCrafting = false;
    elements.craftingStatus.classList.add('hidden');
    elements.progressBar.style.width = '0%';

    for (let i = 0; i < count; i++) {
        const variance = Math.floor(Math.random() * 11) - 5;
        const finalPower = recipe.basePower + variance;
        let rarity = recipe.rarity;
        const roll = Math.random();
        if (roll > 0.95) rarity = 'legendary';
        else if (roll > 0.85) rarity = 'epic';
        else if (roll > 0.70 && rarity === 'common') rarity = 'rare';

        const rarityJp = { common: '一般', rare: '希少', epic: '逸品', legendary: '伝説' };
        const item = {
            id: Date.now() + i,
            name: recipe.name,
            type: recipe.type,
            power: finalPower,
            rarity: rarity,
            rarityName: rarityJp[rarity],
            value: Math.floor(finalPower * 1.5)
        };
        state.inventory.push(item);
        state.stats.totalCrafted++;
    }
    
    addLog(`「${recipe.name}」を${count}個鍛え上げました！`);
    renderInventory();
    updateUI();
    saveGame();
}

// インベントリロジック
function renderInventory() {
    elements.inventoryGrid.innerHTML = '';
    state.inventory.slice().reverse().forEach(item => {
        const card = document.createElement('div');
        card.className = `weapon-card ${item.rarity}`;
        const typeEmoji = item.type === 'weapon' ? '⚔️' : item.type === 'shield' ? '🛡️' : '🛡️';
        const powerLabel = item.type === 'weapon' ? '攻撃' : '防御';
        
        card.innerHTML = `
            <div class="weapon-name">${typeEmoji} ${item.name}</div>
            <div class="weapon-power">${powerLabel}: ${item.power}</div>
            <div class="weapon-rarity" style="font-size: 0.7rem; color: var(--rarity-${item.rarity})">${item.rarityName}</div>
            <button class="list-on-shelf-btn">棚に並べる</button>
            <button class="sell-btn">即時売却 (${item.value} G)</button>
        `;
        card.querySelector('.list-on-shelf-btn').addEventListener('click', () => shopManager.listOnShelf(item.id));
        card.querySelector('.sell-btn').addEventListener('click', () => sellItem(item.id));
        elements.inventoryGrid.appendChild(card);
    });
}

function sellItem(id) {
    const index = state.inventory.findIndex(w => w.id === id);
    if (index !== -1) {
        audio.sell();
        const item = state.inventory[index];
        state.resources.gold += item.value;
        state.inventory.splice(index, 1);
        addLog(`「${item.name}」を売却して ${item.value} G 獲得しました。`);
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
// 保存/読込
function saveGame() {
    localStorage.setItem('arcaneForgeSave_Clicker_v2', JSON.stringify(state));
}

function loadGame() {
    const saved = localStorage.getItem('arcaneForgeSave_Clicker_v2');
    if (saved) {
        const loadedState = JSON.parse(saved);
        state = {
            ...state,
            ...loadedState,
            resources: { ...state.resources, ...loadedState.resources },
            employees: { ...state.employees, ...loadedState.employees },
            inventory: loadedState.inventory || [],
            shopShelf: loadedState.shopShelf || [],
            shopName: loadedState.shopName || "神秘の鍛冶場",
            stats: { ...state.stats, ...loadedState.stats }
        };
        state.isCrafting = false;
    }
}

init();
