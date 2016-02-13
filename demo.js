'use strict';

var _ = require('lodash');
var open = require('openurl').open;
var async = require('async');
var GeoJSON = require('geojson');
var GradsQ = require('./index.js');
var coordinates = require('./library/coordinates.js');
var calculations = require('./library/calculations.js');

var gradsQ = new GradsQ(37.4037, -79.1702,  '111:4572', { minutes: 60 });

gradsQ.ready(function() {

    console.log('gradsQ is readY');

    var steps = _.range( 60 );
    var path = [[ -79.1702, 37.4037 ]];

    async.each( steps, ( i, callback ) => {
        var last = path[ path.length - 1 ];

        gradsQ.query( 1, last[1], last[0], 609.6, ( results ) => {
            var wind = calculations.wind( results.wind_u_prs, results.wind_v_prs );
            var next = coordinates.travel( [ last[1], last[0], 0 ], wind.speed * 60, wind.heading );

            path.push([ next[1], next[0] ]);

            callback();
        });
    }, error => {
        var map = JSON.stringify( GeoJSON.parse( [{ line: path }], { LineString: 'line' } ) );

        open( 'http://geojson.io/\#data=data:application/json,' + map );

        // Oh?
        process.exit();
    });

});
