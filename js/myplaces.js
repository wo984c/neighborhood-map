// Global Variables
var map, infoWindow, bounds, address;

// Initializes google maps
var initMap = function () {
    var myLatLng = {
        lat: 18.366177,
        lng: -66.561086
    };


    map = new google.maps.Map(document.getElementById('map'), {
        center: myLatLng,
        zoom: 10,
        mapTypeControl: false,
        disableDefaultUI: true
    });

    infoWindow = new google.maps.InfoWindow();
    bounds = new google.maps.LatLngBounds();

    ko.applyBindings(new ViewModel());

} // Close of initMap

// Map Error Handler 
var mapError = function() {
    alert("Error while loading your Map");
}

// Map Location Marker
var locationMarker = function(data) {
    
    // FourSquare ClientID and ClientSecret
    cID = '0ZSCXSAKNUR4F1XLXJFKTKH40V5BO0SXMMX2OKOLUKWK4B4L';
    cSec = 'RWK1JFCWOQZEJX543IJGVJ0OQWPSDASABFV3QXYQKN55WYK3';

    var self = this;

    this.name = data.name;
    this.position = data.coords;
    this.note = data.note;
    this.id = data.id;
    this.rating = '';
    this.picture = '';

    this.visible = ko.observable(true);

    // Default Icon
    var defaultIcon = makeMarkerIcon('0091ff');

    // On mouse over the icon changes tge color
    var highlightedIcon = makeMarkerIcon('FFFF24');
    
    var fsqURL = 'https://api.foursquare.com/v2/venues/' + this.id +
                 '?client_id=' + cID + '&client_secret=' + cSec +
                 '&v=20180731';

    // Get information from FourSquare API
    $.getJSON(fsqURL).done(function(data) {

        var results = data.response.venue;
        self.rating = results.rating;
        self.picture = results.bestPhoto.prefix + '150x150' + results.bestPhoto.suffix;
        self.street = results.location.formattedAddress[0];
        self.city = results.location.formattedAddress[1];

        console.log(results);
    }).fail(function() {

        alert('foursquare error, try again later');

    });


    var owUrl = 'http://api.openweathermap.org/data/2.5/weather?lat=' +
    this.position.lat + '&lon=' + this.position.lng + 
    '&APPID=a8736ea7e85a5d3824c7791161e8a0f9&&units=imperial';

    // Get Weather information from OpenWeathermap API
    $.getJSON(owUrl).done(function(data){

        var oWeather = {
            temp: data.main.temp,
            humidity: data.main.humidity,
            sunRise: data.sys.sunrise,
            sunSet: data.sys.sunset,
            sky: data.weather[0].description,
            iCon: data.weather[0].icon
        };

        var dateSR = new Date(oWeather.sunRise * 1000);
        var dateSS = new Date(oWeather.sunSet * 1000);

        self.sunSet = (dateSS.getHours() - 12) + ':' + dateSS.getMinutes() + ' pm';
        self.sunRise = dateSR.getHours() + ':' + dateSR.getMinutes() + ' am';
        self.humidity = oWeather.humidity;
        self.temp = Math.round(oWeather.temp);
        self.sky = oWeather.sky;
        self.iCon = '<img src="http://www.openweathermap.com/img/w/' + oWeather.iCon + '.png">'

    }).fail(function(){
        alert('failed to get weather info');
    });
 
    this.marker = new google.maps.Marker({

        position: this.position,
        title: this.name,
        description: this.note,
        animation: google.maps.Animation.DROP,
        icon: defaultIcon

    });

    self.filterMarkers = ko.computed(function () {

        if(self.visible() === true) {
            self.marker.setMap(map);
            bounds.extend(self.marker.position);
            map.fitBounds(bounds);
        
        } else {
            self.marker.setMap(null);
        }

    });

    
    // Open InfoWindow on mouse click
    this.marker.addListener('click', function() {

        popIW(this, self, infoWindow);
        bounceMarker(this);
        map.panTo(this.getPosition());

    });

    // Marker is highlighted when the mouse pointer is over
    this.marker.addListener('mouseover', function() {
    
        this.setIcon(highlightedIcon);
    
    });
    
    // Marker isn't highlighted anymore
    this.marker.addListener('mouseout', function() {
    
        this.setIcon(defaultIcon);
    
    });


    this.show = function(location) {

        google.maps.event.trigger(self.marker, 'click');

    };

    // Marker bounces on click
    this.bounce = function(place) {

        google.maps.event.trigger(self.marker, 'click');
    
    };

}; // Close of locationMarker


// View Model - Knockout handles the locations list
var ViewModel = function() {

    var self = this;
    this.item = ko.observable('');
    this.list = ko.observableArray([]);

    myLocations.forEach(function(location) {
        self.list.push( new locationMarker(location) );
    });

    this.locationList = ko.computed(function() {

        var searchFilter = self.item().toLowerCase();
        
        if (searchFilter) {
            
            return ko.utils.arrayFilter(self.list(), function(location) {
                
                var str = location.name.toLowerCase();
                var result = str.includes(searchFilter);
                location.visible(result);
                return result;

            });

        }

        self.list().forEach(function(location) {
            
            location.visible(true);

        });

        return self.list();

    }, self);

}; // Close of View Model

// Pop InfoWindow of selected marker with its information, image, weather, etc.
function popIW(marker, self, infowindow) {

    if (infowindow.marker != marker) {

        infowindow.setContent('');
        infowindow.marker = marker;

        infowindow.addListener('closeclick', function() {
         
            infowindow.marker = null;
        
        });

       var windowContent = '<p><b>' + marker.title +  '</b></p>' +
                           '<p>' + marker.description + '</p>' +
                           '<div><img src="' + self.picture + '">' + '</div>' + 
                           '<br><p>' + 'Rating: ' + self.rating + '</p>' +
                           '<p>' + 'Sky: ' + self.iCon + self.sky + '<br>' + 
                           'Sun Rise at: ' + self.sunRise + '<br>' +
                           'Sun Set at: ' + self.sunSet + '<br>' +
                           'Temperature: ' + self.temp + ' ' + '&#8457;' + '<br>' +
                           'Humidity: ' + self.humidity + '%' +
                           '</p>' + '<p><b>' + 'Address' + '</b></p>' +
                           '<p>' + self.street + ', ' + self.city + '</p>';

        infowindow.setContent(windowContent);

        infowindow.open(map, marker);
    }

}


// Marker Bounce Animation
function bounceMarker(marker) {

    if (marker.getAnimation() !== null) {
        marker.setAnimation(null);
    } else {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            marker.setAnimation(null);
        }, 2100);  // 3 bounces then stops
    }

} // Close of bounceMarker


// Creates new marker with specified markerColor
function makeMarkerIcon (markerColor) {
    var markerImage = new google.maps.MarkerImage(
      'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
      '|40|_|%E2%80%A2',
      new google.maps.Size(21, 34),
      new google.maps.Point(0, 0),
      new google.maps.Point(10, 34),
      new google.maps.Size(21,34));
    return markerImage;
} // Close of makeMarkerIcon
