import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { businessId } = await req.json()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('business_id', businessId)
    .single()

  if (!subscription) {
    return NextResponse.json({ error: 'No subscription found' })
  }

  const stripeSub = await stripe.subscriptions.retrieve(
    subscription.stripe_subscription_id
  )

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeSub.customer as string,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
  })

  return NextResponse.json({ url: portalSession.url })
}
