// item-stats.js
// Funções utilitárias para agregar e exibir os status dos itens selecionados

// Lista de status relevantes para LoL (pode ser expandida conforme necessário)
const STAT_KEYS = [
  'FlatHPPoolMod',
  'FlatMPPoolMod',
  'FlatHPRegenMod',
  'FlatMPRegenMod',
  'FlatArmorMod',
  'FlatSpellBlockMod',
  'FlatPhysicalDamageMod',
  'FlatMagicDamageMod',
  'PercentAttackSpeedMod',
  'FlatCritChanceMod',
  'FlatMoveSpeedMod',
  'PercentLifeStealMod',
  'PercentSpellVampMod',
  'PercentHPPoolMod',
  'PercentMPPoolMod',
  'PercentArmorMod',
  'PercentSpellBlockMod',
  'PercentPhysicalDamageMod',
  'PercentMagicDamageMod',
  'PercentMoveSpeedMod',
  'PercentAttackSpeedMod',
  'PercentCooldownMod',
  'PercentCritChanceMod',
  'PercentEXPBonus',
  'PercentGoldBonus',
  'PercentMagicPenetrationMod',
  'PercentArmorPenetrationMod',
  'PercentHealAndShieldPowerMod',
  'PercentOmnivampMod',
  'PercentTenacityMod',
];

// Nomes amigáveis para exibição
const STAT_LABELS = {
  FlatHPPoolMod: 'Vida',
  FlatMPPoolMod: 'Mana',
  FlatHPRegenMod: 'Regen Vida',
  FlatMPRegenMod: 'Regen Mana',
  FlatArmorMod: 'Armadura',
  FlatSpellBlockMod: 'Resist. Mágica',
  FlatPhysicalDamageMod: 'AD',
  FlatMagicDamageMod: 'AP',
  PercentAttackSpeedMod: 'Vel. de Ataque (%)',
  FlatCritChanceMod: 'Crítico (%)',
  FlatMoveSpeedMod: 'Vel. de Movimento',
  PercentLifeStealMod: 'Roubo de Vida (%)',
  PercentSpellVampMod: 'Vamp. Mágico (%)',
  PercentCooldownMod: 'Redução de CD (%)',
  PercentHealAndShieldPowerMod: 'Poder de Cura/Escudo (%)',
  PercentOmnivampMod: 'Omnivamp (%)',
  PercentTenacityMod: 'Tenacidade (%)',
};

// Soma os status dos itens selecionados
export function aggregateItemStats(selectedItems) {
  const stats = {};
  for (const item of selectedItems) {
    if (!item.stats) continue;
    for (const [key, value] of Object.entries(item.stats)) {
      if (!STAT_KEYS.includes(key)) continue;
      stats[key] = (stats[key] || 0) + value;
    }
  }
  return stats;
}

// Gera HTML para exibir os status agregados
export function renderStatsTable(stats) {
  if (!stats || Object.keys(stats).length === 0) return '<div style="color:#888">Nenhum status agregado</div>';
  let html = '<table class="stats-table">';
  for (const key of STAT_KEYS) {
    if (stats[key]) {
      html += `<tr><td>${STAT_LABELS[key] || key}</td><td>${stats[key] > 0 ? '+' : ''}${stats[key]}${key.includes('Percent') || key.includes('Crit') ? '%' : ''}</td></tr>`;
    }
  }
  html += '</table>';
  return html;
}
