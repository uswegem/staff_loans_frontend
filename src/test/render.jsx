import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PreferencesProvider } from '../i18n';
import { makeStore } from '../store';

const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true };

/** Renders an element at a route as a signed-in user with the given permissions. */
export function renderAt(path, pattern, element, { permissions = [], userId = 'u-test' } = {}) {
  const store = makeStore({
    auth: { status: 'signedIn', user: { id: userId, fullName: 'Asha Mfinanga', staffNo: 'LFB0010', mustChangePassword: false }, roles: [], permissions, mfaRequired: true, inactivityTimeoutMin: 15, endedReason: null },
  });
  return render(
    <Provider store={store}>
      <PreferencesProvider>
        <MemoryRouter initialEntries={[path]} future={FUTURE}>
          <Routes>
            <Route path={pattern} element={element} />
            <Route path="*" element={<p>Elsewhere</p>} />
          </Routes>
        </MemoryRouter>
      </PreferencesProvider>
    </Provider>
  );
}
