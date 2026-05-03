import { getClipStream } from "$lib/server/archive";

export const GET = async ({ params, request }) => {
	const response = await getClipStream(params.date, params.file, request.headers.get("range"));

	return response ?? new Response("Not found", { status: 404 });
};
