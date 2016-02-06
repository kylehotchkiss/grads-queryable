# grads-queryable

This is a _queryable_ instance of my [grads](https://github.com/kylehotchkiss/grads) software.
The intension is to make flight path predictions easier for you (and for NOAA) by reducing the amount of weather data requests you'll need to make for ambitious (where bounding box for data is unknown) requests.
It's focused around wind data, but could be used for other values if needed. (Maybe waves? Who knows. That'd be cool)

_This is not flight path prediction software on its own - check out [fnstraj2](https://github.com/kylehotchkiss/fnstraj2) for that._

## How it works

1. You initialize grads-queryable with your launch or starting coordinates
```
    var gradsQ = new GradsQ( lat, lon, alt, options )
```
2. grads-queryable makes a wide-area request around your launch location to get a rough idea of what wind (or whatever value you're looking up) is looking like.
3. grads-queryable makes a quick estimate of flight distance based on the averages in that last request, then sets the bounding box
4. grads-queryable grabs the wind values for a bounding box between your launch location and the estimated flight distance. All values are saved to a flat object and saved to redis.
5. You can start your prediction code at this point, and you can query your instance of grads-queryable with the next moment of your prediction.
```
    gradsQ.query( timeOffset, lat, lon, alt )
```
6. grads-queryable searches the previously stored data for your location. If the location is unavailable, it makes a new grads request for data for your new location.
7. Tada! You just made a flight path prediction or whatever you were trying to do.

## Instructions

1. `npm i --save grads grads-queryable`
2. Initialize in your code:

```
    var GradsQ = require('grads-queryable');

    // Your launch or starting location
    var gradsQ = new GradsQ( lat, lon, alt );

    // Since the initializer needs to make some requests, you'll need to put a .ready()
    gradsQ.ready(function() {

        var flightPath = [];

        // Linear vertical climb to 8000m
        // Lets say you're starting on the ground
        // Your max altitude is 8000m
        // In each `moment` of flight, you ascend 5m
        for ( var alt = 0; alt < 8000; alt + 60; ) {

            // Lets say each `moment` represents 1 minute
            // That means our climb rate is 1m/s.
            var timeOffset = 1;

            var myValues = gradsQ.query( timeOffset, lat, lon, alt );

            // Calculate new location etc etc            

            flightPath.push({
                alt: x,
                lat: y,
                lon: z
            });
        }

        // Make a cool map with flightPath

        // :D
    });
```


## Options / Defaults

* This currently uses the GFS model.
