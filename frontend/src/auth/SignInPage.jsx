import { useState } from 'react'
import { Activity, LoaderCircle, LockKeyhole } from 'lucide-react'
import { useAuth } from './AuthContext.js'

function SignInPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signIn')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'signUp') {
        const result = await signUp(name.trim(), email.trim(), password)
        if (!result.session) {
          setNotice('Account created. Check your email and confirm your address, then sign in to create your organization.')
        } else {
          setNotice('Account created. Next, set up your organization.')
        }
      } else {
        await signIn(email.trim(), password)
      }
    } catch (authError) {
      console.error(`Supabase ${mode === 'signUp' ? 'sign-up' : 'sign-in'} failed:`, authError)
      setError(authError.message || `${mode === 'signUp' ? 'Sign-up' : 'Sign-in'} failed. Check your details and try again.`)
    } finally {
      setSubmitting(false)
    }
  }

  const isSignUp = mode === 'signUp'

  return (
    <main className="auth-page">
      <section aria-labelledby="sign-in-title" className="auth-card">
        <div className="auth-brand"><span className="brand-symbol"><Activity size={20} /></span><strong>SpendWise</strong></div>
        <span className="auth-icon"><LockKeyhole size={19} /></span>
        <span className="eyebrow">{isSignUp ? 'CREATE YOUR WORKSPACE' : 'SECURE WORKSPACE'}</span>
        <h1 id="sign-in-title">{isSignUp ? 'Get started with SpendWise' : 'Sign in to SpendWise'}</h1>
        <p>{isSignUp ? 'Create your account, then set up an organization where you’ll be the admin.' : 'Sign in to your SpendWise organization or create a new account.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {isSignUp && <label>Your name<input autoComplete="name" autoFocus onChange={(event) => setName(event.target.value)} required value={name} /></label>}
          <label>Email address<input autoComplete="email" autoFocus={!isSignUp} onChange={(event) => { setEmail(event.target.value); setNotice('') }} required type="email" value={email} /></label>
          <label>Password<input autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={isSignUp ? 8 : undefined} onChange={(event) => { setPassword(event.target.value); setNotice('') }} required type="password" value={password} /></label>
          {isSignUp && <small className="auth-password-hint">Use at least 8 characters.</small>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          <button className="primary-button" disabled={submitting} type="submit">{submitting ? <LoaderCircle className="auth-spinner" size={16} /> : null}{submitting ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create account' : 'Sign in')}</button>
        </form>
        <p className="auth-footnote">{isSignUp ? 'Already have an account?' : 'New to SpendWise?'} <button className="auth-mode-toggle" onClick={() => { setMode(isSignUp ? 'signIn' : 'signUp'); setError(''); setNotice('') }} type="button">{isSignUp ? 'Sign in' : 'Create an account'}</button></p>
      </section>
    </main>
  )
}

export default SignInPage
