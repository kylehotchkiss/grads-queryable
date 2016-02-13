'use strict';

var _ = require('lodash');
var Grads = require('grads');
var moment = require('moment');
var Decimal = require('decimal.js');
var coordinates = require('./library/coordinates.js');
var calculations = require('./library/calculations.js');


var remap = function( value, from, to, strict ) {
    var result = to[0] + ( value - from[0] ) * ( to[1] - to[0] ) / ( from[1] - from[0] );
    if ( strict ) { // Allow better proximity to data when GrADS allows it
        return Math.floor( result );
    } else {
        return Math.round( result );
    }
};

var nearest = function( num, arr ) {
    var curr = arr[0];
    var diff = Math.abs( num - curr );

    for ( var val = 0; val < arr.length; val++ ) {
        var newdiff = Math.abs( num - arr[val] );

        if ( newdiff < diff ) {
            diff = newdiff;
            curr = arr[val];
        }
    }

    return curr;
};

function GradsQ( lat, lon, alt, options ) {
    this.dataset = {};
    this.altitudes = [];

    const defaults = {
        minutes: 60, // length of flight, minutes
        model: 'gfs', // NOAA weather model (GFS/RAP)
        variables: ['wind_u_prs', 'wind_v_prs'] // Variables
    };

    // Merge defauts with passed object
    options = _.extend( defaults, options );

    this.search = ( timeOffset, lat, lon, alt ) => {
        var key;

        // TODO: config argument for grads callback should provide the actual resolution
        // if the dataset was simplified at all. This should only apply if you travel
        // more than 12.5deg in GFS or 9.25deg in RAP (873 or 639 equator-miles respectively)
        // Note: this needs to be fixed before using ultra high-res models
        var modelOptions = this.model.options;
        var resolution = modelOptions.resolution;
        var resolution_x = modelOptions.resolution_x;
        var resolution_y = modelOptions.resolution_y;
        var resolution_z = modelOptions.resolution_y;

        // Round to nearest location given resolution of model.
        lat = Decimal( lat ).toNearest( resolution_x || resolution );
        lon = Decimal( lon ).toNearest( resolution_y || resolution );
        alt = nearest( Decimal( alt ), this.altitudes );

        // Figure out how many minutes a timeblock will represent
        var interval = ( this.model.steps.days / this.model.steps.time ) * 1440;

        // Figure out which block our time belongs in
        var time = remap( timeOffset, [ 1, ( this.model.steps.days * this.model.steps.time ) ], [ 1, this.model.steps.time ], false );

        // Add the time block to the initial time
        time = ( ( time * interval ) * 60000 ) + this.time;

        // Generate a key (TODO: altitude)
        if ( alt ) {
            key = `[${ time }][${ alt }][${ lat }][${ lon }]`;
        } else {
            key = `[${ time }][${ lat }][${ lon }]`;
        }

        if ( typeof this.dataset[key] === 'object' ) {
            return this.dataset[key];
        } else {
            return false;
        }
    };

    // Query function to search existing data or grab some more
    this.query = ( timeOffset, lat, lon, alt, callback ) => {
        // Search existing data
        var results = this.search( timeOffset, lat, lon, alt );

        if ( results ) {
            callback( results );
        } else {
            //console.log('Out of bounds :( bye');
            // this.extend
        }
    };

    // Save ready callback for after we're done initializing.
    this.ready = callback => {
        this.next = callback;
    };

    // Request 1
    // Build the bounding box 25 miles northwest and southeast of the launch point
    // TODO: Make the initial box size a variable
    // TODO: Cordinate boxes expand upwards like an upside down pyramid
    var topleft = coordinates.travel( [ lat, lon, 0 ], 40233.6, 290 );
    var bottomright = coordinates.travel( [ lat, lon, 0 ], 40233.6, 130 );

    // Request a 50mi by 50mi square from the launch location to get wind trends
    // TODO: altitude friendly
    var sample = new Grads( bottomright[0] + ':' + topleft[0], topleft[1] + ':' + bottomright[1], 609.6, options.model );

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
        if ( typeof averages.wind_u_prs !== 'undefined' && averages.wind_v_prs !== 'undefined' ) {
            var wind = calculations.wind( averages.wind_u_prs, averages.wind_v_prs ); // m/s

            // Convert speed to m/min, then multiply by flight minutes
            // Then multiply by 50% so we can have a better sized bounding box
            distance = (( wind.speed * 60 ) * options.minutes ) * 5;
            corner = coordinates.travel( [ lat, lon, 609.6 ], distance, wind.heading );

            //} else {
            // How do we calculate estimated distance for other vars ?????
        }

        // Make our official request with projected boundaries
        // NOTE: this assumes East->West travel - will need to handle flipping ranges in Grads
        // to prevent fatal errors here for southern hemispheres
        var official = new Grads( corner[0] + ':' + lat, corner[1] + ':' + lon, alt, options.model );

        official.bulkFetch( options.variables, () => {
            this.dataset = official.flatten();
            this.model = official.model;

            for ( var i in this.dataset ) {
                if ( this.altitudes.indexOf( this.dataset[i].alt ) === -1 ) {
                    this.altitudes.push( this.dataset[i].alt );
                }
            }

            // Figure out our first time so we can iterate properly
            var firstKey = Object.keys(this.dataset)[0];

            this.time = +moment( this.dataset[ firstKey ].time ); // todo: this will be js time in the future

            // We should read all the values into redis or something?

            this.next();
        });
    });
}

module.exports = GradsQ;
