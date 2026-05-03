import { json } from "@sveltejs/kit"
import { listClips } from "$lib/server/archive"

export const GET = async ({ params }) => {
	const clips = await listClips(params.date)

	if (!clips) return json({ error: "Invalid date" }, { status: 400 })
	return json({ date: params.date, clips })
}
