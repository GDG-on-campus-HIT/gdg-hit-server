import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

// Helper: parse cloudinary URL like cloudinary://<api_key>:<api_secret>@<cloud_name>
function parseCloudinaryUrl(url: string) {
  try {
    const normalized = url.replace(/^cloudinary:\/\//, "https://");
    const u = new URL(normalized);
    const api_key = u.username;
    const api_secret = u.password;
    const cloud_name = u.hostname;
    if (!api_key || !api_secret || !cloud_name) return null;
    return { api_key, api_secret, cloud_name };
  } catch {
    return null;
  }
}

(function configureCloudinary() {
  // Prefer explicit CLOUDINARY_URL if present
  const url = process.env.CLOUDINARY_URL;

  if (url) {
    const parsed = parseCloudinaryUrl(url);
    if (parsed) {
      cloudinary.config({
        cloud_name: parsed.cloud_name,
        api_key: parsed.api_key,
        api_secret: parsed.api_secret,
        secure: true,
      });
      return;
    }
  }

  // Some deployments may have misconfigured env where CLOUD_API_KEY actually contains the cloudinary URL.
  const maybeUrl = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY;
  const parsedFromApiKey = maybeUrl && maybeUrl.startsWith("cloudinary://") ? parseCloudinaryUrl(maybeUrl) : null;

  if (parsedFromApiKey) {
    cloudinary.config({
      cloud_name: parsedFromApiKey.cloud_name,
      api_key: parsedFromApiKey.api_key,
      api_secret: parsedFromApiKey.api_secret,
      secure: true,
    });
    return;
  }

  // Fallback to separate keys from multiple possible env names
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_SECRET_KEY;

  cloudinary.config({
    cloud_name: cloud_name || "",
    api_key: api_key || "",
    api_secret: api_secret || "",
    secure: true,
  });
})();

export default cloudinary;
