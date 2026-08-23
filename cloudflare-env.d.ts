declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    RAZORPAY_KEY_ID?: string;
    RAZORPAY_KEY_SECRET?: string;
    RAZORPAY_WEBHOOK_SECRET?: string;
    PLATFORM_ADMIN_EMAILS?: string;
    DEV_USER_EMAIL?: string;
    DEV_USER_NAME?: string;
  }
}
