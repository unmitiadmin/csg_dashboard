$(document).ready(function () {
    const mapProps = new MapProps("map");
    mapProps.initMap();


    $('.project-model .close-btn').on('click', (event) => {
        $('.project-model').removeClass('show');
    });
    $('.map-popup .project-area').on('click', (event) => {
        $('.project-model').addClass('show');
    })
});