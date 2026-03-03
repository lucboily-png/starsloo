// src/app/api/stripe-webhook/route.ts

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log("🔥 WEBHOOK RECEIVED:", event.type);

    switch (event.type) {

      // ==============================
      // CHECKOUT SESSION COMPLETED
      // ==============================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const subscriptionId = session.subscription as string;
        const businessId = session.metadata?.businessId;
        const planName = session.metadata?.planName;
        const smsMax = parseInt(session.metadata?.smsMax || "0", 10);

        console.log("📦 Checkout completed:", {
          subscriptionId,
          businessId,
          planName,
          smsMax,
        });

        // Update la ligne Trial existante
        const { error } = await supabase
          .from("subscriptions")
          .update({
            stripe_subscription_id: subscriptionId,
            plan_name: planName,
            status: "active",
            sms_max: smsMax,
            sms_sent: 0,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("business_id", businessId);

        if (error) console.error("❌ Supabase update error:", error);
        else console.log("✅ Supabase updated Trial → Active for business:", businessId);

        break;
      }

      // ==============================
      // SUBSCRIPTION UPDATED / Renewal / Cancel
      // ==============================
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const meta = (subscription.metadata as any) || {};
        const businessId = meta.businessId;

        console.log("🔄 Subscription updated:", subscription.id, subscription.status);

        if (!businessId) {
          console.warn("⚠️ No businessId in subscription metadata");
          break;
        }

        // Mapping status
        let status: string;
        if (subscription.status === "canceled" || subscription.status === "incomplete_expired") {
          status = "canceled";
        } else if (subscription.cancel_at_period_end) {
          status = "canceling";
        } else if (subscription.status === "active") {
          status = "active";
        } else {
          status = subscription.status;
        }

        // Calcul end_date
        const endDate = (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : subscription.items.data.length > 0 && (subscription.items.data[0] as any).current_period_end
          ? new Date((subscription.items.data[0] as any).current_period_end * 1000).toISOString()
          : null;

        // ⚡ Reset SMS automatiquement si renouvellement
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status,
            end_date: endDate,
            sms_sent: 0,
            sms_max: parseInt(meta.smsMax || "20", 10),
          })
          .eq("business_id", businessId);

        if (error) console.error("❌ Supabase update error:", error);
        else console.log("✅ Subscription updated & SMS reset:", subscription.id);

        break;
      }

      default:
        console.log("ℹ️ Event not handled:", event.type);
    }

  } catch (err) {
    console.error("❌ Webhook error:", err);
    return new Response("Webhook error", { status: 400 });
  }

  return new Response("ok", { status: 200 });
}