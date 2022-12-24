<script lang="ts">
	import LocationFinder from '$lib/LocationFinder.svelte';
    import Footer from '$lib/Footer.svelte'
	import getHistoricalWeatherData from '$lib/weatherData';
	import WeatherVisualizer from '$lib/WeatherVisualizer.svelte';
	import { table } from 'arquero';

	let lat: number | null = null;
	let lon: number | null = null;
    let prettyLocName: string | null = null;
	let wthData: any = null;
    let wthDataPromise: Promise<any> | null = null;

	$: {
		if (lat && lon) {
			wthDataPromise = getHistoricalWeatherData(lat, lon).then((res) => {
				if (!res) return;
				if (!res.daily) return;
				wthData = table(res.daily);
			});
		}
	}
</script>

<div>
	<div class="text-center mb-8">
		<h1 class="text-3xl">Visualize climate change since 1960 for {prettyLocName ? prettyLocName : 'your city.'}</h1>
	</div>
	<div>
		<LocationFinder bind:lat bind:lon bind:prettyLocName />
	</div>
    {#if lat && lon}
        {#await wthDataPromise}
            Loading weather data...
        {:then}
            <div class="mt-8">
                <WeatherVisualizer {wthData} type="Summer" />
                <WeatherVisualizer {wthData} type="Winter" />
            </div>
        {/await}
    {/if}
    <div>
        <Footer />
    </div>
</div>
