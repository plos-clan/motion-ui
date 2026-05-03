import { json } from "@sveltejs/kit";
import { listDays } from "$lib/server/archive";

export const GET = async ({ url }) => {
	const days = await listDays({ refresh: url.searchParams.get("refresh") === "1" });

	return json({ days });
};
