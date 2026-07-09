import { Outlet } from 'react-router-dom';
import { SiteHeader } from '../components/site-header';

export function DashboardLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <SiteHeader />
      <main className="flex-1 min-h-0 p-4 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
