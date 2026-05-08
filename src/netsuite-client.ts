export interface NetSuiteConfig {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
  baseUrl?: string;
}

export class NetSuiteClient {
  private config: NetSuiteConfig;
  private baseUrl: string;

  constructor(config: NetSuiteConfig) {
    this.config = config;
    this.baseUrl =
      config.baseUrl ??
      `https://${config.accountId}.suitetalk.api.netsuite.com/services/rest`;
  }

  /**
   * Build OAuth 1.0 Authorization header for NetSuite REST API
   */
  private async buildAuthHeader(
    method: string,
    url: string
  ): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomUUID().replace(/-/g, "");

    const params: Record<string, string> = {
      oauth_consumer_key: this.config.consumerKey,
      oauth_token: this.config.tokenId,
      oauth_signature_method: "HMAC-SHA256",
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: "1.0",
    };

    // Build base string
    const sortedParams = Object.keys(params)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]!)}`)
      .join("&");

    const baseString = [
      method.toUpperCase(),
      encodeURIComponent(url.split("?")[0]!),
      encodeURIComponent(sortedParams),
    ].join("&");

    // Sign with HMAC-SHA256
    const signingKey = `${encodeURIComponent(this.config.consumerSecret)}&${encodeURIComponent(this.config.tokenSecret)}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(signingKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(baseString)
    );
    const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

    params["oauth_signature"] = signature;

    const header = Object.keys(params)
      .sort()
      .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(params[k]!)}"`)
      .join(", ");

    return `OAuth realm="${this.config.accountId}", ${header}`;
  }

  async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const authHeader = await this.buildAuthHeader(method, url);

    const headers: Record<string, string> = {
      Authorization: authHeader,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`NetSuite API error ${res.status}: ${text}`);
    }

    return res.json();
  }

  async get(path: string): Promise<unknown> {
    return this.request("GET", path);
  }

  async post(path: string, body: unknown): Promise<unknown> {
    return this.request("POST", path, body);
  }

  async patch(path: string, body: unknown): Promise<unknown> {
    return this.request("PATCH", path, body);
  }

  async delete(path: string): Promise<unknown> {
    return this.request("DELETE", path);
  }
}

export function createNetSuiteClient(): NetSuiteClient {
  const accountId = process.env.NETSUITE_ACCOUNT_ID;
  const consumerKey = process.env.NETSUITE_CONSUMER_KEY;
  const consumerSecret = process.env.NETSUITE_CONSUMER_SECRET;
  const tokenId = process.env.NETSUITE_TOKEN_ID;
  const tokenSecret = process.env.NETSUITE_TOKEN_SECRET;

  if (!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret) {
    throw new Error(
      "Missing NetSuite credentials. Set NETSUITE_ACCOUNT_ID, NETSUITE_CONSUMER_KEY, NETSUITE_CONSUMER_SECRET, NETSUITE_TOKEN_ID, NETSUITE_TOKEN_SECRET"
    );
  }

  return new NetSuiteClient({
    accountId,
    consumerKey,
    consumerSecret,
    tokenId,
    tokenSecret,
    baseUrl: process.env.NETSUITE_BASE_URL,
  });
}
