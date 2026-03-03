import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json()

    const sms = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: to,
    })

    return NextResponse.json({ success: true, sid: sms.sid })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
