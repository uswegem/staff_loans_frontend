import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Alert, AlertTitle, Button, Card, CardContent, TextField } from '@mui/material';
import { authApi } from '../../api/auth';
import { apiError } from '../../api/client';
import { profileUpdated } from '../../store/authSlice';
import { useT } from '../../i18n';

// Policy shown before typing (DECISIONS Q2). The server enforces it.
const RULES = ['At least 8 characters', 'Three of: lower-case letters, capital letters, numbers, symbols', 'Not your staff number', 'Not one of your last 5 passwords'];

export default function ChangePassword() {
  const t = useT();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((st) => st.auth.user);
  const [serverError, setServerError] = useState(null);
  const [done, setDone] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (v) => {
    setServerError(null);
    if (v.newPassword !== v.confirm) return setError('confirm', { message: 'The two new passwords do not match.' });
    try {
      const profile = await authApi.changePassword(v.currentPassword, v.newPassword);
      dispatch(profileUpdated(profile));
      setDone(true);
      if (user.mustChangePassword) navigate('/', { replace: true });
    } catch (err) {
      const e = apiError(err);
      if (e.details?.currentPassword) setError('currentPassword', { message: e.details.currentPassword[0] });
      else if (e.details?.password) setError('newPassword', { message: e.details.password.join(' ') });
      else setServerError(e.message);
    }
    return undefined;
  };

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <div className="pagehead">
        <div>
          <h1>{t('Change password')}</h1>
          <p>{user.mustChangePassword ? t('You signed in with a temporary password. Choose your own to continue.') : t('Other sessions are signed out when you change it.')}</p>
        </div>
      </div>
      {done && <Alert severity="success" sx={{ mb: 2 }}>{t('Password changed.')}</Alert>}
      {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'grid', gap: 16 }}>
            <TextField label={t('Current password')} type="password" autoComplete="current-password" required {...register('currentPassword', { required: 'Enter your current password.' })} error={!!errors.currentPassword} helperText={errors.currentPassword?.message && t(errors.currentPassword.message)} />
            <TextField label={t('New password')} type="password" autoComplete="new-password" required {...register('newPassword', { required: 'Enter a new password.', minLength: { value: 8, message: 'Use at least 8 characters.' } })} error={!!errors.newPassword} helperText={errors.newPassword?.message && t(errors.newPassword.message)} />
            <TextField label={t('Repeat the new password')} type="password" autoComplete="new-password" required {...register('confirm', { required: 'Repeat the new password.' })} error={!!errors.confirm} helperText={errors.confirm?.message && t(errors.confirm.message)} />
            <Alert severity="info" icon={false}>
              <AlertTitle>{t('Your password needs')}</AlertTitle>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{RULES.map((r) => <li key={r}>{t(r)}</li>)}</ul>
            </Alert>
            <div className="row">
              <Button type="submit" variant="contained" disabled={isSubmitting}>{t('Change password')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
