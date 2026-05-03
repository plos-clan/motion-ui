import adapter from "@eslym/sveltekit-adapter-bun"

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			bundler: "bun",
			bunBuildMinify: true,
			precompress: false,
			sourceMap: false,
		}),
	},
}

export default config
