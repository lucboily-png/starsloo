 // 🔥 ça fonctionne ici
 
import Stripe from 'stripe'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(req: Request) {
  try {
    const { priceId, businessId, planName, smsMax } = await req.json()

    if (!priceId || !businessId) {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      )
    }

   const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  payment_method_types: ['card'],
  line_items: [{ price: priceId, quantity: 1 }],

  metadata: {
    businessId,
    planName,
    smsMax: String(smsMax),
  },

  subscription_data: {
    metadata: {
      businessId,
      planName,
      smsMax: String(smsMax),
    },
  },

  success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
  cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
});

    // 🔹 Retour correct de l’URL
    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe session error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
