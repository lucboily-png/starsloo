'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

type Plan = {
  nameFR: string
  nameEN: string
  color: string
  sms: string          // reste string car on écrit "250 SMS par mois"
  priceText: string
  priceId: string
  advantages: {
    FR: string[]
    EN: string[]
  }
  modalContent?: {
    FR: string
    EN: string
  }
}

type PlanModalProps = {
  open: boolean
  businessId: string
  onClose: () => void
  lang: "FR" | "EN"
}

// ✅ Plans fusionnés avec FR/EN, avantages et modalConten
const plans: Plan[] = [
  {
    nameFR: "Je veux l’essayer 🎯",
    nameEN: "I want to try 🎯",
    sms: "90 SMS par mois",
    priceText: "$19.99/mo",
    priceId: "price_1T5e6CEyGK0Xf3bphUQDpxig",
    advantages: {
      FR: [
        "Facilitez la récolte d’avis Google et l’envoi de SMS marketing",
        "Envoyez jusqu’à 130 SMS par mois",
        "Accès au tableau de bord",
        "Support par email"
      ],
      EN: [
        "Easily collect Google reviews and send marketing SMS",
        "Send up to 130 SMS per month",
        "Dashboard access",
        "Email support"
      ]
    },
    modalContent: {
      FR: "Ce plan est parfait pour tester Starsloo avec un petit volume de SMS.",
      EN: "This plan is perfect to try Starsloo with a small SMS volume."
    }
  },
  {
    nameFR: "WOW 🔥",
    nameEN: "WOW 🔥",
    sms: "250 SMS par mois",
    priceText: "$29.99/mo",
    priceId: "price_1T5e7KEyGK0Xf3bpV6yhZEvK",
    advantages: {
      FR: [
        "Idéal pour les entreprises en croissance",
        "Augmentez rapidement vos avis Google",
        "Envoyez jusqu’à 250 SMS par mois",
        "Tableau de bord complet",
        "Support prioritaire par email"
      ],
      EN: [
        "Perfect for growing businesses",
        "Boost your Google reviews faster",
        "Send up to 250 SMS per month",
        "Full dashboard access",
        "Priority email support"
      ]
    },
    modalContent: {
      FR: "Ce plan est adapté pour les entreprises qui veulent maximiser leurs avis et communications.",
      EN: "This plan is suited for businesses that want to maximize reviews and communications."
    }
  },
  {
    nameFR: "Incroyable 🚀",
    nameEN: "Incredible 🚀",
    sms: "600 SMS par mois",
    priceText: "$49.99/mo",
    priceId: "price_1T5e9REyGK0Xf3bpasnTX12f",
    advantages: {
      FR: [
        "Idéal pour les entreprises établies et très actives",
        "Maximisez votre visibilité et vos avis Google",
        "Envoyez jusqu’à 600 SMS par mois",
        "Tableau de bord avancé avec analytics détaillées",
        "Support prioritaire rapide"
      ],
      EN: [
        "Designed for established and ambitious businesses",
        "Maximize your visibility and Google reviews",
        "Send up to 600 SMS per month",
        "Advanced dashboard with detailed analytics",
        "Fast priority support"
      ]
    },
    modalContent: {
      FR: "Ce plan est conçu pour les entreprises très actives qui veulent tout automatiser.",
      EN: "This plan is designed for highly active businesses who want full automation."
    }
  }
]

// Stripe front-end
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function PlanModal({ open, businessId, onClose, lang }: PlanModalProps) {
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handlePlanClick = async (plan: Plan) => {
    try {
      setLoading(true)
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          businessId,
          planName: lang === "FR" ? plan.nameFR : plan.nameEN,
          smsMax: parseInt(plan.sms.replace(/\D/g, '')) // transforme "250 SMS par mois" en 250
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Stripe error')
      console.log('Stripe Checkout URL:', data.url)
      window.location.href = data.url
    } catch (err: any) {
      alert(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top:0, left:0, width:'100vw', height:'100vh',
      background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000
    }}>
      <div style={{ background:'#fff', padding:'30px', borderRadius:'15px', width:'90%', maxWidth:'900px' }}>
        <h2 style={{ textAlign:'center', marginBottom:'20px' }}>
          {lang === "FR" ? "Choisir un plan" : "Choose a plan"}
        </h2>

        <div style={{ display:'flex', gap:'20px', justifyContent:'center', flexWrap:'wrap' }}>
          {plans.map(plan => (
            <div
              key={plan.priceId}
              style={{
                borderRadius:'10px',
                padding:'20px',
                width:'250px',
                textAlign:'center',
                background: plan.color,
                color: '#fff',
                boxShadow:'0 6px 12px rgba(0,0,0,0.25)',
                cursor:'pointer'
              }}
              onClick={() => handlePlanClick(plan)}
            >
              <h3>{lang === "FR" ? plan.nameFR : plan.nameEN}</h3>
              <p style={{ fontSize:'14px', margin:'10px 0' }}>{plan.sms}</p>
              <ul style={{ fontSize:'12px', textAlign:'left', paddingLeft:'18px', marginBottom:'15px' }}>
                {(lang === "FR" ? plan.advantages.FR : plan.advantages.EN).map((adv, i) => (
                  <li key={i}>{adv}</li>
                ))}
              </ul>
              <p style={{ fontSize:'12px', fontStyle:'italic', marginBottom:'10px' }}>
                {lang === "FR" ? plan.modalContent.FR : plan.modalContent.EN}
              </p>
              <button className="btn-green" disabled={loading}>
                {loading ? (lang === "FR" ? 'Chargement...' : 'Loading...') : (lang === "FR" ? 'Choisir' : 'Select')}
              </button>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="btn-dark" style={{ marginTop:'20px' }}>
          {lang === "FR" ? 'Fermer' : 'Close'}
        </button>
      </div>
    </div>
  )
}