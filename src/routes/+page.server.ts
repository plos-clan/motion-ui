import { motionConfig } from "$lib/server/config";
import { listDays } from "$lib/server/archive";

export const load = async () => {
	const days = await listDays();

	return {
		config: motionConfig,
		days,
		selectedDate: days[0]?.date ?? null,
	};
};
