<script lang="ts">
	import LocationFinder from '$lib/LocationFinder.svelte'
	import Footer from '$lib/Footer.svelte'
	import getCombinedHistoricalAndForecastWeatherData from '$lib/weatherData'
	import { inject } from '@vercel/analytics'
	import { onMount } from 'svelte'
	import UnitPicker from '$lib/UnitPicker.svelte'
	import ClimateModelPicker from '$lib/ClimateModelPicker.svelte'
	import { dev } from '$app/environment'
	import Card from '$lib/Card.svelte'

	import {
		Chart as ChartJS,
		Tooltip,
		Title,
		LineElement,
		LinearScale,
		PointElement,
		CategoryScale,
		Filler
	} from 'chart.js'

	let lat: number | null = null
	let lon: number | null = null
	let prettyLocName: string | null = null
	let wthData: any = null
	let originalWthData: any = null
	let wthDataPromise: Promise<any> | null = null
	let unit: string = 'metric'
	let climateModel: string = 'MRI_AGCM3_2_S'
	let activeTab: number = 1

	if (dev) {
		if (lat === null) lat = 52.5
		if (lon === null) lon = 13.5
	}

	$: {
		if (originalWthData) {
			// we received new weather data!
			// first, create a deep copy of the original data
			let wthDataCopy = JSON.parse(JSON.stringify(originalWthData))

			// select requested weather model
			wthDataCopy.forecast['temperature_2m_max'] =
				wthDataCopy.forecast['temperature_2m_max_' + climateModel]
            wthDataCopy.forecast['temperature_2m_min'] =
				wthDataCopy.forecast['temperature_2m_min_' + climateModel]
            wthDataCopy.forecast['rain_sum'] =
				wthDataCopy.forecast['rain_sum_' + climateModel]
            wthDataCopy.forecast['snowfall_sum'] =
				wthDataCopy.forecast['snowfall_sum_' + climateModel]
			
			let newWthData: any = {}

            // UNIONize history and forecast data
			Object.keys(wthDataCopy.history).forEach((k) => {
				newWthData[k] = wthDataCopy.history[k].concat(wthDataCopy.forecast[k])
			})

			// now, convert to correct unit
			// we requested in metric units, so we only have to do conversion
			// for imperial units
			if (unit == 'imperial') {
				// convert everything to imperial units
				// °C to °F
				newWthData.temperature_2m_max = newWthData.temperature_2m_max.map(
					(i: number) => i * (9 / 5) + 32
				)
				newWthData.temperature_2m_min = newWthData.temperature_2m_min.map(
					(i: number) => i * (9 / 5) + 32
				)
				// mm rainfall to inches
				newWthData.rain_sum = newWthData.rain_sum.map((i: number) => i / 25.4)
				// cm snowfall to inches
				newWthData.snowfall_sum = newWthData.snowfall_sum.map((i: number) => i / 2.54)
			}

			// aaand off the data goes to the components rendering it
			wthData = newWthData
		}
	}

	$: {
		if (lat && lon) {
			wthDataPromise = getCombinedHistoricalAndForecastWeatherData(lat, lon).then((res) => {
				if (!res) return

				originalWthData = res
			})
		}
	}

	let TempVis: null | any = null
	let PrecipVis: null | any = null

	onMount(async () => {
		// lazy-load components for faster initial page load
		TempVis = (await import('$lib/TempVis.svelte')).default
		PrecipVis = (await import('$lib/PrecipVis.svelte')).default
		ChartJS.register(Title, Tooltip, LineElement, Filler, LinearScale, PointElement, CategoryScale)

		if (dev) {
			console.log('Not running analytics in development mode.')
		} else {
			inject() // perform vercel analytics
		}
	})
</script>

<Card>
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
		<p class="mt-4">
			The data also incorporates climate projections up until 2050. Please keep in mind that such
			long-term projections are always subject to assumptions and therefore only represent our
			current best guess as to what might happen.
		</p>
		<br />
	</div>
	<div>
		<LocationFinder bind:lat bind:lon bind:prettyLocName />
	</div>
	<div class="flex flex-col md:flex-row gap-4 items-center">
		<UnitPicker bind:unit />
		<ClimateModelPicker bind:climateModel />
	</div>
</Card>
{#if lat && lon}
	<Card>
		<div class="flex w-full justify-center ">
			<div class="tabs">
				<button
					class={'tab tab-bordered' + (activeTab == 1 ? ' tab-active' : '')}
					on:click={() => (activeTab = 1)}>Summer</button
				>
				<button
					class={'tab tab-bordered' + (activeTab == 2 ? ' tab-active' : '')}
					on:click={() => (activeTab = 2)}>Winter</button
				>
				<button
					class={'tab tab-bordered' + (activeTab == 3 ? ' tab-active' : '')}
					on:click={() => (activeTab = 3)}>Rain</button
				>
				<button
					class={'tab tab-bordered' + (activeTab == 4 ? ' tab-active' : '')}
					on:click={() => (activeTab = 4)}>Snow</button
				>
			</div>
		</div>
		{#await wthDataPromise}
			Loading weather data...
		{:then}
			<div class={activeTab == 1 ? '' : 'hidden'}>
				<svelte:component
					this={TempVis}
					unit={unit == 'metric' ? 'C' : 'F'}
					{wthData}
					latitude={lat}
					type="Summer"
				/>
			</div>
			<div class={activeTab == 2 ? '' : 'hidden'}>
				<svelte:component
					this={TempVis}
					unit={unit == 'metric' ? 'C' : 'F'}
					{wthData}
					latitude={lat}
					type="Winter"
				/>
			</div>
			<div class={activeTab == 3 ? '' : 'hidden'}>
				<svelte:component
					this={PrecipVis}
					unit={unit == 'metric' ? 'mm' : ' inches'}
					{wthData}
					type="rain"
				/>
			</div>
			<div class={activeTab == 4 ? '' : 'hidden'}>
				<svelte:component
					this={PrecipVis}
					unit={unit == 'metric' ? 'cm' : ' inches'}
					{wthData}
					type="snow"
				/>
			</div>
		{/await}
	</Card>
{/if}
<Card>
	<Footer />
</Card>
