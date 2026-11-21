import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { TablePagination } from '@mui/material';
import { PreferencesProvider } from './index';
import { makeStore } from '../store';

describe('table pagination', () => {
  it('uses the interface language', () => {
    window.localStorage.setItem('slas.preferences', JSON.stringify({ language: 'sw', theme: 'light' }));
    render(
      <Provider store={makeStore()}>
        <PreferencesProvider>
          <TablePagination component="div" count={13} page={0} onPageChange={() => {}} rowsPerPage={10} onRowsPerPageChange={() => {}} />
        </PreferencesProvider>
      </Provider>
    );
    expect(screen.getByText('Safu kwa ukurasa:')).toBeInTheDocument();
    expect(screen.getByText('1–10 kati ya 13')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nenda ukurasa unaofuata' })).toBeInTheDocument();
    window.localStorage.removeItem('slas.preferences');
  });
});
