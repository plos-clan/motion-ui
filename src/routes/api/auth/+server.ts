import { json } from "@sveltejs/kit"
import { isValidToken, setSessionCookie } from "$lib/server/auth"

export const POST = async ({ cookies, request }) => {
	const { token } = (await request.json().catch(() => ({}))) as {
		token?: unknown
	}

	if (!isValidToken(token)) {
		return json({ error: "Invalid token" }, { status: 401 })
	}

	setSessionCookie(cookies)
	return json({ ok: true })
}
