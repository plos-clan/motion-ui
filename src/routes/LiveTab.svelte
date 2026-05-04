<script lang="ts">
import MaximizeIcon from "@lucide/svelte/icons/maximize"
import MinimizeIcon from "@lucide/svelte/icons/minimize"
import * as Button from "$lib/components/ui/button"
import * as Tabs from "$lib/components/ui/tabs"

let liveFrame = $state<HTMLDivElement | null>(null)
let isLiveFullscreen = $state(false)

const toggleLiveFullscreen = async () => {
	const target = liveFrame
	if (typeof document === "undefined" || !target) return

	try {
		if (document.fullscreenElement === target) {
			await document.exitFullscreen()
		} else {
			await target.requestFullscreen()
		}
	} catch {
		isLiveFullscreen = false
	}
}

$effect(() => {
	const target = liveFrame
	if (typeof document === "undefined" || !target) return

	const syncFullscreen = () => {
		isLiveFullscreen = document.fullscreenElement === target
	}

	syncFullscreen()
	document.addEventListener("fullscreenchange", syncFullscreen)
	return () => document.removeEventListener("fullscreenchange", syncFullscreen)
})
</script>

<Tabs.Content value="live" class="mt-0 flex-1 lg:min-h-0">
	<section class="overflow-hidden rounded-lg border border-border bg-card shadow-sm lg:h-full lg:min-h-0">
		<div class="flex items-center justify-between border-b border-border px-3 py-2">
			<div class="flex items-center gap-2 text-sm font-medium">
				<span class="size-2 rounded-full bg-primary"></span>
				直播
			</div>
		</div>
		<div
			bind:this={liveFrame}
			class="live-frame relative flex min-h-[260px] items-center justify-center bg-black lg:h-[calc(100%-41px)] lg:min-h-0"
		>
			<img
				src="/api/live"
				alt="Motion 实时监控画面"
				class="block aspect-video h-auto w-full object-contain lg:h-full lg:aspect-auto"
			/>
			<Button.Button
				variant="secondary"
				size="icon"
				class="absolute bottom-3 right-3 shadow-sm"
				aria-label={isLiveFullscreen ? "退出全屏" : "全屏播放"}
				onclick={toggleLiveFullscreen}
			>
				{#if isLiveFullscreen}
					<MinimizeIcon class="size-4" />
				{:else}
					<MaximizeIcon class="size-4" />
				{/if}
			</Button.Button>
		</div>
	</section>
</Tabs.Content>

<style>
	.live-frame:fullscreen {
		width: 100vw;
		height: 100vh;
		min-height: 100vh;
	}

	.live-frame:fullscreen img {
		height: 100%;
	}
</style>
