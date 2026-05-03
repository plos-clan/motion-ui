function readEnv(name: string) {
	const value = process.env[name];
	if (value) return value;

	throw new Error(`${name} is required`);
}

export const motionConfig = {
	get streamUrl() {
		return readEnv("MOTION_STREAM_URL");
	},
	get videoDir() {
		return readEnv("MOTION_VIDEO_DIR");
	},
};
