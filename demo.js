'use strict';

var _ = require('lodash');
var open = require('openurl').open;
var async = require('async');
var request = require('request');
var GeoJSON = require('geojson');
var GradsQ = require('./index.js');
var coordinates = require('./library/coordinates.js');
var calculations = require('./library/calculations.js');

var gradsQ = new GradsQ(26.9236127, 75.9134684, '111:1500', { minutes: 60, model: 'gfs' });

gradsQ.ready(function() {

    console.log('gradsQ is readY');

    var steps = _.range( 100 );
    var path = [[ 75.9134684, 26.9236127 ]]; // GEOJSON: LON, LAT

    async.each( steps, ( i, callback ) => {
        var last = path[ path.length - 1 ];

        //var alt = ( i / 100 ) * 13716; // imaginary climb
        var alt = 600;

        gradsQ.query( 1, last[1], last[0], alt, ( results ) => {
            var wind = calculations.wind( results.wind_u_prs, results.wind_v_prs );
            var next = coordinates.travel( [ last[1], last[0], 0 ], wind.speed * 60, wind.heading );

            path.push([ next[1], next[0] ]);

            callback();
        });
    }, error => {
        var map = JSON.stringify( GeoJSON.parse( [{ line: path }], { LineString: 'line' } ) );

        request({
            json: true,
            method: 'POST',
            url: 'https://api.github.com/gists',
            headers: {'user-agent': 'https://github.com/kylehotchkiss/grads-queryable'},
            body: {
                public: true,
                description: "Hot Air Balloon Altitude Trajectories",
                files: {
                    "paths.geojson": {
                        content: map
                    }
                }
            }
        }, function( error, response, body ) {
            if ( !error ) {
                var url = 'anonymous/' + body.id;
                open( 'http://geojson.io/#id=gist:' + url );
            }
        });

        // Oh?
        //process.exit();
    });

});
