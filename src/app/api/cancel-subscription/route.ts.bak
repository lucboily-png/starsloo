import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Cancel endpoint hit')

    const body = await req.json()
    const { businessId } = body

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
    }

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json({ error: 'Missing stripe_subscription_id' }, { status: 400 })
    }

    // ⚡ Mise à jour Stripe
    const updatedStripeSub = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      { cancel_at_period_end: true }
    ) as Stripe.Subscription

    // ✅ On récupère la fin de période safely
    const endDate = updatedStripeSub['current_period_end']
  ? new Date(updatedStripeSub['current_period_end'] * 1000)
  : null

    // ⚠️ Si jamais current_period_end est null
    if (!endDate) {
      console.warn('⚠️ current_period_end is null, setting endDate to now')
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceling',
        end_date: endDate || new Date(),
        updated_at: new Date(),
      })
      .eq('business_id', businessId)

    if (updateError) {
      return NextResponse.json({ error: 'Supabase update failed' }, { status: 500 })
    }

    // Gestion abonnement expiré
    if (subscription.status === "incomplete_expired") {
      return new Response(
        "Subscription expired, please create a new one",
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('🔥 SERVER ERROR:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}