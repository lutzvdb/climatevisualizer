<script lang="ts">
	import LocationFinder from '$lib/LocationFinder.svelte'
	import Footer from '$lib/Footer.svelte'
	import getHistoricalWeatherData from '$lib/weatherData'
	import TempVis from '$lib/TempVis.svelte'
	import PrecipVis from '$lib/PrecipVis.svelte'
	import { table } from 'arquero'

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
				wthData = table(res.daily)
			})
		}
	}
</script>

<div>
	<div class="text-center mb-8">
		<h1 class="text-3xl">
			Visualize climate change for <span class="bg-gray-200 p-2 decoration-dashed underline decoration-0">{prettyLocName ? prettyLocName : 'your city.'}</span>
		</h1>
	</div>
	<div>
		<LocationFinder bind:lat bind:lon bind:prettyLocName />
	</div>
	{#if lat && lon}
		{#await wthDataPromise}
			Loading weather data...
		{:then}
			<div class="mt-8">
				<TempVis {wthData} type="Summer" />
				<TempVis {wthData} type="Winter" />
				<PrecipVis {wthData} type="rain" />
				<PrecipVis {wthData} type="snow" />
			</div>
		{/await}
	{/if}
	<div>
		<Footer />
	</div>
</div>
