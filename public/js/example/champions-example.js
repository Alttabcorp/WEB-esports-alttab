const API_BASE = 'https://ddragon.leagueoflegends.com/cdn';
const LANG = 'pt_BR';

async function getLatestVersion() {
  const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
  const versions = await res.json();
  return versions[0];
}

async function getChampions(version) {
  const url = `${API_BASE}/${version}/data/${LANG}/champion.json`;
  const res = await fetch(url);
  const data = await res.json();
  return Object.values(data.data);
}

async function getChampionDetails(version, champId) {
  const url = `${API_BASE}/${version}/data/${LANG}/champion/${champId}.json`;
  const res = await fetch(url);
  const data = await res.json();
  return data.data[champId];
}

function renderChampionList(champions, version) {
  const listEl = document.getElementById('champion-list');
  listEl.innerHTML = '';
  champions.forEach(champ => {
    const card = document.createElement('div');
    card.className = 'champion-card';
    card.innerHTML = `
      <img src="${API_BASE}/${version}/img/champion/${champ.image.full}" alt="${champ.name}">
      <div>${champ.name}</div>
    `;
    card.onclick = () => showChampionDetails(version, champ.id);
    listEl.appendChild(card);
  });
}

// Utilitário para substituir placeholders do tooltip/descrição
function parseSpellText(text, spell) {
  if (!text) return '';
  // Substitui {{ eN }} pelos valores de effectBurn
  text = text.replace(/\{\{\s*e(\d+)\s*\}\}/g, (match, n) => {
    const idx = parseInt(n, 10);
    return spell.effectBurn && spell.effectBurn[idx] ? spell.effectBurn[idx] : match;
  });
  // Substitui {{ aN }} e {{ fN }} pelos valores de vars
  text = text.replace(/\{\{\s*([af])(\d+)\s*\}\}/g, (match, type, n) => {
    if (!spell.vars) return match;
    const key = type + n;
    const found = spell.vars.find(v => v.key === key);
    if (found) {
      // Se for array, mostra todos os coeficientes
      return Array.isArray(found.coeff) ? found.coeff.join('/') : found.coeff;
    }
    return match;
  });
  // Substitui {{ cost }} pelo costBurn
  text = text.replace(/\{\{\s*cost\s*\}\}/g, spell.costBurn || '');
  // Substitui {{ cooldown }} pelo cooldownBurn
  text = text.replace(/\{\{\s*cooldown\s*\}\}/g, spell.cooldownBurn || '');
  return text;
}

async function showChampionDetails(version, champId) {
  const details = await getChampionDetails(version, champId);
  const detailsEl = document.getElementById('champion-details');
  detailsEl.style.display = 'block';
  // Splash Art principal (primeira skin)
  const splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${details.id}_0.jpg`;
  // Champion Square
  const squareUrl = `${API_BASE}/${version}/img/champion/${details.image.full}`;
  // Loading Screen (primeira skin)
  const loadingUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${details.id}_0.jpg`;
  // Passiva
  const passiveUrl = `${API_BASE}/${version}/img/passive/${details.passive.image.full}`;
  // Skins
  const skinsHtml = details.skins.map(skin => `
    <div style="display:inline-block;margin:8px;text-align:center;">
      <img src="https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${details.id}_${skin.num}.jpg" alt="${skin.name}" style="width:180px;height:100px;object-fit:cover;border-radius:6px;box-shadow:0 2px 8px #000;">
      <br>
      <img src="https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${details.id}_${skin.num}.jpg" alt="loading" style="width:60px;height:36px;object-fit:cover;border-radius:4px;margin-top:2px;">
      <div style="font-size:13px;margin-top:4px;">${skin.name === 'default' ? 'Padrão' : skin.name}</div>
    </div>
  `).join('');
  detailsEl.innerHTML = `
    <div style="text-align:center;">
      <img src="${splashUrl}" alt="Splash Art" style="width:100%;max-width:600px;border-radius:10px;box-shadow:0 4px 24px #000;">
    </div>
    <div style="display:flex;align-items:center;gap:16px;margin-top:12px;">
      <img src="${squareUrl}" alt="Square" style="width:64px;height:64px;border-radius:8px;border:2px solid #0596aa;background:#181c23;">
      <div>
        <h2 style="margin:0;">${details.name} <small style="font-size:16px;opacity:.7;">(${details.title})</small></h2>
      </div>
    </div>
    <p style="margin-top:8px;">${details.lore}</p>
    <h3 style="margin-bottom:4px;">Skins</h3>
    <div style="overflow-x:auto;white-space:nowrap;">${skinsHtml}</div>
    <h3 style="margin-bottom:4px;">Habilidades</h3>
    <ul style="list-style:none;padding:0;">
      <li style="margin-bottom:16px;background:#222;padding:8px;border-radius:6px;">
        <b>Passiva:</b> <span title="${details.passive.description}">${details.passive.name}</span><br>
        <img src="${passiveUrl}" alt="${details.passive.name}" style="width:40px;vertical-align:middle;margin:4px 0;"> <br>
        <small>${details.passive.description}</small>
      </li>
      ${details.spells.map(spell => `
        <li style="margin-bottom:16px;background:#222;padding:8px;border-radius:6px;">
          <b>${spell.name}</b> <span style="color:#0596aa;">(${spell.id})</span><br>
          <img src="${API_BASE}/${version}/img/spell/${spell.image.full}" alt="${spell.name}" style="width:32px;vertical-align:middle;"> <br>
          <small><b>Dica:</b> ${parseSpellText(spell.tooltip || spell.description, spell)}</small><br>
          <small><b>Descrição:</b> ${parseSpellText(spell.description, spell)}</small><br>
          <small><b>Custo:</b> ${spell.costBurn} | <b>Alcance:</b> ${spell.rangeBurn} | <b>Tempo de Recarga:</b> ${spell.cooldownBurn}</small>
        </li>
      `).join('')}
    </ul>
    <button id="close-details">Fechar</button>
  `;
  document.getElementById('close-details').onclick = () => {
    detailsEl.style.display = 'none';
  };
}

async function main() {
  const version = await getLatestVersion();
  const champions = await getChampions(version);
  renderChampionList(champions, version);
}

main();
