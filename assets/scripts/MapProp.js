class MapProps {
    static sharedCountryIds = []; // Static property shared across instances

    constructor(mapId) {
        this.mapId = mapId;
        this.map = null;
        this.selected_country_ids = MapProps.sharedCountryIds; // Initialize with the shared property
    }

    initMap() {
        this.map = L.map(this.mapId, {
            zoomControl: true,
            attributionControl: true,
        });
        // .setView([51.505, -0.09], 13);
        // L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        //     maxZoom: 19,
        //     attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        // }).addTo(this.map);
        // this.map.touchZoom.disable();
        // this.map.doubleClickZoom.disable();
        // this.map.scrollWheelZoom.disable();
        // this.map.boxZoom.disable();
        // this.map.dragging.disable();
        this.drawBoundries();
    }

    drawBoundries() {
        fetch("./assets/map_data/map.topojson")
            .then((res) => res.json())
            .then((response) => {
                const countries = topojson.feature(
                    response,
                    response.objects.collection
                );
                const bounds = L.geoJson(countries, {}).getBounds();
                const tooltipContainer = document.getElementById("tooltip-container");

                let tooltip = null;
                let polygons = L.d3SvgOverlay(
                    (selection, projection) => {
                        let locationGroup = selection
                            .selectAll("path")
                            .data(countries.features)
                            .enter()
                            .append("g")
                            .append("path")
                            .attr("d", (d) => projection.pathFromGeojson(d))
                            .attr("class", "country_map")
                            .attr("id", (d, i) => `country_${d.properties.country_id}`)
                            .attr(
                                "style",
                                "z-index:2000;pointer-events:visiblePainted !important"
                            )
                            .attr("fill", (d) => "rgb(237, 245, 241)")
                            .attr("fill-opacity", 1)
                            .attr("stroke", "black")
                            .attr("stroke-width", "0.75px")
                            .on("mouseenter", (e, d) => {
                                if (d.properties) {
                                    d3.select(`path#country_${d.properties.ISO_A3}`).attr("cursor", "pointer");
                                }
                            })
                            .on("mouseleave", (d, e) => d.properties?.ISO_A3 ? tooltip.closeTooltip() : null)
                            .on("click", (e, d) => {
                                if (MapProps.sharedCountryIds.includes(d.properties.country_id)) {
                                    const popOver = d3.select(".map-popup");
                                    popOver.classed("show", true);
                                    popOver.style('left', e.clientX - 405 + 'px');
                                    popOver.style('top', e.clientY - 120 + 'px');
                                    popOver.select(".country-name").text(d.properties.country);
                                }
                            });
                        locationGroup
                            .transition()
                            .duration(10)
                            .attr("stroke-width", "0.75px");
                    },
                    { id: `country-` }
                );
                polygons.addTo(this.map);
                this.map.setView([0, 0], 2);
            });
    }

    // Add a method to change country colors based on country_ids
    changeCountryColors(countryIds, projects) {
        const map_popup = document.getElementById("map-popup");
        map_popup.style.display = "none"
        // for(let i = 0; i < this.selected_country_ids.length; i++){
        //   const countryElement = document.getElementById(`country_${this.selected_country_ids[i]}`);
        //   if (countryElement) {
        //     countryElement.setAttribute("fill", "rgb(237, 245, 241)");
        //   }
        // }
        MapProps.sharedCountryIds = countryIds;
        countryIds.forEach((countryId) => {
            const countryElement = document.getElementById(`country_${countryId}`);
            const no_of_projects = document.getElementById("no_of_projects");
            if (countryElement) {
                countryElement.setAttribute("fill", "#6ab28d");
                const objectsWithCountryId = projects.filter((data) =>
                    data.country_ids && data.country_ids.includes(countryId)
                );
                const count = objectsWithCountryId.length;
                countryElement.addEventListener("click", () => {
                    map_popup.style.display = "block";
                    no_of_projects.innerText = `No of Projects: ${count}`;
                    projects_filter(countryId);
                    get_filtered_data("map")
                })
            }
        });
    }

    country_changes(countryIds) {
        for (let i = 0; i < this.selected_country_ids.length; i++) {
            const countryElement = document.getElementById(`country_${this.selected_country_ids[i]}`);
            if (countryElement) {
                countryElement.setAttribute("fill", "#6ab28d");
                countryElement.setAttribute("stroke-width", "0.75px");
                countryElement.setAttribute("stroke", "black");
            }
        }
        countryIds.forEach((countryId) => {
            const countryElement = document.getElementById(`country_${countryId}`);
            if (countryElement) {
                countryElement.setAttribute("fill", "#17BECF");    //003F35    
                countryElement.setAttribute("stroke", "black");
                countryElement.setAttribute("stroke-width", "2px");
            }
        });
    }

}