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
import ProductsPage from './features/admin/products/ProductsPage';
import NewProductPage from './features/admin/products/NewProductPage';
import ProductHistoryPage from './features/admin/products/ProductHistoryPage';
import VersionPage from './features/admin/products/VersionPage';

const PRODUCT_PERMS = ['products.view', 'products.make', 'products.check'];

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
          <Route path="admin/products" element={<RequirePermission any={PRODUCT_PERMS}><ProductsPage /></RequirePermission>} />
          <Route path="admin/products/new" element={<RequirePermission any={['products.make']}><NewProductPage /></RequirePermission>} />
          <Route path="admin/products/:id" element={<RequirePermission any={PRODUCT_PERMS}><ProductHistoryPage /></RequirePermission>} />
          <Route path="admin/products/versions/:vid" element={<RequirePermission any={PRODUCT_PERMS}><VersionPage kind="product" key="product" /></RequirePermission>} />
          <Route path="admin/pricing/versions/:vid" element={<RequirePermission any={PRODUCT_PERMS}><VersionPage kind="pricing" key="pricing" /></RequirePermission>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
