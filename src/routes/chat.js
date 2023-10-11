'use strict';
const express = require( 'express' ),
    router = express.Router();
const ChatController = require( '../controllers/ChatController' );
const AuthController = require( '../controllers/AuthController' );

// sending a message to a new user
router.get( '/messages/conversations', AuthController.checkLogin, AuthController.isActive, ChatController.getAllUserRooms );

router.get( '/messages/:roomId', AuthController.checkLogin, AuthController.isActive, ChatController.getMoreRoomMessages );
// getting all messages

router.get( '/messages/:chatRoomId', AuthController.checkLogin, AuthController.isActive, ChatController.getMessages );
// getting all conversations


module.exports = router;
