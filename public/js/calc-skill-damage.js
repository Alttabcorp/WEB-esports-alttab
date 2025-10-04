// Função utilitária para calcular o dano de uma skill já considerando os stats agregados dos itens
// Suporta apenas AD, AP, Penetração e multiplicadores básicos

/**
 * Calcula o dano de uma skill considerando os stats agregados
 * @param {object} spell - Objeto da skill (do Data Dragon)
 * @param {object} stats - Stats agregados dos itens
 * @param {number} level - Nível da skill (1-5)
 * @returns {string} Dano formatado
 */
export function calcSkillDamage(spell, stats, level = 1) {
  // Valor base do dano (effectBurn pode ser string tipo "50/80/110/140/170")
  let base = 0;
  if (spell.effectBurn && spell.effectBurn[1]) {
    const arr = spell.effectBurn[1].split('/').map(x => parseFloat(x.replace(/[^\d.\-]/g, '')));
    base = arr[level - 1] || arr[0] || 0;
  }
  // Procura escalas (vars) e aplica
  let scaling = 0;
  if (spell.vars && Array.isArray(spell.vars)) {
    for (const v of spell.vars) {
      // Exemplo: v.link === 'spelldamage' (AP), 'attackdamage', 'bonusattackdamage', etc
      let statValue = 0;
      if (v.link === 'spelldamage' && stats.FlatMagicDamageMod) statValue = stats.FlatMagicDamageMod;
      if (v.link === 'attackdamage' && stats.FlatPhysicalDamageMod) statValue = stats.FlatPhysicalDamageMod;
      if (v.link === 'bonusattackdamage' && stats.FlatPhysicalDamageMod) statValue = stats.FlatPhysicalDamageMod;
      if (v.link === 'bonusspellblock' && stats.FlatSpellBlockMod) statValue = stats.FlatSpellBlockMod;
      if (v.link === 'armor' && stats.FlatArmorMod) statValue = stats.FlatArmorMod;
      // Aplica coeficiente
      if (statValue && v.coeff) {
        scaling += (Array.isArray(v.coeff) ? v.coeff[0] : v.coeff) * statValue;
      }
    }
  }
  // Dano final
  const total = base + scaling;
  if (isNaN(total)) return '-';
  return `${Math.round(total)}${scaling ? ' (base+' + Math.round(scaling) + ')' : ''}`;
}
