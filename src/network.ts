import { parse } from "node-html-parser"
import { safe } from "./safe.ts"

async function downloadPage(url: string): Promise<string | undefined> {
    const action = async (url: string) => {
        console.log(`INSPECTING: ${url}`)
        const res = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "text/html",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(10_000),
        })

        if (!res.ok) {
            console.log(`ERROR: unexpected status code (${res.status}): ${url}`)
            return
        }

        let contentType = res.headers.get("content-type")
        if (!contentType) {
            contentType = res.headers.get("Content-Type")
        }

        if (!contentType || !contentType.includes("text/html")) {
            console.log(`SKIPPING: ${url}`)
            return
        }

        return await res.text()
    }

    return await safe(action(url))
}

function shouldSkip(url: string): boolean {
    const lowered = url.toLowerCase()
    return (
        lowered == "" ||
        lowered.startsWith("#") ||
        lowered.endsWith(".jpg") ||
        lowered.endsWith(".jpeg") ||
        lowered.endsWith(".png") ||
        lowered.endsWith(".gif") ||
        lowered.endsWith(".webp") ||
        lowered.endsWith(".pdf") ||
        lowered.endsWith(".js") ||
        lowered.endsWith(".css") ||
        lowered.endsWith(".mp4") ||
        lowered.endsWith(".mp3") ||
        lowered.endsWith(".mov")
    )
}

function resolveBaseUrl(baseURL: string): (h: string) => string | undefined {
    return (h: string) => {
        if (shouldSkip(h)) return
        try {
            return new URL(h, baseURL).href
        } catch {
            return
        }
    }
}

export function isExternalUrl(baseURL: string, h: string): boolean {
    return !h.startsWith(baseURL)
}

function normalizeUrl(url: string): string {
    if (url.includes("#")) {
        const pieces = url.split("#")
        url = pieces[0]!
    }
    if (url.includes("?")) {
        const pieces = url.split("?")
        url = pieces[0]!
    }
    if (url.endsWith("/")) {
        url = url.slice(0, -1)
    }
    return url
}

export async function extractHrefs(baseURL: string, url: string): Promise<string[]> {
    const html = await downloadPage(url)
    if (!html) return []

    const doc = parse(html)
    const hrefs = doc
        .querySelectorAll("a[href]")
        .map((a) => a.getAttribute("href"))
        .filter((h) => h != undefined)
        .map(resolveBaseUrl(baseURL))
        .filter((u) => u != undefined)
        .filter((u) => u.startsWith("http"))
        .map(normalizeUrl)

    return hrefs
}
