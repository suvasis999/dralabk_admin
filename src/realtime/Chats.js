const { authenticateUser } = require( './Authentication' );
const chatController = require( './../controllers/ChatController');

const setChatsQuizHandler = ( nameSpace ) => {

    nameSpace.use( authenticateUser ).on( 'connection', async( socket ) => {
        console.log('USER CONNECTED TO CHAT SOCKET');
        // listening on changes on all rooms.
        socket.join(`all_chats_rooms/${socket.userDoc._id.toString()}`);
        
        // join a chat room
        socket.on( 'joinDiscussion', async function( req ) {
        const messageBody = req;

        // get all messages:
        const { messages, roomDoc } = await chatController.getRoomMessages(socket.userDoc, messageBody);
        socket.emit( 'message', { 'messages': messages } );

        // joining the user socket to room for both users.
        socket.join(roomDoc._id.toString());

    } );

    socket.on( 'leaveDiscussion', async function( req ) {
        const messageBody = JSON.parse( req );

        // joining the user socket to room for both users.
        await socket.leave(messageBody.room_id.toString());
    }
    
    )

    socket.on( 'sendMultipleMessages', async function( req )
    {
        const messageBody = req ;
        const senderDoc = socket.userDoc;
        const messageBuffer = messageBody.message;
        const attachments = messageBody.attachments || [];
        const receveirsId = messageBody.receveirsId;
        
        for(const receiverId  of receveirsId){
        try{
            
            if(((messageBody.attachments && messageBody.attachments.length > 0) || messageBody.message != 0) && receiverId){
    
                const roomDoc = await chatController.getRoom( senderDoc,receiverId );
                let isSeen = false;
                if( global.io._nsps.get('/chats').adapter.rooms.get(roomDoc._id.toString()) && global.io._nsps.get('/chats').adapter.rooms.get(roomDoc._id.toString()).size >= 2 ){
                    isSeen = true;
                }
                const {message,mutatedRoom} = await chatController.sendMessageToUser(senderDoc,roomDoc,messageBuffer,isSeen,attachments);
                chatController.linkAttachMents(attachments);

                // notify the receiver to that a room have changed.
                global.io.of("/chats").in(`all_chats_rooms/${receiverId.toString()}`).emit('room_document_mutated', mutatedRoom );
                global.io.of("/chats").in(`all_chats_rooms/${senderDoc['_id'].toString()}`).emit('room_document_mutated', mutatedRoom );
    
                // send the receiver the message.
                global.io.of("/chats").in(roomDoc._id.toString()).emit('new_message', message );
    
    
            }else{
                throw new Error('Bad Request');
            }
            }catch(error){
                console.log(error);
            }
        }

    })

    socket.on( 'sendMessage', async function( req ){
        const messageBody = req;
        const senderDoc = socket.userDoc;
        const receiverId = messageBody.receiverId || null;
        const messageBuffer = messageBody.message;
        const attachments = messageBody.attachments || [];
        try{
            
        if(((messageBody.attachments && messageBody.attachments.length > 0) || messageBody.message != 0) && receiverId){

            const roomDoc = await chatController.getRoom( senderDoc,receiverId );
            let isSeen = false;

            if( global.io._nsps.get('/chats').adapter.rooms.get(roomDoc._id.toString()) && global.io._nsps.get('/chats').adapter.rooms.get(roomDoc._id.toString()).size >= 2 ){
                isSeen = true;
            }
            const {message,mutatedRoom} = await chatController.sendMessageToUser(senderDoc,roomDoc,messageBuffer,isSeen,attachments);
            chatController.linkAttachMents(attachments);
            // notify the receiver to that a room have changed.
            global.io.of("/chats").in(`all_chats_rooms/${receiverId.toString()}`).emit('room_document_mutated', mutatedRoom );
            global.io.of("/chats").in(`all_chats_rooms/${senderDoc['_id'].toString()}`).emit('room_document_mutated', mutatedRoom );

            // send the receiver the message.
            global.io.of("/chats").in(roomDoc._id.toString()).emit('new_message', message );


        }else{
            throw new Error('Bad Request');
        }
        }catch(error){
            console.log(error);
        }

    } );

    socket.on( 'disconnect', function() {
       delete socket;
       
    }
    );


} );

}

module.exports = { setChatsQuizHandler }