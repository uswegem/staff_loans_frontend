// A new product starts as a draft (FR-58); it goes live only after a checker approves it.

import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, CardContent, Link, TextField } from '@mui/material';
import { productsApi } from '../../../api/products';
import { apiError } from '../../../api/client';
import { todayEat } from '../../../lib/dates';
import { failureShown, useLiveErrors } from '../../../lib/validation';
import ProductForm, { EMPTY_PRODUCT } from './ProductForm';
import s from './products.module.css';
import { useT } from '../../../i18n';

export default function NewProductPage() {
  const t = useT();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(todayEat());
  const [note, setNote] = useState('');
  const [values, setValues] = useState(EMPTY_PRODUCT);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const live = useLiveErrors(errors, { ...values, code, effectiveFrom });

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const v = await productsApi.create({ code: code.trim().toUpperCase(), effectiveFrom, note, values });
      navigate(`/admin/products/versions/${v.id}`);
    } catch (err) {
      const x = apiError(err);
      const details = {};
      Object.entries(x.details || {}).forEach(([k, msgs]) => {
        details[k.replace(/^values\./, '')] = msgs;
      });
      setErrors(details);
      setFailure(x);
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}>
        <Link component={RouterLink} to="/admin/products" color="inherit">{t('Products and pricing')}</Link>
      </div>
      <div className="pagehead">
        <div>
          <h1>{t('New product')}</h1>
          <p>{t('Saved as a draft. It goes live only after a different person approves it.')}</p>
        </div>
      </div>
      <div className="stack">
        {failureShown(failure, errors, live) && <Alert severity="error">{failure.message}</Alert>}
        <div className={s.layout}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <ProductForm values={values} onChange={setValues} errors={live} />
            </CardContent>
          </Card>
          <Card className={s.sticky}>
            <CardContent sx={{ p: 3, display: 'grid', gap: 2 }}>
              <TextField label={t('Product code')} required value={code} onChange={(e) => setCode(e.target.value)} error={!!live.code} helperText={live.code?.join(' ') || '2 to 10 capital letters or digits. It never changes.'} inputProps={{ maxLength: 10, autoCapitalize: 'characters' }} />
              <TextField label={t('Effective from')} type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} inputProps={{ min: todayEat() }} error={!!live.effectiveFrom} helperText={live.effectiveFrom?.join(' ')} />
              <TextField label={t('Why this product')} multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button variant="contained" onClick={create} disabled={busy}>{t('Save draft')}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
