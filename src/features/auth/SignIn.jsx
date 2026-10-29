// Sign-in (FR-53). Logic ported from Ess-Frontend/src/pages/login/Login.jsx; the
// layout is replaced by the prototype's sign-in design. Adds staff-number
// validation, remaining attempts, lockout, MFA code and first-time enrolment.

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, Button, TextField, InputAdornment } from '@mui/material';
import { authApi } from '../../api/auth';
import { apiError, setAccessToken } from '../../api/client';
import { sessionStarted } from '../../store/authSlice';
import OtpInput from './OtpInput';
import logo from '../../assets/lfb-logo.png';
import s from './SignIn.module.css';

const STAFF_NO = /^LFB\d{4}$/;

function BrandPanel() {
  return (
    <div className={s.art}>
      <svg className={s.geo} viewBox="0 0 600 520" aria-hidden="true" preserveAspectRatio="xMaxYMin slice">
        <polygon points="420,0 600,312 240,312" fill="#FFC20E" />
        <polygon points="420,0 330,156 510,156" fill="#000" opacity=".14" />
        <polygon points="560,250 640,390 480,390" fill="#FFC20E" opacity=".35" />
      </svg>
      <div className={s.artbody}>
        <span className={s.tagline}>Tunaboresha maisha</span>
        <h1>Staff Loans</h1>
        <p>Apply, sign and follow your staff loan from one place, from the first form to the money in your account.</p>
        <div className={s.peek} aria-hidden="true">
          <div className={s.peekH}>
            <span>
              <b>Personal loan</b>
              <small>SL-2026-00031</small>
            </span>
            <span className={s.amt}>TZS 3,000,000</span>
          </div>
          <ol className={s.peekT}>
            <li className={s.done}><i />Signed</li>
            <li className={s.done}><i />Credit</li>
            <li className={s.now}><i />HR</li>
            <li><i />CEO</li>
            <li><i />Paid</li>
          </ol>
          <div className={s.peekF}>
            <span className={s.dot} />
            With People and Culture · due Thursday
          </div>
        </div>
        <ul className={s.perks}>
          <li><b>Sign once.</b> Read and sign the agreement as you apply.</li>
          <li><b>See where it is.</b> Every approval, owner and due date.</li>
          <li><b>Repay by salary.</b> Deductions start after disbursement.</li>
        </ul>
      </div>
    </div>
  );
}

function CredentialsStep({ onResult }) {
  const [staffNo, setStaffNo] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const sn = staffNo.trim().toUpperCase();
    const errs = {};
    if (!sn) errs.staffNo = 'Enter your staff number.';
    else if (!STAFF_NO.test(sn)) errs.staffNo = 'Staff numbers look like LFB0412.';
    if (!password) errs.password = 'Enter your password.';
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      onResult(await authApi.login(sn, password), sn);
    } catch (err) {
      const e2 = apiError(err);
      if (e2.code === 'ACCOUNT_LOCKED') onResult({ locked: true });
      else if (e2.details?.staffNo) setErrors({ staffNo: e2.details.staffNo[0] });
      else setFormError({ title: e2.code === 'INVALID_CREDENTIALS' ? 'The staff number or password is not right' : e2.message, remaining: e2.details?.remainingAttempts, body: e2.code === 'INVALID_CREDENTIALS' ? null : undefined });
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <span className={s.eyebrow}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        Secure staff sign-in
      </span>
      <h2>Karibu. Sign in to continue.</h2>
      <p className={s.lead}>Use your LFB staff number and network password.</p>
      {formError && (
        <Alert severity="error" sx={{ mt: 2 }} role="alert">
          <AlertTitle>{formError.title}</AlertTitle>
          {formError.remaining !== undefined && `${formError.remaining} ${formError.remaining === 1 ? 'attempt' : 'attempts'} left before the account locks.`}
        </Alert>
      )}
      <form className={s.fields} onSubmit={submit} noValidate autoComplete="off">
        <TextField
          id="sn"
          label="Staff number"
          placeholder="LFB0000"
          value={staffNo}
          onChange={(e) => setStaffNo(e.target.value)}
          error={!!errors.staffNo}
          helperText={errors.staffNo || 'LFB followed by 4 digits, as on your staff ID.'}
          inputProps={{ autoCapitalize: 'characters', spellCheck: false }}
        />
        <TextField
          id="pw"
          label="Password"
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={!!errors.password}
          helperText={errors.password}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button variant="text" size="small" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? 'Hide' : 'Show'}
                </Button>
              </InputAdornment>
            ),
          }}
        />
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ minHeight: 48 }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <div className={s.help}>
        <span>Forgot your password?</span> Call the IT Service Desk on ext. 2100. They will issue a temporary password once they confirm who you are.
      </div>
    </>
  );
}

function CodeStep({ mfaToken, onDone, onBack, onLocked }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter all 6 digits.');
    setBusy(true);
    try {
      onDone(await authApi.mfaVerify(mfaToken, code));
    } catch (err) {
      const e2 = apiError(err);
      if (e2.code === 'ACCOUNT_LOCKED') return onLocked();
      if (e2.code === 'MFA_TOKEN_INVALID') return onBack(e2.message);
      setError(`${e2.message}${e2.details?.remainingAttempts !== undefined ? ` ${e2.details.remainingAttempts} attempts left.` : ''}`);
      setCode('');
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <>
      <h2>Enter your one-time code</h2>
      <p className={s.lead}>Open your authenticator app and enter the 6-digit code for Staff Loans. Reviewers, OPS and administrators confirm a code at every sign-in.</p>
      <form className={s.fields} onSubmit={submit} noValidate autoComplete="off">
        <div>
          <label htmlFor="otp0" className="small" style={{ fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>6-digit code</label>
          <OtpInput value={code} onChange={setCode} invalid={!!error} describedBy="otph" />
          <div id="otph" className="xs" style={{ marginTop: 6, color: error ? 'var(--bad)' : 'var(--ink-3)', fontWeight: error ? 600 : 400 }} role={error ? 'alert' : undefined}>
            {error || 'The code changes every 30 seconds.'}
          </div>
        </div>
        <Button type="submit" variant="contained" fullWidth sx={{ minHeight: 48 }} disabled={busy}>Verify and continue</Button>
        <p className="small muted" style={{ margin: 0 }}>
          Lost your device? Contact the IT Service Desk.{' '}
          <Button variant="text" size="small" onClick={() => onBack()}>Use a different account</Button>
        </p>
      </form>
    </>
  );
}

function EnrolStep({ mfaToken, onDone, onBack, onLocked }) {
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      setSetup(await authApi.mfaEnrolStart(mfaToken));
    } catch (err) {
      onBack(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter all 6 digits.');
    setBusy(true);
    try {
      onDone(await authApi.mfaEnrolConfirm(mfaToken, code));
    } catch (err) {
      const e2 = apiError(err);
      if (e2.code === 'ACCOUNT_LOCKED') return onLocked();
      if (e2.code === 'MFA_TOKEN_INVALID') return onBack(e2.message);
      setError(e2.message);
      setCode('');
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <>
      <h2>Set up your authenticator app</h2>
      <p className={s.lead}>Your role reviews, disburses or administers loans, so Staff Loans asks for a one-time code at every sign-in. Use Microsoft Authenticator, Google Authenticator or a similar app.</p>
      {!setup ? (
        <div className={s.fields}>
          <Button variant="contained" fullWidth sx={{ minHeight: 48 }} onClick={start} disabled={busy}>Show my QR code</Button>
          <Button variant="text" onClick={() => onBack()}>Use a different account</Button>
        </div>
      ) : (
        <form className={s.fields} onSubmit={submit} noValidate autoComplete="off">
          <ol className="small" style={{ margin: 0, paddingLeft: 20 }}>
            <li>In the app, add an account and scan this code.</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          <img className={s.qr} src={setup.qrDataUrl} alt="QR code to add Staff Loans to your authenticator app" />
          <details className="small">
            <summary>Can&apos;t scan? Enter this key instead</summary>
            <p className={s.secret}>{setup.secret}</p>
          </details>
          <div>
            <label htmlFor="otp0" className="small" style={{ fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>6-digit code</label>
            <OtpInput value={code} onChange={setCode} invalid={!!error} describedBy="enrolh" />
            <div id="enrolh" className="xs" style={{ marginTop: 6, color: error ? 'var(--bad)' : 'var(--ink-3)', fontWeight: error ? 600 : 400 }} role={error ? 'alert' : undefined}>
              {error || 'The code changes every 30 seconds.'}
            </div>
          </div>
          <Button type="submit" variant="contained" fullWidth sx={{ minHeight: 48 }} disabled={busy}>Confirm and sign in</Button>
        </form>
      )}
    </>
  );
}

function LockedStep({ onBack }) {
  return (
    <>
      <h2>Your account is locked</h2>
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Too many failed sign-in attempts</AlertTitle>
        For your security, Staff Loans locked this account after 5 failed attempts. The IT Service Desk can unlock it once they confirm who you are.
      </Alert>
      <div className={s.fields}>
        <Button fullWidth onClick={() => onBack()}>Back to sign in</Button>
      </div>
    </>
  );
}

const ENDED = {
  idle: 'You were signed out after a period of inactivity. Sign in again to continue.',
  expired: 'Your session has ended. Sign in again to continue.',
};

export default function SignIn() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, endedReason } = useSelector((st) => st.auth);
  const [step, setStep] = useState({ name: 'creds' });
  const [notice, setNotice] = useState(endedReason ? ENDED[endedReason] : null);

  if (status === 'signedIn') return <Navigate to={location.state?.from || '/'} replace />;

  const finish = (session) => {
    setAccessToken(session.accessToken);
    dispatch(sessionStarted(session));
    navigate(session.user.mustChangePassword ? '/change-password' : location.state?.from || '/', { replace: true });
  };
  const back = (message) => {
    setNotice(message || null);
    setStep({ name: 'creds' });
  };
  const locked = () => setStep({ name: 'locked' });

  const onCredentials = (result) => {
    setNotice(null);
    if (result.locked) return locked();
    if (result.mfaRequired) return setStep({ name: 'code', mfaToken: result.mfaToken });
    if (result.enrolRequired) return setStep({ name: 'enrol', mfaToken: result.mfaToken });
    return finish(result);
  };

  return (
    <main className={s.login}>
      <BrandPanel />
      <div className={s.form}>
        <img className={s.logo} src={logo} alt="Letshego Faidika Bank" />
        {notice && step.name === 'creds' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {notice}
          </Alert>
        )}
        {step.name === 'creds' && <CredentialsStep onResult={onCredentials} />}
        {step.name === 'code' && <CodeStep mfaToken={step.mfaToken} onDone={finish} onBack={back} onLocked={locked} />}
        {step.name === 'enrol' && <EnrolStep mfaToken={step.mfaToken} onDone={finish} onBack={back} onLocked={locked} />}
        {step.name === 'locked' && <LockedStep onBack={back} />}
        <div className={s.lfoot}>
          <p>For authorised Letshego Faidika Bank staff only. Sign-ins and activity are recorded. Available on the LFB network.</p>
        </div>
      </div>
    </main>
  );
}
