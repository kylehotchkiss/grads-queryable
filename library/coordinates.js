'use strict';

var RADIANS = Math.PI / 180;
var DEGREES = 180 / Math.PI;

exports.travel = function( frame, distance, heading ) {
    //////////////////////////////////////////////////////
    // Take a set of coordinates, distance, and heading //
    // return new coordinates. May be sloppy interface? //
    //////////////////////////////////////////////////////

    heading = heading * RADIANS;
    distance = distance * RADIANS;    

    var radius = (6367500 + frame[2]) * RADIANS;
    var oldLat = frame[0] * RADIANS;
    var oldLon = frame[1] * RADIANS;

    var newLat = Math.asin( Math.sin( oldLat ) * Math.cos( distance / radius ) + Math.cos( oldLat ) * Math.sin( distance / radius ) * Math.cos( heading ) );
    var newLon = oldLon + Math.atan2( Math.sin( heading ) * Math.sin( distance / radius ) * Math.cos( oldLat ), Math.cos( distance / radius ) - Math.sin( oldLat ) * Math.sin( newLat ) );

    var latitude = newLat * DEGREES;
    var longitude = newLon * DEGREES;

    return [ latitude, longitude ];
};
