'use strict';
const path = require( 'path' );

module.exports.getConfig = () => {
    
    const config = {
        'MODE': 'Development',
        'PORT': process.env.PORT || 5000,
        'CORSHEADER': process.env.CORSHEADER || 'http://localhost:3000',
        'SOCKET_PORT': process.env.SOCKET_PORT || 3020,
        'MONGO_URL': process.env.MONGO_URL || 'mongodb://mongo:27017/sotnac?directConnection=true&authSource=admin&replicaSet=replicaset&retryWrites=true',
        'UPLOAD_PATH': path.resolve( `${__dirname }/../uploads` ),
        'JWT_SECRET': process.env.JWT_SECRET || 'R4ND0M5TR1NG'
    };

    // Modify for Production
    if ( process.env.NODE_ENV === 'production' ) {
        config.MODE = 'Production';
    }

    return config;
};
