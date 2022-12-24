<script lang="ts">
    export let compName: string = 'Kompi'
    
    const getSlow = async () => {
        await new Promise(r => setTimeout(r, 2000))

        return 'ok'
    }

    let slowPromise = getSlow()
</script>

<div>
    <strong>A component named {compName}.</strong>
    <div>
        {#await slowPromise}
            Waiting...
        {:then result}
            Result is {result}
        {/await}
    </div>
</div>
