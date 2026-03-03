import { supabase } from './supabase'

export const autoLoginTestUser = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'luc@gmail.com',
    password: 's7uy3d00',
  })

  if (error) console.error('Erreur auto-login:', error)
  else console.log('Auto-login réussi:', data.user)
}
