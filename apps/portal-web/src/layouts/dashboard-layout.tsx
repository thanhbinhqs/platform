import { Outlet } from 'react-router-dom';
import { TopNavigation } from '../components/top-navigation';

export function DashboardLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <TopNavigation />
      <main className="flex-1 overflow-hidden p-4">
        <Outlet />
      </main>
    </div>
  );
}
