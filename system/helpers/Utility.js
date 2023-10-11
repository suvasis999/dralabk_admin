'use strict';
const jwt = require( 'jsonwebtoken' ),
    config = require( '../../config/config' ).getConfig(),
    jwtKey = config.JWT_SECRET;

module.exports.slugify = ( text ) => {
    return text.toString().toLowerCase()
        .replace( /\s+/g, '-' ) // Replace spaces with -
        .replace( /[^\w\-\.]+/g, '' ) // Remove all non-word chars
        .replace( /\-\-+/g, '-' ) // Replace multiple - with single -
        .replace( /^-+/, '' ) // Trim - from start of text
        .replace( /-+$/, '' ); // Trim - from end of text
};

module.exports.verifyToken = ( token ) => {
    try {
        return jwt.verify( token, jwtKey );
    } catch ( e ) {
        throw e;
    }
};
