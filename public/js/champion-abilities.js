/**
 * Sistema para carregar e exibir habilidades de campeões
 * Usa Data Dragon oficial e calcula danos baseado na documentação Riot API
 */

class ChampionAbilitiesManager {
    constructor() {
        this.championFullData = new Map();
        this.baseUrl = 'https://ddragon.leagueoflegends.com/cdn';
        this.currentVersion = '15.19.1';
        this.locale = 'pt_BR';
    }

    /**
     * Carrega dados completos de um campeão específico
     */
    async loadChampionFullData(championKey) {
        if (this.championFullData.has(championKey)) {
            return this.championFullData.get(championKey);
        }

        try {
            const url = `${this.baseUrl}/${this.currentVersion}/data/${this.locale}/champion/${championKey}.json`;
            const response = await fetch(url);
            const data = await response.json();
            
            const championData = data.data[championKey];
            this.championFullData.set(championKey, championData);
            
            return championData;
        } catch (error) {
            console.error(`Erro ao carregar dados completos de ${championKey}:`, error);
            return null;
        }
    }

    /**
     * Calcula dano de habilidade baseado no nível e stats do campeão
     */
    calculateSpellDamage(spell, spellLevel, championStats) {
        const damage = {
            base: 0,
            scaling: [],
            total: 0
        };

        // Tentar extrair dano base dos arrays effect
        if (spell.effect && spell.effect[1] && spell.effect[1][spellLevel - 1] !== undefined && spell.effect[1][spellLevel - 1] > 0) {
            damage.base = spell.effect[1][spellLevel - 1];
        } else {
            // Fallback: extrair do tooltip se disponível
            damage.base = this.extractDamageFromTooltip(spell, spellLevel);
        }

        // Calcular escalas (AP, AD, etc.)
        if (spell.vars && spell.vars.length > 0) {
            spell.vars.forEach(variable => {
                const coeff = variable.coeff[0] || 0;
                let statValue = 0;
                
                switch (variable.link) {
                    case 'spelldamage':
                        statValue = championStats.abilitypower || 0;
                        damage.scaling.push({
                            type: 'AP',
                            ratio: coeff,
                            value: statValue * coeff,
                            display: `(+${(coeff * 100).toFixed(0)}% PA)`
                        });
                        break;
                    case 'attackdamage':
                        statValue = championStats.attackdamage || 0;
                        damage.scaling.push({
                            type: 'AD',
                            ratio: coeff,
                            value: statValue * coeff,
                            display: `(+${(coeff * 100).toFixed(0)}% AD)`
                        });
                        break;
                    case 'bonusattackdamage':
                        // AD bônus (AD total - AD base)
                        const baseAD = championStats.attackdamagebase || 0;
                        const totalAD = championStats.attackdamage || 0;
                        statValue = Math.max(0, totalAD - baseAD);
                        damage.scaling.push({
                            type: 'Bonus AD',
                            ratio: coeff,
                            value: statValue * coeff,
                            display: `(+${(coeff * 100).toFixed(0)}% AD bônus)`
                        });
                        break;
                    case 'health':
                        statValue = championStats.hp || 0;
                        damage.scaling.push({
                            type: 'HP',
                            ratio: coeff,
                            value: statValue * coeff,
                            display: `(+${(coeff * 100).toFixed(1)}% Vida)`
                        });
                        break;
                }
            });
        } else {
            // Fallback: tentar extrair escalas do tooltip
            this.extractScalingFromTooltip(spell, championStats, damage);
        }

        // Calcular dano total
        damage.total = damage.base + damage.scaling.reduce((sum, scale) => sum + scale.value, 0);

        return damage;
    }

    /**
     * Extrai valores de dano do tooltip quando dados estruturados não estão disponíveis
     */
    extractDamageFromTooltip(spell, spellLevel) {
        const tooltip = spell.tooltip || spell.description || '';
        
        // Padrões comuns para dano físico/mágico
        const damagePatterns = [
            /(?:physicalDamage|magicDamage).*?(\d+(?:\/\d+)*)/i,
            /(\d+(?:\/\d+)+).*?(?:dano|damage)/i,
            /{{ ?[\w\d]+ ?}}.*?(\d+(?:\/\d+)*)/i
        ];
        
        for (const pattern of damagePatterns) {
            const match = tooltip.match(pattern);
            if (match && match[1]) {
                const values = match[1].split('/').map(v => parseInt(v)).filter(v => !isNaN(v));
                if (values.length >= spellLevel) {
                    return values[spellLevel - 1];
                }
            }
        }
        
        return 0;
    }

    /**
     * Extrai informações de escala do tooltip
     */
    extractScalingFromTooltip(spell, championStats, damage) {
        const tooltip = spell.tooltip || spell.description || '';
        
        // Padrões para escalas de AD
        const adPattern = /(\d+(?:\.\d+)?).*?(?:%|percent).*?(?:AD|Attack Damage|Dano de Ataque)/i;
        const adMatch = tooltip.match(adPattern);
        if (adMatch) {
            const ratio = parseFloat(adMatch[1]) / 100;
            const statValue = championStats.attackdamage || 0;
            damage.scaling.push({
                type: 'AD',
                ratio: ratio,
                value: statValue * ratio,
                display: `(+${(ratio * 100).toFixed(0)}% AD)`
            });
        }
        
        // Padrões para escalas de AP
        const apPattern = /(\d+(?:\.\d+)?).*?(?:%|percent).*?(?:AP|Ability Power|Poder de Habilidade)/i;
        const apMatch = tooltip.match(apPattern);
        if (apMatch) {
            const ratio = parseFloat(apMatch[1]) / 100;
            const statValue = championStats.abilitypower || 0;
            damage.scaling.push({
                type: 'AP',
                ratio: ratio,
                value: statValue * ratio,
                display: `(+${(ratio * 100).toFixed(0)}% PA)`
            });
        }
    }

    /**
     * Formata tooltip de habilidade substituindo placeholders
     */
    formatSpellTooltip(spell, spellLevel, championStats) {
        let tooltip = spell.tooltip || spell.description || '';
        
        // Substituir placeholders {{ eN }}
        if (spell.effectBurn) {
            spell.effectBurn.forEach((value, index) => {
                if (value && index > 0) {
                    const placeholder = new RegExp(`{{ e${index} }}`, 'gi');
                    tooltip = tooltip.replace(placeholder, value);
                }
            });
        }

        // Substituir placeholders {{ aN }} e {{ fN }}
        if (spell.vars) {
            spell.vars.forEach(variable => {
                const placeholder = new RegExp(`{{ ${variable.key} }}`, 'gi');
                const coeff = variable.coeff[0] || 0;
                
                // Formatar como porcentagem ou valor absoluto
                let displayValue = coeff;
                if (variable.link === 'spelldamage' || variable.link === 'attackdamage') {
                    displayValue = (coeff * 100).toFixed(0) + '%';
                }
                
                tooltip = tooltip.replace(placeholder, displayValue);
            });
        }

        return tooltip;
    }

    /**
     * Renderiza habilidades de um campeão
     */
    async renderChampionAbilities(championKey, championStats, containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.warn('Container de habilidades não encontrado:', containerSelector);
            return;
        }

        console.log('Carregando habilidades para:', championKey);
        container.innerHTML = '<div class="champion-abilities-loading"><i class="fas fa-spinner fa-spin"></i> Carregando habilidades...</div>';

        const championData = await this.loadChampionFullData(championKey);
        if (!championData) {
            container.innerHTML = '<div class="abilities-error">Não foi possível carregar habilidades</div>';
            return;
        }

        console.log('Dados do campeão carregados:', championData.name);
        console.log('Stats recebidos:', championStats);

        // Sempre mostrar pelo menos as habilidades básicas
        const abilitiesHTML = this.buildAbilitiesHTML(championData, championStats);
        container.innerHTML = abilitiesHTML;
        
        // Adicionar event listeners para mudança de nível
        this.setupAbilityLevelControls(container, championData, championStats);
        
        console.log('Habilidades renderizadas com sucesso');
    }

    /**
     * Constrói HTML das habilidades
     */
    buildAbilitiesHTML(championData, championStats) {
        let html = '<div class="champion-abilities">';
        
        // Passiva
        if (championData.passive) {
            html += this.buildPassiveHTML(championData.passive);
        }

        // Habilidades Q, W, E, R
        if (championData.spells) {
            html += '<div class="champion-spells">';
            championData.spells.forEach((spell, index) => {
                const spellKey = ['Q', 'W', 'E', 'R'][index];
                
                // Aplicar dados de fallback se necessário
                if (window.applyAbilitiesFallback) {
                    spell = window.applyAbilitiesFallback(spell, index, championData.id);
                }
                
                html += this.buildSpellHTML(spell, spellKey, 1, championStats);
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Constrói HTML da passiva
     */
    buildPassiveHTML(passive) {
        const imageUrl = `${this.baseUrl}/${this.currentVersion}/img/passive/${passive.image.full}`;
        
        return `
            <div class="ability-passive">
                <div class="ability-header">
                    <div class="ability-icon">
                        <img src="${imageUrl}" alt="${passive.name}" loading="lazy">
                        <span class="ability-key">P</span>
                    </div>
                    <div class="ability-info">
                        <h4 class="ability-name">${passive.name}</h4>
                        <p class="ability-description">${passive.description}</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Constrói HTML de uma habilidade
     */
    buildSpellHTML(spell, spellKey, currentLevel, championStats) {
        const imageUrl = `${this.baseUrl}/${this.currentVersion}/img/spell/${spell.image.full}`;
        const damage = this.calculateSpellDamage(spell, currentLevel, championStats);
        
        // Usar descrição simples se tooltip não estiver disponível
        const description = spell.tooltip || spell.description || 'Habilidade disponível';
        
        // Cooldown e custo
        const cooldown = spell.cooldownBurn || (spell.cooldown ? spell.cooldown.join('/') : 'N/A');
        const cost = spell.costBurn || (spell.cost ? spell.cost.join('/') : '0');
        const costType = spell.costType || spell.resource || 'Mana';
        
        // Obter alcance se disponível
        const range = spell.rangeBurn || (spell.range ? spell.range[0] : '');
        
        return `
            <div class="ability-spell" data-spell="${spellKey.toLowerCase()}">
                <div class="ability-header">
                    <div class="ability-icon">
                        <img src="${imageUrl}" alt="${spell.name}" loading="lazy" onerror="this.src='public/images/logo-alttab.png';">
                        <span class="ability-key">${spellKey}</span>
                    </div>
                    <div class="ability-info">
                        <div class="ability-title">
                            <h4 class="ability-name">${spell.name}</h4>
                            <div class="ability-level-selector">
                                ${spell.maxrank ? 
                                    Array.from({length: spell.maxrank}, (_, i) => i + 1).map(level => 
                                        `<button class="level-btn ${level === currentLevel ? 'active' : ''}" data-level="${level}">${level}</button>`
                                    ).join('')
                                    : 
                                    [1,2,3,4,5].map(level => 
                                        `<button class="level-btn ${level === currentLevel ? 'active' : ''}" data-level="${level}">${level}</button>`
                                    ).join('')
                                }
                            </div>
                        </div>
                        <div class="ability-stats">
                            ${cooldown !== 'N/A' ? `<span class="ability-cooldown"><i class="fas fa-clock"></i> ${cooldown}s</span>` : ''}
                            ${cost !== '0' ? `<span class="ability-cost"><i class="fas fa-tint"></i> ${cost} ${costType}</span>` : `<span class="ability-cost"><i class="fas fa-tint"></i> ${costType}</span>`}
                            ${range && range !== '25000' && range !== '' ? `<span class="ability-range"><i class="fas fa-crosshairs"></i> ${range}</span>` : ''}
                            ${damage.total > 0 ? `<span class="ability-damage"><i class="fas fa-sword"></i> ${Math.round(damage.total)}</span>` : ''}
                        </div>
                        <p class="ability-description">${description}</p>
                        ${damage.scaling.length > 0 ? `
                            <div class="ability-scaling">
                                <span class="scaling-label">Escalas:</span>
                                ${damage.scaling.map(scale => `<span class="scaling-item">${scale.display}</span>`).join(' ')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Configura controles de nível das habilidades
     */
    setupAbilityLevelControls(container, championData, championStats) {
        const levelButtons = container.querySelectorAll('.level-btn');
        
        levelButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const level = parseInt(e.target.dataset.level);
                const spellElement = e.target.closest('.ability-spell');
                const spellKey = spellElement.dataset.spell;
                
                // Atualizar botões ativos
                const siblings = spellElement.querySelectorAll('.level-btn');
                siblings.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                // Encontrar spell data
                const spellIndex = ['q', 'w', 'e', 'r'].indexOf(spellKey);
                if (spellIndex >= 0 && championData.spells[spellIndex]) {
                    const spell = championData.spells[spellIndex];
                    
                    // Recalcular e atualizar
                    const damage = this.calculateSpellDamage(spell, level, championStats);
                    const damageElement = spellElement.querySelector('.ability-damage');
                    if (damageElement && damage.total > 0) {
                        damageElement.innerHTML = `<i class="fas fa-sword"></i> ${Math.round(damage.total)}`;
                    }
                    
                    // Atualizar tooltip
                    const tooltip = this.formatSpellTooltip(spell, level, championStats);
                    const descElement = spellElement.querySelector('.ability-description');
                    if (descElement) {
                        descElement.textContent = tooltip;
                    }
                }
            });
        });
    }
}

// Instância global
window.championAbilitiesManager = new ChampionAbilitiesManager();