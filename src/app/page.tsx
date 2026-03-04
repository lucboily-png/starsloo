'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'
import './home.css'
import { usePathname } from "next/navigation";

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState<'FR' | 'EN'>('FR')

  const [showContact, setShowContact] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactBusiness, setContactBusiness] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactLoading, setContactLoading] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) window.location.href = '/dashboard'
    }
    checkUser()
  }, [])

  const handleLogin = async () => {
    if (!email || !password) return alert(lang === 'FR' ? 'Veuillez entrer email et mot de passe' : 'Please enter email and password')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return alert(error.message)
    window.location.href = '/dashboard'
  }

  const handleContactSubmit = async (e: any) => {
    e.preventDefault()
    if (!contactName || !contactBusiness || !contactEmail || !contactMessage) {
      return alert(lang === 'FR' ? 'Veuillez remplir tous les champs' : 'Please fill in all fields')
    }
    setContactLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          business: contactBusiness,
          email: contactEmail,
          message: contactMessage
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      alert(lang === 'FR' ? 'Message envoyé ✅' : 'Message sent ✅')
      setContactName('')
      setContactBusiness('')
      setContactEmail('')
      setContactMessage('')
      setShowContact(false)
    } catch (err: any) {
      alert(err.message)
    }
    setContactLoading(false)
  }

  function Logo({ lang }: { lang: "FR" | "EN" }) {
  return (
    <div style={{ textAlign: "center" }}>
      <img
        src="/images/logo.png"
        alt="Starsloo"
        style={{ height: "100px" }}
      />
      <p style={{ marginTop: "8px", margin:'-10px auto 40px auto', fontSize: "18px", color: "#555" }}>
        {lang === "FR"
          ? "La puissances des étoiles"
          : "The power of stars"}
      </p>
    </div>
  );
}

  return (
    <div className="home-container">
      {/* LANGUAGE SWITCH */}
      <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", padding: "0 40px 20px" }}>
        <button
          onClick={() => setLang(lang === "FR" ? "EN" : "FR")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#364899",
            color: "#fff",
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {lang === "FR" ? "EN" : "FR"}
        </button>
      </div>

 {/* LOGO */}
      {/* LOGO */}
      <Logo lang={lang} />
	  
      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-stars">
          <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
        </div>

        <h1 className="hero-title">
          {lang === 'FR'
            ? 'Boostez vos avis Google et votre visibilité !'
            : 'Boost your Google reviews and visibility!'}
        </h1>

        <p className="hero-subtitle">
          {lang === 'FR'
            ? 'Obtenez plus de retours positifs, améliorez votre réputation et attirez de nouveaux clients facilement.'
            : 'Get more positive feedback, improve your reputation, and attract new clients easily.'}
        </p>

        <button
          onClick={() => window.location.href = '/register'}
          className="btn-primary hero-btn"
        >
          {lang === 'FR' ? 'Créer un compte maintenant' : 'Create an account now'}
        </button>
      </section>

      {/* LOGIN CARD */}
      <div className="login-card">
        <h2 className="login-title">{lang === 'FR' ? 'Connexion' : 'Login'}</h2>

        <input
          type="email"
          placeholder={lang === 'FR' ? 'Email' : 'Email'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />

        <input
          type="password"
          placeholder={lang === 'FR' ? 'Mot de passe' : 'Password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="btn-primary home-btn"
        >
          {loading ? (lang === 'FR' ? 'Connexion...' : 'Logging in...') : (lang === 'FR' ? 'Se connecter' : 'Login')}
        </button>
      </div>

      {/* MARKETING SECTIONS HERO STYLE */}
      <section className="marketing-hero-sections">
        <div className="marketing-card">
		<span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
          <h3>{lang === 'FR' ? 'Attirez plus de clients' : 'Attract More Customers'}</h3>
          <p>{lang === 'FR' ? 'Utilisez les avis pour améliorer votre visibilité et booster vos ventes.' : 'Leverage reviews to boost visibility and sales.'}</p>
        </div>

        <div className="marketing-card">
		<span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
          <h3>{lang === 'FR' ? 'Gagnez en crédibilité' : 'Gain Credibility'}</h3>
          <p>{lang === 'FR' ? 'Les avis positifs renforcent la confiance de vos clients potentiels.' : 'Positive reviews build trust with potential clients.'}</p>
        </div>

        <div className="marketing-card">
		<span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
          <h3>{lang === 'FR' ? 'Facile à utiliser' : 'Easy to Use'}</h3>
          <p>{lang === 'FR' ? 'Notre plateforme est intuitive et rapide, sans tracas techniques.' : 'Our platform is intuitive and hassle-free.'}</p>
		</div>
      </section>
	
      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-stars">
          <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
        </div>

        <h1 className="hero-title">
          {lang === 'FR'
            ? 'Exploser vos avis GOOGLE facilement!'
            : 'Explode your Google reviews easyly!'}
        </h1>

        <p className="hero-subtitle">
          
        </p>

        <button
          onClick={() => window.location.href = '/register'}
          className="btn-primary hero-btn"
        >
          {lang === 'FR' ? 'Créer un compte maintenant' : 'Create an account now'}
        </button>
      </section>
	   
	           <div className="hero-stars">
          <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
        </div>
      {/* FOOTER */}
      <div className="home-footer">
        <p>© 2026 GoogleStars. {lang === 'FR' ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
      </div>


    </div>
  )
}