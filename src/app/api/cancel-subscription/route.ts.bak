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
    console.log('📦 Body:', body)

    const { businessId } = body

    if (!businessId) {
      console.log('❌ Missing businessId')
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
    }

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .single()

    console.log('📄 Subscription from DB:', subscription)

    if (subError || !subscription) {
      console.log('❌ Subscription not found', subError)
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    if (!subscription.stripe_subscription_id) {
      console.log('❌ Missing stripe_subscription_id')
      return NextResponse.json({ error: 'Missing stripe_subscription_id' }, { status: 400 })
    }

    console.log('🔄 Updating Stripe...')

    const updatedStripeSub = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      { cancel_at_period_end: true }
    )

    console.log('✅ Stripe updated:', updatedStripeSub.id)

    const endDate = new Date(updatedStripeSub.current_period_end * 1000)

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceling',
        end_date: endDate,
        updated_at: new Date(),
      })
      .eq('business_id', businessId)

    if (updateError) {
      console.log('❌ Supabase update error:', updateError)
      return NextResponse.json({ error: 'Supabase update failed' }, { status: 500 })
    }
	
	if (subscription.status === "incomplete_expired") {
  console.log("⚠️ Abonnement expiré, rien à annuler ou créer, on doit créer un nouvel abonnement.");
  return new Response("Subscription expired, please create a new one", { status: 400 });
}

    console.log('🎉 Done')

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('🔥 SERVER ERROR:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}