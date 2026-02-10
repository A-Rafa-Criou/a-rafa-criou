'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Commission {
  id: string;
  commissionAmount: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  pixTransferId: string | null;
  transferError: string | null;
  transferAttemptCount: number;
  orderId: string;
  affiliate: {
    id: string;
    name: string;
    email: string;
    pixKey: string | null;
    pixAutoTransferEnabled: boolean | null;
  };
  order: {
    id: string;
    total: string;
  };
}

interface Stats {
  totalPaid: string;
  totalPending: string;
  totalFailed: string;
  countPaid: number;
  countPending: number;
  countFailed: number;
}

export default function PixPayoutsMonitorPage() {
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent24h, setRecent24h] = useState<{ count: number; total: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/pix-payouts?status=${statusFilter}`);
      const result = await response.json();

      if (result.success) {
        setCommissions(result.data.commissions);
        setStats(result.data.stats);
        setRecent24h(result.data.recent24h);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetry = async (commissionId: string) => {
    setRetrying(commissionId);
    try {
      const response = await fetch('/api/admin/pix-payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionId }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Pagamento processado com sucesso!');
        fetchData();
      } else {
        alert(`Erro: ${result.error || 'Falha ao processar pagamento'}`);
      }
    } catch (error) {
      console.error('Erro ao retentar:', error);
      alert('Erro ao retentar pagamento');
    } finally {
      setRetrying(null);
    }
  };

  const getStatusBadge = (commission: Commission) => {
    if (commission.pixTransferId && commission.status === 'paid') {
      return (
        <Badge className="bg-green-600">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Pago
        </Badge>
      );
    }

    if (commission.transferError) {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Falhou
        </Badge>
      );
    }

    if (commission.status === 'approved') {
      return (
        <Badge className="bg-yellow-600">
          <Clock className="w-3 h-3 mr-1" />
          Pendente
        </Badge>
      );
    }

    return <Badge variant="outline">{commission.status}</Badge>;
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pagamentos PIX Instantâneos</h1>
            <p className="text-gray-600 mt-1">Monitoramento de transferências automáticas</p>
          </div>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos Realizados</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(parseFloat(stats.totalPaid || '0'))}
              </div>
              <p className="text-xs text-gray-600 mt-1">{stats.countPaid} transações</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aguardando Pagamento</CardTitle>
              <Clock className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(parseFloat(stats.totalPending || '0'))}
              </div>
              <p className="text-xs text-gray-600 mt-1">{stats.countPending} comissões</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Falhas / Erros</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(parseFloat(stats.totalFailed || '0'))}
              </div>
              <p className="text-xs text-gray-600 mt-1">{stats.countFailed} pagamentos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Últimas 24h */}
      {recent24h && recent24h.count > 0 && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">
                  {recent24h.count} pagamentos nas últimas 24h
                </p>
                <p className="text-sm text-green-700">
                  Total: {formatCurrency(parseFloat(recent24h.total))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="failed">Falhados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Comissões */}
      <Card>
        <CardHeader>
          <CardTitle>Comissões ({commissions.length})</CardTitle>
          <CardDescription>Histórico de pagamentos instantâneos</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : commissions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum pagamento encontrado</p>
          ) : (
            <div className="space-y-4">
              {commissions.map(commission => (
                <div
                  key={commission.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(commission)}
                      <span className="font-semibold">{commission.affiliate.name}</span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>Email:</strong> {commission.affiliate.email}
                      </p>
                      <p>
                        <strong>PIX:</strong>{' '}
                        {commission.affiliate.pixKey || (
                          <span className="text-red-600">Não configurado</span>
                        )}
                      </p>
                      <p>
                        <strong>Pedido:</strong> {commission.order.id.substring(0, 8)}... (R${' '}
                        {commission.order.total})
                      </p>
                      <p>
                        <strong>Comissão:</strong>{' '}
                        <span className="text-green-600 font-semibold">
                          {formatCurrency(parseFloat(commission.commissionAmount))}
                        </span>
                      </p>
                      <p>
                        <strong>Data:</strong>{' '}
                        {new Date(commission.createdAt).toLocaleString('pt-BR')}
                      </p>
                      {commission.paidAt && (
                        <p>
                          <strong>Pago em:</strong>{' '}
                          {new Date(commission.paidAt).toLocaleString('pt-BR')}
                        </p>
                      )}
                      {commission.pixTransferId && (
                        <p>
                          <strong>ID Transferência:</strong>{' '}
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {commission.pixTransferId}
                          </code>
                        </p>
                      )}
                      {commission.transferError && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-red-800 text-xs">
                            <strong>Erro:</strong> {commission.transferError}
                          </p>
                          <p className="text-red-600 text-xs mt-1">
                            Tentativas: {commission.transferAttemptCount}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {commission.transferError && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetry(commission.id)}
                      disabled={retrying === commission.id}
                    >
                      {retrying === commission.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Retentando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retentar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
