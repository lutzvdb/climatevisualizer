
export default async function getLocationsByString(name: string) {
    let apiCall = 'https://geocoding-api.open-meteo.com/v1/search?name=' + name ;

    const res = await fetch(apiCall)
    const data = await res.json()

    if(!data) return
    if(!data.results) return 
    if(data.results.length == 0) return 
    if(!data.results[0].latitude) return 
    if(!data.results[0].longitude) return 

    return(data.results)
}