import { PDFDocument, PDFFont, PDFImage, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { Request } from "express";
import {
  ICertificateDesign,
  ICertificateField,
} from "../models/certificateDesign.schema";
import { siteUrl } from "./site";

export const STANDARD_FONTS: Record<string, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  "Helvetica-Bold": StandardFonts.HelveticaBold,
  "Helvetica-Oblique": StandardFonts.HelveticaOblique,
  "Times-Roman": StandardFonts.TimesRoman,
  "Times-Bold": StandardFonts.TimesRomanBold,
  "Times-Italic": StandardFonts.TimesRomanItalic,
  "Times-BoldItalic": StandardFonts.TimesRomanBoldItalic,
  Courier: StandardFonts.Courier,
  "Courier-Bold": StandardFonts.CourierBold,
};

export const CUSTOM_FONT_PREFIX = "custom:";

export const CERTIFICATE_TOKENS = [
  "name",
  "event",
  "date",
  "position",
  "positionWord",
  "rollNo",
  "department",
  "email",
  "code",
] as const;

export type CertificateTokenData = {
  name: string;
  event: string;
  date: string;
  position?: number | null;
  rollNo?: string;
  department?: string;
  email?: string;
  code: string;
  verifyUrl: string;
};

const ORDINALS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };
const POSITION_WORDS: Record<number, string> = { 1: "First", 2: "Second", 3: "Third" };

export const SAMPLE_DATA: CertificateTokenData = {
  name: "Aarav Sharma",
  event: "Sample Event",
  date: "14 March 2026",
  position: 1,
  rollNo: "22/CSE/101",
  department: "Computer Science & Engineering",
  email: "aarav@example.com",
  code: "GDG-SAMPLE-0000",
  verifyUrl: siteUrl,
};

export const fillTokens = (text: string, data: CertificateTokenData) =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => {
    switch (key) {
      case "position":
        return data.position ? ORDINALS[data.position] ?? String(data.position) : "";
      case "positionWord":
        return data.position ? POSITION_WORDS[data.position] ?? "" : "";
      case "name":
      case "event":
      case "date":
      case "rollNo":
      case "department":
      case "email":
      case "code":
        return data[key] ?? "";
      default:
        return match;
    }
  });

export const formatEventDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

export const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const publicApiBase = (req: Request) =>
  (process.env.API_PUBLIC_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");

export const certificateFileUrl = (req: Request, code: string) =>
  `${publicApiBase(req)}/api/v1/certificate/file/${encodeURIComponent(code)}`;

export const certificateCheckUrl = (req: Request, code: string) =>
  `${publicApiBase(req)}/api/v1/certificate/check/${encodeURIComponent(code)}`;

// Issued certificates live on ImageKit at a path derived from the code, so the URL is known
// before upload (it goes into the QR code) and survives the website changing domains.
export const STORED_CERTIFICATE_FOLDER = "/certificates";

export const storedCertificateUrl = (code: string) => {
  const endpoint = (process.env.IMAGEKIT_URL_ENDPOINT || "").replace(/\/+$/, "");
  return endpoint ? `${endpoint}${STORED_CERTIFICATE_FOLDER}/${encodeURIComponent(code)}.pdf` : null;
};

export const certificateQrUrl = (req: Request, code: string) =>
  storedCertificateUrl(code) || certificateCheckUrl(req, code);

// ImageKit may serve re-encoded (WebP/AVIF, lower quality) variants; pdf-lib needs the original PNG/JPG.
const originalImageUrl = (url: string) => {
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  const isImageKit = (endpoint && url.startsWith(endpoint)) || /^https:\/\/ik\.imagekit\.io\//.test(url);
  return isImageKit ? `${url}${url.includes("?") ? "&" : "?"}tr=orig-true` : url;
};

// Backgrounds and fonts are immutable uploaded assets, so cache their bytes
// across requests (bounded, oldest evicted first).
const ASSET_CACHE_LIMIT = 40;
const assetCache = new Map<string, Promise<Uint8Array>>();

export const fetchAsset = (url: string): Promise<Uint8Array> => {
  const cached = assetCache.get(url);
  if (cached) return cached;
  const pending = fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`Couldn't download ${url} (${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  });
  pending.catch(() => assetCache.delete(url));
  assetCache.set(url, pending);
  if (assetCache.size > ASSET_CACHE_LIMIT) {
    assetCache.delete(assetCache.keys().next().value as string);
  }
  return pending;
};

// Standard PDF fonts only cover WinAnsi; drop accents/characters they can't draw.
const toWinAnsi = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");

const parseColor = (hex?: string) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  const value = match ? parseInt(match[1], 16) : 0x111111;
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
};

export const pageSizeFor = (design: ICertificateDesign) => {
  const width = design.background?.width || 1754;
  const height = design.background?.height || 1240;
  const pageWidth = width >= height ? 842 : 595; // A4 in points
  return { width: pageWidth, height: (pageWidth * height) / width };
};

const isVisibleFor = (field: ICertificateField, data: CertificateTokenData) => {
  if (field.showFor === "winners") return !!data.position;
  if (field.showFor === "participants") return !data.position;
  return true;
};

export class CertificateRenderer {
  private doc!: PDFDocument;
  private fonts = new Map<string, PDFFont>();
  private images = new Map<string, PDFImage>();

  static async create() {
    const renderer = new CertificateRenderer();
    renderer.doc = await PDFDocument.create();
    renderer.doc.registerFontkit(fontkit);
    renderer.doc.setProducer("GDG on Campus HIT");
    return renderer;
  }

  private async font(name: string | undefined, design: ICertificateDesign) {
    const key = name || "Helvetica";
    const cached = this.fonts.get(key);
    if (cached) return { font: cached, standard: !key.startsWith(CUSTOM_FONT_PREFIX) };

    let font: PDFFont;
    let standard = true;
    if (key.startsWith(CUSTOM_FONT_PREFIX)) {
      const custom = design.fonts?.find((f) => f.key === key.slice(CUSTOM_FONT_PREFIX.length));
      if (custom) {
        font = await this.doc.embedFont(await fetchAsset(custom.url), { subset: true });
        standard = false;
      } else {
        font = await this.doc.embedFont(StandardFonts.Helvetica);
      }
    } else {
      font = await this.doc.embedFont(STANDARD_FONTS[key] ?? StandardFonts.Helvetica);
    }
    this.fonts.set(key, font);
    return { font, standard };
  }

  private async background(design: ICertificateDesign) {
    const bg = design.background;
    if (!bg?.url) return null;
    const cached = this.images.get(bg.url);
    if (cached) return cached;
    const bytes = await fetchAsset(originalImageUrl(bg.url));
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const image = isPng ? await this.doc.embedPng(bytes) : await this.doc.embedJpg(bytes);
    this.images.set(bg.url, image);
    return image;
  }

  async addPage(design: ICertificateDesign, data: CertificateTokenData) {
    const { width, height } = pageSizeFor(design);
    const page = this.doc.addPage([width, height]);

    const bg = await this.background(design);
    if (bg) page.drawImage(bg, { x: 0, y: 0, width, height });

    for (const field of design.fields || []) {
      if (!isVisibleFor(field, data)) continue;

      if (field.type === "qr") {
        const size = (field.size || 0.1) * width;
        const png = await QRCode.toBuffer(field.text ? fillTokens(field.text, data) : data.verifyUrl, {
          margin: 1,
          width: 512,
          errorCorrectionLevel: "M",
          color: { dark: field.color || "#000000", light: "#ffffff" },
        });
        const qr = await this.doc.embedPng(png);
        page.drawImage(qr, {
          x: field.x * width - size / 2,
          y: height - field.y * height - size / 2,
          width: size,
          height: size,
        });
        continue;
      }

      const { font, standard } = await this.font(field.font, design);
      let text = fillTokens(field.text || "", data);
      if (field.uppercase) text = text.toUpperCase();
      if (standard) text = toWinAnsi(text);
      if (!text.trim()) continue;

      let size = (field.fontSize || 0.03) * width;
      let textWidth = font.widthOfTextAtSize(text, size);
      const maxWidth = (field.maxWidth || 0) * width;
      if (maxWidth > 0 && textWidth > maxWidth) {
        size *= maxWidth / textWidth;
        textWidth = maxWidth;
      }

      const anchorX = field.x * width;
      const x =
        field.align === "left" ? anchorX : field.align === "right" ? anchorX - textWidth : anchorX - textWidth / 2;

      // Match the editor preview, which centres a line-height:1 box on (x, y)
      const ascent = font.heightAtSize(size, { descender: false });
      const total = font.heightAtSize(size);
      const baselineFromBoxTop = (size - total) / 2 + ascent;
      const y = height - field.y * height - (baselineFromBoxTop - size / 2);

      page.drawText(text, { x, y, size, font, color: parseColor(field.color) });
    }
  }

  save() {
    return this.doc.save();
  }
}

export const renderCertificatePdf = async (
  pages: { design: ICertificateDesign; data: CertificateTokenData }[]
) => {
  const renderer = await CertificateRenderer.create();
  for (const { design, data } of pages) {
    await renderer.addPage(design, data);
  }
  return renderer.save();
};
