import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import QRCode from "qrcode";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import sendMail from "../utlis/sendMail";
import { eventModel } from "../models/events.model";
import { Participant } from "../models/eventregistration.model";
import { certificateModel } from "../models/certificate.model";
import userModel from "../models/user.model";
import { certificateCheckUrl, certificateFileUrl, escapeHtml, formatEventDate, publicApiBase } from "../utlis/certificateRenderer";
import { checkInPassUrl, checkInToken, parseCheckInToken } from "../utlis/checkInPass";

const isObjectId = (id: unknown): id is string => typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

const PARTICIPANT_FIELDS =
  "name email classRollNo department position attendance checkedInAt sessionCheckIns walkIn event";

type Session = { key: string; label: string };

const publicParticipant = (p: any) => ({
  _id: p._id,
  name: p.name,
  email: p.email,
  classRollNo: p.classRollNo,
  department: p.department,
  position: p.position ?? null,
  attendance: !!p.attendance,
  checkedInAt: p.checkedInAt ?? null,
  sessionCheckIns: (p.sessionCheckIns ?? []).map((s: any) => ({ session: s.session, at: s.at })),
  walkIn: !!p.walkIn,
});

// Per-session progress for a participant, in the event's session order
const sessionProgress = (sessions: Session[], participant: any) => {
  const at = new Map<string, Date>((participant?.sessionCheckIns ?? []).map((s: any) => [s.session, s.at]));
  return sessions.map((s) => ({ key: s.key, label: s.label, checkedInAt: at.get(s.key) ?? null }));
};

const istTime = (value: Date) =>
  new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

type CheckInOutcome = { status: "checked_in" | "already"; message: string; participant: any };

/**
 * Marks a participant as checked in. Without sessions this sets attendance directly.
 * With sessions it records the session; attendance (certificate eligibility) is set
 * automatically once every session is attended and is never cleared here, so a lead's
 * manual approval survives later scans.
 */
const recordCheckIn = async (participant: any, sessions: Session[], session?: Session): Promise<CheckInOutcome> => {
  const id = participant._id;

  if (!session) {
    if (participant.attendance) return { status: "already", message: "Already checked in", participant };
    const updated = await Participant.findOneAndUpdate(
      { _id: id, attendance: { $ne: true } },
      { $set: { attendance: true, checkedInAt: new Date() } },
      { new: true }
    )
      .select(PARTICIPANT_FIELDS)
      .lean();
    if (updated) return { status: "checked_in", message: "Checked in", participant: updated };
    const current = await Participant.findById(id).select(PARTICIPANT_FIELDS).lean();
    return { status: "already", message: "Already checked in", participant: current };
  }

  let status: CheckInOutcome["status"] = "already";
  let current: any = participant;
  if (!(participant.sessionCheckIns ?? []).some((s: any) => s.session === session.key)) {
    const now = new Date();
    const updated: any = await Participant.findOneAndUpdate(
      { _id: id, "sessionCheckIns.session": { $ne: session.key } },
      {
        $push: { sessionCheckIns: { session: session.key, at: now } },
        $set: { checkedInAt: participant.checkedInAt ?? now },
      },
      { new: true }
    )
      .select(PARTICIPANT_FIELDS)
      .lean();
    if (updated) {
      status = "checked_in";
      current = updated;
      const done = new Set((updated.sessionCheckIns ?? []).map((s: any) => s.session));
      if (!updated.attendance && sessions.every((s) => done.has(s.key))) {
        current = await Participant.findByIdAndUpdate(id, { $set: { attendance: true } }, { new: true })
          .select(PARTICIPANT_FIELDS)
          .lean();
      }
    } else {
      current = await Participant.findById(id).select(PARTICIPANT_FIELDS).lean();
    }
  }

  const progress = sessionProgress(sessions, current);
  const attended = progress.filter((s) => s.checkedInAt).length;
  let message: string;
  if (status === "checked_in") {
    message =
      attended === sessions.length
        ? `Checked in for ${session.label} · attended all sessions`
        : `Checked in for ${session.label} · ${attended} of ${sessions.length} sessions`;
  } else {
    const at = progress.find((s) => s.key === session.key)?.checkedInAt;
    message = `Already checked in for ${session.label}${at ? ` at ${istTime(at)}` : ""}`;
  }
  return { status, message, participant: current };
};

const checkInStats = async (eventId: string, session?: Session) => {
  const [registered, present, sessionPresent] = await Promise.all([
    Participant.countDocuments({ event: eventId }),
    Participant.countDocuments({ event: eventId, attendance: true }),
    session ? Participant.countDocuments({ event: eventId, "sessionCheckIns.session": session.key }) : null,
  ]);
  return { registered, present, ...(session ? { sessionPresent } : {}) };
};

// Resolves the session a check-in is for; null result means the request is invalid
const resolveSession = (sessions: Session[], raw: unknown): { session?: Session } | null => {
  if (!sessions.length) return {};
  const session = sessions.find((s) => s.key === raw);
  return session ? { session } : null;
};

// Links registrations made for this email (e.g. walk-ins added at the venue before the
// person had an account) to the signed-in user, along with their certificates.
export const claimRegistrationsByEmail = async (user: any) => {
  const email = String(user?.email || "").toLowerCase();
  if (!user?._id || !email) return;
  const unclaimed = await Participant.find({ user: null, email }).select("_id").lean();
  if (!unclaimed.length) return;
  const ids = unclaimed.map((p) => p._id);
  await Participant.updateMany({ _id: { $in: ids }, user: null }, { $set: { user: user._id } });
  await certificateModel.updateMany({ participant: { $in: ids }, user: null }, { $set: { user: user._id } });
};

const qrOptions = { errorCorrectionLevel: "M" as const, margin: 2 };

const checkInQrUrl = (req: Request, token: string) =>
  `${publicApiBase(req)}/api/v1/check-in/qr/${encodeURIComponent(token)}`;

// Scan outcomes are returned as 200 with a `status` so the scanner can show each
// result without treating "already checked in" or "wrong event" as request failures.
export const checkInParticipant = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const { eventId } = req.params;
  if (!isObjectId(eventId)) return next(new ErrorHandler("Invalid event ID.", 400));

  const { code, participantId: manualId, session: rawSession } = req.body as {
    code?: unknown;
    participantId?: unknown;
    session?: unknown;
  };
  const participantId = manualId !== undefined ? (isObjectId(manualId) ? manualId : null) : parseCheckInToken(code);

  const event: any = await eventModel.findById(eventId).select("attendanceSessions").lean();
  if (!event) return next(new ErrorHandler("Event not found.", 404));
  const sessions: Session[] = event.attendanceSessions ?? [];
  const resolved = resolveSession(sessions, rawSession);
  if (!resolved) return next(new ErrorHandler("Choose which session you're checking people in for.", 400));

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

  const outcome = await recordCheckIn(participant, sessions, resolved.session);

  res.status(200).json({
    success: true,
    status: outcome.status,
    message: outcome.message,
    participant: publicParticipant(outcome.participant),
    session: resolved.session ?? null,
    sessions: sessionProgress(sessions, outcome.participant),
    stats: await checkInStats(eventId, resolved.session),
  });
});

// Configure the event's check-in sessions (e.g. "First half", "After lunch")
export const setAttendanceSessions = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const { eventId } = req.params;
  if (!isObjectId(eventId)) return next(new ErrorHandler("Invalid event ID.", 400));

  const raw = (req.body as { sessions?: unknown }).sessions;
  if (!Array.isArray(raw) || raw.length > 6) return next(new ErrorHandler("Send up to 6 sessions.", 400));

  const sessions: Session[] = [];
  for (const item of raw) {
    const label = String((item as any)?.label ?? "").trim().slice(0, 40);
    if (!label) return next(new ErrorHandler("Every session needs a name.", 400));
    if (sessions.some((s) => s.label.toLowerCase() === label.toLowerCase())) {
      return next(new ErrorHandler(`"${label}" is listed twice.`, 400));
    }
    const given = String((item as any)?.key ?? "");
    const key =
      /^[a-z0-9-]{1,40}$/.test(given) && !sessions.some((s) => s.key === given)
        ? given
        : `s-${crypto.randomBytes(4).toString("hex")}`;
    sessions.push({ key, label });
  }

  const event = await eventModel
    .findByIdAndUpdate(eventId, { $set: { attendanceSessions: sessions } }, { new: true, runValidators: true })
    .select("attendanceSessions");
  if (!event) return next(new ErrorHandler("Event not found.", 404));

  // Approve anyone who now has every session; existing approvals are left alone
  if (sessions.length) {
    await Participant.updateMany(
      { event: eventId, attendance: { $ne: true }, "sessionCheckIns.session": { $all: sessions.map((s) => s.key) } },
      { $set: { attendance: true } }
    );
  }

  res.status(200).json({ success: true, sessions: event.attendanceSessions, stats: await checkInStats(eventId) });
});

// Register someone at the venue who didn't sign up online, and check them in
export const addWalkIn = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const { eventId } = req.params;
  if (!isObjectId(eventId)) return next(new ErrorHandler("Invalid event ID.", 400));

  const body = req.body as Record<string, unknown>;
  const text = (key: string) => String(body[key] ?? "").trim();
  const name = text("name");
  const email = text("email").toLowerCase();
  const classRollNo = text("classRollNo");
  const department = text("department");
  const phoneNumber = text("phoneNumber").replace(/[\s-]/g, "");

  if (!name || !email || !classRollNo || !department || !phoneNumber) {
    return next(new ErrorHandler("Name, email, roll number, department and phone are all required.", 400));
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return next(new ErrorHandler("Enter a valid email address.", 400));
  if (!/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) return next(new ErrorHandler("Enter a valid phone number.", 400));

  const event: any = await eventModel.findById(eventId).select("attendanceSessions").lean();
  if (!event) return next(new ErrorHandler("Event not found.", 404));
  const sessions: Session[] = event.attendanceSessions ?? [];
  const resolved = resolveSession(sessions, body.session);
  if (!resolved) return next(new ErrorHandler("Choose which session you're checking people in for.", 400));

  const account: any = await userModel.findOne({ email }).select("_id").lean();
  const existing: any = await Participant.findOne({
    event: eventId,
    $or: [{ email }, ...(account ? [{ user: account._id }] : [])],
  })
    .select(PARTICIPANT_FIELDS)
    .lean();

  let participant = existing;
  if (!participant) {
    const created = await Participant.create({
      user: account?._id ?? null,
      event: eventId,
      name,
      email,
      classRollNo,
      department,
      phoneNumber,
      walkIn: true,
    });
    participant = await Participant.findById(created._id).select(PARTICIPANT_FIELDS).lean();
  }

  const outcome = await recordCheckIn(participant, sessions, resolved.session);

  res.status(existing ? 200 : 201).json({
    success: true,
    created: !existing,
    status: outcome.status,
    message: existing ? `Already registered · ${outcome.message.toLowerCase()}` : `Walk-in added · ${outcome.message.toLowerCase()}`,
    participant: publicParticipant(outcome.participant),
    session: resolved.session ?? null,
    sessions: sessionProgress(sessions, outcome.participant),
    stats: await checkInStats(eventId, resolved.session),
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

  await claimRegistrationsByEmail(req.user);
  const [participant, event] = await Promise.all([
    Participant.findOne({ event: eventId, user: req.user?._id }).select("attendance checkedInAt sessionCheckIns").lean(),
    eventModel.findById(eventId).select("attendanceSessions").lean(),
  ]);
  if (!participant) return next(new ErrorHandler("You aren't registered for this event.", 404));

  const token = checkInToken(String(participant._id));
  res.status(200).json({
    success: true,
    code: token,
    passUrl: checkInPassUrl(req, token),
    qrUrl: checkInQrUrl(req, token),
    checkedIn: !!participant.attendance,
    checkedInAt: participant.checkedInAt ?? null,
    sessions: sessionProgress((event as any)?.attendanceSessions ?? [], participant),
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
  await claimRegistrationsByEmail(req.user);
  const participants: any[] = await Participant.find({ user: req.user?._id })
    .select("event attendance checkedInAt sessionCheckIns position createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const [events, certificates] = await Promise.all([
    eventModel
      .find({ _id: { $in: participants.map((p) => p.event) } })
      .select("name eventDate eventTime venue eventBanner poster is_upcoming attendanceSessions")
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
        sessions: sessionProgress(event.attendanceSessions ?? [], p),
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
