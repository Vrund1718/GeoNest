import { useAuth } from '../context/AuthContext';
import { Button } from './Button';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 h-16 z-10">
      <div className="flex items-center justify-between px-8 h-full">
        <div className="font-display text-2xl font-bold text-chai-cup">
          GeoNest
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-600 hover:text-chai-cup">
            🔔
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-chai-cup rounded-full flex items-center justify-center text-white font-medium">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium">{user?.name}</span>
            <Button variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
