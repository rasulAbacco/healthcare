// server/src/auth/sms.service.js

import "dotenv/config";
import axios from "axios";

const {
  SMS_API_KEY,
  SMS_API_URL,
  SMS_ENTITY_ID,
  SMS_ROUTE,
  SMS_SENDER_ID,
  SMS_TEMPLATE_ID,
} = process.env;

// MUST exactly match your approved DLT template
function buildOtpMessage(otp) {
  return `${otp} is your OTP for Abacco Technology CRM login verification. OTP valid for 10 minutes. Do not share this OTP with anyone.`;
}

// Convert to 91XXXXXXXXXX format
export function normalizePhone(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

export async function sendOtpSms(phone, otp) {
  phone = normalizePhone(phone);

  if (!phone || phone.length !== 12) {
    throw new Error("Invalid mobile number");
  }

  if (!SMS_API_KEY || !SMS_API_URL) {
    throw new Error("SMS gateway is not configured.");
  }

  const text = buildOtpMessage(otp);

  try {
    const { data } = await axios.get(SMS_API_URL, {
      params: {
        APIKey: SMS_API_KEY,
        senderid: SMS_SENDER_ID,
        channel: 2,
        DCS: 0,
        flashsms: 0,
        number: phone,
        text,
        route: SMS_ROUTE,
        EntityId: SMS_ENTITY_ID,
        dlttemplateid: SMS_TEMPLATE_ID,
      },
      timeout: 15000,
    });

    if (!data || data.ErrorCode !== "000") {
      throw new Error(
        data?.ErrorMessage || `SMS Gateway Error (${data?.ErrorCode})`
      );
    }

    return data;
  } catch (err) {
    if (err.response) {
      throw new Error(
        err.response.data?.ErrorMessage || "SMS Gateway Request Failed"
      );
    }

    throw err;
  }
}