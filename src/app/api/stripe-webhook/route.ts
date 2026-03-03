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

    console.log("🔥 WEBHOOK TOUCHÉ", event.type);

    switch (event.type) {

      // ==============================
      // CHECKOUT COMPLETED
      // ==============================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const subscriptionId = session.subscription as string;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            start_date: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          console.error("❌ Supabase checkout error:", error);
        }

        break;
      }

      // ==============================
      // SUBSCRIPTION UPDATED
      // ==============================
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        console.log(
          "🔄 Subscription updated:",
          subscription.id,
          subscription.status
        );

        // --- Mapping status ---
        let status: string;

        if (
          subscription.status === "canceled" ||
          subscription.status === "incomplete_expired"
        ) {
          status = "canceled";
        } else if (subscription.cancel_at_period_end) {
          status = "canceling";
        } else if (subscription.status === "active") {
          status = "active";
        } else {
          status = subscription.status;
        }

        // --- End date ---
       const endDate =
  subscription.items.data.length > 0 &&
  subscription.items.data[0].current_period_end
    ? new Date(
        subscription.items.data[0].current_period_end * 1000
      ).toISOString()
    : null;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status,
            end_date: endDate,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("❌ Supabase subscription.updated error:", error);
        }

        break;
      }

      default:
        console.log("ℹ️ Event non géré:", event.type);
    }
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return new Response("Webhook error", { status: 400 });
  }

  return new Response("ok", { status: 200 });
}