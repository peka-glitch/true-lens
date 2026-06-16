import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import client from '../api/client'

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [profileForm, setProfileForm] = useState({ username: user?.username || '', email: user?.email || '' })
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [profileMsg, setProfileMsg] = useState(null)
  const [pwMsg, setPwMsg] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileMsg(null)
    setProfileLoading(true)
    try {
      await client.patch('/auth/profile/', profileForm)
      await refreshUser()
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err) {
      const data = err.response?.data
      const msg = data ? Object.values(data).flat()[0] : 'Failed to update profile.'
      setProfileMsg({ type: 'error', text: msg })
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwMsg(null)
    if (pwForm.new_password !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    setPwLoading(true)
    try {
      await client.post('/auth/change-password/', {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      })
      setPwMsg({ type: 'success', text: 'Password changed successfully.' })
      setPwForm({ old_password: '', new_password: '', confirm: '' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password.' })
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h2>Profile</h2>
        <p>Manage your account settings</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: 22 }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.username}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Member since {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : '—'}
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Edit Profile</h3>

        {profileMsg && (
          <div className={`alert alert-${profileMsg.type}`}>
            {profileMsg.type === 'success' ? '✅' : '⚠️'} {profileMsg.text}
          </div>
        )}

        <form onSubmit={handleProfileSave}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              value={profileForm.username}
              onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={profileForm.email}
              onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={profileLoading}>
            {profileLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Change Password</h3>

        {pwMsg && (
          <div className={`alert alert-${pwMsg.type}`}>
            {pwMsg.type === 'success' ? '✅' : '⚠️'} {pwMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              className="form-input"
              type="password"
              value={pwForm.old_password}
              onChange={e => setPwForm({ ...pwForm, old_password: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              className="form-input"
              type="password"
              value={pwForm.new_password}
              onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              className="form-input"
              type="password"
              value={pwForm.confirm}
              onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={pwLoading}>
            {pwLoading ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
