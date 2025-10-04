# Estrutura Modular do Projeto LoL Data

Este documento descreve a nova estrutura modular implementada no projeto.

## Estrutura de Pastas

```
public/js/
├── modules/
│   ├── config.js                 # Configurações globais e constantes
│   ├── data/
│   │   ├── state.js             # Estado global da aplicação
│   │   ├── loader.js            # Funções de carregamento de dados
│   │   └── manager.js           # Orquestrador principal de dados
│   ├── ui/
│   │   ├── navigation.js        # Navegação e funcionalidades gerais de UI
│   │   ├── champions.js         # Renderização de campeões
│   │   └── items.js             # Renderização de itens
│   ├── builder/
│   │   ├── setup.js             # Configuração e inicialização do builder
│   │   ├── actions.js           # Ações do builder (adicionar/remover itens)
│   │   ├── calculator.js        # Calculadora de estatísticas
│   │   └── renderer.js          # Renderização dos componentes do builder
│   └── utils/
│       └── helpers.js           # Funções utilitárias
├── lol-data-modular.js          # Arquivo principal modular
└── lol-data-modular.js           # Arquivo principal modular
```

## Descrição dos Módulos

### `/modules/config.js`
- Todas as configurações globais do projeto
- Constantes como URLs da API, cache, limites, etc.
- Definições de estatísticas para o builder
- Funções auxiliares relacionadas a configuração

### `/modules/data/`
**state.js**: Gerenciamento do estado global
- Estado da aplicação (datasets, configurações, builder state)
- Getters e setters para acesso controlado ao estado
- Funções auxiliares para encontrar campeões e itens

**loader.js**: Carregamento de dados
- Funções para carregar dados locais e remotos
- Gerenciamento de cache
- Processamento de arquivos tar.gz
- Mapeamento de respostas da API

**manager.js**: Orquestrador de dados
- Função principal `bootstrapDataset()`
- Aplicação e validação de datasets
- Coordenação entre diferentes fontes de dados
- Eventos customizados para notificar mudanças

### `/modules/ui/`
**navigation.js**: Interface geral
- Configuração de navegação e scroll
- Menu mobile
- Funcionalidades gerais de UI
- Tratamento de erros globais

**champions.js**: Interface de campeões
- Renderização de cards de campeões
- Filtros e busca
- População de dropdowns

**items.js**: Interface de itens
- Renderização de cards de itens
- Filtros e busca de itens
- Categorização

### `/modules/builder/`
**setup.js**: Configuração do builder
- Inicialização do builder
- Configuração de event listeners
- Integração com sistema de habilidades
- Cálculos de estatísticas combinadas

**actions.js**: Ações do builder
- Adicionar/remover itens da build
- Validações de build
- Sincronização com renderização

**calculator.js**: Cálculos de estatísticas
- Computação de estatísticas do builder
- Formatação de valores
- Soma de stats de itens
- Cálculo de velocidade de ataque base

**renderer.js**: Renderização do builder
- Renderização de sumário de campeão
- Lista de itens disponíveis
- Loadout (build atual)
- Painel de estatísticas

### `/modules/utils/helpers.js`
Funções utilitárias usadas em todo o projeto:
- `escapeHtml()`: Sanitização de HTML
- `sanitizeUrlSegment()`: Limpeza de URLs
- `stripHtml()`: Remoção de tags HTML
- `formatGold()`: Formatação de valores de ouro
- `truncateText()`: Truncamento de texto
- `renderRating()`: Renderização de ratings
- `debounce()`: Debounce para eventos
- `fetchJson()`: Wrapper para fetch de JSON

## Como Usar

### Importações
```javascript
// Importar configurações
import { CONFIG, BUILDER_STATS } from './modules/config.js';

// Importar estado
import { getChampionDataset, setBuilderState } from './modules/data/state.js';

// Importar utilitários
import { escapeHtml, formatGold } from './modules/utils/helpers.js';
```

### Extensibilidade
1. **Adicionar nova funcionalidade**: Crie um novo módulo na pasta apropriada
2. **Modificar configurações**: Edite `/modules/config.js`
3. **Adicionar novo estado**: Modifique `/modules/data/state.js`
4. **Nova interface**: Adicione módulo em `/modules/ui/`

### Eventos Customizados
O sistema usa eventos customizados para comunicação entre módulos:
- `datasetApplied`: Disparado quando um dataset é aplicado com sucesso

## Vantagens da Modularização

1. **Separação de Responsabilidades**: Cada módulo tem uma função específica
2. **Manutenibilidade**: Código mais fácil de encontrar e modificar
3. **Reutilização**: Módulos podem ser reutilizados em outras partes do projeto
4. **Testabilidade**: Módulos podem ser testados individualmente
5. **Performance**: Carregamento otimizado com ES6 modules
6. **Escalabilidade**: Fácil adição de novas funcionalidades

## Compatibilidade

- Usa ES6 modules (requer browsers modernos)
- Mantém compatibilidade com o código existente
- Arquivo original mantido como backup (`lol-data.js`)

## Migração

Para migrar do sistema antigo para o modular:
1. Substitua `lol-data.js` por `lol-data-modular.js` no HTML
2. Adicione `type="module"` ao script tag
3. Funcionalidades existentes continuam funcionando normalmente