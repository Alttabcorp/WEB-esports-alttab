# Guia de Uso da Estrutura Modular

## Como Adicionar uma Nova Funcionalidade

### Exemplo: Adicionando um Novo Tipo de Renderização

1. **Crie um novo módulo**:
```javascript
// public/js/modules/ui/runes.js
import { getDatasetConfig } from '../data/state.js';
import { escapeHtml } from '../utils/helpers.js';

export function initializeRunesSection() {
    const container = document.getElementById('runes-list');
    if (!container) return;
    
    // Sua lógica aqui
}

export function renderRuneCards(runes) {
    // Renderização específica
}
```

2. **Exporte no índice**:
```javascript
// public/js/modules/index.js
export { initializeRunesSection, renderRuneCards } from './ui/runes.js';
```

3. **Use no arquivo principal**:
```javascript
// public/js/lol-data-modular.js
import { initializeRunesSection } from './modules/ui/runes.js';

document.addEventListener('datasetApplied', () => {
    initializeRunesSection();
});
```

## Como Modificar Configurações

### Adicionando Nova Configuração
```javascript
// public/js/modules/config.js
export const CONFIG = {
    // ... configurações existentes
    NEW_FEATURE_LIMIT: 50,
    NEW_API_ENDPOINT: 'https://api.example.com'
};
```

### Usando em Outros Módulos
```javascript
import { CONFIG } from '../config.js';

function myFunction() {
    if (items.length > CONFIG.NEW_FEATURE_LIMIT) {
        // Lógica específica
    }
}
```

## Como Adicionar Novo Estado

### Expandindo o Estado Global
```javascript
// public/js/modules/data/state.js
export const appState = {
    // ... estado existente
    runesDataset: [],
    userPreferences: {
        theme: 'dark',
        language: 'pt-BR'
    }
};

// Getters e setters
export function getRunesDataset() {
    return appState.runesDataset;
}

export function setUserPreferences(prefs) {
    appState.userPreferences = { ...appState.userPreferences, ...prefs };
}
```

## Como Criar um Novo Sistema de Dados

### Exemplo: Sistema de Runas
```javascript
// public/js/modules/data/runes-loader.js
import { CONFIG } from '../config.js';
import { fetchJson } from '../utils/helpers.js';

export async function loadRunesData(version) {
    const url = `${CONFIG.CDN_BASE}/${version}/data/${CONFIG.TARGET_LOCALE}/runes.json`;
    const response = await fetchJson(url);
    return response.data;
}

export function processRunesData(rawData) {
    return Object.values(rawData).map(rune => ({
        ...rune,
        processed: true
    }));
}
```

## Como Integrar com Sistema Existente

### Adicionando ao Manager Principal
```javascript
// public/js/modules/data/manager.js
import { loadRunesData, processRunesData } from './runes-loader.js';

export async function bootstrapDataset() {
    // ... código existente
    
    // Carregar runas também
    try {
        const rawRunes = await loadRunesData(resolvedVersion);
        const processedRunes = processRunesData(rawRunes);
        dataset.runes = processedRunes;
    } catch (error) {
        console.warn('Runas não disponíveis:', error);
        dataset.runes = [];
    }
    
    return dataset;
}
```

## Padrões de Nomenclatura

### Arquivos
- `kebab-case` para nomes de arquivo: `champion-abilities.js`
- Organização por funcionalidade: `data/`, `ui/`, `builder/`

### Funções
- `camelCase` para funções: `initializeSection()`
- Prefixos descritivos: `render*`, `initialize*`, `compute*`, `format*`

### Constantes
- `UPPER_SNAKE_CASE` para constantes: `MAX_BUILD_ITEMS`
- Agrupadas no `CONFIG` object

### Variáveis
- `camelCase` para variáveis: `championDataset`
- Nomes descritivos e específicos

## Debugging e Desenvolvimento

### Logs Estruturados
```javascript
// Use console.group para organizar logs
console.group('Builder Initialization');
console.log('Champion selected:', champion.name);
console.log('Items loaded:', items.length);
console.groupEnd();
```

### Debugging de Estado
```javascript
// Adicione no console para debug
window.debugState = () => {
    console.log('Current app state:', appState);
};
```

### Performance Monitoring
```javascript
// Monitore performance de funções críticas
function timedFunction(name, fn) {
    return (...args) => {
        console.time(name);
        const result = fn(...args);
        console.timeEnd(name);
        return result;
    };
}
```

## Testes

### Testando Módulos Individualmente
```javascript
// test-champion-loader.js
import { loadLocalDataset } from './modules/data/loader.js';

async function testChampionLoading() {
    try {
        const dataset = await loadLocalDataset('15.19.1');
        console.assert(dataset.champions.length > 0, 'Champions should be loaded');
        console.log('✅ Champion loading test passed');
    } catch (error) {
        console.error('❌ Champion loading test failed:', error);
    }
}
```

## Migração Gradual

Se você quiser migrar gradualmente do sistema antigo:

1. **Mantenha ambos os arquivos**:
   - `lol-data.js` (original)
   - `lol-data-modular.js` (modular)

2. **Teste com query parameter**:
```html
<script>
const useModular = new URLSearchParams(window.location.search).has('modular');
const scriptSrc = useModular ? 'lol-data-modular.js' : 'lol-data.js';
document.write(`<script type="${useModular ? 'module' : 'text/javascript'}" src="public/js/${scriptSrc}"></script>`);
</script>
```

3. **Acesse com** `?modular` na URL para testar a versão modular