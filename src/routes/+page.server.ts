import { listDays } from "$lib/server/archive"
import { isValidSession } from "$lib/server/auth"

export const load = async ({ cookies }) => {
	const isAuthenticated = isValidSession(cookies)
	const days = isAuthenticated ? await listDays() : []

	return {
		isAuthenticated,
		days,
		selectedDate: days[0]?.date ?? null,
	}
}
