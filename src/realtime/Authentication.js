const{ authService } = require( '../services/AuthService' );


const cookie = require( 'cookie' );

const authenticateUser = async( socket, next ) => {

    console.log('socket headers', socket.handshake.headers)
    const token = socket.handshake.headers.cookie ? cookie.parse( socket.handshake.headers.cookie ).token : null ;

    try {

        let userDoc;
    
        if( token ) {
            userDoc = await authService.checkLogin( token );
            socket.userDoc = userDoc;
            next();
        }

    }catch( error ) {
        return;
    }

  
};

module.exports = { authenticateUser };
