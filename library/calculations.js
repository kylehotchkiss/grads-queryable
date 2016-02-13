'use strict';

var DEGREES = 180 / Math.PI;

exports.wind = function( u, v ) {
    var offset = Math.atan2( v, u ) * DEGREES; // Is an offset from {below} value.
    var heading = ( 270 + offset ) - 180; // Proper direction - Pretty damned critical.
    var speed = Math.sqrt( Math.pow(Math.abs(v), 2) + Math.pow(Math.abs(u), 2) );

    return {
        speed: speed,
        heading: heading
    };
};
