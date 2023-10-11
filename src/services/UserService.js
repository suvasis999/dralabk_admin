'use strict';
/* eslint-disable */

const { Service } = require( '../../system/services/Service' );
const autoBind = require( 'auto-bind' );

const { courseService } = require( '../services/CourseService' );
const { User } = require( '../models/User' );

const { acitvationMailData, forgetPasswordMailData } = require( '../../system/mails/emails' );
const { mailer } = require( '../../system/helpers/mailers' );
const { HttpError } = require( '../../system/helpers/HttpError' );
const { courseProgressStatsService } = require( './StatsService' );
const { getDayStartEnd, getPreviousDay, dayMonthYear } = require( '../../system/helpers/Date' );

const checkProgress = ( section ) => {
    const returnValue = section.contents.every(
        ( content ) => {
            return content.isDone;
        }
    );

    return returnValue;
};

const unlockingNextStepOnProgress = ( progress ) => {
    // go through sections making them available and stop the moment you find someone that his content is not done.
    

    for ( const section of progress[ 'content_progress_track' ] ) {


        // set non empety content to isAvalable and return
        if( !checkProgress( section ) ) {
            section.isAvailable = true;

            if( progress[ 'is_eligible_for_certificate' ] == false ) {
                
                progress[ 'is_eligible_for_quiz' ] = false;

            }
            
            return;
        }

        section.isAvailable = true;
        
    }

    progress[ 'is_eligible_for_quiz' ] = true;
    return;
};


class UserService extends Service {
    constructor( model, courseServiceDependency, CourseProgressStatsServiceDependency ) {
        super( model );
        this.courseProgressStatsService = CourseProgressStatsServiceDependency;
        this.courseService = courseServiceDependency;
        autoBind( this );
    }

    async get( id, query = {} ) {
        try {
            let { projection, search } = query;

            search = search ? search : {};

            projection = projection ? projection : {};
            const item = await this.model.findById( { '_id': id, ...search }, projection ).populate('prof_pic', 'filename');

            if ( !item ) {
                const error = new Error( 'Item not found' );

                error.statusCode = 404;
                throw error;
            }

            return item;
        } catch ( errors ) {
            throw errors;
        }
    }
    
    async userConnect( userId ) {
        console.log( 'userConnected' );

        this.model.findByIdAndUpdate( userId, {'status':true,'last_logout_date':null } );
    }

    async userDisconnect( userId ) {
        console.log( 'userDisconnected' );
        this.model.findByIdAndUpdate( userId, {'status':false,'last_logout_date': Date.now() } );
    }



    // get instructor enrolled pass query direcly, prepare query in the controller
    async getEnrolledUsersForInstructor( instructorId, query ) {
        try {
            // fields to order by courseName price last_name email role status role last_login
            const response = await this.courseProgressStatsService.getAll( { ...query, '$and': [ { 'owner': instructorId }, { 'status': 'ON_GOING' } ] } );

            return response;

        }catch( error ) {
            console.log( error );
        }

    }

    async getAllForChatList(query){
        let { skip, limit, sortBy, projection } = query;

        skip = skip ? Number( skip ) : 0;
        limit = limit ? Number( limit ) : 0;
        sortBy = sortBy ? sortBy : { 'createdAt': -1 };
        projection = projection ? projection : {};


        delete query.projection;
        delete query.skip;
        delete query.limit;
        delete query.sortBy;



        try {
            const items = await this.model
                    .find( query, projection )
                    .sort( sortBy )
                    .populate('image');
            return items;
        } catch ( errors ) {
            throw errors;
        }
    }
    
    async update( id, data, query ) {
        try {
            if(!query){query = {}};
            const item = await this.model.findOneAndUpdate( {'_id': id,...query}, data, { 'new': true, '$set': 'update', 'runValidators': true } );

            return item;
                            
        } catch ( errors ) {
            throw errors;
        }
    }

    async verifiyCourseEligibility( userDoc, courseDoc ) {
        const undonePrerequisites = await this.checkCoursePreRequisites( courseDoc, userDoc );

        try {

            if( undonePrerequisites.length != 0 ) {
                return false;
            }

            return true;
        }catch ( error ) {
            throw error;
        }

    }

    async updatePassword( id, data ) {
        try {
            await this.model.findByIdAndUpdate( id, data, { 'new': true } );
            return { 'passwordChanged': true };
        } catch ( errors ) {
            throw errors;
        }
    }

    async findByEmail( email, includePassword = false ) {
        return includePassword ? this.model.findOne( { email: email } ).select( '+password' ) : this.model.findOne( { email: email } );
    }

    async findById( id, includePassword = false ) {
        return includePassword ? this.model.findById( id ).select( '+password' ) : this.model.findById( id );
    }
    
    async findByIdOnlyIncludedFields( id, include ) {
        if ( include != '' ) {
            const resp = await this.model.findById( id ).select( include ).lean().exec();

            delete resp[ '_id' ];

            return resp;
        }
    }


    // it filtre course progress based
    async checkCoursePreRequisites( courseDoc, userDoc ) {

        const preRequisites = courseDoc[ 'pre_requisites' ] ? courseDoc[ 'pre_requisites' ].map( preRequisite => preRequisite.course_id ) : undefined;
        const userProgress = userDoc[ 'progress_array' ];

        if( preRequisites === undefined ) {
            return [];
        }
        return preRequisites.filter( ( preRequisite ) => !( userProgress.findIndex( ( courseProgress ) => ( courseProgress.course.toString() === preRequisite && courseProgress[ 'is_eligible_for_certificate' ] === true ) ) == -1 ) );
        
    }


    // initialize progress and synchronize it when there is a change
    async syncronizeCourseInfo( userId, courseId ) {

        const user = await this.findById( userId );
        const courseDoc = await this.courseService.findById( courseId );
        
        // same course progress id
        const userProgressArrayInedx = user[ 'progress_array' ].findIndex( ( courseProgress ) => courseProgress.course == courseId );

        
        // user progress
        const userCourseProgressObject = user[ 'progress_array' ][ userProgressArrayInedx ];

        const doneContents = new Map();
          
        userCourseProgressObject.content_progress_track.forEach( ( section ) => {
            section.contents.forEach( ( content ) => doneContents.set( content.content_id.toString(), content.isDone ) );
        }
        );

        const contentProgressTrack = [];

        courseDoc.sections.forEach( ( section, index ) => {

            const tempSectionObject = { 'section_id': section[ '_id' ], 'title': section[ 'title' ], 'isAvailable': index === 0, 'isCompleted': false, 'contents': [] };

            section.contents.forEach( content => {
                const tempContentObject = { 'content_id': content[ '_id' ], 'title': content[ 'title' ], 'isDone': false };

                const coresspendingContentIsDoneValue = doneContents.get( content[ '_id' ].toString() );

                if( coresspendingContentIsDoneValue ) {
                    tempContentObject.isDone = coresspendingContentIsDoneValue;
                };

                tempSectionObject.contents.push( tempContentObject );
            }
            );
            contentProgressTrack.push( tempSectionObject );
        }
        );

        userCourseProgressObject[ 'content_progress_track' ] = contentProgressTrack;
        userCourseProgressObject[ 'name' ] = courseDoc[ 'name' ];
        userCourseProgressObject[ 'description' ] = courseDoc[ 'description' ] ;
        userCourseProgressObject[ 'pictures' ] = courseDoc[ 'pictures' ];
        userCourseProgressObject[ 'quiz' ] = courseDoc[ 'quiz' ];


        unlockingNextStepOnProgress( userCourseProgressObject );

        
        user.markModified( 'progress_array' );
        await user.save();
        return( { 'isUpdated': true } );

    }


    async getProgress( userId, courseId ) {

        await this.syncronizeCourseInfo( userId, courseId );


        const user = await this.findById( userId );
        const userProgressArrayInedx = user[ 'progress_array' ].findIndex( courseProgress => courseProgress.course == courseId );
        const courseProgress = user[ 'progress_array' ][ userProgressArrayInedx ];
        
        try {
            
            return courseProgress;
        }catch( error ) {
            throw error;
        }
    }

    async addProgress( userId, courseId, sectionId, contentDoneId ) {

        await this.syncronizeCourseInfo( userId, courseId );

        const user = await this.findById( userId );
        const userProgressArrayInedx = user[ 'progress_array' ].findIndex( courseProgress => courseProgress.course == courseId );
        const courseProgress = user[ 'progress_array' ][ userProgressArrayInedx ];

        // check if the user have this course first
        if( courseProgress != undefined ) {

            
            const targetSection = courseProgress.content_progress_track.find( ( section ) => section[ 'section_id' ].toString() == sectionId.toString() );

            if( targetSection == undefined ) {
                const error = new HttpError( 'No section is found' );

                error.statusCode = 404;
                throw error;
            }

            // target section should be available.
            if( targetSection.isAvailable == false ) {
                const error = new HttpError( ' You can access this section yet ' );

                error.statusCode = 409;
                throw error;
            }

            const doneElement = targetSection.contents.find( content => content[ 'content_id' ] == contentDoneId );

            if( doneElement == undefined ) {
                const error = new HttpError( 'No content is found' );

                error.statusCode = 404;
                throw error;
            }

            if( doneElement.isDone == true ) {
                return courseProgress;
            }

            doneElement.isDone = true;


            // checks if the section is done
            if( checkProgress( targetSection ) ) {
                unlockingNextStepOnProgress( courseProgress );
            }

            await this.model.addProgress( user, courseProgress, userProgressArrayInedx );

            return courseProgress;
        }
        
    };

    async addMessage( senderId, reciverId, message ) {

        const reciverUserDoc = this.findById( reciverId );
        
        this.model.addMessage( senderId, reciverUserDoc, message );
    }

    async getUsersAllRooms( userId ) {
        return await this.model.getAllRooms( userId );
    }

    async getAccoumplishments( userId, courseId ) {


        await this.syncronizeCourseInfo( userId, courseId );

        const user = await this.findById( userId );
        const course = await this.courseService.get( courseId );
        const userProgressArrayInedx = user[ 'progress_array' ].findIndex( courseProgress => courseProgress.course == courseId );
        const courseProgress = user[ 'progress_array' ][ userProgressArrayInedx ];
        
        try{
            if( !courseProgress ) {
                const error = new HttpError( 'User did not parchause the course' );

                error.statusCode = 409;
                throw error;
            }

            if ( !courseProgress[ 'is_eligible_for_certificate' ] ) {
                const error = new HttpError( 'User did not finish the quiz ' );
                
                error.statusCode = 409;
                throw error;
                
            }
            const response = { 'accoumplishments': course.accoumplishments, 'name': user.name, 'lastName': user.last_name, 'middleName': user.middle_name, 'spirtual_name': user.spirtual_name, 'completionDate': courseProgress.completion_date };
            
            return response;
        }catch( error ) {
            throw error;
        }
    }


    async generateActivationCode( userDoc ) {
        try {

        if( (userDoc[ 'account_status' ] == 'active' || userDoc[ 'account_status' ] == 'completed') && userDoc['new_email'].length == 0 ) {
            const error = new Error( 'this user account is already activated' );
            error.statusCode = 409;
            throw error;
        }

        if( userDoc[ 'activation_token' ] [ 'generated_date' ] ) {
            const generatedTimeCounter = Date.now() - userDoc['activation_token']['generated_date'];

            if( generatedTimeCounter < ( 120 * 1000 ) ) {
                return { 'generatedTimeCounter': 120 - ( generatedTimeCounter / ( 1000 ) ) };
            }
        }

        await this.model.generateToken(userDoc, 'activation_token' );

        const isDone = await mailer.sendMail(acitvationMailData(userDoc['email'],userDoc['activation_token']['token']));

        if( !isDone ) {
            const error = new Error( 'Mailer is not available' );
            error.statusCode = 409;
            throw error;
        }
        await userDoc.save();
        return { 'generatedTimeCounter': 120 };
        
        }catch( errors ) {
            throw errors;
        }

       
    }

    async activateAccount( userDoc, token ) {
        const expirationDate = Date.now() - userDoc[ 'activation_token' ][ 'generated_date'];


        if( (userDoc[ 'account_status' ] == 'active' || userDoc[ 'account_status' ] == 'completed') && userDoc['new_email'].length == 0 ) {
            const error = new Error( 'this user account is already activated' );

            error.statusCode = 409;
            throw error;
        }
        if( expirationDate > ( 1000 * 60 ) * 2 ) {
            const error = new Error( 'Token has been expired' );

            error.statusCode = 409;
            throw error;
        }
        if( userDoc[ 'activation_token' ][ 'token' ].length == 0  && userDoc[ 'activation_token' ][ 'token' ] != token || userDoc[ 'activation_token' ][ 'token' ] == '' ) {
            const error = new Error( 'Token is not correct' );
            
            error.statusCode = 409;
            throw error;
        }
        
            
            if( token && userDoc[ 'activation_token' ][ 'token' ] == token ) {
            if(userDoc['new_email'].length > 0 ){
                userDoc['new_email'] = '';
                await userDoc.save();
                return 'finished';
            }
                userDoc[ 'activation_token' ] = undefined;
                userDoc[ 'account_status' ] = 'active';
                userDoc['new_email']
                await userDoc.save();
            }
            
        return userDoc[ 'account_status' ];
    }

    async generatePasswordToken( email ) {

        let token;
        const userDoc = await this.model.findOne({'email':email});
        if(userDoc){
            token = await this.model.generatePasswordToken(userDoc);
           
        }else{
            const error = new HttpError('Invalid email');

            error.statusCode = 422;
            throw error;
        }

        const mailData = {from: '"SOTNAC Admin" <admin@spiritoftruthnativeamericanchurch.org>',// sender address
        to: userDoc['email'],   // list of receivers
        subject: 'password reset mail for SOTNAC',
        text: 'this is a one time use password',
        html: `<b> Your temporary password to the Spirit of Truth NAC website is: ${ token } </b>`
    
        };

        const isDone = await mailer.sendMail( mailData );

        if(isDone){
            return 'email is generated';
        }else{
            throw new HttpError('Mailer is not working');
        }
        
    }

    async sendContactEmail( message, phoneNumber, email, subject, name ) {
                
        const mailData = {from: 'admin@spiritoftruthnativeamericanchurch.org',
        to: 'admin@spiritoftruthnativeamericanchurch.org', 
        subject: subject,
        text: 'Client message',
        html: 
        `
        <p> Client phone: ${phoneNumber} </p>
        <p> Client name: ${name} </p>
	<p> Client email: ${email}
        <p> Message: ${message} </p>
        `
        };

        const isDone = await mailer.sendMail( mailData );

        if(isDone){
            return 'email is generated';
        }else{
            throw new HttpError('Mailer is not working');
        }
        
    }

    async setNewPassword( userDoc, token, newPassword ) {
        if( Date.now() - userDoc[ 'password_token' ][ 'generated_date' ] < ( 1000 * 60 ) * 2 ) {
            if( userDoc[ 'password_token' ][ 'token' ] == token ) {
                userDoc[ 'password_token' ] = undefined;
                userDoc[ 'passsword' ] = newPassword;
                await userDoc.save();
            }
        }
    }

    
    async insertCourseToUser( userId, courseId ) {
        try {


            const courseDoc = await this.courseService.get( courseId );
            const userDoc = await this.get( userId );

            
            await courseDoc[ 'on_going_users' ].set( userId.toString(), true );

            await courseDoc.save();

            await this.courseProgressStatsService.insert( { 'amount': courseDoc[ 'price' ], 'owner': courseDoc[ 'owner_id' ].toString(), 'course': courseDoc[ '_id' ].toString(), 'learner': userId.toString(), 'status': 'ON_GOING' } );

            return await this.model.buyCourse( userDoc, courseDoc );

        }catch( error ) {
            throw error;
        }
    }


    async getImagePopulated( userId ) {
        try {
            let { projection, search } = {};

            search = search ? search : {};

            projection = projection ? projection : {};
            const item = await this.model.findById( { '_id': userId, ...search }, projection ).populate('prof_pic');

            if ( !item ) {
                const error = new Error( 'Item not found' );

                error.statusCode = 404;
                throw error;
            }

            return item;
        } catch ( errors ) {
            throw errors;
        }
    }
}

const userService = new UserService( User, courseService, courseProgressStatsService );

module.exports = { UserService, userService };

