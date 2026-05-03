import { listDays } from "$lib/server/archive";

export const load = async () => {
	const days = await listDays();

	return {
		days,
		selectedDate: days[0]?.date ?? null,
	};
};
