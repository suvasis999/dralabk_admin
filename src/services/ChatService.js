'use strict';
const { Service } = require( '../../system/services/Service' );
const { userService } = require( './UserService' );
const { Chat } = require( '../models/Chat' );
const mongoose = require( 'mongoose' );
const autoBind = require( 'auto-bind' );
const { sortAlphaNum } = require('../../system/helpers/ArrayHelpers');
class ChatService extends Service {

    constructor( model, userserviceDependency ) {
        super( model );
        this.userService = userserviceDependency;
        autoBind( this );
    }


    // initiate a chat room
    async initiateRoom( senderDoc, reciverId ) {
        console.log('reached');
        const possibleMapKeys = [ `${reciverId.toString()}`, `${senderDoc['_id'].toString()}`]
        const mapKey = possibleMapKeys.sort(sortAlphaNum).reduce( (accumalator,currentValue) => accumalator += currentValue,'');
        const mapQuery = {};


        const reciverDoc = await this.userService.getImagePopulated( reciverId );
        const usersForChatModel = [ { 'user_id': senderDoc['_id'], 'adresse':senderDoc['adresse_line_1'],'profile_pic': senderDoc.prof_pic.filename,'unseen_messages_count': 0, 'user_name': senderDoc[ 'last_name' ] + ' ' + senderDoc[ 'name' ] }, { 'user_id': reciverDoc['_id'], 'profile_pic':reciverDoc.prof_pic.filename, 'adresse':reciverDoc['adresse_line_1'],'unseen_messages_count': 0, 'user_name': reciverDoc[ 'name' ] + ' ' + reciverDoc[ 'last_name' ] } ];
        usersForChatModel['map_key'] = mapKey;
        
        try{
            const chatRoomDoc = await super.insert( {'map_key':mapKey, 'users': usersForChatModel } );
            const userChatRoomData = { 'users': usersForChatModel.map( element => element[ 'user_id' ] ), 'room_id': chatRoomDoc[ '_id' ] };

            mapQuery[`chat_rooms_map.${mapKey}`] = { '$exists':false };
            
            this.userService.update( senderDoc[ '_id' ],{ [`chat_rooms_map.${mapKey}`]: userChatRoomData } ,mapQuery );
            this.userService.update( reciverDoc[ '_id' ],{ [`chat_rooms_map.${mapKey}`]: userChatRoomData } ,mapQuery );
            
            return chatRoomDoc[ '_id' ].toString();
        }catch(error){
            return await this.model.find({'map_key':mapKey});
        }
    }

    // check if a chat room is aleardy initiated
    async isChatRoomInitiated( userDoc, reciverId ) {
        const possibleMapKeys = [ `${reciverId.toString()}`, `${userDoc['_id'].toString()}`]
        const mapKey = possibleMapKeys.sort(sortAlphaNum).reduce( (accumalator,currentValue) => accumalator += currentValue,'');
        const roomDocs = await this.model.find({'map_key':mapKey});
        const roomDoc = roomDocs.length > 0 ? roomDocs[0] : null;
        if(roomDoc){
            return roomDoc[ '_id' ].toString();
        }else{
            return null;
        }

    }


    
    async sendMessageToChatRoom( senderId, reciverId, roomId, messageBody ) {
        const newMessage = { 'from': senderId, 'to': reciverId, 'message': messageBody.content, 'message_type': messageBody.type, 'date': Date.now() };
        const reciverUserDoc = await this.userService.findById( reciverId );
        const roomIdObject = mongoose.Types.ObjectId( roomId );
        const senderUserDoc = await this.userService.findById( senderId );
        const item = await this.model.findByIdAndUpdate(
            roomIdObject,
            {
                '$push': {
                    'unseen_messages': newMessage
                },
                '$inc': {
                    'users.$[element].unseen_messages_count': 1
                }
            },
            
              {
                'arrayFilters': [
                {
                    'element.user_id': reciverId
                }
                ],
                'new': true
              },
              
              ).lean().exec();
        
        
        // emet event to user that are listining to the chat room
        global.io.to( 'user_chat_room_' + roomId ).emit( 'new_chat_message', newMessage );
        
        const reciverocketLastMessageData = this.extractRoomLastMessageData( reciverUserDoc, item );
        const senderSocketLastMessageData = this.extractRoomLastMessageData( senderUserDoc, item );

        global.io.to( 'user_chat_rooms' + reciverId ).emit( 'conversation_update', { 'room_id': roomId, ...reciverocketLastMessageData } );
        global.io.to( 'user_chat_rooms' + senderId ).emit( 'conversation_update', { 'room_id': roomId, ...senderSocketLastMessageData } );

        return item;

    }
    async getAllConversations( userDoc )

    {
        const roomsIds = userDoc[ 'chat_room' ].map( room => mongoose.Types.ObjectId( room[ 'room_id' ] ) ) ;
        const roomsData = await this.model.find( { '_id': { '$in': [ roomsIds ] } } ).sort( { 'updated_At': -1 } ).exec();

        const responseData = [];

        roomsData.forEach( ( room ) => {
            const senderData = room.users[ 0 ][ 'user_id' ] != userDoc[ '_id' ].toString() ? room.users[ 0 ] : room.users[ 1 ];
            const lastMessageData = extractRoomLastMessageData( userDoc, room );

            responseData.push( { 'senderData': senderData, ...lastMessageData } );
        }
        );

        return responseData;
    }

    extractRoomLastMessageData( userDoc, room ) {
        const lastMessage = room[ 'unseen_messages' ] == [] ? room[ 'seen_messages' ].pop() : room[ 'unseen_messages' ].pop();
        const unseenCount = room.users[ 0 ][ 'user_id' ] == userDoc[ '_id' ].toString() ? room.users[ 0 ][ 'unseen_messages_count' ] : room.users[ 1 ][ 'unseen_messages_count' ];
        
        return { 'lastMessage': lastMessage, 'unseenCount': unseenCount };
    }




}

const chatService = new ChatService( Chat, userService );

module.exports = { ChatService, chatService };
