import { logger } from "./logger.ts";

const textEncoder = new TextEncoder();

export interface NetSuiteConfig {
	accountId: string;
	consumerKey: string;
	consumerSecret: string;
	tokenId: string;
	tokenSecret: string;
	baseUrl?: string;
}

export interface RequestOptions {
	body?: unknown;
	headers?: Record<string, string>;
	timeout?: number;
}

export interface ListParams {
	q?: string;
	limit?: number;
	offset?: number;
}

export interface ListResult<T = Record<string, unknown>> {
	totalResults: number;
	items: T[];
	links: { rel: string; href: string }[];
	hasMore: boolean;
	offset: number;
	count: number;
}

export class NetSuiteClient {
	private config: NetSuiteConfig;
	private baseUrl: string;
	private signingKey: CryptoKey | null = null;

	constructor(config: NetSuiteConfig) {
		this.config = config;
		this.baseUrl =
			config.baseUrl ??
			`https://${config.accountId}.suitetalk.api.netsuite.com/services/rest`;
	}

	private async getSigningKey(): Promise<CryptoKey> {
		if (this.signingKey) return this.signingKey;
		const raw = `${encodeURIComponent(this.config.consumerSecret)}&${encodeURIComponent(this.config.tokenSecret)}`;
		this.signingKey = await crypto.subtle.importKey(
			"raw",
			textEncoder.encode(raw),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		return this.signingKey;
	}

	private async buildAuthHeader(method: string, url: string): Promise<string> {
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

		// Include query params in signature per OAuth 1.0 spec
		const [urlBase, queryString] = url.split("?") as [string, string | undefined];
		if (queryString) {
			for (const part of queryString.split("&")) {
				const [k, v] = part.split("=");
				if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
			}
		}

		const sortedParams = Object.keys(params)
			.sort()
			.map(
				(k) =>
					`${encodeURIComponent(k)}=${encodeURIComponent(params[k] as string)}`,
			)
			.join("&");

		const baseString = [
			method.toUpperCase(),
			encodeURIComponent(urlBase),
			encodeURIComponent(sortedParams),
		].join("&");

		const key = await this.getSigningKey();
		const sig = await crypto.subtle.sign(
			"HMAC",
			key,
			textEncoder.encode(baseString),
		);
		const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

		params.oauth_signature = signature;

		const header = Object.keys(params)
			.filter((k) => k.startsWith("oauth_"))
			.sort()
			.map(
				(k) =>
					`${encodeURIComponent(k)}="${encodeURIComponent(params[k] as string)}"`,
			)
			.join(", ");

		return `OAuth realm="${this.config.accountId}", ${header}`;
	}

	async request(
		method: string,
		path: string,
		options?: RequestOptions,
	): Promise<unknown> {
		const url = `${this.baseUrl}${path}`;
		const authHeader = await this.buildAuthHeader(method, url);

		const headers: Record<string, string> = {
			Authorization: authHeader,
			"Content-Type": "application/json",
			Accept: "application/json",
			...options?.headers,
		};

		const timeout = options?.timeout ?? 30_000;
		const signal = AbortSignal.timeout(timeout);

		const start = Date.now();
		logger.info({ method, path }, "netsuite request");

		const res = await fetch(url, {
			method,
			headers,
			body: options?.body ? JSON.stringify(options.body) : undefined,
			signal,
		});

		logger.info({ method, path, status: res.status, duration: Date.now() - start }, "netsuite response");

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`NetSuite API error ${res.status}: ${text}`);
		}

		const contentType = res.headers.get("content-type") ?? "";
		if (contentType.includes("json")) {
			return res.json();
		}
		return res.text();
	}

	// --- Record API ---

	private buildQuery(params: ListParams): string {
		const qs: string[] = [];
		if (params.q) qs.push(`q=${encodeURIComponent(params.q)}`);
		if (params.limit) qs.push(`limit=${params.limit}`);
		if (params.offset) qs.push(`offset=${params.offset}`);
		return qs.length ? `?${qs.join("&")}` : "";
	}

	async listRecords(
		recordType: string,
		params: ListParams = {},
	): Promise<ListResult> {
		const query = this.buildQuery(params);
		return (await this.request(
			"GET",
			`/record/v1/${recordType}${query}`,
		)) as ListResult;
	}

	async getRecord(
		recordType: string,
		id: string,
	): Promise<Record<string, unknown>> {
		return (await this.request(
			"GET",
			`/record/v1/${recordType}/${id}`,
		)) as Record<string, unknown>;
	}

	async createRecord(
		recordType: string,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return (await this.request("POST", `/record/v1/${recordType}`, {
			body: data,
		})) as Record<string, unknown>;
	}

	async updateRecord(
		recordType: string,
		id: string,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return (await this.request("PATCH", `/record/v1/${recordType}/${id}`, {
			body: data,
		})) as Record<string, unknown>;
	}

	async deleteRecord(recordType: string, id: string): Promise<unknown> {
		return this.request("DELETE", `/record/v1/${recordType}/${id}`);
	}

	// --- SuiteQL ---

	async suiteQL(
		query: string,
		params: { limit?: number; offset?: number } = {},
	): Promise<ListResult> {
		const qs: string[] = [];
		if (params.limit) qs.push(`limit=${params.limit}`);
		if (params.offset) qs.push(`offset=${params.offset}`);
		const queryString = qs.length ? `?${qs.join("&")}` : "";
		return (await this.request("POST", `/query/v1/suiteql${queryString}`, {
			body: { q: query },
			headers: { Prefer: "transient" },
		})) as ListResult;
	}
}

export function createNetSuiteClient(): NetSuiteClient {
	const accountId = process.env.NETSUITE_ACCOUNT_ID;
	const consumerKey = process.env.NETSUITE_CONSUMER_KEY;
	const consumerSecret = process.env.NETSUITE_CONSUMER_SECRET;
	const tokenId = process.env.NETSUITE_TOKEN_ID;
	const tokenSecret = process.env.NETSUITE_TOKEN_SECRET;

	if (
		!accountId ||
		!consumerKey ||
		!consumerSecret ||
		!tokenId ||
		!tokenSecret
	) {
		throw new Error(
			"Missing NetSuite credentials. Set NETSUITE_ACCOUNT_ID, NETSUITE_CONSUMER_KEY, NETSUITE_CONSUMER_SECRET, NETSUITE_TOKEN_ID, NETSUITE_TOKEN_SECRET",
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
