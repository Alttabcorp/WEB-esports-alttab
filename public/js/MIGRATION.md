# Como migrar do lol-data.js para a estrutura modular

Este guia explica como migrar gradualmente da versão original monolítica `lol-data.js` para a nova estrutura modular.

## Passo a Passo

### Passo 1: Atualize as referências no HTML

Substitua:
```html
<script src="public/js/lol-data.js"></script>
```

Por:
```html
<script type="module" src="public/js/lol-data-new.js"></script>
```

**Importante**: Note o atributo `type="module"` que é necessário para suportar importações ES6.

### Passo 2: Atualize qualquer código externo que use funções do lol-data.js

Se você tem outros scripts que dependem de funções ou variáveis do arquivo original:

1. Verifique quais funções estão sendo exportadas em `lol-data-new.js`
2. Importe essas funções nos seus scripts usando:

```javascript
import { funcaoNecessaria } from './public/js/lol-data-new.js';
```

### Passo 3: Testando a migração

1. Abra o console do navegador e verifique se não há erros
2. Teste todas as funcionalidades do builder:
   - Seleção de campeões
   - Busca e filtro de itens
   - Adição/remoção de itens da build
   - Visualização de estatísticas
   - Responsividade em dispositivos móveis

## Solução de Problemas

### Erro de CORS em ambiente local

Se encontrar erros de CORS durante o desenvolvimento local, utilize um servidor local:
```bash
npx http-server -o
```

### Erros de importação de módulo

Verifique se todos os caminhos de importação estão corretos. Os caminhos são relativos ao arquivo que está fazendo a importação.

### Funções não definidas

Se alguma função que você usava antes não estiver disponível, verifique o arquivo correspondente na estrutura modular e importe-a especificamente.

## Benefícios da Migração

1. **Manutenção simplificada**: Cada módulo tem uma responsabilidade única
2. **Código mais limpo**: Separação clara de preocupações
3. **Facilidade de expansão**: Adicione novos recursos adicionando novos módulos
4. **Melhor performance**: Carregamento mais eficiente com módulos ES6
5. **Testabilidade**: Módulos isolados são mais fáceis de testar

## Funcionalidades Futuras

A nova estrutura facilita a adição de:
- Sistema de salvar/carregar builds
- Comparação de builds
- Novos visualizadores de estatísticas
- Integração com outros sistemas