import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import imagekit from "../utlis/imageKit";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import sendMail from "../utlis/sendMail";
import { eventModel } from "../models/events.model";
import { Participant } from "../models/eventregistration.model";
import { certificateModel } from "../models/certificate.model";
import {
  ICertificateDesign,
  ICertificateField,
  ICertificateTemplate,
} from "../models/certificateDesign.schema";
import {
  CERTIFICATE_TOKENS,
  CUSTOM_FONT_PREFIX,
  CertificateTokenData,
  SAMPLE_DATA,
  STANDARD_FONTS,
  STORED_CERTIFICATE_FOLDER,
  certificateCheckUrl,
  certificateFileUrl,
  certificateQrUrl,
  escapeHtml,
  formatEventDate,
  renderCertificatePdf,
} from "../utlis/certificateRenderer";

type Kind = "participation" | "winner";

const MAX_FIELDS = 40;
const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const isObjectId = (id: unknown): id is string =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

const sanitizeDesign = (input: any): ICertificateDesign | undefined => {
  if (!input || typeof input !== "object") return undefined;

  const bg = input.background;
  const background =
    bg && typeof bg.url === "string" && /^https:\/\//.test(bg.url)
      ? {
          url: bg.url,
          public_id: String(bg.public_id || ""),
          width: clamp(bg.width, 1, 20000, 1754),
          height: clamp(bg.height, 1, 20000, 1240),
          format: String(bg.format || "png").toLowerCase(),
        }
      : undefined;

  const fonts = (Array.isArray(input.fonts) ? input.fonts : [])
    .filter((f: any) => f && typeof f.key === "string" && typeof f.url === "string" && /^https:\/\//.test(f.url))
    .slice(0, 10)
    .map((f: any) => ({
      key: f.key.slice(0, 40),
      name: String(f.name || "Custom font").slice(0, 60),
      url: f.url,
      public_id: String(f.public_id || ""),
    }));
  const fontKeys = new Set(fonts.map((f: { key: string }) => `${CUSTOM_FONT_PREFIX}${f.key}`));

  const fields: ICertificateField[] = (Array.isArray(input.fields) ? input.fields : [])
    .slice(0, MAX_FIELDS)
    .map((f: any, index: number): ICertificateField => {
      const type = f?.type === "qr" ? "qr" : "text";
      const font = typeof f?.font === "string" && (STANDARD_FONTS[f.font] || fontKeys.has(f.font)) ? f.font : "Helvetica";
      return {
        id: typeof f?.id === "string" && f.id ? f.id.slice(0, 40) : `field-${index}`,
        type,
        text: String(f?.text ?? "").slice(0, 500),
        x: clamp(f?.x, 0, 1, 0.5),
        y: clamp(f?.y, 0, 1, 0.5),
        fontSize: clamp(f?.fontSize, 0.002, 0.3, 0.03),
        font,
        color: /^#[0-9a-f]{6}$/i.test(f?.color) ? f.color : type === "qr" ? "#000000" : "#111111",
        align: ["left", "center", "right"].includes(f?.align) ? f.align : "center",
        maxWidth: clamp(f?.maxWidth, 0, 1, 0),
        uppercase: !!f?.uppercase,
        size: clamp(f?.size, 0.02, 0.5, 0.1),
        showFor: ["all", "winners", "participants"].includes(f?.showFor) ? f.showFor : "all",
      };
    });

  return { background, fonts, fields };
};

const assetIds = (template?: ICertificateTemplate | null) => {
  const images = new Set<string>();
  const raws = new Set<string>();
  for (const design of [template?.participation, template?.winner]) {
    if (design?.background?.public_id) images.add(design.background.public_id);
    design?.fonts?.forEach((f) => f.public_id && raws.add(f.public_id));
  }
  return { images, raws };
};

const uploadBuffer = async (buffer: Buffer, fileName: string, folder: string, fixedName = false) => {
  try {
    return await imagekit.upload({
      file: buffer,
      fileName,
      folder,
      useUniqueFileName: !fixedName,
      ...(fixedName && { overwriteFile: true }),
    } as Parameters<typeof imagekit.upload>[0]);
  } catch (error: any) {
    console.error("ImageKit upload failed:", error);
    throw new ErrorHandler(
      error?.message ? `Image storage rejected the file: ${error.message}` : "Upload to image storage failed",
      502
    );
  }
};

const deleteUpload = (fileId: string) => imagekit.deleteFile(fileId).catch(() => {});

const designFor = (template: ICertificateTemplate | undefined, kind: Kind) =>
  kind === "winner" && template?.winner?.background?.url ? template.winner : template?.participation;

const newVerificationCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `GDG-${chars.slice(0, 4)}-${chars.slice(4)}`;
};

const tokenData = (req: Request, cert: any, event: any, participant: any): CertificateTokenData => ({
  name: participant?.name || cert.user?.name || "",
  event: event?.name || "",
  date: formatEventDate(event?.eventDate),
  position: cert.position ?? null,
  rollNo: participant?.classRollNo || "",
  department: participant?.department || "",
  email: participant?.email || cert.user?.email || "",
  code: cert.verification_code,
  verifyUrl: certificateQrUrl(req, cert.verification_code),
});

const timeOf = (value?: Date | string | null) => (value ? new Date(value).getTime() || 0 : 0);

// A stored PDF is stale once the design or the participant's details change after it was rendered.
const hasFreshStoredFile = (cert: any, event: any) => {
  const renderedAt = timeOf(cert.certificate?.rendered_at);
  return (
    !!renderedAt &&
    !!cert.certificate?.url &&
    renderedAt >= timeOf(event?.certificateTemplate?.updatedAt) &&
    renderedAt >= timeOf(cert.participant?.updatedAt)
  );
};

const storeCertificateFile = async (req: Request, cert: any, event: any) => {
  const design = designFor(event.certificateTemplate, cert.kind);
  if (!design?.background?.url) throw new Error("This event has no certificate design.");

  const renderedAt = new Date();
  const bytes = await renderCertificatePdf([{ design, data: tokenData(req, cert, event, cert.participant) }]);
  const upload = await uploadBuffer(Buffer.from(bytes), `${cert.verification_code}.pdf`, STORED_CERTIFICATE_FOLDER, true);
  if (cert.certificate?.public_id) {
    imagekit.purgeCache(upload.url).catch(() => {});
  }

  await certificateModel.updateOne(
    { _id: cert._id },
    { $set: { certificate: { public_id: upload.fileId, url: upload.url, rendered_at: renderedAt } } },
    { timestamps: false }
  );
};

const runWithConcurrency = async <T>(items: T[], limit: number, worker: (item: T) => Promise<void>) => {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await worker(items[next++]);
    })
  );
};

const loadEvent = async (eventId: string, next: NextFunction) => {
  if (!isObjectId(eventId)) {
    next(new ErrorHandler("Invalid event ID.", 400));
    return null;
  }
  const event = await eventModel.findById(eventId).select("+certificateTemplate name eventDate");
  if (!event) {
    next(new ErrorHandler("Event not found.", 404));
    return null;
  }
  return event;
};

const sendPdf = (res: Response, bytes: Uint8Array, filename: string, disposition: "inline" | "attachment") => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${disposition}; filename="${filename.replace(/[^\w.-]+/g, "-")}"`);
  res.setHeader("Cache-Control", "private, max-age=60");
  res.send(Buffer.from(bytes));
};

// ------------------------------------------------------------------ template

export const getCertificateTemplate = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const event = await loadEvent(req.params.eventId, next);
  if (!event) return;

  res.status(200).json({
    success: true,
    event: { _id: event._id, name: event.name, eventDate: event.eventDate },
    template: event.certificateTemplate ?? null,
    tokens: CERTIFICATE_TOKENS,
    standardFonts: Object.keys(STANDARD_FONTS),
    sample: { ...SAMPLE_DATA, event: event.name, date: formatEventDate(event.eventDate) },
  });
});

export const saveCertificateTemplate = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const event = await loadEvent(req.params.eventId, next);
  if (!event) return;

  const previous = event.certificateTemplate ? JSON.parse(JSON.stringify(event.certificateTemplate)) : null;
  const template: ICertificateTemplate = {
    participation: sanitizeDesign(req.body.participation),
    winner: req.body.winner === null ? undefined : sanitizeDesign(req.body.winner),
    updatedAt: new Date(),
  };

  await eventModel.updateOne({ _id: event._id }, { $set: { certificateTemplate: template } }, { runValidators: true });

  // Remove uploads that no longer appear in either design (designs can be copied between events)
  const before = assetIds(previous);
  const after = assetIds(template);
  const usedElsewhere = (path: "background.public_id" | "fonts.public_id", id: string) =>
    eventModel.exists({
      _id: { $ne: event._id },
      $or: [
        { [`certificateTemplate.participation.${path}`]: id },
        { [`certificateTemplate.winner.${path}`]: id },
      ],
    });
  for (const id of before.images) {
    if (after.images.has(id)) continue;
    if (!(await usedElsewhere("background.public_id", id))) deleteUpload(id);
  }
  for (const id of before.raws) {
    if (after.raws.has(id)) continue;
    if (!(await usedElsewhere("fonts.public_id", id))) deleteUpload(id);
  }

  res.status(200).json({ success: true, template });
});

export const uploadCertificateBackground = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const event = await loadEvent(req.params.eventId, next);
  if (!event) return;

  const file = req.file;
  if (!file) return next(new ErrorHandler("Choose a PNG or JPG file.", 400));
  if (!["image/png", "image/jpeg"].includes(file.mimetype)) {
    return next(new ErrorHandler("The design must be a PNG or JPG. Export PDFs as PNG first.", 400));
  }

  const format = file.mimetype === "image/png" ? "png" : "jpg";
  const result = await uploadBuffer(file.buffer, `design.${format}`, `/certificate_templates/${event._id}`);

  res.status(201).json({
    success: true,
    background: {
      url: result.url,
      public_id: result.fileId,
      width: result.width,
      height: result.height,
      format,
    },
  });
});

export const uploadCertificateFont = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const event = await loadEvent(req.params.eventId, next);
  if (!event) return;

  const file = req.file;
  const ext = (file?.originalname.split(".").pop() || "").toLowerCase();
  if (!file || !["ttf", "otf"].includes(ext)) {
    return next(new ErrorHandler("Upload a .ttf or .otf font file.", 400));
  }

  try {
    const scratch = await PDFDocument.create();
    scratch.registerFontkit(fontkit);
    await scratch.embedFont(file.buffer);
  } catch {
    return next(new ErrorHandler("That font file couldn't be read.", 400));
  }

  const key = crypto.randomBytes(5).toString("hex");
  const result = await uploadBuffer(file.buffer, `${key}.${ext}`, "/certificate_fonts");

  res.status(201).json({
    success: true,
    font: {
      key,
      name: file.originalname.replace(/\.(ttf|otf)$/i, "").slice(0, 60),
      url: result.url,
      public_id: result.fileId,
    },
  });
});

export const previewCertificateTemplate = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const event = await loadEvent(req.params.eventId, next);
  if (!event) return;

  const design = sanitizeDesign(req.body.design);
  if (!design?.background?.url) return next(new ErrorHandler("Upload a design first.", 400));

  const kind: Kind = req.body.kind === "winner" ? "winner" : "participation";
  const data: CertificateTokenData = {
    ...SAMPLE_DATA,
    ...(req.body.sample && typeof req.body.sample === "object" ? req.body.sample : {}),
    event: event.name,
    date: formatEventDate(event.eventDate),
    position: kind === "winner" ? 1 : null,
  };

  try {
    const bytes = await renderCertificatePdf([{ design, data }]);
    sendPdf(res, bytes, "certificate-preview.pdf", "inline");
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Couldn't render the preview.", 500));
  }
});

// ------------------------------------------------------------------ issuing

export const getEventCertificates = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const event = await loadEvent(req.params.eventId, next);
  if (!event) return;

  const [participants, certificates] = await Promise.all([
    Participant.find({ event: event._id }).select("attendance position").lean(),
    certificateModel
      .find({ event: event._id })
      .sort({ createdAt: -1 })
      .populate({ path: "participant", select: "name email classRollNo department attendance position" })
      .populate({ path: "user", select: "_id name email" })
      .lean(),
  ]);

  const certifiedParticipants = new Set(certificates.map((c: any) => String(c.participant?._id ?? "")));
  const present = participants.filter((p) => p.attendance);

  res.status(200).json({
    success: true,
    stats: {
      registered: participants.length,
      present: present.length,
      winners: present.filter((p) => p.position).length,
      issued: certificates.length,
      emailed: certificates.filter((c) => c.mail_sent).length,
      pending: present.filter((p) => !certifiedParticipants.has(String(p._id))).length,
      absentWithCertificate: certificates.filter((c: any) => c.participant && !c.participant.attendance).length,
    },
    hasTemplate: !!event.certificateTemplate?.participation?.background?.url,
    certificates,
  });
});

export const issueEventCertificates = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const event = await loadEvent(req.params.eventId, next);
  if (!event) return;

  if (!event.certificateTemplate?.participation?.background?.url) {
    return next(new ErrorHandler("Upload and save a certificate design for this event first.", 400));
  }

  const present = await Participant.find({ event: event._id, attendance: true }).lean();
  const existing = await certificateModel.find({ event: event._id, participant: { $in: present.map((p) => p._id) } });
  const byParticipant = new Map(existing.map((c) => [String(c.participant), c]));

  const toCreate: any[] = [];
  let updated = 0;

  for (const p of present) {
    const kind: Kind = p.position ? "winner" : "participation";
    const position = p.position ?? null;
    const cert = byParticipant.get(String(p._id));

    if (cert) {
      if (cert.kind !== kind || (cert.position ?? null) !== position) {
        cert.kind = kind;
        cert.position = position;
        cert.set("certificate.rendered_at", null);
        await cert.save();
        updated++;
      }
      continue;
    }

    const code = newVerificationCode();
    toCreate.push({
      event: event._id,
      user: p.user,
      participant: p._id,
      kind,
      position,
      verification_code: code,
      certificate: { public_id: "", url: "", rendered_at: null },
    });
  }

  let created = 0;
  if (toCreate.length) {
    try {
      const docs = await certificateModel.insertMany(toCreate, { ordered: false });
      created = docs.length;
    } catch (error: any) {
      created = error?.insertedDocs?.length ?? error?.result?.insertedCount ?? 0;
    }
  }

  const issued = await certificateModel
    .find({ event: event._id, participant: { $type: "objectId" } })
    .populate("participant")
    .populate({ path: "user", select: "name email" })
    .lean();
  const toStore = issued.filter((cert: any) => cert.participant && !hasFreshStoredFile(cert, event));

  let stored = 0;
  let failed = 0;
  await runWithConcurrency(toStore, 4, async (cert) => {
    try {
      await storeCertificateFile(req, cert, event);
      stored++;
    } catch (error) {
      failed++;
      console.error(`Certificate ${cert.verification_code} couldn't be stored:`, error);
    }
  });

  const parts = [
    created && `issued ${created} new certificate${created === 1 ? "" : "s"}`,
    updated && `updated ${updated}`,
    stored && `generated ${stored} PDF${stored === 1 ? "" : "s"}`,
    failed && `${failed} PDF${failed === 1 ? "" : "s"} couldn't be generated — try again`,
  ].filter(Boolean) as string[];
  const message = parts.length
    ? `${parts.join(", ").replace(/^./, (c) => c.toUpperCase())}.`
    : "Everyone marked present already has an up-to-date certificate.";

  res.status(200).json({ success: true, created, updated, stored, failed, message });
});

export const printEventCertificates = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const event = await loadEvent(req.params.eventId, next);
  if (!event) return;

  const kind = req.query.kind === "winner" || req.query.kind === "participation" ? req.query.kind : "all";
  const filter: Record<string, unknown> = { event: event._id, participant: { $exists: true } };
  if (kind !== "all") filter.kind = kind;

  const certificates = await certificateModel
    .find(filter)
    .sort({ position: 1, createdAt: 1 })
    .populate("participant")
    .populate({ path: "user", select: "name email" })
    .lean();

  if (!certificates.length) return next(new ErrorHandler("No certificates to print yet.", 404));

  const pages = certificates
    .map((cert: any) => {
      const design = designFor(event.certificateTemplate, cert.kind);
      return design?.background?.url ? { design, data: tokenData(req, cert, event, cert.participant) } : null;
    })
    .filter(Boolean) as { design: ICertificateDesign; data: CertificateTokenData }[];

  if (!pages.length) return next(new ErrorHandler("This event has no certificate design.", 400));

  const bytes = await renderCertificatePdf(pages);
  sendPdf(res, bytes, `${event.name}-${kind}-certificates.pdf`, "attachment");
});

// ------------------------------------------------------------------ public

const findCertificateByCode = (code: string) =>
  certificateModel
    .findOne({ verification_code: code })
    .populate("participant")
    .populate({ path: "user", select: "name email" })
    .populate({ path: "event", select: "+certificateTemplate name eventDate" });

export const renderCertificateFile = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const cert: any = await findCertificateByCode(req.params.code);
  if (!cert) return next(new ErrorHandler("Certificate not found.", 404));

  if (!cert.participant) {
    // Legacy uploads were stored as files
    if (cert.certificate?.url && !cert.certificate.url.includes("/certificate/file/")) {
      return res.redirect(cert.certificate.url);
    }
    return next(new ErrorHandler("Certificate file not available.", 404));
  }

  if (hasFreshStoredFile(cert, cert.event)) {
    certificateModel.updateOne({ _id: cert._id }, { $inc: { download: 1 } }, { timestamps: false }).catch(() => {});
    return res.redirect(req.query.download ? `${cert.certificate.url}?ik-attachment=true` : cert.certificate.url);
  }

  const design = designFor(cert.event?.certificateTemplate, cert.kind);
  if (!design?.background?.url) return next(new ErrorHandler("Certificate design not available.", 404));

  const bytes = await renderCertificatePdf([{ design, data: tokenData(req, cert, cert.event, cert.participant) }]);
  certificateModel.updateOne({ _id: cert._id }, { $inc: { download: 1 } }).catch(() => {});
  sendPdf(
    res,
    bytes,
    `${cert.participant.name || "certificate"}-${cert.event?.name || ""}.pdf`,
    req.query.download ? "attachment" : "inline"
  );
});

export const certificateCheckPage = CatchAsyncError(async (req: Request, res: Response) => {
  const cert: any = await findCertificateByCode(req.params.code);
  const name = cert?.participant?.name || cert?.user?.name;
  const valid = !!cert && !!name;

  const body = valid
    ? `<div class="badge ok">&#10003; Valid certificate</div>
       <h1>${escapeHtml(name)}</h1>
       <p class="muted">${cert.kind === "winner" && cert.position ? `Secured position ${escapeHtml(cert.position)} in` : "Participated in"}</p>
       <h2>${escapeHtml(cert.event?.name)}</h2>
       <dl>
         <dt>Event date</dt><dd>${escapeHtml(formatEventDate(cert.event?.eventDate) || "—")}</dd>
         <dt>Issued</dt><dd>${escapeHtml(new Date(cert.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }))}</dd>
         <dt>Code</dt><dd><code>${escapeHtml(cert.verification_code)}</code></dd>
       </dl>
       <a class="btn" href="${escapeHtml(certificateFileUrl(req, cert.verification_code))}">View certificate</a>`
    : `<div class="badge bad">&#10007; Not found</div>
       <h1>We couldn't verify this certificate</h1>
       <p class="muted">The code <code>${escapeHtml(req.params.code)}</code> doesn't match any certificate issued by GDG on Campus HIT.</p>`;

  res.status(valid ? 200 : 404).type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Certificate verification · GDG on Campus HIT</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#e4e4e7;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px}
  .card{max-width:440px;width:100%;background:#121214;border:1px solid #27272a;border-radius:20px;padding:32px}
  .brand{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#71717a;margin-bottom:20px}
  .badge{display:inline-block;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;margin-bottom:16px}
  .ok{background:rgba(16,185,129,.12);color:#34d399}.bad{background:rgba(239,68,68,.12);color:#f87171}
  h1{font-size:24px;margin:0 0 6px;color:#fff}h2{font-size:18px;margin:4px 0 20px;color:#fff}
  .muted{color:#a1a1aa;margin:0;font-size:14px}
  dl{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;margin:0 0 24px}dt{color:#71717a}dd{margin:0;text-align:right}
  code{font-family:ui-monospace,Menlo,monospace;font-size:13px}
  .btn{display:block;text-align:center;background:#3b82f6;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px;border-radius:12px}
</style></head>
<body><main class="card"><div class="brand">GDG on Campus HIT</div>${body}</main></body></html>`);
});

// ------------------------------------------------------------------ email

export const sendCertificateEmail = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  if (!isObjectId(req.params.id)) return next(new ErrorHandler("Invalid certificate ID.", 400));

  const cert: any = await certificateModel
    .findById(req.params.id)
    .populate("participant")
    .populate({ path: "user", select: "name email" })
    .populate({ path: "event", select: "+certificateTemplate name eventDate" });
  if (!cert) return next(new ErrorHandler("Certificate not found.", 404));

  const email = cert.participant?.email || cert.user?.email;
  const name = cert.participant?.name || cert.user?.name || "there";
  if (!email) return next(new ErrorHandler("This participant has no email address.", 400));

  const eventName = cert.event?.name || "our event";
  // Emails stay in inboxes for years, so prefer the stored file that outlives the yearly domain
  const fileUrl = !cert.participant
    ? cert.certificate?.url
    : hasFreshStoredFile(cert, cert.event)
      ? cert.certificate.url
      : certificateFileUrl(req, cert.verification_code);
  const checkUrl = certificateCheckUrl(req, cert.verification_code);
  const achievement =
    cert.kind === "winner" && cert.position
      ? `Congratulations on securing <strong>position ${escapeHtml(cert.position)}</strong> in <strong>${escapeHtml(eventName)}</strong>! Your certificate of achievement is ready.`
      : `Thank you for attending <strong>${escapeHtml(eventName)}</strong>. Your participation certificate is ready.`;

  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#18181b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
      <tr><td style="padding:28px 32px 0;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#71717a">GDG on Campus HIT</td></tr>
      <tr><td style="padding:12px 32px 8px"><h1 style="margin:0;font-size:22px">Hi ${escapeHtml(name)},</h1></td></tr>
      <tr><td style="padding:0 32px;font-size:15px;line-height:1.6">${achievement}</td></tr>
      <tr><td style="padding:24px 32px"><a href="${escapeHtml(fileUrl)}" style="display:inline-block;background:#1a73e8;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">Download certificate</a></td></tr>
      <tr><td style="padding:0 32px 28px;font-size:13px;line-height:1.6;color:#52525b">Anyone can verify it at <a href="${escapeHtml(checkUrl)}" style="color:#1a73e8">${escapeHtml(checkUrl)}</a> using code <strong>${escapeHtml(cert.verification_code)}</strong>.</td></tr>
      <tr><td style="padding:20px 32px;background:#fafafa;font-size:12px;color:#71717a">You're receiving this because you registered for ${escapeHtml(eventName)}.</td></tr>
    </table>
  </td></tr></table></body></html>`;

  try {
    await sendMail({ email, subject: `Your certificate for ${eventName}`, template: html, data: {} });
  } catch (error) {
    console.log("Certificate email failed:", error);
    return next(new ErrorHandler("Couldn't send the email. Check the SMTP settings.", 502));
  }

  cert.mail_sent = true;
  await cert.save();

  res.status(200).json({ success: true, message: `Certificate emailed to ${email}` });
});
