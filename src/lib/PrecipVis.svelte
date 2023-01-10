<script lang="ts">
	import { op, table } from 'arquero'
	import { Line } from 'svelte-chartjs'
	import {
		Chart as ChartJS,
		Title,
		Tooltip,
		Legend,
		LineElement,
		LinearScale,
		PointElement,
		CategoryScale
	} from 'chart.js'
	import { CloudSnowIcon, CloudRainIcon } from 'svelte-feather-icons'
	ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale)

	import LinearRegression from './linearRegression'

	export let wthData: any = null
	export let type: string = 'rain'
	export let unit: string = 'mm'

	let yearlySum: any = null
	let dryDays: any = null
	let plotData: any = null
	let plotData2: any = null
	let plotData3: any = null
	let firstTrendPoint: number | null = null
	let lastTrendPoint: number | null = null
	let firstTrendPoint2: number | null = null
	let lastTrendPoint2: number | null = null
	let firstTrendPoint3: number | null = null
	let lastTrendPoint3: number | null = null
	let totalDelta: number | null = null
	let gradient: number | null = null

	$: {
		if (wthData) {
			if (type == 'rain') {
				yearlySum = table(wthData)
					.filter((d: any) => d.rain_sum !== null)
					.derive({ year: (d: any) => op.year(d.time) })
					.groupby('year')
					.rollup({
						sumPrecipitation: (d: any) => op.sum(d.rain_sum),
						strongestRain: (d: any) => op.max(d.rain_sum)
					})
					.objects()
				dryDays = table(wthData)
					.filter((d: any) => d.rain_sum == 0)
					.derive({ year: (d: any) => op.year(d.time) })
					.groupby('year')
					.rollup({
						dryDayN: (d: any) => op.count()
					})
					.objects()
			} else {
				yearlySum = table(wthData)
					.filter((d: any) => d.snowfall_sum !== null)
					.derive({ year: (d: any) => op.year(d.time) })
					.groupby('year')
					.rollup({
						sumPrecipitation: (d: any) => op.sum(d.snowfall_sum)
					})
					.objects()
			}

			const linTrend = LinearRegression(yearlySum.map((i: any) => [i.year, i.sumPrecipitation]))

			firstTrendPoint = Math.round(linTrend.predictions[0][1] * 10) / 10
			lastTrendPoint =
				Math.round(linTrend.predictions[linTrend.predictions.length - 1][1] * 10) / 10
			gradient = Math.round(linTrend.gradient * 10 * 10) / 10 // per decade
			totalDelta = Math.round((lastTrendPoint - firstTrendPoint) * 10) / 10

			let linTrend_dryDays
			let linTrend_strongestRain
			if (type == 'rain') {
				linTrend_dryDays = LinearRegression(dryDays.map((i: any) => [i.year, i.dryDayN]))
				firstTrendPoint2 = Math.round(linTrend_dryDays.predictions[0][1] * 10) / 10
				lastTrendPoint2 =
					Math.round(
						linTrend_dryDays.predictions[linTrend_dryDays.predictions.length - 1][1] * 10
					) / 10

				linTrend_strongestRain = LinearRegression(
					yearlySum.map((i: any) => [i.year, i.strongestRain])
				)
				firstTrendPoint3 = Math.round(linTrend_strongestRain.predictions[0][1] * 10) / 10
				lastTrendPoint3 =
					Math.round(
						linTrend_strongestRain.predictions[linTrend_strongestRain.predictions.length - 1][1] *
							10
					) / 10
			}

			const lastYear = linTrend.predictions[linTrend.predictions.length - 1][0]

			plotData = {
				labels: yearlySum.map((i: any) => i.year),
				datasets: [
					{
						label: 'Yearly sum',
						data: yearlySum.map((i: any) => i.sumPrecipitation),
						borderColor: 'rgba(0,0,255, 0.1)',
						backgroundColor: 'rgba(0,0,255,0.2)',
						pointRadius: 3
					},
					{
						label: 'Trend',
						data: linTrend.predictions.map((i: any) =>
							i[0] == 1960 || i[0] == lastYear ? i[1] : undefined
						),
						borderColor: 'rgba(0,0,200,0.7)',
						backgroundColor: 'rgba(0,0,255,0.3)',
						pointRadius: 5
					}
				]
			}

			if (type == 'rain' && linTrend_dryDays && linTrend_strongestRain) {
				plotData2 = {
					labels: yearlySum.map((i: any) => i.year),
					datasets: [
						{
							label: 'Dry days per year',
							data: dryDays.map((i: any) => i.dryDayN),
							borderColor: 'rgba(0,0,255, 0.1)',
							backgroundColor: 'rgba(0,0,255,0.2)',
							pointRadius: 3
						},
						{
							label: 'Trend',
							data: linTrend_dryDays.predictions.map((i: any) =>
								i[0] == 1960 || i[0] == lastYear ? i[1] : undefined
							),
							borderColor: 'rgba(0,0,200,0.7)',
							backgroundColor: 'rgba(0,0,255,0.3)',
							pointRadius: 5
						}
					]
				}

				plotData3 = {
					labels: yearlySum.map((i: any) => i.year),
					datasets: [
						{
							label: 'Strongest single-day rainfall',
							data: yearlySum.map((i: any) => i.strongestRain),
							borderColor: 'rgba(0,0,255, 0.1)',
							backgroundColor: 'rgba(0,0,255,0.2)',
							pointRadius: 3
						},
						{
							label: 'Trend',
							data: linTrend_strongestRain.predictions.map((i: any) =>
								i[0] == 1960 || i[0] == lastYear ? i[1] : undefined
							),
							borderColor: 'rgba(0,0,200,0.7)',
							backgroundColor: 'rgba(0,0,255,0.3)',
							pointRadius: 5
						}
					]
				}
			}
		}
	}
</script>

{#if !(type == 'snow' && lastTrendPoint == 0 && firstTrendPoint == 0)}
	<div>
		<div class="mt-8">
			<h3 class="text-2xl w-full text-center my-4">
                {#if totalDelta && firstTrendPoint}
                    {#if type == 'rain'}
                        <CloudRainIcon class="inline mr-2" />
                        Amount of yearly rainfall: {totalDelta && Math.abs(totalDelta)}{unit}
                    {:else}
                        <CloudSnowIcon class="inline mr-2" />
                        Amount of yearly snowfall: {totalDelta && Math.abs(totalDelta)}{unit}
                    {/if}
                    {#if totalDelta && totalDelta > 0}
                        more
                    {:else if totalDelta && totalDelta < 0}
                        less
                    {/if}
                    ({totalDelta > 0 ? '+' : ''}{ Math.round(10 * 100 * (totalDelta / firstTrendPoint)) / 10 }%)
                {/if}
			</h3>
			<h4 class="text-xl m-4">Total yearly {type == 'rain' ? 'rainfall' : 'snowfall'}</h4>
			<p>
				{#if lastTrendPoint && firstTrendPoint && gradient && totalDelta}
					In the 1960s, the average year saw <strong
						>{firstTrendPoint}{unit}{type == 'rain' ? ' of rainfall' : ' of snowfall'}
					</strong>. These days, the average yearly sum is
					<strong>{lastTrendPoint}{unit}</strong>. That is a total change of about {Math.abs(totalDelta)}{unit}.
				{/if}
			</p>
			{#if plotData}
				<Line
					data={plotData}
					options={{ spanGaps: true, plugins: { legend: { display: false } } }}
				/>
			{/if}
			{#if type == 'rain'}
				<h4 class="text-xl m-4 mt-8">Number of dry days</h4>
				<p>
					{#if lastTrendPoint2 && firstTrendPoint2}
						In the 1960s, the average year had <strong
							>{firstTrendPoint2} dry days per year
						</strong>. These days, the average is is
						<strong>{lastTrendPoint2} days</strong>.
						{#if lastTrendPoint2 > firstTrendPoint2}
							Longer dry periods pose challenges to agriculture and water supply.
						{/if}
					{/if}
				</p>
				{#if plotData2}
					<Line
						data={plotData2}
						options={{ spanGaps: true, plugins: { legend: { display: false } } }}
					/>
				{/if}
				<h4 class="text-xl m-4 mt-8">Strongest daily rainfall</h4>
				<p>
					{#if lastTrendPoint3 && firstTrendPoint3}
						In the 1960s, the day with the most rainfall had <strong
							>{firstTrendPoint3}{unit} of rainfall in a single day
						</strong>. By now, this has changed to
						<strong>{lastTrendPoint3}{unit}</strong>. In many places on earth, we see stronger daily
						rainfalls.
						{#if 
                            lastTrendPoint2 && firstTrendPoint2 && 
                            lastTrendPoint2 > firstTrendPoint2 && 
                            lastTrendPoint3 > firstTrendPoint3 && 
                            (lastTrendPoint2-firstTrendPoint2) / firstTrendPoint2 > 0.03 &&
                            (lastTrendPoint3-firstTrendPoint3) / firstTrendPoint3 > 0.03 }
							The combination of more dry days yet stronger daily rainfall means that there is a
							tendency for the soil to be either dried out or overwhelmed with water. This is
							problematic for agriculture as plants are not supplied with a constant enough stream
							of water, potentially causing significant loss of food.
						{/if}
					{/if}
				</p>
				{#if plotData3}
					<Line
						data={plotData3}
						options={{ spanGaps: true, plugins: { legend: { display: false } } }}
					/>
				{/if}
			{/if}
		</div>
	</div>
{:else}
    <p>
        No relevant data found.
    </p>
{/if}
