'use strict';
const { HttpResponse } = require( '../../system/helpers/HttpResponse' );
const { Service } = require( '../../system/services/Service' );
const { userService } = require( './UserService' );
const { mediaService } = require( '../services/MediaService' );

const { Change } = require( '../models/Change' );
const { UserTemp } = require( '../models/TempUser' );
const { PROPS_FOR_USER_CHANGE_REQUEST } = require( './CONSTANTS/ChangeServiceMagicConstants' );
const { notificationController } = require('../controllers/Notifications');

const markChanges = ( a, b, includes ) => {
    for( let key of includes ) {
        if( key != "_id" /*&& !Array.isArray(b[key])*/ ) {
            if( JSON.stringify(b[ key ]) != JSON.stringify(a[ key ]) ) {
                b[key] = {"new": b[ key ], "old": a[ key ], "isModified": true }
            }else if( !b[ key ] ) {
                b[ key ] = a[ key ];
            }
        }
    }
}

const userMarkChanges = ( a, b, includes ) => {
    for( let key of includes ) {
        if( key != "_id" /*&& !Array.isArray(b[key])*/ ) {
            if( b[ key ] != a[ key ] && b[ key ] ) {
                b[ key ] = { 'new': b[ key ], 'old': a[ key ], 'isModified': true };
            }else if( !b[ key ] ) {
                b[ key ] = a[ key ];
            }
        }
    }
}

class ChangeService extends Service {


    constructor( model, userServiceDependency, mediaServiceDependency, userTempModelDependency ) {
        super( model );
        this.userTemp = userTempModelDependency;
        this.mediaService = mediaServiceDependency;
        this.userService = userServiceDependency;
    }


    async changeCourseProprities( originalCourseDoc, modifiedCourseDoc ) {
        modifiedCourseDoc[ 'isChangeBlocked' ] = true;
        await modifiedCourseDoc.save();

        const originalDocToObject = originalCourseDoc.toObject( { 'getters': true } );
        const modifiedDocToObject = modifiedCourseDoc.toObject( { 'getters': true } );

        this.detectChangeOnObject( originalDocToObject, modifiedDocToObject );

        const item = await this.insert( { 'object_id': originalCourseDoc[ 'id' ].toString(), 'owner_id': originalCourseDoc[ 'owner_id' ], 'old_values': originalCourseDoc, 'new_values': modifiedDocToObject, 'object_type': 'course' } );
        return item;    
    }

    
    insertRemovedItems( removedFromObject, targetInsertionObject, removedIndexes ) {
        removedIndexes.forEach(removedItem => {
        removedFromObject[removedItem].operation = "deleted"
        targetInsertionObject.splice(removedItem, 0, removedFromObject[removedItem]);
    })
    
    }
    
    detectChangeOnObject( oldObject, newObject ) {
        markChanges( oldObject, newObject,["pictures","name","category","description","price", "pre_requisites"])
        this.detectChangeOnSection(oldObject.sections,newObject.sections)
    }
    
    detectChangeOnSection(oldSections,newSections) {
        let removedItemsIndexes = Array.from( Array( oldSections.length ).keys());

        newSections.forEach( (newSection) => {
        for(let i = 0; i<oldSections.length; ++i) {
            let oldSection = oldSections[i]
            
            if(oldSection._id.toString() == newSection._id.toString()) {
                removedItemsIndexes[i] = null
                if(JSON.stringify(oldSection) == JSON.stringify(newSection)){
                    newSection.operation = "unmodified"
                    break;
                }else{
                    newSection.operation = "modified"
                    markChanges( oldSection, newSection, [ "title" ] );
                    this.detectChangeOnContent( oldSection.contents || [], newSection.contents || [] )
                    break;
                }
            
            }
            
        }
        
        if( !newSection.operation ) {
            newSection.operation = "added"
        }
       
    
    })
    this.insertRemovedItems( oldSections, newSections, removedItemsIndexes.filter( element => element != null ) );
    
    }
    
    detectChangeOnContent( oldContents, newContents ) {
                    let removedCotnetnIndexes = Array.from(Array(oldContents.length).keys())
                    newContents.forEach( (newContent) => {
                        newContent.operation = "added"
                        for(let j=0; j < oldContents.length; ++j){
                            let oldContent = oldContents[j];
                          
                            if( newContent._id.toString() == oldContent._id.toString() ){
                                removedCotnetnIndexes[j] = null
                                if(JSON.stringify(oldContent) == JSON.stringify(newContent))
                                {
                                    newContent.operation = "unmodified"
                                    break;
                                }
                                else
                                {
                                    newContent.operation = "modified"
                                    markChanges(oldContent,newContent,["title", "type", "content"])
                                    break;
                                }
                            }
                            
                        }
                         if(!newContent.operation) {
                            newContent.operation = "added"
                            }
                        
                    })
    
                    this.insertRemovedItems( oldContents, newContents, removedCotnetnIndexes.filter( element => element != null))
    
                    
    }

    async approveCourseEditRequest( originalDoc, newDoc ) {

        if( newDoc.pictures[0]._id.toString() != originalDoc.pictures[0]._id.toString()){
        mediaService.unLinkImage( originalDoc['pictures'][0] );
        }
        
        await originalDoc.delete();
        await newDoc.delete();

        newDoc._id = originalDoc._id;
        newDoc.accoumplishments = originalDoc.accoumplishments;
        newDoc.quiz = originalDoc.quiz;

        newDoc.isTemp = false;
        newDoc.isLive = true;
        newDoc.isChangeBlocked = false;
        newDoc[ 'temp_object_for_change' ] = null;
        newDoc.isNew = true;

        await newDoc.save();

        return newDoc;

    }

    async disapproveCourseEditRequest( originalDoc, newDoc ) {

        
        originalDoc.isTemp = false;
        originalDoc.isLive = true;
        originalDoc.isChangeBlocked = false;
        originalDoc[ 'temp_object_for_change' ] = null;

        if( newDoc.pictures[0]._id.toString() != originalDoc.pictures[0]._id.toString()){
            mediaService.unLinkImage( newDoc['pictures'][0] );
            }


        await newDoc.delete();
        await originalDoc.save();

        return originalDoc;

    }

    async getCourseChangesForView( courseId ) {
        try {

            const query = { 'courseId': courseId };

            const response = await this.getAll( query );

            return response.status( 200 ).json( new HttpResponse( response ) );

        }catch( error ) {
            console.log( error );
        }
    }

    async getAll( query ) {

        let { skip, limit, sortBy, projection } = query;

        skip = skip ? Number( skip ) : 0;
        limit = limit ? Number( limit ) : 0;
        sortBy = sortBy ? sortBy : { 'createdAt': -1 };
        projection = projection ? projection : {};


        delete query.projection;
        delete query.skip;
        delete query.limit;
        delete query.sortBy;


        if ( query._id ) {
            try {
                query._id = new mongoose.mongo.ObjectId( query._id );
            } catch ( error ) {
                throw new Error( 'Not able to generate mongoose id with content' );
            }
        }

        try {
            const items = await this.model
                    .find( query, projection )
                    .populate( 'author', 'email name last_name' )
                    .sort( sortBy )
                    .skip( skip )
                    .limit( limit ),
                total = await this.model.countDocuments( query );

            return { 'items': items, 'totalCount': total };
        } catch ( errors ) {
            throw errors;
        }
    }


    async changeUserProprities( id, newData, type, compareAgainst ) {

        const userDoc = await this.userService.get( id, compareAgainst );
        const newTempUser = new this.userTemp();

        if ( userDoc.role == 'admin' ) {
          


            for( const path of compareAgainst ) {
                if( newData[ path ] ) {
                    userDoc[ path ] = newData[ path ];
                }
            }

            await userDoc.save();
            if( newData.image ) {
                this.mediaService.linkImage( newData.image );
                this.mediaService.unLinkImage( userDoc.image )
            }

            return userDoc;
        }

        if( newData.image ) {
            this.mediaService.linkImage( newData.image );
        }

        for( const path of compareAgainst ) {
            if( newData[ path ] ) {
                newTempUser[ path ] = newData[ path ];
            }else{
                newTempUser[ path ] = userDoc[ path ];
            }
        }

        userDoc[ 'temp_object' ] = newTempUser._doc._id;
        await userDoc.save();

        await newTempUser.save();
        userMarkChanges( userDoc, newData, compareAgainst );
        
        const item = await this.insert( { 'object_id': id.toString(), 'old_values': userDoc, 'new_values': newData, 'object_type': 'user' } );

        return item;
    }

    /* approving scenario
        => Update user object with new values.
        => unlink old image
        => delete object
    */
    async approveUserChangeRequest( originalDocId ) {
        const originalUserDoc = await this.userService.get( originalDocId );
        const tempUserDoc = await this.userTemp.findById( originalUserDoc[ 'temp_object' ] );

        if(tempUserDoc['email'] != originalUserDoc['email']){
            originalUserDoc['new_email'] = tempUserDoc['email'];
        }
        for( const path of PROPS_FOR_USER_CHANGE_REQUEST ) {
            if( tempUserDoc[ path ] ) {
                originalUserDoc[ path ] = tempUserDoc[ path ];
            }
        }

        if( tempUserDoc.image.toString() != originalUserDoc.image.toString() ) {
            this.mediaService.unLinkImage( originalUserDoc.image );
        }

        originalUserDoc[ 'temp_object' ] = null;

        await tempUserDoc.delete();
        await originalUserDoc.save();
        notificationController.insertProfileChangesRequstNotification(originalUserDoc['_id'].toString(),true);

        return originalUserDoc;
    }

    // const changeRequestDoc = this.get( requestId );


    async disApproveUserChangeRequest( originalDocId ) {

        const originalUserDoc = await this.userService.get( originalDocId );
        const tempUserDoc = await this.userTemp.findById( originalUserDoc[ 'temp_object' ] );

        
        if( tempUserDoc.image.toString() != originalUserDoc.image.toString() ) {
            await this.mediaService.unLinkImage( tempUserDoc.image );
        }

        originalUserDoc[ 'temp_object' ] = null;

        await tempUserDoc.delete();
        await originalUserDoc.save();
        notificationController.insertProfileChangesRequstNotification(originalUserDoc['_id'].toString(),false);

        return originalUserDoc;
    }


}

const changeService = new ChangeService( Change, userService, mediaService, UserTemp );

module.exports = { ChangeService, changeService };
