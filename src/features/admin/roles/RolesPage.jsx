// "Roles and permissions" (prototype #/admin/roles, FR-43 to FR-48). Three tabs:
// the role-by-permission matrix, the roles list, and the segregation-of-duties rules.
// The matrix previews SoD conflicts as you tick; the API re-checks each role on save,
// including against every holder's other roles.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField } from '@mui/material';
import { rolesApi } from '../../../api/admin';
import { apiError } from '../../../api/client';
import { conflictsFor } from '../users/sod';
import { useT } from '../../../i18n';

const KIND_TAG = { approve: 'Approval', disburse: 'Disbursement', admin: 'Admin', check: 'Checker' };

function Matrix({ roles, catalogue, onSaved }) {
  const t = useT();
  const [pending, setPending] = useState(null);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const groups = [...new Set(catalogue.permissions.map((p) => p.group))];

  const current = (r) => (pending?.[r.id] ?? r.permissions);
  const toggle = (r, pid, on) => {
    const base = pending ? { ...pending } : {};
    const list = new Set(current(r));
    if (on) list.add(pid);
    else list.delete(pid);
    base[r.id] = [...list];
    setPending(base);
    setErrors([]);
  };

  const preview = useMemo(
    () => roles.flatMap((r) => conflictsFor(current(r), catalogue).map((c) => t('Role {role}: {conflict}.', { role: t(r.name), conflict: t(c.name).toLowerCase() }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, roles, catalogue]
  );

  const save = async () => {
    if (preview.length) {
      setErrors(preview);
      return;
    }
    const changed = roles.filter((r) => pending[r.id] && [...pending[r.id]].sort().join() !== [...r.permissions].sort().join());
    setBusy(true);
    const errs = [];
    let saved = 0;
    for (const r of changed) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await rolesApi.update(r.id, { permissions: pending[r.id] });
        saved += 1;
      } catch (err) {
        errs.push(`${r.name}: ${apiError(err).message}`);
      }
    }
    setBusy(false);
    setErrors(errs);
    if (!errs.length) setPending(null);
    onSaved(saved ? t(saved > 1 ? 'Permissions saved for {n} roles' : 'Permissions saved for {n} role', { n: saved }) : errs.length ? null : t('No changes'));
  };

  const shown = errors.length ? errors : preview;
  return (
    <>
      {shown.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          <AlertTitle>{t('These changes break segregation-of-duties rules')}</AlertTitle>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{shown.map((e) => <li key={e}>{e}</li>)}</ul>
        </Alert>
      )}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 24px', borderBottom: '1px solid var(--line-2)', flexWrap: 'wrap' }}>
          <h3>{t('Permission matrix')}</h3>
          <div className="row">
            <span className="small muted">{pending ? t('Unsaved changes') : t('Tick to grant a permission to a role')}</span>
            <Button size="small" disabled={!pending || busy} onClick={() => { setPending(null); setErrors([]); }}>{t('Discard')}</Button>
            <Button size="small" variant="contained" disabled={!pending || busy} onClick={save}>{t('Save changes')}</Button>
          </div>
        </div>
        <div className="tablewrap">
          <Table size="small" aria-label={t('Permission matrix')}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 300 }}>{t('Permission')}</TableCell>
                {roles.map((r) => (
                  <TableCell key={r.id} align="center" sx={{ whiteSpace: 'normal', minWidth: 92, verticalAlign: 'bottom', lineHeight: 1.3 }}>
                    {t(r.name)}
                    {!r.system && <><br /><span className="tag">{t('Custom')}</span></>}
                    {!r.active && <><br /><span className="tag">{t('Inactive')}</span></>}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => [
                <TableRow key={g}>
                  <TableCell colSpan={roles.length + 1} sx={{ background: 'var(--canvas)', fontWeight: 700, fontSize: 12.5, color: 'var(--ink-2)', py: 1 }}>{g}</TableCell>
                </TableRow>,
                ...catalogue.permissions
                  .filter((p) => p.group === g)
                  .map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        {t(p.label)} {p.kind && <span className="tag">{t(KIND_TAG[p.kind])}</span>}
                      </TableCell>
                      {roles.map((r) => {
                        const locked = p.locked && r.code === 'staff';
                        return (
                          <TableCell key={r.id} align="center">
                            <Checkbox
                              size="small"
                              inputProps={{ 'aria-label': `${t(r.name)}: ${t(p.label)}` }}
                              checked={current(r).includes(p.id)}
                              disabled={locked || busy}
                              onChange={(e) => toggle(r, p.id, e.target.checked)}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  )),
              ])}
            </TableBody>
          </Table>
        </div>
      </Card>
      <p className="small muted" style={{ marginTop: 12 }}>
        Staff keeps &quot;Apply&quot; and &quot;View own&quot; for everyone. The approval workflow sends each stage to every active holder of that stage&apos;s review permission, and nobody can review their own application. Changes apply immediately and are written to the audit log.
      </p>
    </>
  );
}

function RoleDialog({ role, roles, onClose, onSaved }) {
  const t = useT();
  const isNew = !role;
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [active, setActive] = useState(role ? role.active : true);
  const [copyFrom, setCopyFrom] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError(t('Enter a role name.'));
    setBusy(true);
    setError(null);
    try {
      if (isNew) {
        const src = roles.find((r) => r.id === copyFrom);
        const permissions = src ? src.permissions.filter((p) => !['loan.apply', 'loan.viewOwn'].includes(p)) : [];
        await rolesApi.create({ name: name.trim(), description, permissions });
        onSaved(t('{name} created. Set its permissions in the matrix.', { name: name.trim() }));
      } else {
        await rolesApi.update(role.id, { name: name.trim(), description, active });
        onSaved(t('Role saved'));
      }
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const remove = async () => {
    setBusy(true);
    try {
      await rolesApi.remove(role.id);
      onSaved(`${role.name} deleted`);
    } catch (err) {
      setError(apiError(err).message);
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>
          {isNew ? t('New role') : t(role.name)}
          {!isNew && <span className="small muted" style={{ display: 'block', fontWeight: 400 }}>{role.system ? t('System role: can be renamed or deactivated but not deleted.') : t('Custom role')}</span>}
        </DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label={t('Role name')} required value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label={t('What the role is for')} value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} />
          {isNew ? (
            <TextField select label={t('Start with the permissions of')} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
              <MenuItem value="">{t('No permissions')}</MenuItem>
              {roles.map((r) => <MenuItem key={r.id} value={r.id}>{t(r.name)}</MenuItem>)}
            </TextField>
          ) : (
            <>
              <FormControlLabel control={<Checkbox checked={active} disabled={role.code === 'staff'} onChange={(e) => setActive(e.target.checked)} />} label={t('Active. Inactive roles grant nothing but stay assigned.')} />
              <p className="small" style={{ margin: 0 }}>{t(role.holders === 1 ? 'Held by {n} person.' : 'Held by {n} people.', { n: role.holders })}</p>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!isNew && !role.system && (
            <Button color="error" sx={{ mr: 'auto', color: 'var(--bad)' }} disabled={busy || role.holders > 0} title={role.holders ? t('Remove it from every user first') : undefined} onClick={remove}>{t('Delete role')}</Button>
          )}
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy}>{isNew ? t('Create role') : t('Save role')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function RolesList({ roles, onEdit, onNew }) {
  const t = useT();
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
        <h3>{t('Roles')}</h3>
        <Button size="small" variant="contained" onClick={onNew}>{t('New role')}</Button>
      </div>
      <div className="tablewrap">
        <Table aria-label={t('Roles')}>
          <TableHead>
            <TableRow>
              <TableCell>{t('Role')}</TableCell>
              <TableCell>{t('Type')}</TableCell>
              <TableCell>{t('Description')}</TableCell>
              <TableCell align="right">{t('Users')}</TableCell>
              <TableCell align="right">{t('Permissions')}</TableCell>
              <TableCell>{t('Status')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((r) => (
              <TableRow key={r.id}>
                <TableCell><b>{t(r.name)}</b></TableCell>
                <TableCell>{r.system ? t('System') : t('Custom')}</TableCell>
                <TableCell className="small">{t(r.description)}</TableCell>
                <TableCell align="right" className="num">{r.holders}</TableCell>
                <TableCell align="right" className="num">{r.permissions.length}</TableCell>
                <TableCell>{r.active ? <Chip size="small" color="success" label={t('Active')} /> : <Chip size="small" label={t('Inactive')} />}</TableCell>
                <TableCell align="right"><Button size="small" onClick={() => onEdit(r)}>{t('Edit')}</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function SodRules({ catalogue, roles }) {
  const t = useT();
  const labels = (kinds) => catalogue.permissions.filter((p) => kinds.includes(p.kind)).map((p) => t(p.label)).join(', ');
  const roleConflicts = roles.flatMap((r) => conflictsFor(r.active ? r.permissions : [], catalogue).map((c) => t('Role {role}: {conflict}.', { role: t(r.name), conflict: t(c.name).toLowerCase() })));
  return (
    <div className="stack">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
          <h3>{t('Segregation-of-duties rules')}</h3>
          <span className="small muted">{t('Checked on every save')}</span>
        </div>
        <div style={{ padding: 24 }}>
          {catalogue.sodRules.map((r, i) => (
            <div key={r.id} style={{ paddingTop: i ? 16 : 0, marginTop: i ? 16 : 0, borderTop: i ? '1px solid var(--line-2)' : 0 }}>
              <h4>{t(r.name)}</h4>
              <p className="small" style={{ margin: '4px 0 6px' }}>{t(r.why)}</p>
              <div className="small muted">
                {t('Blocked combination:')}{' '}
                {r.all ? r.all.map((id) => t(catalogue.permissions.find((p) => p.id === id)?.label)).join(` ${t('with')} `) : <>{labels(r.a)} <b>{t('with')}</b> {labels(r.b)}</>}.
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}><h3>{t('Current check')}</h3></div>
        <div style={{ padding: 24 }}>
          {roleConflicts.length ? (
            <Alert severity="error"><AlertTitle>{t('{n} conflicts', { n: roleConflicts.length })}</AlertTitle>{roleConflicts.map((c) => <div key={c}>{c}</div>)}</Alert>
          ) : (
            <Alert severity="success"><AlertTitle>{t('No conflicts')}</AlertTitle>{t('No role breaks a rule. User combinations are checked whenever roles are assigned.')}</Alert>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function RolesPage() {
  const t = useT();
  const [tab, setTab] = useState('matrix');
  const [roles, setRoles] = useState([]);
  const [catalogue, setCatalogue] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null);

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([rolesApi.list(), rolesApi.catalogue()]);
      setRoles(r);
      setCatalogue(c);
    } catch (err) {
      setError(apiError(err).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const saved = (message) => {
    setDialog(null);
    if (message) setToast(message);
    load();
  };

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>{t('Roles and permissions')}</h1>
          <p>{t('Decide what each role can do and keep duties separate. Assign roles to people in Users and roles.')}</p>
        </div>
        <Button component={RouterLink} to="/admin/users">{t('Users and roles')}</Button>
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" allowScrollButtonsMobile>
        <Tab value="matrix" label={t('Permission matrix')} />
        <Tab value="roles" label={`Roles (${roles.length})`} />
        <Tab value="sod" label={t('Segregation of duties')} />
      </Tabs>
      {!catalogue ? (
        <p className="muted" role="status">{t('Loading…')}</p>
      ) : (
        <>
          {tab === 'matrix' && <Matrix roles={roles} catalogue={catalogue} onSaved={saved} />}
          {tab === 'roles' && <RolesList roles={roles} onEdit={(r) => setDialog({ role: r })} onNew={() => setDialog({ role: null })} />}
          {tab === 'sod' && <SodRules catalogue={catalogue} roles={roles} />}
        </>
      )}
      {dialog && <RoleDialog role={dialog.role} roles={roles} onClose={() => setDialog(null)} onSaved={saved} />}
    </div>
  );
}
