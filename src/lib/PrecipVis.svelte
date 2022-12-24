<script lang="ts">
	import { op } from 'arquero'
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

	import regression from 'regression'

	export let wthData: any = null
	export let type: string = 'rain'

	let yearlySum: any = null
	let plotData: any = null
	let firstTrendPoint: number | null = null
	let lastTrendPoint: number | null = null
	let totalDelta: number | null = null
	let gradient: number | null = null

	$: {
		if (wthData) {
			if (type == 'rain') {
				yearlySum = wthData
					.derive({ year: (d: any) => op.year(d.time) })
					.groupby('year')
					.rollup({
						sumPrecipitation: (d: any) => op.sum(d.rain_sum)
					})
					.objects()
			} else {
				yearlySum = wthData
					.derive({ year: (d: any) => op.year(d.time) })
					.groupby('year')
					.rollup({
						sumPrecipitation: (d: any) => op.sum(d.snowfall_sum)
					})
					.objects()
			}

			const linTrend = regression.linear(yearlySum.map((i: any) => [i.year, i.sumPrecipitation]))

			firstTrendPoint = linTrend.points[0][1]
			lastTrendPoint = linTrend.points[linTrend.points.length - 1][1]
			gradient = linTrend.equation[0] * 10 // per decade
			totalDelta = Math.round((lastTrendPoint - firstTrendPoint) * 100) / 100

			const lastYear = linTrend.points[linTrend.points.length - 1][0]

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
						data: linTrend.points.map((i: any) =>
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
</script>

<div>
	<div class="mt-14">
		<h3 class="text-xl m-4">
			{#if type == 'rain'}
				<CloudRainIcon class="inline mr-2" />
				Amount of rainfall (mm) per year: {totalDelta}mm
			{:else}
				<CloudSnowIcon class="inline mr-2" />
				Amount of snowfall (cm) per year: {totalDelta}cm
			{/if}
			{#if totalDelta && totalDelta > 0}
				more
			{:else if totalDelta && totalDelta < 0}
				less
			{/if}
		</h3>
		<p>
			{#if lastTrendPoint && firstTrendPoint && gradient && totalDelta}
				In the 1960s, the average year saw <strong>{firstTrendPoint}{type == 'rain' ? 'mm of rainfall' : 'cm of snowfall'}
                </strong>. These days, the average yearly sum
				is <strong>{lastTrendPoint}{type == 'rain' ? 'mm' : 'cm'}</strong>. That is a
				<strong>total change of {totalDelta}{type == 'rain' ? 'mm' : 'cm'}</strong>.
			{/if}
		</p>
		{#if plotData}
			<Line data={plotData} options={{ spanGaps: true, plugins: { legend: { display: false } } }} />
		{/if}
	</div>
</div>
