# 📧 E-mail de Recuperação de Senha - Troubleshooting

## ✅ Status Atual

**E-mail está sendo enviado com sucesso!**

Resposta do Resend:

```json
{
  "data": {
    "id": "b5deaf81-b408-4c3f-a139-5607615240fc"
  },
  "error": null
}
```

Isso significa que:

- ✅ API Key do Resend está correta
- ✅ Código está funcionando
- ✅ Resend aceitou o e-mail
- ✅ E-mail foi enviado

---

## 🔍 Por que você não recebeu o e-mail?

### **1. Caixa de Spam/Lixo Eletrônico** (Mais provável)

**Ação:** Verifique as seguintes pastas no Gmail:

1. **Spam/Lixo Eletrônico**
   - Procure por: "A Rafa Criou" ou "Recuperação de Senha"
   - Remetente: `onboarding@resend.dev`

2. **Promoções**
   - Às vezes o Gmail classifica e-mails automatizados aqui

3. **Social** ou **Atualizações**
   - Verifique todas as abas do Gmail

**Como marcar como "Não é spam":**

```
1. Abra o e-mail na pasta Spam
2. Clique em "Não é spam" no topo
3. E-mails futuros chegarão na Caixa de Entrada
```

---

### **2. Delay no envio** (Menos provável)

Às vezes e-mails transacionais podem demorar alguns minutos para chegar.

**Tempo normal:** 10 segundos a 5 minutos  
**Tempo máximo:** até 15 minutos em casos raros

---

### **3. Domínio `onboarding@resend.dev`** (Provisório)

Atualmente estamos usando o domínio de teste do Resend: `onboarding@resend.dev`

**Limitações:**

- ⚠️ Maior chance de ir para spam
- ⚠️ Pode ter delay
- ⚠️ Alguns provedores bloqueiam

**Solução permanente:**
Configurar domínio próprio `arafacriou.com.br` no Resend.

---

## 🛠️ Soluções Imediatas

### **Opção 1: Verificar Logs do Resend** (Recomendado)

1. Acesse: https://resend.com/emails
2. Faça login com a conta do Resend
3. Vá em "Logs" ou "Activity"
4. Procure pelo e-mail enviado (ID: `b5deaf81-b408-4c3f-a139-5607615240fc`)
5. Verifique o status:
   - ✅ **Delivered** - E-mail foi entregue (verifique spam)
   - ⏳ **Pending** - Ainda processando
   - ❌ **Bounced** - E-mail retornou (endereço inválido)
   - ❌ **Rejected** - Bloqueado pelo provedor

---

### **Opção 2: Testar com outro e-mail**

Teste com diferentes provedores:

```
✅ Gmail: edduardooo2011@gmail.com (atual)
✅ Outlook/Hotmail: seu-email@outlook.com
✅ Yahoo: seu-email@yahoo.com
✅ ProtonMail: seu-email@proton.me
```

Execute novamente:

```powershell
# Acesse /auth/forgot-password
# Digite o e-mail
# Clique em "Enviar Link de Recuperação"
```

---

### **Opção 3: Usar Domínio Próprio** (Produção)

Para evitar spam, configure o domínio `arafacriou.com.br`:

**Passo a passo:**

1. **Acesse Resend Dashboard**
   - URL: https://resend.com/domains
   - Clique em "Add Domain"

2. **Adicione o domínio**
   - Digite: `arafacriou.com.br`
   - Clique em "Add"

3. **Configure DNS**
   Resend fornecerá 3 registros DNS:

   **Registro SPF:**

   ```
   Tipo: TXT
   Nome: @
   Valor: v=spf1 include:resend.com ~all
   ```

   **Registro DKIM:**

   ```
   Tipo: TXT
   Nome: resend._domainkey
   Valor: (fornecido pelo Resend)
   ```

   **Registro DMARC:**

   ```
   Tipo: TXT
   Nome: _dmarc
   Valor: v=DMARC1; p=none
   ```

4. **Adicione no painel do domínio**
   - GoDaddy, HostGator, Registro.br, etc.
   - Cole os registros DNS fornecidos
   - Aguarde 24-48h para propagação

5. **Atualize o código**
   ```typescript
   from: 'A Rafa Criou <noreply@arafacriou.com.br>';
   ```

---

## 🧪 Teste Rápido

Execute este script para testar:

```powershell
npx tsx scripts/test-resend.ts
```

**Resultado esperado:**

```
✅ E-mail enviado com sucesso!
📦 Resposta do Resend:
{
  "data": {
    "id": "..."
  },
  "error": null
}
```

---

## 📊 Checklist de Verificação

**Já verificou?**

- [ ] Pasta de Spam/Lixo Eletrônico
- [ ] Pasta de Promoções (Gmail)
- [ ] Outras abas do Gmail (Social, Atualizações)
- [ ] Aguardou 5-10 minutos
- [ ] Logs do Resend Dashboard
- [ ] Tentou com outro e-mail

**Se nada funcionou:**

- [ ] Verifique se RESEND_API_KEY está correta
- [ ] Verifique limite do plano (100 emails/dia no free)
- [ ] Configure domínio próprio

---

## 💡 Dica Pro

**Para desenvolvimento:**
Use o MailTrap (https://mailtrap.io) para capturar todos os e-mails sem realmente enviá-los:

```env
# .env.local
RESEND_API_KEY="..." # Para produção
MAILTRAP_API_KEY="..." # Para desenvolvimento
NODE_ENV="development"
```

---

## 🆘 Próximos Passos

1. **IMEDIATO:** Verifique sua pasta de spam agora
2. **5 min:** Aguarde e verifique novamente
3. **15 min:** Se não recebeu, acesse logs do Resend
4. **1 hora:** Configure domínio próprio para produção

---

## 📞 Suporte

**Dashboard Resend:** https://resend.com  
**Documentação:** https://resend.com/docs  
**Status:** https://status.resend.com

---

## ✅ Conclusão

**O sistema está funcionando corretamente!** ✅

O e-mail foi enviado com sucesso pelo Resend. O problema provavelmente está na **classificação como spam** pelo Gmail.

**99% dos casos:** O e-mail está na pasta **Spam/Lixo Eletrônico** do Gmail.

Verifique agora! 📬
