"use client"

import Link from "next/link"
import { useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

export default function SubscriptionPage() {
  const router = useRouter()

  useEffect(() => {
    // Vérifie si l'utilisateur a une subscription
    const checkSubscription = async () => {
      const {
        data: profile,
      } = await supabase.from("profiles").select("*").single()

      if (profile?.business_id) {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("business_id", profile.business_id)
          .single()

        if (subscription) {
          // Si abonnement trouvé → dashboard
          router.push("/dashboard")
        }
      }
    }

    checkSubscription()
  }, [router])

  return (
    <div className="p-10 max-w-md mx-auto">
      <h1 className="text-2xl mb-4">Subscription</h1>
      <p>Aucune subscription trouvée pour le moment.</p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block bg-black text-white p-2"
      >
        Aller au Dashboard
      </Link>
    </div>
  )
}
