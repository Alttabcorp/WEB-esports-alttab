/**
 * Dados de habilidades fixos para testes - Aatrox
 * Usado quando os dados do Data Dragon estão incompletos
 */

window.CHAMPION_ABILITIES_FALLBACK = {
    'Aatrox': {
        spells: [
            {
                id: 'AatroxQ',
                name: 'A Espada Darkin',
                description: 'Aatrox bate sua espada no chão, causando Dano Físico. Ele pode bater até três vezes, cada vez em uma área de ação diferente.',
                baseDamage: [10, 30, 50, 70, 90],
                adRatio: 0.6,
                cooldown: [14, 12, 10, 8, 6],
                cost: [0, 0, 0, 0, 0],
                maxrank: 5
            },
            {
                id: 'AatroxW',
                name: 'Correntes Infernais',
                description: 'Aatrox arremessa uma corrente, causando Lentidão e Dano Físico ao primeiro inimigo atingido.',
                baseDamage: [25, 45, 65, 85, 105],
                adRatio: 0.8,
                cooldown: [20, 18, 16, 14, 12],
                cost: [0, 0, 0, 0, 0],
                maxrank: 5
            },
            {
                id: 'AatroxE',
                name: 'Avanço Umbral',
                description: 'Passivamente, Aatrox se cura quando causa dano a Campeões inimigos. Quando ativado, ele avança em uma direção.',
                baseDamage: [0, 0, 0, 0, 0],
                healingPercent: [20, 22, 24, 26, 28],
                cooldown: [9, 8, 7, 6, 5],
                cost: [0, 0, 0, 0, 0],
                maxrank: 5
            },
            {
                id: 'AatroxR',
                name: 'Aniquilador de Mundos',
                description: 'Aatrox libera sua forma demoníaca, aterrorizando tropas inimigas próximas, ganhando Dano de Ataque, cura aumentada e Velocidade de Movimento.',
                adBonus: [20, 30, 40],
                cooldown: [120, 100, 80],
                cost: [0, 0, 0],
                maxrank: 3
            }
        ],
        passive: {
            name: 'Postura do Arauto da Morte',
            description: 'Periodicamente, o próximo ataque básico de Aatrox causa Dano Mágico adicional e o cura com base na Vida máxima do alvo.'
        }
    }
};

// Função para aplicar dados de fallback quando necessário
window.applyAbilitiesFallback = function(spell, spellIndex, championKey) {
    const fallbackData = window.CHAMPION_ABILITIES_FALLBACK[championKey];
    if (!fallbackData || !fallbackData.spells[spellIndex]) {
        return spell;
    }
    
    const fallbackSpell = fallbackData.spells[spellIndex];
    
    // Aplicar dados de dano base se não existirem
    if (!spell.effect || !spell.effect[1] || spell.effect[1].every(val => val === 0)) {
        spell.effect = spell.effect || [];
        spell.effect[1] = fallbackSpell.baseDamage;
    }
    
    // Aplicar dados de escalas se não existirem
    if (!spell.vars || spell.vars.length === 0) {
        spell.vars = [];
        if (fallbackSpell.adRatio) {
            spell.vars.push({
                key: 'a1',
                link: 'attackdamage',
                coeff: [fallbackSpell.adRatio]
            });
        }
        if (fallbackSpell.apRatio) {
            spell.vars.push({
                key: 'a2',
                link: 'spelldamage',
                coeff: [fallbackSpell.apRatio]
            });
        }
    }
    
    return spell;
};