/* eslint-disable prefer-arrow-callback */


require( 'dotenv' ).config();
const { setQuizSocketHandlers } = require( './src/realtime/Quiz' );
const { setUserStatusSocketHandler } = require( './src/realtime/UserStatus' );

// Initialize DB Connection
require( './config/database' );


const config = require( './config/config' ).getConfig(),
    PORT = config.PORT;
    SOCKET_PORT = config.SOCKET_PORT;
    CORSHADER = config.CORSHEADER;
console.log( '✔ Bootstrapping Application' );
console.log( `✔ Mode: ${config.MODE}` );
console.log( `✔ Port: ${PORT}` );

const { app } = require( './config/server' );
const { socketApp } = require( './config/SocketServer' );
const { setChatsQuizHandler } = require('./src/realtime/Chats');

const server = require( 'http' ).createServer( app );

const socketServer = require( 'http' ).createServer( socketApp );
 

socketServer.listen( SOCKET_PORT ).on( 'error', ( err ) => {
    console.log( '✘ Application failed to start' );
    console.error( '✘', err.message );
    process.exit( 0 );
} ).on( 'listening', () => {
    console.log( '✔ Socket Application Started on 3020' );
} );


server.listen( PORT ).on( 'error', ( err ) => {
    console.log( '✘ Application failed to start' );
    console.error( '✘', err.message );
    process.exit( 0 );
} ).on( 'listening', () => {
    console.log( '✔ Website Application Started on 5000' );
    console.log( 'CONFIG FOR PRODUCTION ', config);
} );


const socketConfig = {
    'cors': {
        'origin': CORSHADER,
        'methods': ["GET", "POST"],
        'transports': ['websocket', 'polling'],
        'allowedHeaders': [ 'cookie' ],
        'credentials': true
    },
    'allowEIO3': true
};

global.io = require( 'socket.io' )( socketServer, socketConfig );

const quizNameSpace = global.io.of( '/quizzes' );
const userStatusNameSpace = global.io.of( '/users' );
const chatNameSpace = global.io.of( '/chats');
setQuizSocketHandlers( quizNameSpace );
setUserStatusSocketHandler( userStatusNameSpace );
setChatsQuizHandler(chatNameSpace);












// eslint-disable-next-line no-unu

module.exports = { app };
