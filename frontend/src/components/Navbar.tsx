import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import { Bell } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 bg-indigo border-b border-indigo/50 h-16 z-10 shadow-md">
      <div className="flex items-center justify-between px-6 h-full">
        <div className="font-display text-2xl font-bold text-marigold tracking-wide">
          GeoNest
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-sand/80 hover:text-sand hover:bg-sand/10 rounded-lg transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-marigold motion-reduce:transition-none" aria-label="Notifications">
            <Bell size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-marigold rounded-full flex items-center justify-center text-ink font-semibold shadow-inner">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-sand hidden sm:block">{user?.name}</span>
            <Button variant="secondary" onClick={logout} className="bg-sand/10 text-sand border-sand/30 hover:bg-sand/20 focus:ring-sand">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
