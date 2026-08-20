import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type RegistrationBody = {
  name?: string;
  email?: string;
  contactNo?: string;
  address?: string;
  domain?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegistrationBody;

    const name = clean(body.name);
    const email = clean(body.email);
    const contactNo = clean(body.contactNo);
    const address = clean(body.address);
    const domain = clean(body.domain);

    if (!name || !email || !contactNo || !address || !domain) {
      return NextResponse.json(
        { error: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const recipient = "sumitnagar06@gmail.com";

    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.error("SMTP environment variables are not configured.");
      return NextResponse.json(
        { error: "Email service is not configured. Please contact the administrator." },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || smtpUser,
      to: recipient,
      replyTo: email,
      subject: `New Domain Registration Request - ${domain}`,
      text: [
        "New Domain Registration Request",
        "",
        `Domain: ${domain}`,
        `Name: ${name}`,
        `Email: ${email}`,
        `Contact No.: ${contactNo}`,
        `Address: ${address}`,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#222">
          <h2 style="margin-bottom:20px">New Domain Registration Request</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:10px;border:1px solid #ddd"><strong>Domain</strong></td><td style="padding:10px;border:1px solid #ddd">${escapeHtml(domain)}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd"><strong>Name</strong></td><td style="padding:10px;border:1px solid #ddd">${escapeHtml(name)}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd"><strong>Email</strong></td><td style="padding:10px;border:1px solid #ddd">${escapeHtml(email)}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd"><strong>Contact No.</strong></td><td style="padding:10px;border:1px solid #ddd">${escapeHtml(contactNo)}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd"><strong>Address</strong></td><td style="padding:10px;border:1px solid #ddd;white-space:pre-wrap">${escapeHtml(address)}</td></tr>
          </table>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Domain registration email error:", error);
    return NextResponse.json(
      { error: "Unable to send the registration request. Please try again later." },
      { status: 500 }
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
