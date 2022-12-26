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
	import { ThermometerIcon } from 'svelte-feather-icons'
	ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale)

	import regression from 'regression'

	export let wthData: any = null
	export let type: string = 'Summer'

	let yearlyAverages: any = null
	let plotData: any = null
	let firstTrendPoint: number | null = null
	let lastTrendPoint: number | null = null
	let totalDelta: number | null = null
	let gradient: number | null = null

	$: {
		if (wthData) {
			let filteredData = table(wthData)
			if (type == 'Summer') {
				filteredData = filteredData
					.filter((d: any) => op.month(d.time) + 1 >= 5 && op.month(d.time) + 1 <= 8)
					.reify()
			} else if (type == 'Winter') {
				filteredData = filteredData
					.filter((d: any) => op.month(d.time) + 1 <= 2 || op.month(d.time) + 1 >= 11)
					.reify()
			}
			yearlyAverages = filteredData
				.derive({ year: (d: any) => op.year(d.time) })
				.groupby('year')
				.rollup({
					avgDailyHigh: (d: any) => op.mean(d.temperature_2m_max),
					avgDailyLow: (d: any) => op.mean(d.temperature_2m_min)
				})
				.objects()

			const linTrendHigh = regression.linear(
				yearlyAverages.map((i: any) => [i.year, i.avgDailyHigh])
			)
			const linTrendLow = regression.linear(yearlyAverages.map((i: any) => [i.year, i.avgDailyLow]))

			firstTrendPoint = linTrendHigh.points[0][1]
			lastTrendPoint = linTrendHigh.points[linTrendHigh.points.length - 1][1]
			gradient = linTrendHigh.equation[0] * 10 // per decade
			totalDelta = Math.round((lastTrendPoint - firstTrendPoint) * 100) / 100

			const lastYear = linTrendHigh.points[linTrendHigh.points.length - 1][0]

			plotData = {
				labels: yearlyAverages.map((i: any) => i.year),
				datasets: [
					{
						label: 'Avg. daily high',
						data: yearlyAverages.map((i: any) => i.avgDailyHigh),
						borderColor: 'rgba(255,0,0,0.1)',
						backgroundColor: 'rgba(255,0,0,0.2)',
						pointRadius: 3
					},
					{
						label: 'Avg. daily high (trend)',
						data: linTrendHigh.points.map((i: any) =>
							i[0] == 1960 || i[0] == lastYear ? i[1] : undefined
						),
						borderColor: 'rgba(255,0,0,0.7)',
						backgroundColor: 'rgba(255,0,0,0.3)',
						pointRadius: 5
					},
					{
						label: 'Avg. daily low',
						data: yearlyAverages.map((i: any) => i.avgDailyLow),
						borderColor: 'rgba(0,0,255,0.1)',
						backgroundColor: 'rgba(0,0,255,0.05)',
						pointRadius: 3
					},
					{
						label: 'Avg. daily low (trend)',
						data: linTrendLow.points.map((i: any) =>
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
			<ThermometerIcon class="inline mr-2" />
			{type}: {totalDelta}°C
			{#if totalDelta && totalDelta > 0}
				hotter
			{:else if totalDelta && totalDelta < 0}
				colder
			{/if}
		</h3>
		<p>
			{#if lastTrendPoint && firstTrendPoint && gradient && totalDelta}
				{#if type == 'Summer'}
					In the 1960s, the average summer day had a daily high of <strong
						>{firstTrendPoint}°C</strong
					>. These days, the average daily high is <strong>{lastTrendPoint}°C</strong>. That's a
					change of about {gradient}°C per decade and is a
					<strong>total change of {totalDelta}°C !</strong> Oh, by the way, summer means may through
					august here.
				{/if}
				{#if type == 'Winter'}
					In the 1960s, the average winter day had a daily high of <strong
						>{firstTrendPoint}°C</strong
					>. These days, the average daily high is <strong>{lastTrendPoint}°C</strong>. That's a
					change of about {gradient}°C per decade and is a
					<strong>total change of {totalDelta}°C !</strong> By winter days I mean days from november
					to february.
				{/if}
			{/if}
		</p>
		{#if plotData}
			<Line data={plotData} options={{ spanGaps: true, plugins: { legend: { display: false } } }} />
		{/if}
	</div>
</div>
