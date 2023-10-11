const { changeService } = require( './../services/ChangeService' );
const { Controller } = require( '../../system/controllers/Controller');
const { courseService } = require('../services/CourseService');
const { HttpResponse } = require('../../system/helpers/HttpResponse');
const autoBind = require( 'auto-bind' );
const { PROPS_FOR_USER_CHANGE_REQUEST } = require( '../services/CONSTANTS/ChangeServiceMagicConstants' );
const { HttpError } = require('../../system/helpers/HttpError');
const { notificationController } = require('./Notifications');
const { userService } = require('./ChatController');
const { UserTemp } = require('../models/TempUser');


class ChangeController extends Controller {

    constructor( service, courseServiceDependency, mediaServiceDependecy ) {
        super( service );
        this.mediaService = mediaServiceDependecy;
        this.courseService = courseServiceDependency;
        autoBind( this );
    }


    // approving courses edit
    async approveCourseEditRequest( req, res, next ) {
       
        try {
            const changeRequest = await this.service.get( req.params.requestId );
            const newCourseDoc = await this.courseService.get( changeRequest[ 'old_values' ][ 'temp_object_for_change' ] );
            const oldDoc = await this.courseService.get( changeRequest[ 'object_id' ] );
            const newDoc = await this.service.approveCourseEditRequest( oldDoc, newCourseDoc );

            await this.service.delete( req.params.requestId );
            
            const response = await this.courseService.insert( newDoc );
            notificationController.insertCoursesChangedForUserNotification(response._id.toString());
            notificationController.insertCourseChangeRequestNotificationForInstructor(response._id.toString(),true);
            res.status( 200 ).json( new HttpResponse( response ) );

        }catch( errors ) {
            console.log( errors );
        }
    }
    
    // disapproving courses edit
    async disapproveCourseEditRequest( req, res, next ) {
       
        try {

            const changeRequest = await this.service.get( req.params.requestId );
            
            const newCourseDoc = await this.courseService.get( changeRequest[ 'old_values' ][ 'temp_object_for_change' ] );
            const oldDoc = await this.courseService.get( changeRequest[ 'object_id' ] );

            const newDoc = await this.service.disapproveCourseEditRequest( oldDoc, newCourseDoc );

            notificationController.insertCourseChangeRequestNotificationForInstructor(newDoc['_id'].toString(),false);
            this.service.delete( req.params.requestId );
            
            res.status( 200 ).json( new HttpResponse( newDoc ) );

        }catch( erros ) {
            console.log( erros );
        }
    }

    // getting all courses edit
    async getCoursesChangeRequest( req, res, next ) {
            
        try{
            const response = await this.service.getAll( { ...req.mongooseParsedQueries.pagination,'sortBy': { ...req.mongooseParsedQueries.sortBy } , 'object_type': 'course', 'projection': { 'createdAt':1, 'new_values': 1, 'object_id': 1, 'owner_id': 1, 'old_values': 1 } } );

            res.status( 200 ).json( new HttpResponse(response.items, {'totalCount':response.totalCount} ));
        }catch( error ) {
            
            next( error );
        }

    }


    // getting courses edit view
    async getCourseChangesForView( req, res, next ) {
        try{
            
            const requrestId = req.params.courseId;
            const response = await this.service.getBy( {'search': {'_id': requrestId}, 'projection': { 'new_values': 1 } } );

            res.status( 200 ).json( new HttpResponse( response ));
        }catch( error ) {
            next( error );
        }
    }

    // getting all users request changes
    async getUserChangeRequest( req, res, next ) {
        try{
            const query = { ...req.mongooseParsedQueries.pagination,'sortBy': { ...req.mongooseParsedQueries.sortBy } } ;

            const response = await this.service.getAll( {  ...query, 'object_type': 'user', 'projection': { 'createdAt':1, 'new_values': 1, 'object_id': 1, 'owner_id': 1, 'old_values': 1 } } );

            res.status( 200 ).json( new HttpResponse( response.items, {'totalCount': response.totalCount }));
        }catch( error ) {
            
            next( error );
        }
    }
    //
    async changeUserProprities( req, res, next ) {
        try{
            const userId = req.user[ '_id' ];
            if( req.body.email ) {

                const userDoc = await userService.model.findOne( {'$and': [ {'_id': { '$ne':userId} }, {'$or':[ {'new_email':req.body.email},  {'email':req.body.email}]}]});

                if(userDoc ){
                    const error = new HttpError('This email is already used');

                    error.statusCode = 422;
                    throw error;
                }
                const userTempDoc = await UserTemp.findOne( {'email':req.body.email});

                if(userTempDoc){
                    const error = new HttpError('Someone else requested a change with the same email');

                    error.statusCode = 422;
                    throw error;
                }
            }

            if( req.user[ 'temp_object' ] ) {
                const error = new HttpError('A change is already requested');

                error.statusCode = 409;
                throw error;
            }


            const data = req.body;
            const finalData = {}
            const props = [ 'name', 'last_name', 'email','image', 'sex', 'image', 'birth_date', 'adresse_line_1', 'state', 'city', 'zip_code', 'country', 'phone_number' ];
            const OptionaProps = [ 'password', 'spirtual_name', 'middle_name', 'dralla_wallet_adress', 'adresse_line_2' ];
            
            for ( const prop of OptionaProps ) {
                if( data[ prop ] ) {
                    
                    if( ( data[ prop ] ) != '' ) {
                        finalData[ prop ] = data[ prop ];
                    }
                    
                }
                
            }
            for ( const prop of props ) {
                if( ( data[ prop ] == undefined || data[ prop ] == null || data[ prop ] ) == '' ) {
                    delete data[ prop ];

                    const error = new Error( 'Bad request' );
                    
                    error.statusCode = 400;
                    throw error;

                }else{
                    finalData[ prop ] = data[ prop ];
                }
            }


                const prop = PROPS_FOR_USER_CHANGE_REQUEST;

                for ( const k in finalData ) {
                    if ( prop.indexOf( k ) < 0) {
                        delete finalData[ k ];
                    }
                }


                const response = await this.service.changeUserProprities( userId, finalData, 'user', prop );
                res.status( 200 ).json( new HttpResponse( response ) );
                notificationController.insertProfileChangeForAdmin(userId,response['_id'].toString());

        }catch( error ) {
            console.log(error)
            next( error );
        }
    }


    // approving user change request
    async approveUserChangeRequest( req, res, next ) {

        try {

            const changeRequest = await this.service.get( req.params.requestId );

            const newDoc = await this.service.approveUserChangeRequest( changeRequest[ 'object_id' ] );

            this.service.delete( req.params.requestId );
            

            res.status( 200 ).json( new HttpResponse( newDoc ) );

        }catch( errors ) {
            next( errors );
        }

    }
    
    // disaaprove user change request
    async disApproveUserChangeRequest( req, res, next ) {
        
        try {

            const changeRequest = await this.service.get( req.params.requestId );

            const newDoc = await this.service.disApproveUserChangeRequest( changeRequest[ 'object_id' ] );

            this.service.delete( req.params.requestId );
            

            res.status( 200 ).json( new HttpResponse( newDoc ) );

        }catch( errors ) {
            next( errors );
        }
    }

    async getUserChangesForView( req, res, next ) {
        try{
            
            const userId = req.params.userId;
            const response = await this.service.getBy( { 'search':{'object_id': userId}, 'projection': { 'new_values': 1 } } );

            res.status( 200 ).json( new HttpResponse( response ) );
        }catch( error ) {
            next( error );
        }
    }
}

module.exports = new ChangeController( changeService, courseService ) ;
