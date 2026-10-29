import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import { refreshSession } from './api/client';
import { sessionEnded, sessionStarted } from './store/authSlice';
import AppShell from './components/AppShell';
import { RequireAuth, RequirePermission } from './components/RequireAuth';
import SignIn from './features/auth/SignIn';
import ChangePassword from './features/auth/ChangePassword';
import Home from './features/home/Home';
import MyAccess from './features/account/MyAccess';
import UsersPage from './features/admin/users/UsersPage';
import RolesPage from './features/admin/roles/RolesPage';

function NotFound() {
  return (
    <div className="page">
      <h1>Page not found</h1>
      <p className="muted">Check the address, or use the menu.</p>
    </div>
  );
}

export default function App() {
  const dispatch = useDispatch();

  // On load, restore the session silently from the refresh cookie (the access token is never stored).
  useEffect(() => {
    refreshSession()
      .then((data) => dispatch(sessionStarted(data)))
      .catch(() => dispatch(sessionEnded(null)));
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<SignIn />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="account/access" element={<MyAccess />} />
          <Route path="admin/users" element={<RequirePermission any={['admin.users']}><UsersPage /></RequirePermission>} />
          <Route path="admin/roles" element={<RequirePermission any={['admin.roles']}><RolesPage /></RequirePermission>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
