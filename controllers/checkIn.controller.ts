import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import QRCode from "qrcode";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import sendMail from "../utlis/sendMail";
import { eventModel } from "../models/events.model";
import { Participant } from "../models/eventregistration.model";
import { certificateModel } from "../models/certificate.model";
import { certificateCheckUrl, certificateFileUrl, escapeHtml, formatEventDate, publicApiBase } from "../utlis/certificateRenderer";
import { checkInPassUrl, checkInToken, parseCheckInToken } from "../utlis/checkInPass";

const isObjectId = (id: unknown): id is string => typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

const PARTICIPANT_FIELDS = "name email classRollNo department position attendance checkedInAt event";

const publicParticipant = (p: any) => ({
  _id: p._id,
  name: p.name,
  email: p.email,
  classRollNo: p.classRollNo,
  department: p.department,
  position: p.position ?? null,
  attendance: !!p.attendance,
  checkedInAt: p.checkedInAt ?? null,
});

const qrOptions = { errorCorrectionLevel: "M" as const, margin: 2 };

const checkInQrUrl = (req: Request, token: string) =>
  `${publicApiBase(req)}/api/v1/check-in/qr/${encodeURIComponent(token)}`;

// Scan outcomes are returned as 200 with a `status` so the scanner can show each
// result without treating "already checked in" or "wrong event" as request failures.
export const checkInParticipant = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const { eventId } = req.params;
  if (!isObjectId(eventId)) return next(new ErrorHandler("Invalid event ID.", 400));

  const { code, participantId: manualId } = req.body as { code?: unknown; participantId?: unknown };
  const participantId = manualId !== undefined ? (isObjectId(manualId) ? manualId : null) : parseCheckInToken(code);

  if (!participantId) {
    return res.status(200).json({ success: true, status: "invalid", message: "This isn't a valid GDG check-in pass." });
  }

  let participant: any = await Participant.findById(participantId).select(PARTICIPANT_FIELDS).lean();
  if (!participant) {
    return res
      .status(200)
      .json({ success: true, status: "not_found", message: "This registration no longer exists." });
  }

  if (String(participant.event) !== eventId) {
    const other = await eventModel.findById(participant.event).select("name").lean();
    return res.status(200).json({
      success: true,
      status: "wrong_event",
      message: `This pass is for ${other?.name ? `"${other.name}"` : "a different event"}.`,
      participant: publicParticipant(participant),
    });
  }

  let status: "checked_in" | "already" = "already";
  if (!participant.attendance) {
    const updated = await Participant.findOneAndUpdate(
      { _id: participantId, attendance: { $ne: true } },
      { $set: { attendance: true, checkedInAt: new Date() } },
      { new: true }
    )
      .select(PARTICIPANT_FIELDS)
      .lean();
    if (updated) {
      participant = updated;
      status = "checked_in";
    } else {
      participant = await Participant.findById(participantId).select(PARTICIPANT_FIELDS).lean();
    }
  }

  const [registered, present] = await Promise.all([
    Participant.countDocuments({ event: eventId }),
    Participant.countDocuments({ event: eventId, attendance: true }),
  ]);

  res.status(200).json({
    success: true,
    status,
    message: status === "checked_in" ? "Checked in" : "Already checked in",
    participant: publicParticipant(participant),
    stats: { registered, present },
  });
});

export const sendCheckInPass = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const { eventId, participantId } = req.params;
  if (!isObjectId(eventId) || !isObjectId(participantId)) return next(new ErrorHandler("Invalid ID.", 400));

  const [participant, event] = await Promise.all([
    Participant.findOne({ _id: participantId, event: eventId }).select("name email").lean(),
    eventModel.findById(eventId).select("name eventDate venue").lean(),
  ]);
  if (!participant || !event) return next(new ErrorHandler("Participant not found for this event.", 404));

  const token = checkInToken(participantId);
  const passUrl = checkInPassUrl(req, token);
  const qrPng = await QRCode.toBuffer(token, { ...qrOptions, width: 480 });
  const when = formatEventDate((event as any).eventDate);
  const venue = (event as any).venue;

  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#18181b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
      <tr><td style="padding:28px 32px 0;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#71717a">GDG on Campus HIT</td></tr>
      <tr><td style="padding:12px 32px 8px"><h1 style="margin:0;font-size:22px">Your entry pass, ${escapeHtml(participant.name)}</h1></td></tr>
      <tr><td style="padding:0 32px;font-size:15px;line-height:1.6">Show this QR code at the entrance of <strong>${escapeHtml(event.name)}</strong>${when ? ` on <strong>${escapeHtml(when)}</strong>` : ""}${venue ? ` at ${escapeHtml(venue)}` : ""}. A GDG member will scan it to mark your attendance — you need to be marked present to receive your certificate.</td></tr>
      <tr><td align="center" style="padding:24px 32px 8px"><img src="cid:checkin-qr" width="240" height="240" alt="Check-in QR code" style="display:block;border:1px solid #e4e4e7;border-radius:12px"></td></tr>
      <tr><td align="center" style="padding:8px 32px 28px"><a href="${escapeHtml(passUrl)}" style="display:inline-block;background:#1a73e8;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">Open pass on your phone</a></td></tr>
      <tr><td style="padding:20px 32px;background:#fafafa;font-size:12px;color:#71717a">Don't share this pass — it's unique to your registration.</td></tr>
    </table>
  </td></tr></table></body></html>`;

  try {
    await sendMail({
      email: participant.email,
      subject: `Your entry pass for ${event.name}`,
      template: html,
      data: {},
      attachments: [{ filename: "entry-pass.png", content: qrPng, cid: "checkin-qr" }],
    });
  } catch (error) {
    console.log("Check-in pass email failed:", error);
    return next(new ErrorHandler("Couldn't send the email. Check the SMTP settings.", 502));
  }

  res.status(200).json({ success: true, message: `Pass emailed to ${participant.email}` });
});

// For the public site: the logged-in user's pass for an event they registered for
export const getMyCheckInPass = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const { eventId } = req.params;
  if (!isObjectId(eventId)) return next(new ErrorHandler("Invalid event ID.", 400));

  const participant = await Participant.findOne({ event: eventId, user: req.user?._id })
    .select("attendance checkedInAt")
    .lean();
  if (!participant) return next(new ErrorHandler("You aren't registered for this event.", 404));

  const token = checkInToken(String(participant._id));
  res.status(200).json({
    success: true,
    code: token,
    passUrl: checkInPassUrl(req, token),
    qrUrl: checkInQrUrl(req, token),
    checkedIn: !!participant.attendance,
    checkedInAt: participant.checkedInAt ?? null,
  });
});

export const checkInPassPage = CatchAsyncError(async (req: Request, res: Response) => {
  const participantId = parseCheckInToken(req.params.token);
  const participant: any = participantId
    ? await Participant.findById(participantId).select("name classRollNo attendance checkedInAt event").lean()
    : null;
  const event: any = participant ? await eventModel.findById(participant.event).select("name eventDate venue").lean() : null;

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");

  let body: string;
  if (!participant || !event) {
    body = `<div class="badge bad">&#10007; Invalid pass</div>
      <h1>This pass isn't valid</h1>
      <p class="muted">Ask a GDG member at the venue to find your registration manually.</p>`;
  } else {
    const svg = await QRCode.toString(checkInToken(String(participant._id)), { ...qrOptions, type: "svg" });
    const when = formatEventDate(event.eventDate);
    const status = participant.attendance
      ? `<div class="badge ok">&#10003; Checked in${participant.checkedInAt ? ` at ${escapeHtml(new Date(participant.checkedInAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }))}` : ""}</div>`
      : `<div class="badge">Entry pass</div>`;
    body = `${status}
      <h1>${escapeHtml(participant.name)}</h1>
      <p class="muted">${escapeHtml(participant.classRollNo || "")}</p>
      <div class="qr">${svg}</div>
      <h2>${escapeHtml(event.name)}</h2>
      <p class="muted">${escapeHtml([when, event.venue].filter(Boolean).join(" · "))}</p>
      <p class="hint">Turn your screen brightness up and show this to a GDG member at the entrance.</p>`;
  }

  res.status(participant ? 200 : 404).type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Entry pass · GDG on Campus HIT</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#e4e4e7;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:20px}
  .card{max-width:400px;width:100%;background:#121214;border:1px solid #27272a;border-radius:20px;padding:28px;text-align:center}
  .brand{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#71717a;margin-bottom:18px}
  .badge{display:inline-block;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;margin-bottom:14px;background:rgba(59,130,246,.12);color:#60a5fa}
  .ok{background:rgba(16,185,129,.12);color:#34d399}.bad{background:rgba(239,68,68,.12);color:#f87171}
  h1{font-size:22px;margin:0 0 4px;color:#fff}h2{font-size:17px;margin:0 0 4px;color:#fff}
  .muted{color:#a1a1aa;margin:0;font-size:14px}
  .qr{background:#fff;border-radius:16px;padding:12px;margin:20px auto;max-width:280px}.qr svg{display:block;width:100%;height:auto}
  .hint{color:#71717a;font-size:12px;margin:18px 0 0}
</style></head>
<body><main class="card"><div class="brand">GDG on Campus HIT</div>${body}</main></body></html>`);
});

// For the public site: every event the logged-in user registered for, with their
// entry pass and (once issued) certificate
export const getMyEvents = CatchAsyncError(async (req: Request, res: Response) => {
  const participants: any[] = await Participant.find({ user: req.user?._id })
    .select("event attendance checkedInAt position createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const [events, certificates] = await Promise.all([
    eventModel
      .find({ _id: { $in: participants.map((p) => p.event) } })
      .select("name eventDate eventTime venue eventBanner poster is_upcoming")
      .lean(),
    certificateModel
      .find({ participant: { $in: participants.map((p) => p._id) } })
      .select("participant kind position verification_code createdAt")
      .lean(),
  ]);
  const eventById = new Map(events.map((e: any) => [String(e._id), e]));
  const certByParticipant = new Map(certificates.map((c: any) => [String(c.participant), c]));

  const result = participants
    .filter((p) => eventById.has(String(p.event)))
    .map((p) => {
      const event: any = eventById.get(String(p.event));
      const cert: any = certByParticipant.get(String(p._id));
      const token = checkInToken(String(p._id));
      return {
        registrationId: p._id,
        registeredAt: p.createdAt,
        attendance: !!p.attendance,
        checkedInAt: p.checkedInAt ?? null,
        position: p.position ?? null,
        event: {
          _id: event._id,
          name: event.name,
          eventDate: event.eventDate,
          eventTime: event.eventTime,
          venue: event.venue,
          image: event.poster?.url || event.eventBanner?.url || null,
          is_upcoming: !!event.is_upcoming,
        },
        pass: { code: token, qrUrl: checkInQrUrl(req, token), passUrl: checkInPassUrl(req, token) },
        certificate: cert
          ? {
              code: cert.verification_code,
              kind: cert.kind,
              position: cert.position ?? null,
              issuedAt: cert.createdAt,
              viewUrl: certificateFileUrl(req, cert.verification_code),
              downloadUrl: `${certificateFileUrl(req, cert.verification_code)}?download=1`,
              verifyUrl: certificateCheckUrl(req, cert.verification_code),
            }
          : null,
      };
    });

  res.status(200).json({ success: true, events: result });
});

export const checkInQrImage = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const token = String(req.params.token || "");
  if (!parseCheckInToken(token)) return next(new ErrorHandler("Invalid pass.", 404));

  const svg = await QRCode.toString(token, { ...qrOptions, type: "svg" });
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.type("image/svg+xml").send(svg);
});
