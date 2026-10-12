require('dotenv').config();
import nodemailer ,{Transporter} from 'nodemailer';



interface MailAttachment {
    filename: string;
    content: Buffer | string;
}

interface EmailOptions{
    email:string;
    subject:string;
    template:string;
    data: {[key:string]:any};
    attachments?: MailAttachment[];
}

const SENDER_NAME = "GDG on campus HIT";
const BREVO_URL = "https://api.brevo.com/v3";
const BREVO_TIMEOUT_MS = 20_000;

// Render's free instances block outbound SMTP ports, so production sends through
// Brevo's HTTPS API. SMTP stays as the fallback when no Brevo key is configured.
const brevoKey = () => process.env.BREVO_API_KEY;
const senderEmail = () => process.env.MAIL_FROM || process.env.SMTP_MAIL;

class MailApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

const brevoRequest = async (path: string, init: { method: string; body?: unknown }) => {
    const response = await fetch(`${BREVO_URL}${path}`, {
        method: init.method,
        headers: {
            "api-key": brevoKey() as string,
            accept: "application/json",
            "content-type": "application/json",
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) throw new MailApiError(response.status, payload?.message || response.statusText);
    return payload;
};

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            service: process.env.SMTP_SERVICE,
            auth:{
                user: process.env.SMTP_MAIL,
                pass: process.env.SMTP_PASSWORD,
            },
            pool: true,
            maxConnections: 3,
            maxMessages: 100,
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 30_000,
            dnsTimeout: 10_000,
        });
    }
    return transporter;
};

export const describeMailError = (error: any): string => {
    if (!error) return "Unknown error";
    if (error instanceof MailApiError) {
        if (error.status === 401) return "Brevo rejected the API key (check BREVO_API_KEY).";
        return `Brevo refused the email (${error.status}): ${error.message}`;
    }
    if (error.name === "TimeoutError" || error.name === "AbortError") return "The email service took too long to respond.";
    if (error.code === "ETIMEDOUT" || error.code === "ESOCKET" || error.code === "ECONNECTION") {
        return `Couldn't reach the mail server (${error.code}). Check SMTP_HOST/SMTP_PORT and that outbound SMTP is allowed.`;
    }
    if (error.code === "EAUTH") return "The mail server rejected the SMTP username or password.";
    return error.response || error.message || String(error);
};

export const verifyMailTransport = async (): Promise<void> => {
    const started = Date.now();
    const provider = brevoKey() ? "Brevo" : "SMTP";
    try {
        if (brevoKey()) await brevoRequest("/account", { method: "GET" });
        else await getTransporter().verify();
        console.log(`✅ ${provider} mail ready (${Date.now() - started} ms)`);
    } catch (error) {
        console.error(`❌ ${provider} mail check failed after ${Date.now() - started} ms: ${describeMailError(error)}`);
    }
};

const sendMail = async(options : EmailOptions): Promise <void> =>{
    const {email,subject,template,attachments} = options;

    if (brevoKey()) {
        await brevoRequest("/smtp/email", {
            method: "POST",
            body: {
                sender: { name: SENDER_NAME, email: senderEmail() },
                to: [{ email }],
                subject,
                htmlContent: template,
                ...(attachments?.length && {
                    attachment: attachments.map((file) => ({
                        name: file.filename,
                        content: Buffer.from(file.content).toString("base64"),
                    })),
                }),
            },
        });
        return;
    }

    await getTransporter().sendMail({
        from: `"${SENDER_NAME}" <${senderEmail()}>`,
        to:email,
        subject,
        html: template,
        attachments
    });
}

export default sendMail;
