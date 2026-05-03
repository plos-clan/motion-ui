import { motionConfig } from "$lib/server/config"

const HOP_BY_HOP = new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
])

export const GET = async ({ fetch }) => {
	const upstream = await fetch(motionConfig.streamUrl)
	const headers = new Headers()

	upstream.headers.forEach((value, key) => {
		if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value)
	})
	headers.set("cache-control", "no-store")

	return new Response(upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers,
	})
}
