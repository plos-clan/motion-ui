import { json, type Handle } from "@sveltejs/kit"
import { isValidSession } from "$lib/server/auth"

export const handle: Handle = async ({ event, resolve }) => {
	if (
		event.url.pathname.startsWith("/api/") &&
		event.url.pathname !== "/api/auth" &&
		!isValidSession(event.cookies)
	) {
		return json({ error: "Unauthorized" }, { status: 401 })
	}

	return resolve(event)
}
