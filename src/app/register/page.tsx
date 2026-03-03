"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase";
import "./register.css";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<"FR" | "EN">("FR");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1️⃣ Création utilisateur
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
        });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!signUpData.user) {
        setError(lang === "FR" ? "Utilisateur non créé." : "User not created.");
        setLoading(false);
        return;
      }

      const userId = signUpData.user.id;

      // 2️⃣ Création business
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .insert({
          owner_id: userId,
          name: businessName,
        })
        .select()
        .single();

console.log("Business error:", businessError)

      if (businessError || !businessData) {
        setError(businessError?.message || "Erreur business.");
        setLoading(false);
        return;
      }

      // 3️⃣ Création profile AVEC business_id
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        email,
        business_id: businessData.id,
      });

console.log("Profile error:", profileError)

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      // 4️⃣ Création abonnement Trial 20 SMS
      const { error: subscriptionError } = await supabase.from("subscriptions").insert({
        user_id: userId,
        business_id: businessData.id,
        plan_name: "Trial",
        sms_sent: 0,
        sms_max: 20,
        status: "trial",
		stripe_subscription_id: null
      });

console.log("Subscription error:", subscriptionError)

      if (subscriptionError) {
        setError(subscriptionError.message);
        setLoading(false);
        return;
      }

      // 5️⃣ Redirection dashboard
	  setLoading(false);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || (lang === "FR" ? "Erreur inconnue" : "Unknown error"));
    }
  };

  return (
    <div
      className="register-container"
      style={{
        minHeight: "60vh",
		minWidth: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to bottom, #b2d2ed, #98c1e3)",
        padding: "20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px", position: "relative" }}>
        {/* Toggle Langue */}
        <div style={{ position: "absolute", top: 0, right: 0 }}>
          {lang === "FR" && (
            <button
              type="button"
              onClick={() => setLang("EN")}
              style={{
                padding: "5px 12px",
                borderRadius: "5px",
                border: "none",
                backgroundColor: "#1e3a8a",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              EN
            </button>
          )}
          {lang === "EN" && (
            <button
              type="button"
              onClick={() => setLang("FR")}
              style={{
                padding: "5px 12px",
                borderRadius: "5px",
                border: "none",
                backgroundColor: "#1e3a8a",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              FR
            </button>
          )}
        </div>

        <h1 style={{ textAlign: "center", marginBottom: "20px", color: "#1e3a8a" }}>
          {lang === "FR" ? "Créer un compte" : "Create Account"}
        </h1>

        <form
          onSubmit={handleRegister}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            backgroundColor: "#ffffff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
          }}
        >
          <label>{lang === "FR" ? "Email" : "Email"}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              width: "100%",
            }}
          />

          <label>{lang === "FR" ? "Mot de passe" : "Password"}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              width: "100%",
            }}
          />

          <label>{lang === "FR" ? "Nom de l'entreprise" : "Business Name"}</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            style={{
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              width: "100%",
            }}
          />

          {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px",
              borderRadius: "5px",
              border: "none",
              backgroundColor: "#ff6600",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            {loading
              ? lang === "FR"
                ? "Chargement..."
                : "Loading..."
              : lang === "FR"
              ? "S'inscrire"
              : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}
