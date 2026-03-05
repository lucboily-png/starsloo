import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(req: NextRequest) {
  try {
    // Récupérer les données du frontend
    const { to, name } = await req.json();

    // Message personnalisé pour le client
    const messageBody = `Salut ${name}, merci pour votre visite ! Laissez-nous un avis Google : https://g.page/review`;

    // Envoyer le SMS via le Messaging Service
    const sms = await client.messages.create({
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID!,
      to: to,
      body: messageBody,
    });

    // Enregistrer le SMS dans Supabase
    await supabase.from("sms_logs").insert({
      client_phone: to,
      client_name: name,
      message: messageBody,
      twilio_sid: sms.sid,
      status: "sent",
      date: new Date(),
    });

    return NextResponse.json({ success: true, sid: sms.sid });
  } catch (error: any) {
    console.error("Erreur SMS :", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}