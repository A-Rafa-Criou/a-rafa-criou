import { Metadata } from 'next';
import PixPayoutsMonitorPage from '@/components/admin/PixPayoutsMonitorPage';

export const metadata: Metadata = {
  title: 'Pagamentos PIX - Admin | A Rafa Criou',
  description: 'Monitoramento de pagamentos PIX instantâneos para afiliados',
};

export default function AdminPixPayoutsPage() {
  return <PixPayoutsMonitorPage />;
}
