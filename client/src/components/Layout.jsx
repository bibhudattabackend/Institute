import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout() {
  const { institute, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          {institute?.logo_url ? (
            <img src={institute.logo_url} alt="" className="brand-logo" />
          ) : (
            <span className="brand-mark">B.Ed</span>
          )}
          <div>
            <div className="brand-title">Institute Portal</div>
            <div className="brand-sub">{institute?.name}</div>
          </div>
        </div>
        <nav className="nav">
          <NavLink end className="nav-link" to="/">
            Dashboard
          </NavLink>
          <NavLink className="nav-link" to="/students">
            Students
          </NavLink>
          <NavLink className="nav-link" to="/students/new">
            New admission
          </NavLink>
          <NavLink className="nav-link" to="/universities">
            Universities
          </NavLink>
          <NavLink className="nav-link" to="/course-fees">
            Course fees
          </NavLink>
          <NavLink className="nav-link" to="/profile">
            Institute profile
          </NavLink>
        </nav>
        <button
          type="button"
          className="btn ghost full"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
        >
          Log out
        </button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
