/* src/app/dashboard/page.tsx */

'use client'

import './dashboard.css'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PlanModal from '@/components/PlanModal'
import Image from 'next/image'
import { usePathname } from "next/navigation";

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
  
  const pathname = usePathname();
  
  const [openFaq, setOpenFaq] = useState<number | null>(null)

const toggleFaq = (index: number) => {
  setOpenFaq(openFaq === index ? null : index)
}



  // Si l'URL contient /en → logo anglais
  const isEnglish = pathname.startsWith("/en");

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
        body: JSON.stringify({ to: clientPhone, message })
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

  const premiumCard = {
    background:'#fff',
    padding:'40px',
    borderRadius:'18px',
    boxShadow:'0 10px 30px rgba(0,0,0,0.05)',
    transition:'0.2s'
  }

  // 🔹 Plans avec avantages
const plans = [
  {
    nameFR: "Je veux l’essayer 🎯",
    nameEN: "I want to try 🎯",
    color: "#28A7C9",
    sms: 100,
    priceText: "$19.95",
    priceId: "price_1T5e6CEyGK0Xf3bphUQDpxig",
    advantages: {
      FR: [
        "Facilitez la récolte d’avis Google et l’envoi de SMS marketing",
        "Envoyez jusqu’à 100 SMS par mois",
        "Accès au tableau de bord",
        "Support par email"
      ],
      EN: [
        "Easily collect Google reviews and send marketing SMS",
        "Send up to 130 SMS per month",
        "Dashboard access",
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
    }
  },
  
  {
  nameFR: "Incroyable 🚀",
  nameEN: "Incredible 🚀",
  color: "#28A7C9",
  sms: 600,
  priceText: "$49.95",
  priceId: "price_1T5e9REyGK0Xf3bpasnTX12f",

  advantages: {
    FR: [
      "Conçu pour les entreprises établies et ambitieuses",
      "Maximisez votre visibilité et vos avis Google",
      "Envoyez jusqu’à 600 SMS par mois",
      "Tableau de bord avancé avec statistiques détaillées",
      "Support prioritaire rapide"
    ],
    EN: [
      "Designed for established and ambitious businesses",
      "Maximize your visibility and Google reviews",
      "Send up to 600 SMS per month",
      "Advanced dashboard with detailed analytics",
      "Fast priority support"
    ]
  }
}
]


 return (
 <div>
   <div style={{maxWidth:'1200px', margin:'10px auto 40px auto', display:'flex', justifyContent:'space-between', alignItems:'center'}}>

          <button onClick={()=>setLang(lang==='FR'?'EN':'FR')} className="dashboard-button">{lang==='FR' ? 'EN' : 'FR'}</button>
          <button onClick={async ()=>{await supabase.auth.signOut(); window.location.href='/'}} className="dashboard-button">{lang==='FR' ? 'Déconnexion' : 'Logout'}</button>
        </div>
	  
      {/* LOGO */}
      <Logo lang={lang} />

      {/* HEADER */}
      <div style={{maxWidth:'1200px', margin:'0 auto 40px auto', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>
            {lang==='FR' ? `Bonjour ${business.name} 👋` : `Hi ${business.name} 👋`}
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            {lang==='FR' ? "Voici l'état de votre compte" : "Here is your account overview"}
          </p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div style={{maxWidth:'1200px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'20px'}}>
        <div className="dashboard-card">
          <p className="dashboard-label">{lang==='FR'?'SMS Restants':'SMS Remaining'}</p>
          <h2 className="dashboard-big-number">{smsRemaining}</h2>
          <p style={{fontSize:'15px',color:'#777'}}>{subscription?.sms_max} total</p>
          {subscription && (
            <div className="dashboard-progress">
              <div className="dashboard-progress-filled" style={{width:`${(subscription.sms_sent/subscription.sms_max)*100}%`}}/>
            </div>
          )}
        </div>
        <div className="dashboard-card">
          <p className="dashboard-label">{lang==='FR'?'SMS Envoyés':'SMS Sent'}</p>
          <h2 className="dashboard-big-number">{subscription?.sms_sent || 0}</h2>
        </div>
        <div className="dashboard-card">
          <p className="dashboard-label">{lang==='FR'?'Plan Actif':'Active Plan'}</p>
          <h2 className="dashboard-big-number">{subscription?.plan_name || '-'}</h2>
        </div>
        <div className="dashboard-card">
          <p className="dashboard-label">{lang==='FR'?'Statut':'Status'}</p>
          <h2 className="dashboard-big-number" style={{color: subscription?.status==='active'? '#16a34a':'#dc2626'}}>{subscription?.status || '-'}</h2>
        </div>
      </div>

      {/* GOOGLE LINK / SMS TEMPLATES */}
      <div className="dashboard-card2" style={{maxWidth:'1200px', margin:'50px auto'}}>
        <h3>{lang==='FR'?'Inscrire votre  message en Français ici + votre lien URL':'Enter your French message here + your URL link'}</h3>
        <input type="text" placeholder={lang==='FR'?'EX: Bonjour {client_name}, merci de votre passage à {business_name}. Laissez-nous un avis Google... + votre url (lien google ou autre)':' EX: Bonjour {client_name}, merci de votre passage chez {business.name}. Laisser-nous un avis Google...  + your url link here (google review link or other)'} value={smsTemplateFR} onChange={(e)=>setSmsTemplateFR(e.target.value)} className="dashboard-input"/>
        <h3>{lang==='FR'?'Inscrire votre message en anglais ici + votre lien URL':'Enter your English message here + your URL link'}</h3>
		<input type="text" placeholder={lang==='FR'?'EX: Hi {client_name}, thank you for your visit at {business_name}. Let us a Google review... + votre url (lien google ou autre)':'EX: Hi [First Name], thanks for visiting us at {business.name}. Your Google review means a lot for us... + your url link here (google review link or other)'} value={smsTemplateEN} onChange={(e)=>setSmsTemplateEN(e.target.value)} className="dashboard-input"/>
        <button onClick={async ()=>{
          if(!business) return
          const { error } = await supabase.from('businesses').update({
            link, sms_template_fr: smsTemplateFR, sms_template_en: smsTemplateEN
          }).eq('id', business.id)
          if(error) alert(error.message)
          else alert(lang==='FR'?'Modifications sauvegardées !':'Saved!')
        }} className="dashboard-button">{lang==='FR'?'Sauvegarder':'Save'}</button>
      </div>	  


      {/* SEND SMS */}
      {subscription && (
        <div className="dashboard-card2" style={{maxWidth:'1200px', margin:'0 auto 40px auto'}}>
          <h3>{lang==='FR'?'Envoyer un SMS':'Send SMS'}</h3>
          <div style={{display:'flex',gap:'15px',flexWrap:'wrap'}}>
            <input type="text" placeholder={lang==='FR'?'Prénom':'First name'} value={clientName} onChange={(e)=>setClientName(e.target.value)} className="dashboard-input"/>
            <input type="text" placeholder={lang==='FR'?'Téléphone':'Phone'} value={clientPhone} onChange={(e)=>setClientPhone(e.target.value)} className="dashboard-input"/>
          </div>
          <div style={{marginTop:'15px',display:'flex',gap:'10px'}}>
            <button onClick={()=>sendClientSMS('FR')} className="dashboard-button">FR</button>
            <button onClick={()=>sendClientSMS('EN')} className="dashboard-button">EN</button>
          </div>
        </div>
      )}

		<div style={{maxWidth:'1200px', margin:'0 auto 40px auto', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
		<h1 style={{ margin: 20, fontSize: '28px', fontWeight: 700}}>
            {lang==='FR' ? `Choisissez votre plan` : `Chose your plan`}
          </h1>
		  </div>
		  
{/* Plans Section */}
<div
  style={{
    maxWidth: '1200px',
    margin: '0 auto 60px auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px'
  }}
>
  {plans.map((plan, index) => (
    <div
      key={plan.priceId}
      style={{
        background: '#ffffff',
        borderRadius: '18px',
        padding: '35px 30px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: index === 1 ? '2px solid #28A7C9' : '1px solid #eee',
        transform: index === 1 ? 'scale(1.03)' : 'scale(1)',
        transition: '0.25s'
      }}
    >
      {/* PLAN NAME */}
      <div>
        <h3
          style={{
            fontSize: '22px',
            fontWeight: 700,
            marginBottom: '10px',
            color: '#111'
          }}
        >
          {lang === 'FR' ? plan.nameFR : plan.nameEN}
        </h3>

        {/* PRICE */}
        <div style={{ marginBottom: '20px' }}>
          <span
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#28A7C9'
            }}
          >
            {plan.priceText}
          </span>
          <span style={{ fontSize: '14px', color: '#777' }}>
            {lang === 'FR' ? ' / mois' : ' / month'}
          </span>
          <div style={{ fontSize: '14px', color: '#555', marginTop: '5px' }}>
            {plan.sms} SMS
          </div>
        </div>

        {/* ADVANTAGES */}
        <ul
          style={{
            paddingLeft: '18px',
            marginBottom: '25px',
            color: '#444',
            lineHeight: '1.6'
          }}
        >
          {(lang === 'FR'
            ? plan.advantages.FR
            : plan.advantages.EN
          ).map((adv, i) => (
            <li key={i} style={{ marginBottom: '6px' }}>
              {adv}
            </li>
          ))}
        </ul>
      </div>

      {/* BUTTON */}
      <button
        onClick={() => handlePlanClick(plan)}
        style={{
          marginTop: 'auto',
          padding: '15px',
          borderRadius: '10px',
          border: 'none',
          background: '#28A7C9',
          color: '#fff',
          fontWeight: 700,
          fontSize: '15px',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        {lang === 'FR' ? 'Choisir ce plan' : 'Select plan'}
      </button>
    </div>
  ))}
</div>

      {/* FOOTER ACTIONS */}
      <div style={{maxWidth:'1200px', margin:'40px auto', display:'flex', gap:'20px', justifyContent:'center'}}>
        {subscription && (
          <button onClick={handleCancelSubscription} className="dashboard-button2 dashboard-button-cancel">
            {lang==='FR'?'Annuler mon abonnement':'Cancel Subscription'}
          </button>
        )}
        <button onClick={()=>setShowContactForm(true)} className="dashboard-button">
          {lang==='FR'?'Nous contacter':'Contact Us'}
        </button>
      </div>

      {/* POPUP CONTACT */}
      {showContactForm && (
        <div className="dashboard-popup" onClick={()=>setShowContactForm(false)}>
          <div className="dashboard-popup-content" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between', alignItems:'center'}}>
              <h3 style={{margin:0, fontSize:'18px', fontWeight:600}}>{lang==='FR'?'Nous contacter':'Contact Us'}</h3>
              <button onClick={()=>setShowContactForm(false)} style={{background:'none', border:'none', fontSize:'18px', cursor:'pointer', color:'#999'}}>×</button>
            </div>
            <input type="text" placeholder={lang==='FR'?'Votre nom':'Your name'} value={contactName} onChange={e=>setContactName(e.target.value)} className="dashboard-input"/>
            <input type="text" placeholder={lang==='FR'?'Nom entreprise':'Business name'} value={contactBusiness} onChange={e=>setContactBusiness(e.target.value)} className="dashboard-input"/>
            <input type="email" placeholder="Email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} className="dashboard-input"/>
            <textarea placeholder="Message" rows={4} value={contactMessage} onChange={e=>setContactMessage(e.target.value)} className="dashboard-input"/>
            <button onClick={handleContactSubmit} className="dashboard-button">{lang==='FR'?'Envoyer':'Send'}</button>
          </div>
        </div>
      )}


<section className="marketing-hero-sections">
<div style={{ display: 'flex', justifyContent: 'center', padding: '5px 4px 5px 5px' }}>

	  </div>
	  </section>
	   
	           <div className="hero-stars">
          <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
        </div>
		
{/* PREMIUM FAQ SECTION */}
<section style={{
  maxWidth: '900px',
  margin: '80px auto',
  padding: '0 20px'
}}>
  <h2 style={{
    textAlign: 'center',
    fontSize: '30px',
    fontWeight: 700,
    marginBottom: '50px',
    background: 'linear-gradient(90deg,#111,#444)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  }}>
    {lang === 'FR' ? 'Questions fréquentes' : 'Frequently Asked Questions'}
  </h2>

  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

    {[
      {
        questionFR: "Comment fonctionnent les SMS ?",
        answerFR: "Les SMS sont envoyés directement depuis votre tableau de bord. Vous rédigez le message, ajoutez le numéro du client et l’envoi se fait instantanément.",
        questionEN: "How does SMS sending work?",
        answerEN: "Messages are sent directly from your dashboard. Simply write your message, add the customer's number, and it is delivered instantly."
      },
      {
        questionFR: "Les SMS sont-ils automatiques ?",
        answerFR: "Non. Vous gardez le contrôle total. Chaque message est envoyé manuellement par vous.",
        questionEN: "Are messages automated?",
        answerEN: "No. You stay in full control. Every message is manually sent by you."
      },
      {
        questionFR: "Puis-je changer de plan à tout moment ?",
        answerFR: "Oui. Vous pouvez modifier ou annuler votre abonnement directement depuis votre tableau de bord.",
        questionEN: "Can I change my plan anytime?",
        answerEN: "Yes. You can upgrade or cancel your subscription anytime from your dashboard."
      },
      {
        questionFR: "Que se passe-t-il si je dépasse mon forfait ?",
        answerFR: "Lorsque votre limite mensuelle est atteinte, vous pouvez passer au plan supérieur pour continuer vos envois.",
        questionEN: "What happens if I exceed my limit?",
        answerEN: "Once you reach your monthly limit, you can upgrade your plan to continue sending messages."
      }
    ].map((faq, index) => (
      <div key={index} style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '22px 25px',
        boxShadow: openFaq === index
          ? '0 10px 30px rgba(0,0,0,0.08)'
          : '0 4px 12px rgba(0,0,0,0.04)',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
        border: openFaq === index ? '1px solid #e5e7eb' : '1px solid #f1f1f1'
      }}
      onClick={() => toggleFaq(index)}
      >

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#111'
          }}>
            {lang === 'FR' ? faq.questionFR : faq.questionEN}
          </span>

          <span style={{
            fontSize: '20px',
            transition: 'transform 0.3s ease',
            transform: openFaq === index ? 'rotate(45deg)' : 'rotate(0deg)',
            color: '#666'
          }}>
            +
          </span>
        </div>

        <div style={{
          maxHeight: openFaq === index ? '300px' : '0px',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          opacity: openFaq === index ? 1 : 0,
          marginTop: openFaq === index ? '15px' : '0px',
          color: '#555',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          {lang === 'FR' ? faq.answerFR : faq.answerEN}
        </div>

      </div>
    ))}

  </div>
</section>

      {/* FOOTER */}
      <div className="home-footer">
        <p>© 2026 Starsloo.com {lang === 'FR' ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
      </div>


   
	  
	  
      {/* Plan Modal */}
     <PlanModal
  open={showPlanModal}
  businessId={business?.id!}
  onClose={() => setShowPlanModal(false)}
  lang={lang}  // ← Ajoute cette ligne
/>

    </div>
	 

  )
}