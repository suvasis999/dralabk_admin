const express = require( 'express' );
const bodyParser = require( 'body-parser' );
const cookieParser = require("cookie-parser");
const helmet = require( 'helmet' ),
    server = express();
const { setRoutes } = require( './routes' );
const config = require( './../config/config' ).getConfig(),
CORSHEADER = config.CORSHEADER;
// For security

server.use( helmet() );

const cors = require( 'cors' ),
    corsOptions = {
        origin: CORSHEADER,
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204,,
        credentials: true,
    }

server.use( cors( corsOptions ) );

server.use( bodyParser.json() );
server.use( cookieParser() );
// Setting up Routes
setRoutes( server );

const app = server;

module.exports = { app };
