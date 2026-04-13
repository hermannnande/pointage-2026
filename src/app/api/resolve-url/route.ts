import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const resp = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    return NextResponse.json({ resolvedUrl: resp.url });
  } catch {
    try {
      const resp = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      return NextResponse.json({ resolvedUrl: resp.url });
    } catch {
      return NextResponse.json({ error: "Could not resolve URL" }, { status: 422 });
    }
  }
}
