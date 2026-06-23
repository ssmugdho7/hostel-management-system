import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { fieldsFromErrors } from '../../utils/errors';
import FieldError from '../../components/shared/FieldError';

export default function AuthPage() {
  const { login, register } = useAuth();
  const { notify } = useToast();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    email: 'rahim@hostel.test',
    phone: '',
    nid: '',
    password: 'password123',
    password_confirmation: '',
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        notify('Login successful');
      } else {
        const data = await register({
          name: form.name,
          email: form.email,
          phone: form.phone,
          nid: form.nid,
          password: form.password,
          password_confirmation: form.password_confirmation,
        });
        notify(data.message);
        setMode('login');
      }
    } catch (error) {
      setErrors(error.errors || {});
      notify(fieldsFromErrors(error.errors) || error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-block">
          <span className="brand-mark">HM</span>
          <div>
            <h1>Hostel Management</h1>
            <p>Resident and admin workspace</p>
          </div>
        </div>

        <div className="segmented" role="tablist" aria-label="Authentication">
          <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => setMode('login')}>
            Login
          </button>
          <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => setMode('register')}>
            Register
          </button>
        </div>

        <form className="form-grid" onSubmit={submit}>
          {mode === 'register' && (
            <>
              <label>
                Name
                <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
                <FieldError errors={errors} name="name" />
              </label>
              <label>
                Phone
                <input value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
                <FieldError errors={errors} name="phone" />
              </label>
              <label>
                NID
                <input value={form.nid} onChange={(e) => update('nid', e.target.value)} required />
                <FieldError errors={errors} name="nid" />
              </label>
            </>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
            <FieldError errors={errors} name="email" />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
            <FieldError errors={errors} name="password" />
          </label>
          {mode === 'register' && (
            <label>
              Confirm Password
              <input
                type="password"
                value={form.password_confirmation}
                onChange={(e) => update('password_confirmation', e.target.value)}
                required
              />
            </label>
          )}
          <button className="primary-action" type="submit" disabled={loading}>
            {loading ? 'Working...' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>

        <div className="demo-logins">
          <button
            type="button"
            onClick={() => setForm((c) => ({ ...c, email: 'rahim@hostel.test', password: 'password123' }))}
          >
            Customer demo
          </button>
          <button
            type="button"
            onClick={() => setForm((c) => ({ ...c, email: 'admin@hostel.test', password: 'password123' }))}
          >
            Admin demo
          </button>
        </div>
      </section>
    </main>
  );
}
