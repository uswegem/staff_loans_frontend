import { lazy, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import { refreshSession, startSessionSync } from './api/client';
import { sessionEnded, sessionStarted } from './store/authSlice';
import AppShell from './components/AppShell';
import { RequireAuth, RequirePermission } from './components/RequireAuth';
import SignIn from './features/auth/SignIn';
import ChangePassword from './features/auth/ChangePassword';
import Home from './features/home/Home';
import MyAccess from './features/account/MyAccess';
import ProfilePage from './features/profile/ProfilePage';
import ApplyChoosePage from './features/apply/ApplyChoosePage';
import ApplyWizardPage from './features/apply/ApplyWizardPage';
import MyApplicationsPage from './features/applications/MyApplicationsPage';
import ApplicationPage from './features/applications/ApplicationPage';
import AgreementPage from './features/agreement/AgreementPage';
import AcceptRevisedPage from './features/agreement/AcceptRevisedPage';
import NotificationsPage from './features/notifications/NotificationsPage';
import { useT } from './i18n';

// Pages for reviewers, Operations, People and Culture, reports and administration load
// on first visit, so staff who only apply download less (UX review, phase G). Sign-in,
// Home, Apply, My applications and My profile stay in the main bundle.
const UsersPage = lazy(() => import('./features/admin/users/UsersPage'));
const RolesPage = lazy(() => import('./features/admin/roles/RolesPage'));
const ProductsPage = lazy(() => import('./features/admin/products/ProductsPage'));
const NewProductPage = lazy(() => import('./features/admin/products/NewProductPage'));
const ProductHistoryPage = lazy(() => import('./features/admin/products/ProductHistoryPage'));
const VersionPage = lazy(() => import('./features/admin/products/VersionPage'));
const StaffListPage = lazy(() => import('./features/staff/StaffListPage'));
const StaffImportPage = lazy(() => import('./features/staff/StaffImportPage'));
const QueuePage = lazy(() => import('./features/review/QueuePage'));
const ReviewPage = lazy(() => import('./features/review/ReviewPage'));
const DelegationPage = lazy(() => import('./features/review/DelegationPage'));
const DisbursementsPage = lazy(() => import('./features/disburse/DisbursementsPage'));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage'));
const WorkflowPage = lazy(() => import('./features/admin/workflow/WorkflowPage'));
const TemplatesPage = lazy(() => import('./features/admin/templates/TemplatesPage'));
const AuditPage = lazy(() => import('./features/admin/audit/AuditPage'));
const DobVerificationsPage = lazy(() => import('./features/staff/DobVerificationsPage'));
const StaffDetailPage = lazy(() => import('./features/staff/StaffDetailPage'));
const NewStaffPage = lazy(() => import('./features/staff/StaffDetailPage').then((m) => ({ default: m.NewStaffPage })));

const PRODUCT_PERMS = ['products.view', 'products.make', 'products.approveCredit', 'products.approveRisk'];
const STAFF_PERMS = ['staff.view', 'staff.manage'];

function NotFound() {
  const t = useT();
  return (
    <div className="page">
      <h1>{t('Page not found')}</h1>
      <p className="muted">{t('Check the address, or use the menu.')}</p>
    </div>
  );
}

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => startSessionSync((reason) => dispatch(sessionEnded(reason))), [dispatch]);

  // On load, restore the session silently from the refresh cookie (the access token is never stored).
  useEffect(() => {
    refreshSession()
      .then((data) => dispatch(sessionStarted(data)))
      .catch((error) => { if (error?.code !== 'ERR_CANCELED') dispatch(sessionEnded(null)); });
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<SignIn />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="account/access" element={<MyAccess />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="apply" element={<RequirePermission any={['loan.apply']}><ApplyChoosePage /></RequirePermission>} />
          <Route path="apply/:id" element={<RequirePermission any={['loan.apply']}><ApplyWizardPage /></RequirePermission>} />
          <Route path="applications" element={<RequirePermission any={['loan.viewOwn']}><MyApplicationsPage /></RequirePermission>} />
          <Route path="applications/:id" element={<RequirePermission any={['loan.viewOwn']}><ApplicationPage /></RequirePermission>} />
          <Route path="agreement/:id" element={<AgreementPage />} />
          <Route path="accept/:id" element={<RequirePermission any={['loan.viewOwn']}><AcceptRevisedPage /></RequirePermission>} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="review/:id" element={<ReviewPage />} />
          <Route path="delegation" element={<RequirePermission any={['review.delegate']}><DelegationPage /></RequirePermission>} />
          <Route path="disburse" element={<RequirePermission any={['disb.confirm', 'loan.book']}><DisbursementsPage /></RequirePermission>} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="reports" element={<RequirePermission any={['reports.view', 'admin.users', 'admin.roles', 'audit.view']}><ReportsPage /></RequirePermission>} />
          <Route path="admin/workflow" element={<RequirePermission any={['admin.workflow']}><WorkflowPage /></RequirePermission>} />
          <Route path="admin/templates" element={<RequirePermission any={['admin.templates', 'templates.approve']}><TemplatesPage /></RequirePermission>} />
          <Route path="admin/audit" element={<RequirePermission any={['audit.view']}><AuditPage /></RequirePermission>} />
          <Route path="staff" element={<RequirePermission any={STAFF_PERMS}><StaffListPage /></RequirePermission>} />
          <Route path="staff/dob-verifications" element={<RequirePermission any={['staff.verifyDob']}><DobVerificationsPage /></RequirePermission>} />
          <Route path="staff/new" element={<RequirePermission any={['staff.manage']}><NewStaffPage /></RequirePermission>} />
          <Route path="staff/import" element={<RequirePermission any={['staff.manage']}><StaffImportPage /></RequirePermission>} />
          <Route path="staff/:id" element={<RequirePermission any={STAFF_PERMS}><StaffDetailPage /></RequirePermission>} />
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
