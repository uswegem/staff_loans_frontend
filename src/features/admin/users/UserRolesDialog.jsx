// "Assign roles to a user" (prototype rolesForm, FR-46, FR-48, FR-49). Logic ported
// from Ess-Frontend/src/pages/user/UserDetails.js (load one user, edit, save) and the
// role change in Users.js; restyled as the prototype dialog. The server re-checks SoD.

import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertTitle, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { usersApi } from '../../../api/admin';
import { apiError } from '../../../api/client';
import { isoDay } from '../../../lib/format';
import { conflictsFor, needsMfa } from './sod';
import { useT } from '../../../i18n';

export default function UserRolesDialog({ user, roles, catalogue, onClose, onSaved }) {
  const t = useT();
  const [picked, setPicked] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const init = {};
    user.assignments.forEach((a) => {
      init[a.roleId] = { on: true, endsOn: isoDay(a.endsOn) };
    });
    const staff = roles.find((r) => r.code === 'staff');
    if (staff) init[staff.id] = { on: true, endsOn: '' };
    setPicked(init);
  }, [user, roles]);

  const chosen = roles.filter((r) => picked[r.id]?.on);
  const effective = useMemo(() => {
    const set = new Set();
    chosen.filter((r) => r.active).forEach((r) => r.permissions.forEach((p) => set.add(p)));
    return [...set];
  }, [chosen]);
  const conflicts = conflictsFor(effective, catalogue);
  const label = (id) => t(catalogue.permissions.find((p) => p.id === id)?.label || id);

  const toggle = (id, on) => setPicked((p) => ({ ...p, [id]: { ...(p[id] || { endsOn: '' }), on } }));
  const setEnd = (id, endsOn) => setPicked((p) => ({ ...p, [id]: { ...(p[id] || { on: true }), endsOn } }));

  const save = async () => {
    setError(null);
    if (conflicts.length) {
      setError(`${conflicts[0].name}. ${conflicts[0].why}`);
      return;
    }
    setBusy(true);
    try {
      const saved = await usersApi.setRoles(
        user.id,
        chosen.map((r) => ({ roleId: r.id, endsOn: picked[r.id].endsOn || null }))
      );
      onSaved(saved);
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth aria-labelledby="roles-title">
      <DialogTitle id="roles-title" sx={{ pb: 0 }}>
        <span style={{ display: 'block', fontSize: 22, fontWeight: 700 }}>{t('Roles for {name}', { name: user.fullName })}</span>
        <span className="small muted" style={{ fontWeight: 400 }}>
          {user.staffNo}
          {user.title ? `, ${user.title}` : ''}
        </span>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {(error || conflicts.length > 0) && (
          <Alert severity="error" sx={{ my: 1.5 }} role="alert">
            <AlertTitle>{t('This combination is not allowed')}</AlertTitle>
            {error || `${conflicts[0].name}. ${conflicts[0].why}`}
          </Alert>
        )}
        <div className="tablewrap">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('Role')}</TableCell>
                <TableCell>{t('Assigned')}</TableCell>
                <TableCell>{t('Ends (optional)')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((r) => {
                const isStaff = r.code === 'staff';
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <b>{t(r.name)}</b> {!r.active && <span className="tag">{t('Inactive')}</span>}
                      <div className="xs muted">{t(r.description)}</div>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        inputProps={{ 'aria-label': t('Assign {role}', { role: t(r.name) }) }}
                        checked={isStaff || !!picked[r.id]?.on}
                        disabled={isStaff || (!r.active && !picked[r.id]?.on)}
                        onChange={(e) => toggle(r.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      {isStaff ? (
                        <span className="small muted">{t('Always')}</span>
                      ) : (
                        <TextField
                          type="date"
                          size="small"
                          sx={{ maxWidth: 180 }}
                          inputProps={{ 'aria-label': t('End date for {role}', { role: t(r.name) }), min: isoDay(new Date()) }}
                          value={picked[r.id]?.endsOn || ''}
                          disabled={!picked[r.id]?.on}
                          onChange={(e) => setEnd(r.id, e.target.value)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <h4 style={{ marginTop: 16 }}>
          {t('Effective permissions')} {needsMfa(effective, catalogue) && <Chip size="small" color="success" label={t('MFA required')} sx={{ ml: 1 }} />}
        </h4>
        <p className="small">{effective.map(label).join('; ') || t('None')}</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button variant="contained" onClick={save} disabled={busy}>{t('Save roles')}</Button>
      </DialogActions>
    </Dialog>
  );
}
