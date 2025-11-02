# 🧪 COMO TESTAR MERCADO PAGO (CARTÕES)

## ⚠️ PROBLEMA: "Insira o código que te enviamos por e-mail"

O Mercado Pago pede verificação de e-mail quando você usa contas de teste.

---

## ✅ SOLUÇÃO 1: USAR CONTA DE TESTE DO MERCADO PAGO

### 1. Criar Usuário de Teste (Comprador)

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Clique em **"Contas de teste"** (menu lateral)
3. Clique em **"Criar nova conta"**
4. Escolha: **"Comprador"**
5. Copie as credenciais geradas:

```
E-mail: test_user_XXXXXX@testuser.com
Senha: XXXXXXXX
```

### 2. Usar no Checkout

Quando o Mercado Pago pedir login:

1. Use o **e-mail de teste** que você criou
2. Use a **senha de teste**
3. ✅ Não vai pedir verificação de e-mail

### 3. Pagar com Cartão de Teste

Depois de fazer login, use os dados:

```
Cartão: 5031 4332 1540 6351
Nome: APRO
CVV: 123
Validade: 11/25
CPF: Qualquer
```

✅ Pagamento será aprovado automaticamente!

---

## ✅ SOLUÇÃO 2: PAGAR SEM LOGIN (GUEST CHECKOUT)

O Mercado Pago permite pagar **sem criar conta**. Você pode:

1. Clicar em "Pagar como convidado" (se disponível)
2. Preencher dados do cartão diretamente
3. Usar cartão de teste: `5031 4332 1540 6351`

⚠️ **Nota:** Nem sempre essa opção aparece em ambiente de teste.

---

## 📝 CARTÕES DE TESTE DO MERCADO PAGO

| Resultado            | Número                | Nome | CVV | Validade |
| -------------------- | --------------------- | ---- | --- | -------- |
| ✅ Aprovado          | `5031 4332 1540 6351` | APRO | 123 | 11/25    |
| ⏳ Pendente          | `5031 4332 1540 6351` | CONT | 123 | 11/25    |
| ❌ Rejeitado (Saldo) | `5031 4332 1540 6351` | FUND | 123 | 11/25    |
| ❌ Rejeitado (CVV)   | `5031 4332 1540 6351` | SECU | 123 | 11/25    |
| ❌ Rejeitado (Geral) | `5031 4332 1540 6351` | OTHE | 123 | 11/25    |

**Dica:** O **nome no cartão** define o resultado do pagamento!

---

## 🔧 CREDENCIAIS ATUAIS DO .env.local

Suas credenciais de **TESTE** estão corretas:

```env
MERCADOPAGO_ACCESS_TOKEN="TEST-3166468636714348-103013-1cb87e0fd70a7a3bda2af4d9791df509-330639405"
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="TEST-44b17b02-898f-42a2-a389-0fb145bb9fa8"
```

Essas credenciais **só funcionam** com contas de teste do Mercado Pago.

---

## 🎯 PASSO A PASSO COMPLETO

### 1. Criar Conta de Teste (Uma Vez)

```bash
# Acesse:
https://www.mercadopago.com.br/developers/panel/app

# Menu lateral: "Contas de teste"
# Botão: "Criar nova conta"
# Tipo: "Comprador"
# Copie: E-mail + Senha
```

### 2. Testar Pagamento

```bash
1. Acesse: http://localhost:3000/carrinho
2. Adicione produtos
3. Selecione moeda: BRL
4. Clique: "Pagar com Cartão (Mercado Pago)"
5. Será redirecionado para Mercado Pago
6. Faça login com conta de TESTE
7. Dados do cartão:
   - Número: 5031 4332 1540 6351
   - Nome: APRO
   - CVV: 123
   - Validade: 11/25
   - CPF: 111.111.111-11
8. Clique: "Pagar"
9. ✅ Aprovado!
10. Redirecionado para: /obrigado
```

---

## 🐛 TROUBLESHOOTING

### Problema: "Insira o código que te enviamos por e-mail"

**Causa:** Você tentou usar um e-mail real (gmail, hotmail, etc) no checkout de teste.

**Solução:** Use apenas contas de teste criadas no painel do Mercado Pago.

### Problema: "Uma das partes é de teste"

**Causa:** Você está usando credenciais de TESTE mas tentando pagar com conta REAL.

**Solução:** Use conta de teste do Mercado Pago (criada no painel).

### Problema: "Credenciais inválidas"

**Causa:** Token do .env.local está errado.

**Solução:** Copie novamente do painel:
https://www.mercadopago.com.br/developers/panel/credentials/test

---

## 📞 LINKS ÚTEIS

- **Painel de Desenvolvedores:** https://www.mercadopago.com.br/developers/panel/app
- **Credenciais de Teste:** https://www.mercadopago.com.br/developers/panel/credentials/test
- **Contas de Teste:** https://www.mercadopago.com.br/developers/panel/test-users
- **Documentação:** https://www.mercadopago.com.br/developers/pt/docs

---

## ✅ CHECKLIST

- [ ] Criar conta de teste (tipo Comprador)
- [ ] Copiar e-mail + senha da conta de teste
- [ ] Fazer login no checkout com conta de teste
- [ ] Usar cartão: 5031 4332 1540 6351 com nome APRO
- [ ] Verificar aprovação automática
- [ ] Receber e-mail de confirmação
- [ ] Ver pedido em /conta/pedidos

---

## 🎉 PRONTO!

Com uma **conta de teste do Mercado Pago**, você consegue testar pagamentos com cartão sem precisar verificar e-mails reais!

**Importante:** Em **produção**, use credenciais de produção e seus clientes usarão suas contas reais do Mercado Pago (ou pagarão como convidados).
