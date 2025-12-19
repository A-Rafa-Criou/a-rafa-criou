# 💰 Sistema Financeiro - A Rafa Criou

Sistema completo de gestão financeira integrado ao e-commerce, permitindo controle de receitas, despesas, fundos e relatórios detalhados.

## 🎯 Funcionalidades

### 📊 Dashboard

- **Saldo Inicial**: Configure o saldo inicial de cada mês
- **Entradas**: Visualize todas as receitas do período
- **Saídas**: Acompanhe todas as despesas
- **Saldo Atual**: Saldo calculado automaticamente
- **Gráfico de Fluxo de Caixa**: Visualização diária de entradas, saídas e saldo
- **Gráfico Loja x Pessoal**: Distribuição de gastos entre loja e pessoal

### 💼 Fundos

#### Contas Anuais

- Crie fundos para guardar valores mensalmente para contas anuais (IPTU, contador, etc)
- Controle mensal: marque se guardou ou não o valor do mês
- Indicador de atraso para meses não guardados
- Barra de progresso mostrando quanto já foi provisionado

#### Investimentos

- Mesma lógica das contas anuais, mas para investimentos
- Controle de contribuições mensais
- Acompanhamento de progresso até a meta

### 🏪 Loja

#### Entradas Automáticas

- Integração com a tabela `orders` do banco
- Exibição automática de vendas por dia
- Agrupamento por forma de pagamento

#### Contas Mensais (Fixas)

- Hospedagem, domínios, ferramentas, etc
- Suporte a parcelamento automático
- Controle de pagamento (pago/pendente)

#### Contas Variáveis

- Marketing, comissões, taxas, etc
- Mesmos recursos das contas fixas

### 👤 Pessoal

#### Contas Mensais

- Aluguel, internet, telefone, etc
- Parcelamento e controle de pagamento

#### Gastos Dia a Dia

- Alimentação, transporte, lazer
- Lançamentos rápidos

### 📈 Relatórios

- **Total Loja x Pessoal**: Comparativo com gráfico de barras
- **Formas de Pagamento**: Gráfico de pizza mostrando distribuição
- **Gastos por Categoria**: Tabela completa com percentuais
- **Onde Mais Gastei**: Ranking top 10 de gastos por descrição

## 🗂️ Estrutura de Dados

### Tabelas Criadas

- `financial_categories`: Categorias de receitas e despesas
- `financial_transactions`: Todas as transações financeiras
- `monthly_balances`: Saldo inicial de cada mês
- `funds`: Fundos (contas anuais e investimentos)
- `fund_contributions`: Contribuições mensais dos fundos

### Integrações Existentes

- **orders**: Vendas automáticas da loja
- **affiliate_commissions**: Comissões de afiliados (despesa)

## 🎨 Design

### Paleta de Cores

- **Background**: Branco (já existente no sistema)
- **Cards**: Gradientes de cinza claro (`from-gray-50 to-gray-100`)
- **Primária**: `#FD9555` (laranja)
- **Secundária**: `#FED466` (amarelo)
- **Textos**: Cinza escuro (`text-gray-900`, `text-gray-700`)
- **Bordas**: Cinza claro (`border-gray-200`)

### Componentes

- Cards com gradientes suaves
- Tabelas responsivas e editáveis
- Gráficos interativos (Recharts)
- Modais para formulários
- Badges coloridos para status

## 🚀 Como Usar

### 1. Executar Migration

```bash
# Execute a migration no banco de dados
psql -d seu_banco -f drizzle/0026_add_financial_system.sql
```

Ou use o Drizzle Kit:

```bash
npm run db:push
```

### 2. Acessar o Sistema

Navegue para: `/admin/financeiro`

### 3. Configurar Saldo Inicial

1. Selecione o mês desejado
2. Clique em "Editar" no card de Saldo Inicial
3. Digite o valor e clique em "Salvar"

### 4. Adicionar Transações

1. Navegue para a aba desejada (Loja ou Pessoal)
2. Clique em "Nova Conta" ou "Novo Gasto"
3. Preencha o formulário:
   - Data
   - Descrição
   - Categoria
   - Forma de pagamento
   - Valor
   - Parcelas (se houver)
   - Marque como pago se já foi quitado

**Parcelamento**: Ao definir mais de 1 parcela, o sistema cria automaticamente os lançamentos futuros.

### 5. Criar Fundos

1. Acesse a aba "Fundos"
2. Clique em "Nova Conta Anual" ou "Novo Investimento"
3. Preencha:
   - Título (ex: "IPTU 2025")
   - Data de início
   - Data de vencimento/término
   - Valor total
   - Valor mensal
4. O sistema gerará automaticamente as contribuições mensais
5. Marque mensalmente se guardou o valor

### 6. Ver Relatórios

1. Acesse a aba "Relatórios"
2. Visualize:
   - Comparativo Loja x Pessoal
   - Formas de pagamento mais usadas
   - Gastos por categoria
   - Ranking de onde mais gastou

## 🔄 Fluxo de Trabalho Recomendado

### Início do Mês

1. Configure o saldo inicial do mês
2. Lance as contas fixas mensais (loja e pessoal)
3. Marque as contribuições de fundos como "guardado"

### Durante o Mês

1. Lance gastos diários conforme ocorrem
2. Marque transações como pagas quando quitadas
3. Acompanhe o saldo atual no Dashboard

### Fim do Mês

1. Revise todas as transações
2. Confira os relatórios
3. Exporte dados se necessário (CSV)
4. Use o saldo final como saldo inicial do próximo mês

## 📝 Dicas

### Categorias Padrão

O sistema já vem com categorias pré-cadastradas:

- **Loja**: Hospedagem, Domínios, Ferramentas, Marketing, Comissões, Taxas
- **Pessoal**: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer

Você pode criar novas categorias conforme necessário.

### Parcelamento Inteligente

Ao criar uma transação parcelada:

- Digite o valor da parcela (não o total)
- Informe a quantidade de parcelas
- O sistema cria automaticamente os próximos meses
- Cada parcela pode ser marcada individualmente como paga

### Entradas Automáticas

As vendas do e-commerce são exibidas automaticamente:

- Agrupadas por dia
- Com contagem de pedidos
- Valor total em BRL (com conversão de moeda se necessário)

### Fundos - Alerta de Atraso

Se você não marcar uma contribuição de fundo no mês:

- Aparece um badge vermelho com o número de meses atrasados
- O progresso não avança
- Você pode marcar meses anteriores a qualquer momento

## 🛠️ Manutenção

### Adicionar Nova Categoria

```typescript
await createCategory({
  name: 'Nova Categoria',
  type: 'EXPENSE', // ou 'INCOME'
  scope: 'STORE', // ou 'PERSONAL' ou 'BOTH'
  color: '#FF5722',
  icon: 'IconName',
  active: true,
});
```

### Excluir Transação

Transações podem ser excluídas a qualquer momento. Se for uma parcela, apenas aquela parcela é removida (não afeta as outras).

### Fechar Mês (Opcional)

Para "travar" um mês e não permitir mais alterações, você pode implementar a funcionalidade de `locked` na tabela `monthly_balances`.

## 📊 Relatórios Disponíveis

### Dashboard

- Visão geral do mês
- Fluxo de caixa diário
- Distribuição Loja x Pessoal

### Relatórios

- Gastos por escopo (Loja/Pessoal)
- Gastos por forma de pagamento
- Gastos por categoria
- Top 10 gastos por descrição

## 🔐 Segurança

- Todas as rotas estão protegidas por `financial-guard.ts`
- Apenas administradores têm acesso
- Server Actions validam dados com Zod
- Transações atômicas no banco de dados

## 🎓 Tecnologias Utilizadas

- **Next.js 15**: Framework React
- **TypeScript**: Tipagem estática
- **Drizzle ORM**: Comunicação com PostgreSQL
- **Shadcn/UI**: Componentes de interface
- **Recharts**: Gráficos interativos
- **Date-fns**: Manipulação de datas
- **Sonner**: Notificações toast
- **Zod**: Validação de schemas

## 📞 Suporte

Para dúvidas ou sugestões, consulte a documentação do projeto ou entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para A Rafa Criou**
