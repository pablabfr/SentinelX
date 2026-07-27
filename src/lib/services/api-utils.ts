import { NextResponse } from "next/server";
import { MissingApiKeyError, UpstreamError, ValidationError } from "@/lib/services/errors";

export async function handleServiceRoute<T>(fn: () => Promise<T>) {
  try {
    const data = await fn();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return NextResponse.json(
        { ok: false, requiresApiKey: true, service: err.service, error: err.message },
        { status: 200 }
      );
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    if (err instanceof UpstreamError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status ?? 502 });
    }
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export function getApiKeyFromRequest(req: Request, header: string): string | undefined {
  const value = req.headers.get(header);
  return value && value.trim().length > 0 ? value.trim() : undefined;
}
