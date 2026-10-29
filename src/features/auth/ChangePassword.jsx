import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Alert, AlertTitle, Button, Card, CardContent, TextField } from '@mui/material';
import { authApi } from '../../api/auth';
import { apiError } from '../../api/client';
import { profileUpdated } from '../../store/authSlice';

// Policy shown before typing (DECISIONS Q2). The server enforces it.
const RULES = ['At least 8 characters', 'Three of: lower-case letters, capital letters, numbers, symbols', 'Not your staff number', 'Not one of your last 5 passwords'];

export default function ChangePassword() {
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
          <h1>Change password</h1>
          <p>{user.mustChangePassword ? 'You signed in with a temporary password. Choose your own to continue.' : 'Other sessions are signed out when you change it.'}</p>
        </div>
      </div>
      {done && <Alert severity="success" sx={{ mb: 2 }}>Password changed.</Alert>}
      {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'grid', gap: 16 }}>
            <TextField label="Current password" type="password" autoComplete="current-password" required {...register('currentPassword', { required: 'Enter your current password.' })} error={!!errors.currentPassword} helperText={errors.currentPassword?.message} />
            <TextField label="New password" type="password" autoComplete="new-password" required {...register('newPassword', { required: 'Enter a new password.', minLength: { value: 8, message: 'Use at least 8 characters.' } })} error={!!errors.newPassword} helperText={errors.newPassword?.message} />
            <TextField label="Repeat the new password" type="password" autoComplete="new-password" required {...register('confirm', { required: 'Repeat the new password.' })} error={!!errors.confirm} helperText={errors.confirm?.message} />
            <Alert severity="info" icon={false}>
              <AlertTitle>Your password needs</AlertTitle>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
            </Alert>
            <div className="row">
              <Button type="submit" variant="contained" disabled={isSubmitting}>Change password</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
