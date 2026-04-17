import { Link, useLocation } from "react-router-dom";
import { getQuickActionsForUser } from "./quickActions";

function Sidebar({ user, isOpen, onNavigate }) {
  const location = useLocation();
  const actions = getQuickActionsForUser(user);

  return (
    <aside className={`app-sidebar${isOpen ? " open" : ""}`} aria-label="Quick actions sidebar">
      <div className="app-sidebar-inner">
        <p className="app-sidebar-eyebrow">Quick Actions</p>
        <nav className="app-sidebar-nav">
          {actions.map((action) => {
            const isActive =
              location.pathname === action.path ||
              (action.path !== "/" && location.pathname.startsWith(`${action.path}/`));

            return (
              <Link
                key={action.key}
                to={action.path}
                className={`app-sidebar-link${isActive ? " active" : ""}`}
                onClick={onNavigate}
              >
                {action.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;
