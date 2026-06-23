import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageTitle from '../../components/shared/PageTitle';
import SectionHeader from '../../components/shared/SectionHeader';
import LoadingBlock from '../../components/shared/LoadingBlock';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { fieldsFromErrors } from '../../utils/errors';
import { formatMoney, seatLabel } from '../../utils/format';

export default function ProfilePage() {
  const { setUser } = useAuth();
  const { notify } = useToast();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', nid: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiClient
      .get('/profile')
      .then((res) => {
        if (!mounted) return;
        setProfile(res.data);
        setForm({
          name: res.data.user?.name || '',
          phone: res.data.user?.phone || '',
          nid: res.data.user?.nid || '',
        });
      })
      .catch((err) => notify(err.message, 'error'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [notify]);

  async function submit(event) {
    event.preventDefault();
    try {
      const { data } = await apiClient.put('/profile', form);
      notify(data.message);
      setUser(data.user);
      setProfile((current) => ({ ...current, user: data.user }));
    } catch (err) {
      notify(fieldsFromErrors(err.errors) || err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageTitle title="Profile" subtitle={profile?.user?.email} />
      <section className="two-column align-start">
        <form className="panel form-grid" onSubmit={submit}>
          <SectionHeader title="Personal details" />
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            />
          </label>
          <label>
            Phone
            <input
              value={form.phone}
              onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
            />
          </label>
          <label>
            NID
            <input
              value={form.nid}
              onChange={(e) => setForm((current) => ({ ...current, nid: e.target.value }))}
            />
          </label>
          <button className="primary-action" type="submit">
            Save profile
          </button>
        </form>

        <div className="panel">
          <SectionHeader title="Account summary" />
          <div className="detail-grid">
            <span>Role</span>
            <strong>{profile?.user?.role}</strong>
            <span>Status</span>
            <strong>{profile?.user?.status}</strong>
            <span>Seat</span>
            <strong>{seatLabel(profile?.current_seat)}</strong>
            <span>Balance</span>
            <strong>{formatMoney(profile?.balance)}</strong>
            <span>Consumed rent</span>
            <strong>{formatMoney(profile?.consumed_rent)}</strong>
          </div>
        </div>
      </section>
    </>
  );
}
