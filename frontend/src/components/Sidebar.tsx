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
    <aside className="w-64 bg-indigo border-r border-indigo/50 h-screen fixed left-0 top-0 pt-16 shadow-lg">
      <div className="p-6">
        <h2 className="font-display text-xl font-semibold text-sand mb-8">
          {title}
        </h2>
        <nav className="space-y-2">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-4 py-3 rounded-lg transition-all duration-150 ease-out motion-reduce:transition-none ${
                  isActive
                    ? 'bg-marigold text-ink font-semibold shadow-md'
                    : 'text-sand/80 hover:bg-sand/10 hover:text-sand'
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
