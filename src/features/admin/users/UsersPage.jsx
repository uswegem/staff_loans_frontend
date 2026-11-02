// "Users and roles" (prototype #/admin/users, FR-46, FR-49). List, search and actions
// ported from Ess-Frontend/src/pages/user/Users.js (fetchUsers, handleCreate,
// handleDeactivate, handleResetPassword); restyled to the prototype table. Adds
// unlock and MFA reset (prompt 3a.2, 3a.3).

import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Menu, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, TextField } from '@mui/material';
import { rolesApi, usersApi } from '../../../api/admin';
import { apiError } from '../../../api/client';
import { formatDate } from '../../../lib/format';
import UserRolesDialog from './UserRolesDialog';
import { useT } from '../../../i18n';

const statusChip = (t) => ({
  active: <Chip size="small" color="success" label={t('Active')} />,
  locked: <Chip size="small" color="error" label={t('Locked')} />,
  deactivated: <Chip size="small" label={t('Inactive')} />,
});

function TempPasswordDialog({ title, intro, staffNoField, onClose, onSubmit }) {
  const t = useT();
  const [staffNo, setStaffNo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ staffNo: staffNo.trim().toUpperCase(), password });
    } catch (err) {
      const e2 = apiError(err);
      setError(e2.details?.password?.join(' ') || e2.details?.staffNo?.[0] || e2.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{title}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          <p className="small muted" style={{ margin: 0 }}>{intro}</p>
          {error && <Alert severity="error">{error}</Alert>}
          {staffNoField && <TextField label={t('Staff number')} placeholder={t('AT637')} required value={staffNo} onChange={(e) => setStaffNo(e.target.value)} helperText={t('The staff record must already exist in People and Culture\'s records.')} />}
          <TextField label={t('Temporary password')} required value={password} onChange={(e) => setPassword(e.target.value)} helperText={t('At least 8 characters with three of: lower case, capitals, numbers, symbols. Give it to the person directly; they change it at first sign-in.')} autoComplete="off" />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy}>{t('Save')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function ConfirmDialog({ title, body, action, onClose, onConfirm }) {
  const t = useT();
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <p style={{ margin: 0 }}>{body}</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button variant="contained" onClick={onConfirm}>{action}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function UsersPage() {
  const t = useT();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [roles, setRoles] = useState([]);
  const [catalogue, setCatalogue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [menu, setMenu] = useState(null);
  const [dialog, setDialog] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      setResult(await usersApi.list({ q: q || undefined, page: page + 1, limit }));
      setError(null);
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [q, page, limit]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  useEffect(() => {
    Promise.all([rolesApi.list(), rolesApi.catalogue()]).then(([r, c]) => {
      setRoles(r);
      setCatalogue(c);
    });
  }, []);

  const done = (message) => {
    setToast(message);
    setDialog(null);
    setMenu(null);
    fetchUsers();
  };

  const run = async (fn, message) => {
    try {
      await fn();
      done(message);
    } catch (err) {
      setDialog(null);
      setMenu(null);
      setError(apiError(err).message);
    }
  };

  const target = menu?.user;

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>{t('Users and roles')}</h1>
          <p>{t('Give people the roles they need. Every staff member keeps Staff. Conflicting combinations are refused.')}</p>
        </div>
        <div className="row">
          <Button component={RouterLink} to="/admin/roles">{t('Roles and permissions')}</Button>
          <Button variant="contained" onClick={() => setDialog({ type: 'create' })}>{t('Add user')}</Button>
        </div>
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 24px', borderBottom: '1px solid var(--line-2)', flexWrap: 'wrap' }}>
          <TextField
            sx={{ maxWidth: 320 }}
            placeholder={t('Search by name, staff number or department')}
            inputProps={{ 'aria-label': t('Search users') }}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
          <span className="small muted" role="status">{loading ? t('Loading…') : t('{n} users', { n: result.total })}</span>
        </div>
        <div className="tablewrap">
          <Table aria-label={t('Users')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('User')}</TableCell>
                <TableCell>{t('Roles')}</TableCell>
                <TableCell align="right">{t('Permissions')}</TableCell>
                <TableCell>{t('MFA')}</TableCell>
                <TableCell>{t('Status')}</TableCell>
                <TableCell>{t('Last sign-in')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {result.items.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <b>{u.fullName}</b>
                    <div className="xs muted">
                      {u.staffNo}
                      {u.title ? `, ${u.title}` : ''}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="row" style={{ gap: 4 }}>
                      {u.assignments.map((a) => (
                        <span key={a.assignmentId} className="tag">
                          {a.name}
                          {a.endsOn ? ` until ${formatDate(a.endsOn)}` : ''}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell align="right" className="num">{u.permissions.length}</TableCell>
                  <TableCell>
                    {u.mfa.required ? <Chip size="small" color={u.mfa.enabled ? 'success' : 'warning'} label={u.mfa.enabled ? t('Required, enrolled') : t('Required, not enrolled')} /> : <span className="small muted">{t('Not required')}</span>}
                  </TableCell>
                  <TableCell>{statusChip(t)[u.status]}</TableCell>
                  <TableCell className="small">{formatDate(u.lastLoginAt)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" onClick={() => setEditing(u)} disabled={!catalogue}>{t('Edit roles')}</Button>{' '}
                    <Button size="small" aria-haspopup="menu" aria-label={t('More actions for {name}', { name: u.fullName })} onClick={(e) => setMenu({ anchor: e.currentTarget, user: u })}>{t('More')}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          component="div"
          count={result.total}
          page={page}
          rowsPerPage={limit}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(0);
          }}
        />
      </Card>

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        {target?.status === 'locked' && <MenuItem onClick={() => setDialog({ type: 'unlock', user: target })}>{t('Unlock account')}</MenuItem>}
        {target?.mfa.enabled && <MenuItem onClick={() => setDialog({ type: 'mfa', user: target })}>{t('Reset MFA')}</MenuItem>}
        <MenuItem onClick={() => setDialog({ type: 'password', user: target })}>{t('Issue temporary password')}</MenuItem>
        {target?.status === 'deactivated' ? (
          <MenuItem onClick={() => run(() => usersApi.activate(target.id), t('{name} can sign in again.', { name: target.fullName }))}>{t('Activate')}</MenuItem>
        ) : (
          <MenuItem onClick={() => setDialog({ type: 'deactivate', user: target })}>{t('Deactivate')}</MenuItem>
        )}
      </Menu>

      {editing && catalogue && (
        <UserRolesDialog
          user={editing}
          roles={roles}
          catalogue={catalogue}
          onClose={() => setEditing(null)}
          onSaved={(u) => {
            setEditing(null);
            done(t('Roles saved for {name}', { name: u.fullName }));
          }}
        />
      )}
      {dialog?.type === 'create' && (
        <TempPasswordDialog
          title={t('Add a user')}
          intro={t('Creates a sign-in for a staff member who already has a staff record. They get the Staff role; add others afterwards.')}
          staffNoField
          onClose={() => setDialog(null)}
          onSubmit={async ({ staffNo, password }) => {
            const u = await usersApi.create(staffNo, password);
            done(t('User created for {name}. Give them the temporary password in person.', { name: u.fullName }));
          }}
        />
      )}
      {dialog?.type === 'password' && (
        <TempPasswordDialog
          title={t('Temporary password for {name}', { name: dialog.user.fullName })}
          intro={t('Signs them out everywhere. They must choose a new password at the next sign-in.')}
          onClose={() => setDialog(null)}
          onSubmit={async ({ password }) => {
            await usersApi.resetPassword(dialog.user.id, password);
            done(t('Temporary password set for {name}.', { name: dialog.user.fullName }));
          }}
        />
      )}
      {dialog?.type === 'unlock' && (
        <ConfirmDialog title={t('Unlock account')} body={t('Confirm who {name} is before unlocking. The unlock is recorded in the audit log.', { name: dialog.user.fullName })} action={t('Unlock')} onClose={() => setDialog(null)} onConfirm={() => run(() => usersApi.unlock(dialog.user.id), t('{name} is unlocked.', { name: dialog.user.fullName }))} />
      )}
      {dialog?.type === 'mfa' && (
        <ConfirmDialog title={t('Reset MFA')} body={t('{name} will be signed out and must set up their authenticator app again at the next sign-in.', { name: dialog.user.fullName })} action={t('Reset MFA')} onClose={() => setDialog(null)} onConfirm={() => run(() => usersApi.resetMfa(dialog.user.id), t('MFA reset for {name}.', { name: dialog.user.fullName }))} />
      )}
      {dialog?.type === 'deactivate' && (
        <ConfirmDialog title={t('Deactivate user')} body={t('{name} is signed out and cannot sign in until reactivated. Their loan records stay.', { name: dialog.user.fullName })} action={t('Deactivate')} onClose={() => setDialog(null)} onConfirm={() => run(() => usersApi.deactivate(dialog.user.id), t('{name} is deactivated.', { name: dialog.user.fullName }))} />
      )}
    </div>
  );
}
