import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { Browser, BrowserContext } from "playwright";
import type { AuthCredentials, AuthToken } from "./types.js";

const LOGIN_URL = "https://home.trainingpeaks.com/login";
const API_BASE = "tpapi.trainingpeaks.com";
const TOKEN_PATH = path.join(
  os.homedir(),
  ".trainingpeaks-mcp",
  "auth-token.json",
);

export class AuthManager {
  private credentials: AuthCredentials;
  private token: AuthToken | null = null;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private headless: boolean;
  private authenticatePromise: Promise<string> | null = null;

  constructor(credentials: AuthCredentials, headless = true) {
    this.credentials = credentials;
    this.headless = headless;
  }

  async authenticate(): Promise<string> {
    if (this.token) {
      return this.token.token;
    }

    // Try loading a cached token from disk
    const cached = await this.loadCachedToken();
    if (cached) {
      this.token = { token: cached };
      return cached;
    }

    if (this.authenticatePromise) {
      return this.authenticatePromise;
    }

    this.authenticatePromise = this.doAuthenticate().finally(() => {
      this.authenticatePromise = null;
    });
    return this.authenticatePromise;
  }

  private async doAuthenticate(): Promise<string> {
    console.error(
      `[trainingpeaks-mcp] Authenticating (user=${this.credentials.username}, pass length=${this.credentials.password.length})`,
    );

    const { chromium } = await import("playwright");
    this.browser = await chromium.launch({ headless: this.headless });
    this.context = await this.browser.newContext();
    const page = await this.context.newPage();

    let capturedToken: string | null = null;

    // Intercept API requests to capture the auth token from any tpapi request
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes(API_BASE)) {
        const authHeader = request.headers()["authorization"];
        if (authHeader?.startsWith("Bearer ")) {
          capturedToken = authHeader.substring(7);
        }
      }
    });

    try {
      await page.goto(LOGIN_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // Wait for the login form to be ready
      await page.waitForSelector('input[name="Username"]', { timeout: 30000 });

      // Handle cookie consent popup if present
      try {
        const acceptButton = page.locator("#onetrust-accept-btn-handler");
        await acceptButton.click({ timeout: 5000 });
      } catch {
        // Cookie popup may not appear, continue
      }

      // Fill in credentials
      await page.fill('input[name="Username"]', this.credentials.username);
      await page.fill('input[name="Password"]', this.credentials.password);

      // Submit the form
      await Promise.all([
        page.waitForNavigation({ timeout: 60000 }),
        page.click('button[type="submit"]'),
      ]);

      // Check if we're on an error page or need to handle something
      const currentUrl = page.url();
      if (currentUrl.includes("login")) {
        // Still on login page, check for errors
        const errorMsg = await page
          .locator('.error-message, .alert-danger, [class*="error"]')
          .textContent()
          .catch(() => null);
        if (errorMsg) {
          throw new Error(`Login failed: ${errorMsg}`);
        }
        throw new Error("Login failed - still on login page");
      }

      // Give time for API calls to complete and token to be captured
      await page.waitForTimeout(3000);

      if (!capturedToken) {
        // Try to get token from cookies as fallback
        const cookies = await this.context.cookies();
        const authCookie = cookies.find((c) => c.name === "Production_tpAuth");
        if (authCookie) {
          capturedToken = authCookie.value;
        }
      }

      if (!capturedToken) {
        throw new Error(
          "Failed to capture authentication token. Check your credentials.",
        );
      }

      this.token = { token: capturedToken };
      await this.cacheToken(capturedToken);

      return this.token.token;
    } finally {
      await this.cleanup();
    }
  }

  async refreshToken(): Promise<string> {
    this.token = null;
    this.authenticatePromise = null;
    await this.deleteCachedToken();
    return this.authenticate();
  }

  getToken(): string | null {
    return this.token?.token ?? null;
  }

  private async loadCachedToken(): Promise<string | null> {
    try {
      const data = await fs.readFile(TOKEN_PATH, "utf-8");
      const parsed = JSON.parse(data) as { token?: string };
      return parsed.token ?? null;
    } catch {
      return null;
    }
  }

  private async cacheToken(token: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
      await fs.writeFile(TOKEN_PATH, JSON.stringify({ token }), "utf-8");
    } catch {
      // Non-fatal — caching is best-effort
    }
  }

  private async deleteCachedToken(): Promise<void> {
    try {
      await fs.unlink(TOKEN_PATH);
    } catch {
      // File may not exist
    }
  }

  private async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async close(): Promise<void> {
    await this.cleanup();
    this.token = null;
  }
}

export function createAuthManager(
  credentials: AuthCredentials,
  headless = true,
): AuthManager {
  return new AuthManager(credentials, headless);
}
