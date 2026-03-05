"use client";
import { useState } from "react";

export default function SendSmsForm() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");

  const sendSMS = async () => {
    setStatus("Envoi en cours...");
    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, name: name }),
      });
      const data = await res.json();
      if (data.success) setStatus("SMS envoyé !");
      else setStatus("Erreur : " + data.error);
    } catch (err: any) {
      setStatus("Erreur : " + err.message);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Nom du client"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Numéro du client (+1... )"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button onClick={sendSMS}>Envoyer SMS</button>
      <p>{status}</p>
    </div>
  );
}