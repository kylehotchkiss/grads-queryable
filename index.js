'use strict';

var _ = require('lodash');
var Grads = require('grads');
var coordinates = require('./library/coordinates.js');
var calculations = require('./library/calculations.js');

function GradsQ( lat, lon, alt, options ) {
    const defaults = {
        minutes: 60, // length of flight, minutes
        model: 'gfs', // NOAA weather model (GFS/RAP)
        variables: ['wind_u', 'wind_v'] // Variables
    };

    // Merge defauts with passed object
    options = _.extend( defaults, options );

    // Query function to search existing data or grab some more
    //this.query = ( timeOffset, lat, lon, alt ) => {
    //};

    // Save ready callback for after we're done initializing.
    this.ready = callback => {
        this.next = callback;
    };

    // Request 1
    // Build the bounding box 25 miles northwest and southeast of the launch point
    // TODO: Make the initial box size a variable
    var topleft = coordinates.travel( [ lat, lon, alt ], 40233.6, 290 );
    var bottomright = coordinates.travel( [ lat, lon, alt ], 40233.6, 130 );

    // Request a 50mi by 50mi square from the launch location to get wind trends
    // TODO: altitude friendly
    var sample = new Grads( bottomright[0] + ':' + topleft[0], topleft[1] + ':' + bottomright[1], 0, options.model );

    sample.bulkFetch( options.variables, ( values, config ) => {
        var averages = {};
        var distance, corner;
        var flat = sample.flatten();

        // Let's loop
        for ( var i in flat ) {
            var value = flat[i];

            for ( var j in options.variables ) {
                var variable = options.variables[j];

                if ( typeof averages[variable] === 'undefined' ) {
                    averages[variable] = 0;
                }

                averages[variable] = (averages[variable] + value[variable]) / 2; // TODO: This is an unbiased average. no bueno
            }
        }

        // Can we run a sample.clean(); to remove any unneeded data?

        // Figure out rough distance + heading if we're using wind
        if ( typeof averages['wind_u'] !== 'undefined' && averages['wind_v'] !== 'undefined' ) {
            var wind = calculations.wind( averages.wind_u, averages.wind_v ); // m/s

            // Convert speed to m/min, then multiply by flight minutes
            // Then multiply by 50% so we can have a better sized bounding box
            distance = (( wind.speed * 60 ) * options.minutes ) * 1.5;
            corner = coordinates.travel( [ lat, lon, alt ], distance, wind.heading );

            //} else {
            // How do we calculate estimated distance for other vars ?????
        }

        // Make our official request with projected boundaries
        // NOTE: this assumes East->West travel - will need to handle flipping ranges in Grads
        // to prevent fatal errors here for southern hemispheres
        var official = new Grads( corner[0] + ':' + lat, corner[1] + ':' + lon, 0, options.model );

        official.bulkFetch( options.variables, () => {
            var flat = official.flatten();

            // We should read all the values into redis or something?

            this.next();
        });
    });
}

module.exports = GradsQ;
