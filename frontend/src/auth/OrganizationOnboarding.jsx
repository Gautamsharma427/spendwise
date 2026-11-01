import { useState } from 'react'
import { Activity, Building2, LoaderCircle } from 'lucide-react'

function OrganizationOnboarding({ email, suggestedName, onCreate, signingOut, onSignOut }) {
  const [name, setName] = useState(suggestedName)
  const [organizationName, setOrganizationName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onCreate({ organizationName: organizationName.trim(), userName: name.trim(), currency })
    } catch (createError) {
      console.error('Organization setup failed:', createError)
      setError(createError.message || 'Your organization could not be created. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section aria-labelledby="organization-onboarding-title" className="auth-card">
        <div className="auth-brand"><span className="brand-symbol"><Activity size={20} /></span><strong>SpendWise</strong></div>
        <span className="auth-icon"><Building2 size={19} /></span>
        <span className="eyebrow">ONE LAST STEP</span>
        <h1 id="organization-onboarding-title">Set up your organization</h1>
        <p>Your account is ready. Create a workspace to keep your organization’s data private and secure.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>Your name<input autoComplete="name" autoFocus onChange={(event) => setName(event.target.value)} required value={name} /></label>
          <label>Organization name<input autoComplete="organization" onChange={(event) => setOrganizationName(event.target.value)} required value={organizationName} /></label>
          <label>Reporting currency<select onChange={(event) => setCurrency(event.target.value)} value={currency}><option value="INR">Indian Rupee (INR)</option><option value="USD">US Dollar (USD)</option><option value="EUR">Euro (EUR)</option><option value="GBP">British Pound (GBP)</option></select></label>
          <label>Email address<input readOnly type="email" value={email} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={submitting} type="submit">{submitting ? <LoaderCircle className="auth-spinner" size={16} /> : null}{submitting ? 'Creating workspace…' : 'Create organization'}</button>
        </form>
        <p className="auth-footnote">You’ll become this organization’s admin. Your records are isolated from other organizations.</p>
        <button className="auth-mode-toggle" disabled={signingOut} onClick={onSignOut} type="button">Sign out</button>
      </section>
    </main>
  )
}

export default OrganizationOnboarding
