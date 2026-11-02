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
import ProfilePage from './features/profile/ProfilePage';
import StaffListPage from './features/staff/StaffListPage';
import StaffDetailPage, { NewStaffPage } from './features/staff/StaffDetailPage';
import StaffImportPage from './features/staff/StaffImportPage';
import ApplyChoosePage from './features/apply/ApplyChoosePage';
import ApplyWizardPage from './features/apply/ApplyWizardPage';
import MyApplicationsPage from './features/applications/MyApplicationsPage';
import ApplicationPage from './features/applications/ApplicationPage';
import AgreementPage from './features/agreement/AgreementPage';
import AcceptRevisedPage from './features/agreement/AcceptRevisedPage';
import QueuePage from './features/review/QueuePage';
import ReviewPage from './features/review/ReviewPage';
import DelegationPage from './features/review/DelegationPage';
import DisbursementsPage from './features/disburse/DisbursementsPage';
import NotificationsPage from './features/notifications/NotificationsPage';
import ReportsPage from './features/reports/ReportsPage';
import WorkflowPage from './features/admin/workflow/WorkflowPage';
import TemplatesPage from './features/admin/templates/TemplatesPage';
import AuditPage from './features/admin/audit/AuditPage';
import DobVerificationsPage from './features/staff/DobVerificationsPage';

const PRODUCT_PERMS = ['products.view', 'products.make', 'products.approveCredit', 'products.approveRisk'];
const STAFF_PERMS = ['staff.view', 'staff.manage'];

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
          <Route path="disburse" element={<RequirePermission any={['disb.confirm']}><DisbursementsPage /></RequirePermission>} />
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
