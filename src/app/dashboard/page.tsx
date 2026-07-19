/* src/app/dashboard/page.tsx */


'use client'

import './dashboard.css'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PlanModal from '@/components/PlanModal'

type Subscription = {
  plan_name: string
  sms_sent: number
  sms_max: number
  status: string
  stripe_subscription_id?: string
}

export default function DashboardPage() {
  const [business, setBusiness] = useState<any>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [lang, setLang] = useState<'FR'|'EN'>('FR')
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactBusiness, setContactBusiness] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')

  const [link, setLink] = useState('')
  const [smsTemplateFR, setSmsTemplateFR] = useState('')
  const [smsTemplateEN, setSmsTemplateEN] = useState('')
  
  const [openFaq, setOpenFaq] = useState<number | null>(null)

const toggleFaq = (index: number) => {
  setOpenFaq(openFaq === index ? null : index)
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
          ? "La puissance des étoiles"
          : "The power of stars"}
      </p>
    </div>
  );
}

  // 🔹 Fetch business + subscription
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error(lang==='FR' ? 'Utilisateur non connecté' : 'User not logged in')

        const { data: profile } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('id', user.id)
          .single()
        if (!profile || !profile.business_id) throw new Error(lang==='FR' ? 'Profil introuvable' : 'Profile not found')

        const { data: biz } = await supabase
          .from('businesses')
          .select('id, name, link, sms_template_fr, sms_template_en')
          .eq('id', profile.business_id)
          .single()
        if (!biz) throw new Error(lang==='FR' ? 'Entreprise introuvable' : 'Business not found')

        setBusiness(biz)
        setLink(biz.link || '')
        setSmsTemplateFR(biz.sms_template_fr || '')
        setSmsTemplateEN(biz.sms_template_en || '')

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('business_id', profile.business_id)
          .single()

        if (sub) {
          setSubscription(sub)
          if (sub.sms_max - sub.sms_sent <= 0) setShowPlanModal(true)
        }

        setLoading(false)
      } catch (err: any) {
        setError(err.message)
        setLoading(false)
      }
    }
    fetchData()
  }, [lang])

  // 🔹 Send SMS
  const sendClientSMS = async (smsLang: 'FR'|'EN') => {
    if (!subscription || !business) return alert(lang==='FR' ? 'Entreprise ou abonnement introuvable' : 'Business or subscription not found')
    if (!clientName || !clientPhone) return alert(lang==='FR' ? 'Veuillez entrer prénom et téléphone' : 'Please enter client name and phone')

    const smsRemaining = subscription.sms_max - subscription.sms_sent
    if (smsRemaining <= 0) {
      setShowPlanModal(true)
      return alert(lang==='FR' ? 'Limite de SMS atteinte, veuillez choisir un plan' : 'SMS limit reached')
    }

    const templateFR = smsTemplateFR || 'Bonjour {client_name}, découvrez notre offre sur {business_name} !'
    const templateEN = smsTemplateEN || 'Hi {client_name}, check our offer on {business_name}!'
    const message = (smsLang==='FR' ? templateFR : templateEN)
      .replace('{client_name}', clientName)
      .replace('{business_name}', business.name)
      .replace('{link}', link)

    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: clientPhone, message, clientName })
      })
      const data = await response.json()
      if (!response.ok) return alert((lang==='FR' ? 'Erreur Twilio: ' : 'Twilio error: ') + data.error)

      await supabase.from('subscriptions')
        .update({ sms_sent: subscription.sms_sent + 1 })
        .eq('business_id', business.id)

      setSubscription({ ...subscription, sms_sent: subscription.sms_sent + 1 })
      setClientName('')
      setClientPhone('')

      alert(lang==='FR' ? 'SMS envoyé !' : 'SMS sent!')
    } catch (err: any) {
      alert((lang==='FR' ? 'Erreur envoi SMS: ' : 'SMS sending error: ') + err.message)
    }
  }

  if (loading) return <div className="dashboard-container">{lang==='FR' ? 'Chargement...' : 'Loading...'}</div>
  if (error) return <div className="dashboard-container error">{error}</div>

  const smsRemaining = subscription ? subscription.sms_max - subscription.sms_sent : 0

  // 🔹 Cancel Subscription
  const handleCancelSubscription = async () => {
    if (!subscription) return
    const confirmCancel = confirm(lang==='FR'
      ? "Voulez-vous vraiment annuler votre abonnement à la fin de la période ?"
      : "Are you sure you want to cancel your subscription at the end of the period?")
    if (!confirmCancel) return
    if (!subscription.stripe_subscription_id) return alert(lang==='FR' ? "Aucun abonnement Stripe trouvé." : "No Stripe subscription found.")

    try {
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
          businessId: business.id
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Cancellation failed')

      setSubscription({ ...subscription, status: 'canceling' })
      alert(lang==='FR'
        ? "Votre abonnement sera annulé à la fin de la période de facturation."
        : "Your subscription will be canceled at the end of the billing period.")
    } catch (err: any) {
      alert(lang==='FR' ? "Erreur annulation: " : "Cancellation error: " + err.message)
    }
  }

  // 🔹 Create Stripe checkout
type Plan = {
  nameFR: string
  nameEN: string
  color: string
  sms: number
  priceText: string
  priceId: string
  advantages: {
    FR: string[]
    EN: string[]
  }
}

async function handlePlanClick(plan: Plan) {
  if (!business) return alert('Business not found')

  const planName = lang === 'FR' ? plan.nameFR : plan.nameEN

  try {
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: plan.priceId,
        businessId: business.id,
        planName,       // on utilise maintenant planName calculé ici
        smsMax: plan.sms
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Stripe error')

    window.location.href = data.url
  } catch (err: any) {
    alert(err.message)
  }
}

  // 🔹 Contact Form
  const handleContactSubmit = async (e: any) => {
    e.preventDefault()
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
      if (!res.ok) return alert(data.error || 'Error sending message')
      alert(lang==='FR' ? 'Message envoyé avec succès.' : 'Message sent successfully.')
      setContactName('')
      setContactBusiness('')
      setContactEmail('')
      setContactMessage('')
      setShowContactForm(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  // 🔹 Plans avec avantages
const plans = [
  {
    nameFR: "Je veux l’essayer 🎯",
    nameEN: "I want to try 🎯",
    color: "#28A7C9",
    sms: 100,
    priceText: "$19.95",
    priceId: "price_1T7erWI2YBJOFjNSfQ9P8384",
    advantages: {
      FR: [
        "Facilitez la récolte d’avis Google et l’envoi de SMS marketing",
        "Envoyez jusqu’à 100 SMS par mois",
        "Tableau de bord complet",
        "Support par email"
      ],
      EN: [
        "Easily collect Google reviews and send marketing SMS",
        "Send up to 130 SMS per month",
        "Full dashboard access",
        "Email support"
      ]
    }
  },

  {
    nameFR: "WOW 🔥",
    nameEN: "WOW 🔥",
    color: "#28A7C9",
    sms: 250,
    priceText: "$29.95",
    priceId: "price_1T7esYI2YBJOFjNSzNKtBx3n",

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
    }
  },
  
  {
  nameFR: "Incroyable 🚀",
  nameEN: "Incredible 🚀",
  color: "#28A7C9",
  sms: 600,
  priceText: "$49.95",
  priceId: "price_1T7etbI2YBJOFjNSXbvuAUkY",

  advantages: {
    FR: [
      "Conçu pour les entreprises établies et ambitieuses",
      "Maximisez votre visibilité et vos avis Google",
      "Envoyez jusqu’à 600 SMS par mois",
      "Tableau de bord complet",
      "Support prioritaire rapide"
    ],
    EN: [
      "Designed for established and ambitious businesses",
      "Maximize your visibility and Google reviews",
      "Send up to 600 SMS per month",
      "Full dashboard access",
      "Fast priority support"
    ]
  }
}
]


  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-topbar">
          <div className="dashboard-brand-mini">
            <img src="/images/logo.png" alt="Starsloo" />
            <span></span>
          </div>
          <div className="dashboard-topbar-actions">
            <button onClick={() => setLang(lang === 'FR' ? 'EN' : 'FR')} className="dashboard-button dashboard-button-light">
              {lang === 'FR' ? 'EN' : 'FR'}
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }} className="dashboard-button dashboard-button-dark">
              {lang === 'FR' ? 'Déconnexion' : 'Logout'}
            </button>
          </div>
        </header>

        <section className="dashboard-welcome">
          <div>
            <span className="dashboard-eyebrow">{lang === 'FR' ? 'TABLEAU DE BORD' : 'DASHBOARD'}</span>
            <h1>{lang === 'FR' ? `Bonjour ${business.name} 👋` : `Hi ${business.name} 👋`}</h1>
            <p>{lang === 'FR' ? "Gérez vos messages, vos avis Google et votre abonnement au même endroit." : "Manage your messages, Google reviews and subscription from one place."}</p>
          </div>
          <div className={`dashboard-status-pill ${subscription?.status === 'active' ? 'is-active' : 'is-inactive'}`}>
            <span className="dashboard-status-dot" />
            {subscription?.status || '-'}
          </div>
        </section>

        <section className="dashboard-stats-grid">
          <article className="dashboard-stat-card dashboard-stat-primary">
            <div className="dashboard-stat-icon">✉</div>
            <div>
              <p>{lang === 'FR' ? 'SMS restants' : 'SMS remaining'}</p>
              <h2>{smsRemaining}</h2>
              <span>{subscription?.sms_max || 0} {lang === 'FR' ? 'SMS inclus' : 'SMS included'}</span>
            </div>
            {subscription && (
              <div className="dashboard-progress">
                <div className="dashboard-progress-filled" style={{ width: `${Math.min((subscription.sms_sent / subscription.sms_max) * 100, 100)}%` }} />
              </div>
            )}
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-icon">↗</div>
            <div><p>{lang === 'FR' ? 'SMS envoyés' : 'SMS sent'}</p><h2>{subscription?.sms_sent || 0}</h2><span>{lang === 'FR' ? 'Ce mois-ci' : 'This month'}</span></div>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-icon">★</div>
            <div><p>{lang === 'FR' ? 'Plan actif' : 'Active plan'}</p><h2 className="dashboard-plan-name">{subscription?.plan_name || '-'}</h2><span>{lang === 'FR' ? 'Abonnement actuel' : 'Current subscription'}</span></div>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-icon">✓</div>
            <div><p>{lang === 'FR' ? 'Statut' : 'Status'}</p><h2 className={subscription?.status === 'active' ? 'text-success' : 'text-danger'}>{subscription?.status || '-'}</h2><span>{lang === 'FR' ? 'État du compte' : 'Account status'}</span></div>
          </article>
        </section>

        <section className="dashboard-workspace">
          <div className="dashboard-main-column">
            <div className="dashboard-section-heading">
              <span>01</span>
              <div><h2>{lang === 'FR' ? 'Préparez vos messages' : 'Prepare your messages'}</h2><p>{lang === 'FR' ? 'Personnalisez vos modèles avant de les envoyer à vos clients.' : 'Customize your templates before sending them to customers.'}</p></div>
            </div>

            <article className="dashboard-panel">
              <div className="dashboard-panel-header"><div><span className="dashboard-panel-kicker">FR</span><h3>{lang === 'FR' ? 'Message français' : 'French message'}</h3></div></div>
              <div className="dashboard-tip">⚠️ {lang === 'FR' ? 'Conservez {client_name} et {business_name} pour personnaliser automatiquement le message.' : 'Keep {client_name} and {business_name} to personalize the message automatically.'}</div>
              <textarea rows={5} placeholder="Bonjour {client_name} 👋 merci pour votre visite chez {business_name} ! Votre avis nous aide beaucoup. Ajoutez votre lien Google ici." value={smsTemplateFR} onChange={(e) => setSmsTemplateFR(e.target.value)} className="dashboard-input dashboard-textarea" />

              <div className="dashboard-language-divider" />

              <div className="dashboard-panel-header"><div><span className="dashboard-panel-kicker">EN</span><h3>{lang === 'FR' ? 'Message anglais' : 'English message'}</h3></div></div>
              <textarea rows={5} placeholder="Hello {client_name} 👋 Thank you for visiting {business_name}! Your feedback means a lot. Add your Google review link here." value={smsTemplateEN} onChange={(e) => setSmsTemplateEN(e.target.value)} className="dashboard-input dashboard-textarea" />

              <div className="dashboard-panel-actions">
                <button onClick={async () => {
                  if (!business) return
                  const { error } = await supabase.from('businesses').update({ link, sms_template_fr: smsTemplateFR, sms_template_en: smsTemplateEN }).eq('id', business.id)
                  if (error) alert(error.message)
                  else alert(lang === 'FR' ? 'Modifications sauvegardées !' : 'Saved!')
                }} className="dashboard-button dashboard-button-primary">
                  {lang === 'FR' ? 'Sauvegarder les messages' : 'Save messages'}
                </button>
              </div>
            </article>

            <div className="dashboard-section-heading">
              <span>02</span>
              <div><h2>{lang === 'FR' ? 'Envoyez votre SMS' : 'Send your SMS'}</h2><p>{lang === 'FR' ? 'Ajoutez les coordonnées du client et choisissez la langue.' : 'Add the customer details and choose the language.'}</p></div>
            </div>

            {subscription && (
              <article className="dashboard-panel dashboard-send-panel">
                <div className="dashboard-form-grid">
                  <label><span>{lang === 'FR' ? 'Prénom du client' : 'Customer first name'}</span><input type="text" placeholder={lang === 'FR' ? 'Ex. Marie' : 'Ex. Mary'} value={clientName} onChange={(e) => setClientName(e.target.value)} className="dashboard-input" /></label>
                  <label><span>{lang === 'FR' ? 'Numéro de téléphone' : 'Phone number'}</span><input type="tel" placeholder="+1 514 000-0000" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="dashboard-input" /></label>
                </div>
                <div className="dashboard-send-actions">
                  <button onClick={() => sendClientSMS('FR')} className="dashboard-button dashboard-button-primary">🇫🇷 {lang === 'FR' ? 'Envoyer en français' : 'Send in French'}</button>
                  <button onClick={() => sendClientSMS('EN')} className="dashboard-button dashboard-button-outline">🇬🇧 {lang === 'FR' ? 'Envoyer en anglais' : 'Send in English'}</button>
                </div>
              </article>
            )}
          </div>

          <aside className="dashboard-sidebar">
            <article className="dashboard-sidebar-card dashboard-help-card">
              <span className="dashboard-sidebar-icon">💡</span>
              <h3>{lang === 'FR' ? 'Conseil rapide' : 'Quick tip'}</h3>
              <p>{lang === 'FR' ? 'Un message court, personnel et envoyé peu après la visite obtient généralement davantage de réponses.' : 'A short, personal message sent shortly after the visit generally gets more responses.'}</p>
            </article>
            <article className="dashboard-sidebar-card">
              <h3>{lang === 'FR' ? 'Votre utilisation' : 'Your usage'}</h3>
              <div className="dashboard-usage-row"><span>{lang === 'FR' ? 'Utilisés' : 'Used'}</span><strong>{subscription?.sms_sent || 0}</strong></div>
              <div className="dashboard-usage-row"><span>{lang === 'FR' ? 'Disponibles' : 'Available'}</span><strong>{smsRemaining}</strong></div>
              <div className="dashboard-usage-row"><span>{lang === 'FR' ? 'Total' : 'Total'}</span><strong>{subscription?.sms_max || 0}</strong></div>
            </article>
            <button onClick={() => setShowContactForm(true)} className="dashboard-button dashboard-button-outline dashboard-full-button">{lang === 'FR' ? 'Besoin d’aide ?' : 'Need help?'}</button>
          </aside>
        </section>

        <section className="dashboard-plans-section">
          <div className="dashboard-centered-heading"><span className="dashboard-eyebrow">{lang === 'FR' ? 'ABONNEMENTS' : 'SUBSCRIPTIONS'}</span><h2>{lang === 'FR' ? 'Choisissez le plan qui vous convient' : 'Choose the plan that fits you'}</h2><p>{lang === 'FR' ? 'Passez à un volume supérieur à mesure que votre entreprise grandit.' : 'Move to a higher volume as your business grows.'}</p></div>
          <div className="dashboard-plans-grid">
            {plans.map((plan, index) => (
              <article key={plan.priceId} className={`dashboard-plan-card ${index === 1 ? 'is-featured' : ''}`}>
                {index === 1 && <div className="dashboard-popular-badge">{lang === 'FR' ? 'LE PLUS POPULAIRE' : 'MOST POPULAR'}</div>}
                <div><h3>{lang === 'FR' ? plan.nameFR : plan.nameEN}</h3><div className="dashboard-price"><strong>{plan.priceText}</strong><span>{lang === 'FR' ? '/ mois' : '/ month'}</span></div><div className="dashboard-sms-count">{plan.sms} SMS</div></div>
                <ul>{(lang === 'FR' ? plan.advantages.FR : plan.advantages.EN).map((adv, i) => <li key={i}><span>✓</span>{adv}</li>)}</ul>
                <button onClick={() => handlePlanClick(plan)} className={`dashboard-button ${index === 1 ? 'dashboard-button-primary' : 'dashboard-button-outline'}`}>{lang === 'FR' ? 'Choisir ce plan' : 'Select plan'}</button>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-account-actions">
          <button onClick={() => setShowContactForm(true)} className="dashboard-button dashboard-button-primary">{lang === 'FR' ? 'Nous contacter' : 'Contact us'}</button>
          {subscription && <button onClick={handleCancelSubscription} className="dashboard-button dashboard-button-danger">{lang === 'FR' ? 'Annuler mon abonnement' : 'Cancel subscription'}</button>}
        </section>

        <section className="dashboard-faq-section">
          <div className="dashboard-centered-heading"><span className="dashboard-eyebrow">FAQ</span><h2>{lang === 'FR' ? 'Questions fréquentes' : 'Frequently asked questions'}</h2></div>
          <div className="dashboard-faq-list">
            {[
              { questionFR: "Comment fonctionnent les SMS ?", answerFR: "Les SMS sont envoyés directement depuis votre tableau de bord. Vous rédigez le message, ajoutez le numéro du client et l’envoi se fait instantanément.", questionEN: "How does SMS sending work?", answerEN: "Messages are sent directly from your dashboard. Simply write your message, add the customer's number, and it is delivered instantly." },
              { questionFR: "Comment obtenir mon premier Avis Google par SMS", answerFR: "Complétez l'Étape 1 avec le message qui sera envoyé à votre client. Conservez {client_name} et {business_name}, ajoutez votre lien Google, sauvegardez, puis remplissez le prénom et le téléphone à l'Étape 2.", questionEN: "How to get my first Google review via SMS", answerEN: "Complete Step 1 with the message that will be sent to your customer. Keep {client_name} and {business_name}, add your Google link, save, then enter the first name and phone number in Step 2." },
              { questionFR: "Comment trouver mon lien pour les Avis Google ?", answerFR: "Allez sur votre fiche Google Business, cliquez sur « Demander des avis », copiez le lien généré puis collez-le dans votre message Starsloo.", questionEN: "How do I find my Google Reviews link?", answerEN: "Open your Google Business Profile, click “Request reviews,” copy the generated link and paste it into your Starsloo message." },
              { questionFR: "Les SMS sont-ils automatiques ?", answerFR: "Non. Vous gardez le contrôle total. Chaque message est envoyé manuellement par vous.", questionEN: "Are messages automated?", answerEN: "No. You stay in full control. Every message is manually sent by you." },
              { questionFR: "Puis-je changer de plan à tout moment ?", answerFR: "Oui. Vous pouvez modifier ou annuler votre abonnement directement depuis votre tableau de bord.", questionEN: "Can I change my plan anytime?", answerEN: "Yes. You can upgrade or cancel your subscription anytime from your dashboard." },
              { questionFR: "Que se passe-t-il si je dépasse ma limite de SMS ?", answerFR: "Si votre limite mensuelle est atteinte, vous pourrez choisir un plan supérieur pour continuer vos envois.", questionEN: "What happens if I exceed my SMS limit?", answerEN: "If you reach your monthly limit, you can choose a higher plan to continue sending messages." }
            ].map((faq, index) => (
              <article key={index} className={`dashboard-faq-item ${openFaq === index ? 'is-open' : ''}`} onClick={() => toggleFaq(index)}>
                <div className="dashboard-faq-question"><span>{lang === 'FR' ? faq.questionFR : faq.questionEN}</span><button type="button" aria-label="Toggle answer">+</button></div>
                <div className="dashboard-faq-answer"><p>{lang === 'FR' ? faq.answerFR : faq.answerEN}</p></div>
              </article>
            ))}
          </div>
        </section>

        <footer className="dashboard-footer"><Logo lang={lang} /><p>© 2026 Starsloo.com {lang === 'FR' ? 'Tous droits réservés.' : 'All rights reserved.'}</p></footer>
      </div>

      {showContactForm && (
        <div className="dashboard-popup" onClick={() => setShowContactForm(false)}>
          <form className="dashboard-popup-content" onClick={(e) => e.stopPropagation()} onSubmit={handleContactSubmit}>
            <div className="dashboard-modal-header"><div><span className="dashboard-eyebrow">STARSLOO</span><h3>{lang === 'FR' ? 'Nous contacter' : 'Contact us'}</h3></div><button type="button" onClick={() => setShowContactForm(false)}>×</button></div>
            <input type="text" placeholder={lang === 'FR' ? 'Votre nom' : 'Your name'} value={contactName} onChange={(e) => setContactName(e.target.value)} className="dashboard-input" />
            <input type="text" placeholder={lang === 'FR' ? 'Nom de l’entreprise' : 'Business name'} value={contactBusiness} onChange={(e) => setContactBusiness(e.target.value)} className="dashboard-input" />
            <input type="email" placeholder="Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="dashboard-input" />
            <textarea placeholder="Message" rows={5} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} className="dashboard-input dashboard-textarea" />
            <button type="submit" className="dashboard-button dashboard-button-primary dashboard-full-button">{lang === 'FR' ? 'Envoyer le message' : 'Send message'}</button>
          </form>
        </div>
      )}

      <PlanModal open={showPlanModal} businessId={business?.id!} onClose={() => setShowPlanModal(false)} lang={lang} />
    </main>
  )
}