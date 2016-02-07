'use strict';

var DEGREES = 180 / Math.PI;

exports.wind = function( u, v ) {
    var heading = ( 270 - ( Math.atan2( v, u ) * DEGREES ) ) % 360;
    var speed = Math.sqrt( Math.pow(Math.abs( v ), 2) + Math.pow(Math.abs( u ), 2) );

    return {
        speed: speed,
        heading: heading
    };
};
