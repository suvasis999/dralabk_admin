/* eslint-disable prefer-arrow-callback */
const { authenticateUser } = require( './Authentication' );
const { userService } = require( '../services/UserService' );

const setUserStatusSocketHandler = ( nameSpace ) => {


    nameSpace.use( authenticateUser ).on( 'connection', async( socket ) => {

        const userId = socket.userDoc._id.toString();
        userService.userConnect( userId );

        socket.join(`notifications/${userId}`);

        global.io.of("/users").to(`notifications/${userId}`).emit('updated_notification',socket.userDoc['unseen_notifications_count']);

        delete socket.userDoc;
        socket.on( 'disconnect', function() {
            userService.userDisconnect( userId );
        }
        );
    }
    );

};

module.exports = { setUserStatusSocketHandler };
