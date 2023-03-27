<script lang="ts">
	import { climateModels } from './weatherData'

	export let climateModel: string = 'MRI_AGCM3_2_S'
</script>

<!-- The button to open modal -->
<label for="climateModelModal" class="btn btn-sm btn-outline btn-success"
	>Change the climate model</label
>
<input type="checkbox" id="climateModelModal" class="modal-toggle" />
<div class="modal">
	<div class="modal-box">
		<h3 class="font-bold text-lg mb-4">Choose a climate model</h3>
		<p>
			Multiple climate modles for long-term forecasts are available. They differ in their
			assumptions and therefore yield different outcomes. Some models don't offer projections 
            for rainfall or snowfall, however all models provide predictions for temperature.
		</p>
		<p class="my-4">Available models are:</p>
		<div class="mt-4 overflow-x-auto">
			<table class="table w-full">
				<thead>
					<tr>
						<th />
						<th>Name</th>
						<th>Origin</th>
						<th>Link</th>
					</tr>
				</thead>
				<tbody>
					{#each climateModels as mdl, i}
						<tr class={climateModel == mdl.specifier ? 'font-bold' : ''}>
							<td>{i + 1}</td>
							<td>
								<a
									href={'#'}
									on:click={() => {
										climateModel = mdl.specifier
									}}
								>
									<label for="climateModelModal" class="cursor-pointer">
										{mdl.specifier}
									</label>
								</a>
							</td>
							<td>
								{mdl.country}
							</td>
							<td>
								<a href={mdl.link} title={mdl.specifier} target="_blank" rel="noreferrer"
									>More info</a
								>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="modal-action">
			<label for="climateModelModal" class="btn btn-outline btn-success">Ok</label>
		</div>
	</div>
</div>
