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

const STATUS = {
  active: <Chip size="small" color="success" label="Active" />,
  locked: <Chip size="small" color="error" label="Locked" />,
  deactivated: <Chip size="small" label="Inactive" />,
};

function TempPasswordDialog({ title, intro, staffNoField, onClose, onSubmit }) {
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
          {staffNoField && <TextField label="Staff number" placeholder="AT637" required value={staffNo} onChange={(e) => setStaffNo(e.target.value)} helperText="The staff record must already exist in People and Culture's records." />}
          <TextField label="Temporary password" required value={password} onChange={(e) => setPassword(e.target.value)} helperText="At least 8 characters with three of: lower case, capitals, numbers, symbols. Give it to the person directly; they change it at first sign-in." autoComplete="off" />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function ConfirmDialog({ title, body, action, onClose, onConfirm }) {
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <p style={{ margin: 0 }}>{body}</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onConfirm}>{action}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function UsersPage() {
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
    const t = setTimeout(fetchUsers, 250);
    return () => clearTimeout(t);
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
          <h1>Users and roles</h1>
          <p>Give people the roles they need. Every staff member keeps Staff. Conflicting combinations are refused.</p>
        </div>
        <div className="row">
          <Button component={RouterLink} to="/admin/roles">Roles and permissions</Button>
          <Button variant="contained" onClick={() => setDialog({ type: 'create' })}>Add user</Button>
        </div>
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 24px', borderBottom: '1px solid var(--line-2)', flexWrap: 'wrap' }}>
          <TextField
            sx={{ maxWidth: 320 }}
            placeholder="Search by name, staff number or department"
            inputProps={{ 'aria-label': 'Search users' }}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
          <span className="small muted" role="status">{loading ? 'Loading…' : `${result.total} users`}</span>
        </div>
        <div className="tablewrap">
          <Table aria-label="Users">
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell align="right">Permissions</TableCell>
                <TableCell>MFA</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last sign-in</TableCell>
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
                    {u.mfa.required ? <Chip size="small" color={u.mfa.enabled ? 'success' : 'warning'} label={u.mfa.enabled ? 'Required, enrolled' : 'Required, not enrolled'} /> : <span className="small muted">Not required</span>}
                  </TableCell>
                  <TableCell>{STATUS[u.status]}</TableCell>
                  <TableCell className="small">{formatDate(u.lastLoginAt)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" onClick={() => setEditing(u)} disabled={!catalogue}>Edit roles</Button>{' '}
                    <Button size="small" aria-haspopup="menu" aria-label={`More actions for ${u.fullName}`} onClick={(e) => setMenu({ anchor: e.currentTarget, user: u })}>More</Button>
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
        {target?.status === 'locked' && <MenuItem onClick={() => setDialog({ type: 'unlock', user: target })}>Unlock account</MenuItem>}
        {target?.mfa.enabled && <MenuItem onClick={() => setDialog({ type: 'mfa', user: target })}>Reset MFA</MenuItem>}
        <MenuItem onClick={() => setDialog({ type: 'password', user: target })}>Issue temporary password</MenuItem>
        {target?.status === 'deactivated' ? (
          <MenuItem onClick={() => run(() => usersApi.activate(target.id), `${target.fullName} can sign in again.`)}>Activate</MenuItem>
        ) : (
          <MenuItem onClick={() => setDialog({ type: 'deactivate', user: target })}>Deactivate</MenuItem>
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
            done(`Roles saved for ${u.fullName}`);
          }}
        />
      )}
      {dialog?.type === 'create' && (
        <TempPasswordDialog
          title="Add a user"
          intro="Creates a sign-in for a staff member who already has a staff record. They get the Staff role; add others afterwards."
          staffNoField
          onClose={() => setDialog(null)}
          onSubmit={async ({ staffNo, password }) => {
            const u = await usersApi.create(staffNo, password);
            done(`User created for ${u.fullName}. Give them the temporary password in person.`);
          }}
        />
      )}
      {dialog?.type === 'password' && (
        <TempPasswordDialog
          title={`Temporary password for ${dialog.user.fullName}`}
          intro="Signs them out everywhere. They must choose a new password at the next sign-in."
          onClose={() => setDialog(null)}
          onSubmit={async ({ password }) => {
            await usersApi.resetPassword(dialog.user.id, password);
            done(`Temporary password set for ${dialog.user.fullName}.`);
          }}
        />
      )}
      {dialog?.type === 'unlock' && (
        <ConfirmDialog title="Unlock account" body={`Confirm who ${dialog.user.fullName} is before unlocking. The unlock is recorded in the audit log.`} action="Unlock" onClose={() => setDialog(null)} onConfirm={() => run(() => usersApi.unlock(dialog.user.id), `${dialog.user.fullName} is unlocked.`)} />
      )}
      {dialog?.type === 'mfa' && (
        <ConfirmDialog title="Reset MFA" body={`${dialog.user.fullName} will be signed out and must set up their authenticator app again at the next sign-in.`} action="Reset MFA" onClose={() => setDialog(null)} onConfirm={() => run(() => usersApi.resetMfa(dialog.user.id), `MFA reset for ${dialog.user.fullName}.`)} />
      )}
      {dialog?.type === 'deactivate' && (
        <ConfirmDialog title="Deactivate user" body={`${dialog.user.fullName} is signed out and cannot sign in until reactivated. Their loan records stay.`} action="Deactivate" onClose={() => setDialog(null)} onConfirm={() => run(() => usersApi.deactivate(dialog.user.id), `${dialog.user.fullName} is deactivated.`)} />
      )}
    </div>
  );
}
