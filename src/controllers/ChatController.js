const { chatService } = require( './../services/ChatService' );
const { userService } = require( './../services/UserService' );
const { mediaService } = require( './../services/MediaService' );
const { Message } = require('./../models/Message');
const autoBind = require( 'auto-bind' );
const { HttpResponse } = require('../../system/helpers/HttpResponse');
var mongoose = require('mongoose');
class ChatController {

    constructor( service, userServiceDependency ) {
        this.service = service;
        this.userService = userServiceDependency;
        autoBind( this );
    }


    async linkAttachMents( attachments ){
        const attachmentsIds = attachments.map((attachment)=> mongoose.Types.ObjectId(attachment.id));
        try{
        await mediaService.model.updateMany({'_id': {'$in':attachmentsIds}},{'status':'linked'});
        }catch(error){
            console.log(error);
        }
    }

    async getAllUserRooms( req, res, next ){
        const roomsIds =  Array.from( req.user['chat_rooms_map'] ).map(([key, value]) => value[ 'room_id' ]);

        const rooms = await this.service.model
        .find({})
        .where( '_id' )
        .in( roomsIds )
        .sort([['date', -1]]);

        return res.status( 200 ).json( new HttpResponse(rooms));
    }
    async getRoom( senderDoc, receiverId, roomIdInit ){
        // get or initiate the room.
        let roomId = roomIdInit;
        if( roomId == null ) {
        roomId = await this.service.isChatRoomInitiated( senderDoc, receiverId );
        if( !roomId ) {
            roomId = await this.service.initiateRoom( senderDoc, receiverId );
        }
        }
        // get the room
        return await this.service.get( roomId );

    }


    // on connection with socket.
        // it checks if there is a room and bring messages.
            // it mark all the other part sent messages as seen.

    // if not it does nothing.
    async getMoreRoomMessages( req, res, next ){

        const roomId = req.params.roomId;
        const skip = Number(req.query.skip);

        try{
            const count = await Message.count({'room_id':roomId });
            const items = await Message.find({'room_id':roomId }).sort({'createdAt':1}).skip(skip).limit(10);
            const rest = Math.max( count - skip, 0 );
            
            const messages = {items,rest};
            
            return res.status(200).json( new HttpResponse(messages));
        }catch(error){
            next(error);
        }
    }

    async getRoomMessages( senderDoc, messageBody ) {
        let roomId = messageBody[ 'room_id' ] || null;
        const senderId = senderDoc[ '_id' ].toString();
        const receiverId = messageBody.receiverId;

       
        const roomDoc = await this.getRoom(senderDoc,receiverId,roomId);
        
        // update messages in the room of the other party as seen. ( optimised with indexes )
        await Message.updateMany({'room_id':roomDoc['_id'].toString(),'sender_id':receiverId.toString(),'isSeen':false}, {'isSeen':true});


        // reset the seen counter of this party
        for(const user of roomDoc.users ){
            if(user.user_id.toString() == senderId.toString()){
                user['unseen_messages_count'] = 0;
                break;
            }
        }

        // persist the seen counter ( i made sure of synchronization )
        await roomDoc.save();


        // getting the messages.
        const count = await Message.count({'room_id':roomDoc['_id'].toString()});
        const items = await Message.find({'room_id':roomDoc['_id'].toString() }).sort({'createdAt':-1}).limit(10);
        const messages = {items,count};

        return { messages, roomDoc };        
    }

    async sendMessageToUser( senderDoc, roomDoc, messageBuffer, isSeen, attachments = []) {
        // send message
        const message = await Message.create({'room_id':roomDoc[ '_id' ],'message':messageBuffer ,'sender_id':senderDoc['_id'].toString(), 'isSeen':isSeen ,'attachments':attachments });

        // update count
        for(const user of roomDoc.users ){
            if(user.user_id.toString() != senderDoc[ '_id' ].toString()){
                user['unseen_messages_count'] += 1;
                break;
            }
        }
        const contents = attachments.length > 0 ? 'Attachments' : messageBuffer;
        roomDoc.last_message = {'sender':senderDoc['id'].toString(),'content': contents, 'Date': Date.now()};
        const mutatedRoom = await roomDoc.save();
        return {message,mutatedRoom};
    }

    // send message to different users.

    // send message.
    async postMessageSingleUser( req, res, next ) {

        const senderId = req.user[ '_id' ].toString();
        const senderDoc = req.user;
        const messageBody = req.body;
        const receiverId = messageBody.receiverId;

        let roomId = messageBody[ 'room_id' ];

        if( roomId == null ) {
            roomId = await this.service.isChatRoomInitiated( senderDoc, receiverId );
            if( roomId == null ) {
                roomId = await this.service.initiateRoom( senderDoc, receiverId );
            }
        }else{
            
        }

        const response = await this.service.sendMessageToChatRoom( senderId, receiverId, roomId, messageBody );
        
        return response;
    }
    
    // only give it a user id and it will create the chat room:
    async createChatRoom( req, res, next ){

    }
    async getAllConversations(req, res, next) {
        return this.service.getAllConversations( req.user );
    }

    async getMessages( req, res, next ) {
        const userId = req.user[ '_id' ].toString();
        const chatRoomId = req.params.chatRoomId;
        const roomDoc = await this.service.get( chatRoomId );
        
        // eslint-disable-next-line no-shadow
        let response = {};

        if( roomDoc.users.some( element => element['user_id'] = userId ))
        {
            response = await this.service.getMessages( roomDoc, userId );
        }

        return response;
    }

}

module.exports = new ChatController( chatService, userService );
