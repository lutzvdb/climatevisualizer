<script lang="ts">
	import LocationFinder from '$lib/LocationFinder.svelte'
	import Footer from '$lib/Footer.svelte'
	import getHistoricalWeatherData from '$lib/weatherData'
    import { inject } from '@vercel/analytics';
	import { onMount } from 'svelte'
	import UnitPicker from '$lib/UnitPicker.svelte'
    import { dev } from '$app/environment'

	let lat: number | null = null
	let lon: number | null = null
	let prettyLocName: string | null = null
	let wthData: any = null
    let originalWthData: any = null
	let wthDataPromise: Promise<any> | null = null
    let unit: string = 'metric'

    $: {
        if(originalWthData) {
            // we received new weather data! 
            // first, create a deep copy of the original data
            let newWthData = JSON.parse(JSON.stringify(originalWthData)) 
            // now, convert to correct unit
            // we requested in metric units, so we only have to do conversion
            // for imperial units
            if(unit == 'imperial') {
                // convert everything to imperial units
                // °C to °F
                newWthData.temperature_2m_max = newWthData.temperature_2m_max.map((i: number) => i * (9/5) + 32)
                newWthData.temperature_2m_min = newWthData.temperature_2m_min.map((i: number) => i * (9/5) + 32)
                // mm rainfall to inches
                newWthData.rain_sum = newWthData.rain_sum.map((i: number) => i / (25.4))
                // cm snowfall to inches
                newWthData.snowfall_sum = newWthData.snowfall_sum.map((i: number) => i / (2.54))
            } 

            // aaand off the data goes to the components rendering it
            wthData = newWthData
        }
    }

	$: {
		if (lat && lon) {
			wthDataPromise = getHistoricalWeatherData(lat, lon).then((res) => {
				if (!res) return
				if (!res.daily) return
				originalWthData = res.daily
			})
		}
	}

	let TempVis: null | any = null
	let PrecipVis: null | any = null

	onMount(async () => {
		// lazy-load components for faster initial page load
		TempVis = (await import('$lib/TempVis.svelte')).default
		PrecipVis = (await import('$lib/PrecipVis.svelte')).default

        if(dev) {
            console.log('Not running analytics in development mode.')
        } else {
            inject() // perform vercel analytics
        }
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
			<div class="mt-4">
                <UnitPicker bind:unit />
				<svelte:component this={TempVis} unit={unit == 'metric' ? 'C' : 'F'} {wthData} latitude={lat} type="Summer" />
				<svelte:component this={TempVis} unit={unit == 'metric' ? 'C' : 'F'} {wthData} latitude={lat} type="Winter" />
				<svelte:component this={PrecipVis} unit={unit == 'metric' ? 'mm' : ' inches'} {wthData} type="rain" />
				<svelte:component this={PrecipVis} unit={unit == 'metric' ? 'cm' : ' inches'} {wthData} type="snow" />
			</div>
		{/await}
	{/if}
	<div>
		<Footer />
	</div>
</div>
