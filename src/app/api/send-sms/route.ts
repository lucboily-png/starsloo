import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(req: NextRequest) {
  try {
    const { to, message, clientName } = await req.json();

    const sms = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: to,
    });

    await supabase.from("sms_logs").insert({
      client_phone: to,
      client_name: clientName || null,
      message: message,
      twilio_sid: sms.sid,
      status: "sent",
      date: new Date(),
    });

    return NextResponse.json({ success: true, sid: sms.sid });

  } catch (error: any) {
    console.error("Erreur SMS :", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}