# Configuração do Cron de Traduções Automáticas

Este documento explica a configuração do processamento automático de traduções em background.

## Como Funciona

1. **Criação de Produto**: Quando um produto é criado via painel admin, o sistema enfileira um job de tradução no banco de dados (tabela `product_jobs`) em vez de fazer a tradução imediatamente.
2. **Processamento em Background**: Um cron job (GitHub Actions) chama o endpoint `/api/admin/products/process-jobs/cron` a cada 5 minutos (configurável).
3. **Traduções Realizadas**: O endpoint processa até 3 jobs pendentes por vez, traduzindo nomes e descrições para EN e ES via DeepL.

## Configuração (GitHub Secrets)

Para habilitar o cron, adicione as seguintes secrets no repositório GitHub (Settings → Secrets and variables → Actions):

1. **`SITE_URL`**: URL de produção do site (exemplo: `https://arafacriou.com.br`)
2. **`PROCESS_JOBS_CRON_SECRET`**: Uma string secreta forte (mínimo 32 caracteres), para proteger o endpoint de chamadas não autorizadas. Exemplo: `openssl rand -base64 32`

### Passos

1. Gere um segredo forte:
   ```bash
   openssl rand -base64 32
   ```
   (Exemplo de output: `XYZ123ABC...`)

2. Adicione no GitHub:
   - `SITE_URL` = `https://arafacriou.com.br`
   - `PROCESS_JOBS_CRON_SECRET` = o valor gerado acima

3. Adicione a mesma chave no `.env.local` (desenvolvimento) e na Vercel (produção):
   ```
   PROCESS_JOBS_CRON_SECRET=XYZ123ABC...
   ```

4. Ative o workflow em: `.github/workflows/process-jobs.yml`

## Ajustar Frequência

Para rodar a cada 15 minutos em vez de 5, edite `.github/workflows/process-jobs.yml`:

```yaml
schedule:
  - cron: '*/15 * * * *'  # Altere '*/5' para '*/15'
```

Consulte [Crontab Guru](https://crontab.guru/) para mais opções.

## Endpoints

- `POST /api/admin/products/process-jobs/cron` (com header `x-cron-secret`): trigger do cron (protegido).
- `POST /api/admin/products/process-jobs`: worker interno (pode ser chamado manualmente pelo admin).

## Logs

O processamento registra logs no console do servidor (Vercel Functions logs). Cada execução retorna JSON:
```json
{ "processed": 2 }
```
indicando quantos jobs foram traduzidos naquela rodada.

## Testar Manualmente

No painel do GitHub Actions, você pode disparar o workflow manualmente (botão "Run workflow") para testar antes de aguardar o intervalo do cron.
