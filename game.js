// Game State
let state = {
    resources: {
        gold: 10,
        iron: 0,
        wood: 0,
        mana: 0
    },
    inventory: [],
    isCrafting: false,
    stats: {
        totalCrafted: 0
    }
};

const recipes = [
    { id: 'iron-dagger', name: 'Iron Dagger', reqs: { iron: 5, wood: 2 }, time: 3000, basePower: 10, rarity: 'common' },
    { id: 'longsword', name: 'Longsword', reqs: { iron: 15, wood: 5 }, time: 8000, basePower: 25, rarity: 'common' },
    { id: 'battle-axe', name: 'Battle Axe', reqs: { iron: 20, wood: 10 }, time: 12000, basePower: 40, rarity: 'rare' },
    { id: 'mana-staff', name: 'Mana Staff', reqs: { wood: 15, mana: 5 }, time: 15000, basePower: 35, rarity: 'rare' },
    { id: 'excalibur', name: 'Excalibur', reqs: { iron: 50, mana: 20, gold: 100 }, time: 30000, basePower: 100, rarity: 'legendary' }
];

// DOM Elements
const elements = {
    gold: document.getElementById('gold-count'),
    iron: document.getElementById('iron-count'),
    wood: document.getElementById('wood-count'),
    mana: document.getElementById('mana-count'),
    recipeList: document.getElementById('recipe-list'),
    inventoryGrid: document.getElementById('inventory-grid'),
    log: document.getElementById('log'),
    craftingStatus: document.getElementById('crafting-status'),
    craftingMsg: document.getElementById('crafting-msg'),
    progressBar: document.getElementById('crafting-progress-inner')
};

// Initialize
function init() {
    loadGame();
    setupTabs();
    setupGathering();
    renderRecipes();
    renderInventory();
    updateUI();
    addLog("Forge initialized. Materials are waiting.");
}

// Tab Management
function setupTabs() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Update buttons
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Resource Gathering
function setupGathering() {
    document.getElementById('mine-iron').addEventListener('click', () => collect('iron', 1, "Mined 1 Iron."));
    document.getElementById('chop-wood').addEventListener('click', () => collect('wood', 1, "Chopped 1 Wood."));
    document.getElementById('search-mana').addEventListener('click', () => collect('mana', 1, "Found 1 Mana Crystal."));
}

function collect(resource, amount, msg) {
    state.resources[resource] += amount;
    
    // Pulse animation
    const el = elements[resource];
    el.classList.remove('pulse');
    void el.offsetWidth; // trigger reflow
    el.classList.add('pulse');

    updateUI();
    addLog(msg);
    saveGame();
}

// UI Updates
function updateUI() {
    elements.gold.innerText = state.resources.gold;
    elements.iron.innerText = state.resources.iron;
    elements.wood.innerText = state.resources.wood;
    elements.mana.innerText = state.resources.mana;
    
    // Update craft button states
    document.querySelectorAll('.craft-btn').forEach(btn => {
        const recipeId = btn.getAttribute('data-recipe');
        const recipe = recipes.find(r => r.id === recipeId);
        btn.disabled = !canCraft(recipe) || state.isCrafting;
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

// Crafting Logic
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
            .map(([res, amt]) => `${amt} ${res.charAt(0).toUpperCase() + res.slice(1)}`)
            .join(', ');
            
        card.innerHTML = `
            <div class="recipe-info">
                <h3>${recipe.name}</h3>
                <p class="recipe-reqs">Requires: ${reqsText}</p>
            </div>
            <button class="craft-btn" data-recipe="${recipe.id}">Forge</button>
        `;
        
        card.querySelector('.craft-btn').addEventListener('click', () => startCrafting(recipe));
        elements.recipeList.appendChild(card);
    });
}

function startCrafting(recipe) {
    if (state.isCrafting || !canCraft(recipe)) return;
    
    // Consume resources
    for (const [res, amt] of Object.entries(recipe.reqs)) {
        state.resources[res] -= amt;
    }
    
    state.isCrafting = true;
    updateUI();
    
    elements.craftingStatus.classList.remove('hidden');
    elements.craftingMsg.innerText = `Forging ${recipe.name}...`;
    
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
    state.isCrafting = false;
    elements.craftingStatus.classList.add('hidden');
    elements.progressBar.style.width = '0%';
    
    // Randomize stats
    const variance = Math.floor(Math.random() * 11) - 5; // -5 to +5
    const finalPower = recipe.basePower + variance;
    
    // Determine Rarity
    let rarity = recipe.rarity;
    const roll = Math.random();
    if (roll > 0.95) rarity = 'legendary';
    else if (roll > 0.85) rarity = 'epic';
    else if (roll > 0.70 && rarity === 'common') rarity = 'rare';

    const weapon = {
        id: Date.now(),
        name: recipe.name,
        power: finalPower,
        rarity: rarity,
        value: Math.floor(finalPower * 1.5)
    };
    
    state.inventory.push(weapon);
    state.stats.totalCrafted++;
    
    addLog(`Successfully forged ${weapon.rarity.toUpperCase()} ${weapon.name}! (Power: ${weapon.power})`);
    renderInventory();
    updateUI();
    saveGame();
}

// Inventory Logic
function renderInventory() {
    elements.inventoryGrid.innerHTML = '';
    state.inventory.slice().reverse().forEach(weapon => {
        const card = document.createElement('div');
        card.className = `weapon-card ${weapon.rarity}`;
        card.innerHTML = `
            <div class="weapon-name">${weapon.name}</div>
            <div class="weapon-power">Power: ${weapon.power}</div>
            <div class="weapon-rarity" style="font-size: 0.7rem; color: var(--rarity-${weapon.rarity})">${weapon.rarity.toUpperCase()}</div>
            <button class="sell-btn" style="margin-top: 5px; font-size: 0.7rem; cursor: pointer;">Sell (${weapon.value}g)</button>
        `;
        
        card.querySelector('.sell-btn').addEventListener('click', () => sellWeapon(weapon.id));
        elements.inventoryGrid.appendChild(card);
    });
}

function sellWeapon(id) {
    const index = state.inventory.findIndex(w => w.id === id);
    if (index !== -1) {
        const weapon = state.inventory[index];
        state.resources.gold += weapon.value;
        state.inventory.splice(index, 1);
        addLog(`Sold ${weapon.name} for ${weapon.value} Gold.`);
        renderInventory();
        updateUI();
        saveGame();
    }
}

// Persistence
function saveGame() {
    localStorage.setItem('arcaneForgeSave', JSON.stringify(state));
}

function loadGame() {
    const saved = localStorage.getItem('arcaneForgeSave');
    if (saved) {
        state = JSON.parse(saved);
        // Reset crafting state on load just in case
        state.isCrafting = false;
    }
}

init();
