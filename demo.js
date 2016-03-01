'use strict';

var _ = require('lodash');
var open = require('openurl').open;
var async = require('async');
var request = require('request');
var GeoJSON = require('geojson');
var GradsQ = require('./index.js');
var coordinates = require('./library/coordinates.js');
var calculations = require('./library/calculations.js');

var gradsQ = new GradsQ(37.4037, -79.1702, '111:5000', { minutes: 60, model: 'rap' });

gradsQ.ready(function() {

    console.log('gradsQ is readY');

    var steps = _.range( 100 );
    var paths = {};
    var path = [[ -79.1702, 37.4037 ]]; // GEOJSON: LON, LAT
    var altitudes = [ 300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700 ];

    async.each( altitudes, ( i, callback ) => {
        var alt = i;
        var myPath = _.clone( path );

        async.each( steps, ( j, callback ) => {
            var last = myPath[ myPath.length - 1 ];

            gradsQ.query( 1, last[1], last[0], alt, ( results ) => {
                var wind = calculations.wind( results.wind_u_prs, results.wind_v_prs );
                var next = coordinates.travel( [ last[1], last[0], 0 ], wind.speed * 60, wind.heading );

                myPath.push([ next[1], next[0] ]);

                callback();
            });
        }, () => {
            paths[ alt ] = myPath;
            callback();
        });
    }, () => {
        var lines = [];

        for ( var k in paths ) {
            var path = paths[k];

            lines.push({
                name: k + 'm',
                line: path,

            });
        }

        var map = JSON.stringify( GeoJSON.parse( lines, { LineString: 'line', extra: {
            style: {
                color: "#FF0000"
            }
        } } ) );

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
    });
});
