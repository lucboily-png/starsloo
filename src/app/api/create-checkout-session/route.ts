// src/app/api/create-checkout-session/route.ts

import Stripe from "stripe";
import { NextResponse } from "next/server";

// ⚡ Pas besoin de spécifier apiVersion, Stripe utilisera celle du dashboard
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { priceId, businessId, planName, smsMax } = await req.json();

    // --- Vérification des paramètres obligatoires
    if (!priceId || !businessId || !planName || smsMax === undefined) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }
	
	console.log(process.env.PRICE_ID_LIVE)

    // --- Création de la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],

      // Metadata utile pour ton webhook
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

    console.log("✅ Checkout session created for business:", businessId);

    // --- Retour de l'URL vers le frontend
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Stripe session error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}