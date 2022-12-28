<script lang="ts">
	import LocationFinder from '$lib/LocationFinder.svelte'
	import Footer from '$lib/Footer.svelte'
	import getHistoricalWeatherData from '$lib/weatherData'
    import { inject } from '@vercel/analytics';
	import { onMount } from 'svelte'

	let lat: number | null = null
	let lon: number | null = null
	let prettyLocName: string | null = null
	let wthData: any = null
	let wthDataPromise: Promise<any> | null = null

	$: {
		if (lat && lon) {
			wthDataPromise = getHistoricalWeatherData(lat, lon).then((res) => {
				if (!res) return
				if (!res.daily) return
				wthData = res.daily
			})
		}
	}

	let TempVis: null | any = null
	let PrecipVis: null | any = null

	onMount(async () => {
		// lazy-load components for faster initial page load
		TempVis = (await import('$lib/TempVis.svelte')).default
		PrecipVis = (await import('$lib/PrecipVis.svelte')).default

        inject(); // analytics
	})
</script>

<div>
	<div class="text-center mb-8">
		<h1 class="text-3xl leading-relaxed">
			Visualize climate change for <span
				class="bg-gray-200 p-2 decoration-dashed underline decoration-0"
				>{prettyLocName ? prettyLocName : 'your city.'}</span
			>
		</h1>
	</div>
	<div>
		<p>
			It is normal for weather conditions to be quite different from year to year - some years are
			hotter, some are colder; some are wetter, some are drier. However, for many places on earth,
			strong trends can be observed. In many cases, the trend is for temperatures to be higher on
			average. The graphics below are designed to give you an idea of how the climate has changed to
			this date for the place where you live.
		</p>
        <br />
	</div>
	<div>
		<LocationFinder bind:lat bind:lon bind:prettyLocName />
	</div>
	{#if lat && lon}
		{#await wthDataPromise}
			Loading weather data...
		{:then}
			<div class="mt-8">
				<svelte:component this={TempVis} {wthData} latitude={lat} type="Summer" />
				<svelte:component this={TempVis} {wthData} latitude={lat} type="Winter" />
				<svelte:component this={PrecipVis} {wthData} type="rain" />
				<svelte:component this={PrecipVis} {wthData} type="snow" />
			</div>
		{/await}
	{/if}
	<div>
		<Footer />
	</div>
</div>
