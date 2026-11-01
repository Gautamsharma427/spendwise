import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const hasAnySupabaseSetting = Boolean(supabaseUrl || supabaseAnonKey)
const configurationError = hasAnySupabaseSetting && !(supabaseUrl && supabaseAnonKey)
  ? 'Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local.'
  : ''
const configured = Boolean(supabaseUrl && supabaseAnonKey)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [supabase, setSupabase] = useState(null)
  const [loading, setLoading] = useState(configured)
  const [initializationError, setInitializationError] = useState('')

  useEffect(() => {
    if (!configured) return undefined

    let active = true
    let subscription
    import('@supabase/supabase-js').then(({ createClient }) => {
      if (!active) return
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
      })
      setSupabase(client)
      const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
        if (active) {
          setSession(nextSession)
          setLoading(false)
        }
      })
      subscription = data.subscription
      return client.auth.getSession()
    }).then((result) => {
      if (!active || !result) return
      const { data, error } = result
      if (error) console.error('Could not restore the Supabase session:', error)
      setSession(data.session)
      setLoading(false)
    }).catch((error) => {
      if (!active) return
      console.error('Could not initialize Supabase authentication:', error)
      setInitializationError('Supabase authentication could not be initialized. Check the frontend configuration and reload.')
      setLoading(false)
    })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Supabase authentication is not ready.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [supabase])

  const signUp = useCallback(async (name, email, password) => {
    if (!supabase) throw new Error('Supabase authentication is not ready.')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) throw error
    return data
  }, [supabase])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [supabase])

  const value = useMemo(() => ({
    configured,
    configurationError,
    initializationError,
    loading,
    session,
    signIn,
    signUp,
    signOut,
  }), [initializationError, loading, session, signIn, signUp, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
