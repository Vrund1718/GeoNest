import { Link, useLocation } from 'react-router-dom';

interface SidebarItem {
  label: string;
  path: string;
}

interface SidebarProps {
  items: SidebarItem[];
  title: string;
}

export const Sidebar = ({ items, title }: SidebarProps) => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 pt-16">
      <div className="p-6">
        <h2 className="font-display text-xl font-semibold text-ink-black mb-8">
          {title}
        </h2>
        <nav className="space-y-2">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-chai-cup bg-opacity-10 text-chai-cup font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
