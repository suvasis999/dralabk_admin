/* eslint-disable no-continue */

const mongoose = require( 'mongoose' );
const { Controller } = require( '../../system/controllers/Controller' );
const { courseService } = require( './../services/CourseService' );
const { changeService } = require( './../services/ChangeService' );
const { categoryService } = require( './../services/CategoryService' );
const { HttpError } = require( '../../system/helpers/HttpError' );
const { HttpResponse } = require( '../../system/helpers/HttpResponse' );
const { mediaService } = require( '../services/MediaService')
const autoBind = require( 'auto-bind' );
const { userService } = require('../services/UserService');
const { notificationController } = require('./Notifications');
validateSections  = (courseDoc) => {
    const sections = courseDoc.sections;
    if(sections.length == 0 ) {
        const error = new HttpError('Course should have at least 1 section' );

        error.statusCode = 409;

        throw error;

    }

    for(const section of sections){
        if(section.contents.length == 0 ){
            const error = new HttpError('Section should have at least 1 content' );

            error.statusCode = 409;

            throw error;

        }
    }
}

const isUpcomming = ( ownedCoursesIds, courseDocToCheck ) => {
    const returnedValue = { 'isUpcomming': false, 'preRequisitesDone': [], 'preRequisitesUndone': [] }

    if( ownedCoursesIds.length == 0 ) {
        return returnedValue;
    }
    returnedValue.isUpcomming = ownedCoursesIds.every( ( id ) => {
        
        const indexOfPreRequisiteFound = courseDocToCheck[ 'pre_requisites' ].findIndex( ( preRequisite ) => preRequisite.course_id.toString() == id.toString() );
        
        if( indexOfPreRequisiteFound != -1 ) {
        
            courseDocToCheck[ 'pre_requisites' ][ indexOfPreRequisiteFound ] = courseDocToCheck['pre_requisites'][courseDocToCheck['pre_requisites'].length - 1]
            returnedValue.preRequisitesDone.push( courseDocToCheck[ 'pre_requisites' ].pop())

        }
        if( courseDocToCheck[ 'pre_requisites' ].length == 0 ) {
            return false;
        }
        return true;
    }
    );

    if( returnedValue.isUpcomming == true ) {
        returnedValue.preRequisitesUndone = courseDocToCheck[ 'pre_requisites' ];
    }

    return returnedValue;
};

const isFreeForYou = ( courseDocToCheck ) => {
    return courseDocToCheck.price == 0;
};

const isOwned = ( courseDocToCheck, ownedCoursesIds ) => {
    return ownedCoursesIds.includes( courseDocToCheck[ '_id' ].toString() );
};

const reduceCountingObject = ( object ) => {
    let sum = 0;

    for ( const key in object ) {
        sum += object[ key ];
    }

    return sum;

};

class CourseController extends Controller {


    constructor( service, changeServiceDependeency, categoryServiceDependency, userServiceDependency ) {
        super( service );
        this.changeService = changeServiceDependeency;
        this.categoryService = categoryServiceDependency;
        this.userService = userServiceDependency;
        autoBind( this );
    }

    
    // need mongoose thingy
    async getUserCreatedCourses( req, res, next ) {

    }


    async getAccoumplishments( req, res, next ) {
        const courseDoc = await this.service.get( req.params.courseId );
        const user = req.user;

        try{
            if( user.role != 'admin' && user._id.toString() != courseDoc['owner_id'] && courseDoc['completed_users'].get(user._id.toString()))
            if( !courseDoc ) {
                const error = new HttpError( 'Item not found: check course id' );
                
                error.statusCode = 404;
                throw( error );
            }

            const response = courseDoc.accoumplishments;

            if( !response ) {
                const error = new HttpError( 'Item not found: Course does not have any accomplishments' );
                
                error.statusCode = 404;
                throw( error );
            }
            res.status( 200 ).json( new HttpResponse( response ) );
        }catch( error ) {
            next( error );
        }
    }
    async setAccoumplishments( req, res, next ) {
        
        const courseDoc = await this.service.get( req.params.courseId );

        try{
            if( !courseDoc ) {
                const error = new HttpError( 'Item not found: check course id' );

                error.statusCode = 400;
                throw( error );
            }

            const accoumplishments = req.body;
            const certificate = accoumplishments.certificate || null;
            const letter = accoumplishments.letter || null;

            // check if there is certficate and letter
            if( !certificate && !letter ) {
                const error = new HttpError( 'Bad request: certifcate or letter are not specified on the body' );

                error.statusCode = 400;
                throw( error );
            }

            if( !certificate.title && !certificate.mainText && !certificate.firstParagrah && !certificate.secondParagraph ) {
                const error = new HttpError( 'Bad request: One of the certificate field is empty' );

                error.statusCode = 400;
                throw( error );

            }

            if( !letter.textEditor ) {
                const error = new HttpError( 'Bad request: One of the certificate field is empty' );

                error.statusCode = 400;
                throw( error );
            }

            courseDoc.accoumplishments = { certificate, letter };
            await courseDoc.save();
            res.status( 200 ).json( new HttpResponse( courseDoc ) );
        }catch( error ) {
            next( error );
        }
        
    }


    async generateCertificate( req, res, next ) {
        const courseDoc = await this.service.get(req.params.courseId);

        if( courseDoc ) {
            if( !courseDoc.accoumplishment.hasOwnProperty( 'certificate' ) ) {
            
            const certificiate = { 'introduction_text': "Write your introduction text here",
            'main_text': "Write your main text here",
            'bottom_left_title': "Write your bottom left title here",
            'bottom_left_text': "Write your bottom left text here",
            'bottom_right_text':"Write your bottom right text here"
            }
            courseDoc.accoumplishment.certificate = certificiate;
            courseDoc.markModified('accoumplishment');
            courseDoc.save();
            }
        }
        res.status(200).json(new HttpResponse(courseDoc))
    }

    /*
    async modifyCertificate(req,res,next){
        const courseDoc = this.service.get(req.params.courseId);
        const introductionText = req.body['introduction_text']
        const mainText = req.body['main_text']
        const bottomLeftTitle = req.body['bottom_left_title']
        const bottomLeftText = req.body['bottom_left_text']
        const bottomRightText = req.body['bottom_right_text']

        if(introductionText != undefined && mainText != undefined && bottomLeftTitle != undefined && bottomLeftText !=undefined && bottomRightText != undefined){
            if(courseDoc){
                if(courseDoc.accoumplishment.hasOwnProperty('certificate')){    
                
                const certificiate = { 'introduction_text': introductionText,
                'main_text': mainText,
                'bottom_left_title': bottomLeftTitle,
                'bottom_left_text': bottomLeftText,
                'bottom_right_text': bottomRightText
                }

                courseDoc.certificiate = certificiate;
                courseDoc.markModified('accoumplishment');
                courseDoc.save()
                }
            }
        }
        res.status(200).json(new HttpResponse(courseDoc))

        
    }

    async modifyLetter(req,res,next){
        const letterText = req.body['letter_text']
        if(letterText != undefined){

        const courseDoc = this.service.get(req.params.courseId);
        if(courseDoc){
            if(courseDoc.accoumplishment.letter.text == undefined){    
            courseDoc.accoumplishment.letter.text = letterText;
            courseDoc.markModified('accoumplishment');
            courseDoc.save()
            }
        }
        res.status(200).json(new HttpResponse(courseDoc))

    }
    }

    */
    async approveCourse( req, res, next ) {
        try{
            const courseDoc = await this.service.get( req.params.courseId );
            const ownerUserDoc = await this.userService.get( courseDoc[ 'owner_id' ].toString() );

            let error;

            const errors = [];

            if( !courseDoc.isPublished ) {

                error = error || new HttpError( 'Course does not meet publishing requirments' );
                error.statusCode = 409;
                errors.push( ' You can only approve courses that are freshly created ' );

                
            }

           
            if( !courseDoc.accoumplishments ) {

                error = error || new HttpError( 'Course does not meet publishing requirments' );
                error.statusCode = 409;
                errors.push( ' You can only approve courses that have accoumplishments set ' );


            }

            if( error ) {
                error.errors = errors;
                throw error;
            }
            
            courseDoc[ 'isPublished' ] = false;
            courseDoc[ 'isLive' ] = true;
            ownerUserDoc[ 'created_courses' ].push( courseDoc[ '_id' ].toString() );
            ownerUserDoc.markModified('created_courses');
            ownerUserDoc.save();
            courseDoc.save();

            notificationController.insertCourseLiveNotificationForInstructor(courseDoc['_id'].toString(),true);
            
            res.status( 200 ).json( courseDoc );
        }catch( error ) {
            next( error );
        }
       
    }

    async getContent( req, res, next ) {

        const courseId = req.params.courseId;
        const sectionId = req.params.sectionId;
        const contentId = req.params.contentId;

        try {
            const courseDoc = await this.service.get( courseId );
            const targetSection = courseDoc.sections.filter( ( section ) => sectionId == section[ '_id' ].toString() );
            const targetContent = targetSection[ 0 ].contents.filter( ( content ) => content[ '_id' ].toString() == contentId )[ 0 ];

            if( !targetContent ) {

                const error = new HttpError( 'Item not found' );

                error.statusCode = 404;
                throw error;
            }

            res.status( 200 ).json( new HttpResponse( targetContent ) );

        }catch( error ) {
            next( error );
        }

        
    }
    async isEligibleToGetCourseDetails( req, res, next ) {
        const courseId = req.params.courseId;
        const userId = req.user[ '_id' ];
        const userRole = req.user[ 'role' ];
          
        try {
            const courseDoc = await this.service.get( courseId );

            // not owner and not adming
            if( courseDoc[ 'owner_id' ].toString() != userId.toString() && userRole != 'admin' ) {

                // didn't buy the course
                const ownedCoursesIds = req.user[ 'progress_array' ].map( courseProgress => courseProgress.course );

                if( !isOwned( courseDoc, ownedCoursesIds ) ) {
                    const error = new Error( 'Unauthorized' );

                    error.statusCode = 401;
                    throw error;
                }

                
            }

            req.courseDoc = courseDoc;
            next();
        }catch( error ) {
            next( error );
        }

    }

    async get( req, res, next ) {
        const courseId = req.params.courseId;
        try {
            const courseDoc = await this.service.get( courseId );

            courseDoc.sections = courseDoc.sections.map( ( section ) => {
                const contents = section.contents.map( ( content ) => {
                    content.content = undefined;
                    return content;
                }
                );

                section.contents = contents;
                return section;
            }
            );

            res.status( 200 ).json( new HttpResponse( courseDoc ) );
          
        }catch( error ) {
            next( error );
        }

    }
    
    async isEligibleToGetContent( req, res, next ) {
        next();
    }

    async getUserOnCourseOperation( req, res, next ) {

        
        try{
            const userDoc = req.user;
            const courseDoc = await this.service.get( req.params.courseId, { 'projection': 'name pictures price description pre_requisites owner_id on_going_users completed_users sections.title sections.contents.title ' } );

            return res.status( 200 ).json( new HttpResponse( await this.service.getUserOnCourseOperation( userDoc, courseDoc ) ) );
        }catch( error ) {
            next( error ) ;
        }

    }
    
    async getUsersCreatedCourse( req, res, next ) {

    }

    
    async getAll( req, res, next ) {

        // i should rework that shit so it goes with smart tables at least for sorting and paginations
        // implement sorting and pagination one by one.

        const userDoc = req.user;
        const user = userDoc;
        const userId = req.user[ '_id' ];

        const addCategoryToQuery = ( queryParam ) => {
            const query = queryParam;
            if( req.query.category ) {
                query.category = req.query.category;

            };
        };

        const addPaginationAndSortToQuery = ( queryParam ) => {
            const queryBuffer = { ...req.mongooseParsedQueries.pagination,'sortBy': { ...req.mongooseParsedQueries.sortBy } } ;
            const query = queryParam;

            if( Object.keys(queryBuffer.sortBy).length > 0 ){
                query['sortBy'] = queryBuffer.sortBy;
            }else{
                query['sortBy'] = {'createdAt':-1 };
            }

                query['skip'] = queryBuffer['skip'];
                query['limit'] = queryBuffer['limit'];

        }   


        try{

 
            if ( req.query.isForPreRequisites ) {
                const query = { 'projection': 'name', '$and': [ {'temp_object_for_change': {'$ne': req.query.course_id || 'random thing' } } ,{'name': { '$ne':req.query.name } },{ 'isLive': true }, { 'isTemp': false } ] };
                const response = await this.service.getAll( query );

                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );

            }
            // get drafted courses => for admin and for user
            if( req.query.isDrafted ) {
             

                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ), 'limit': req.query.count, '$and': [ { 'owner_id': { '$eq': userDoc._id.toString() } }, { 'isLive': false }, { 'isTemp': false } ] };
                addPaginationAndSortToQuery(query);
                const response = await this.service.getAll( query );
                
                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
            }

            // get courses that have no quizes for user to add for them quize ( courses that are drafted );
            if( req.query.isForAddQuiz ) {

                
                const query = { '$and': [ { 'owner_id': { '$eq': userDoc._id.toString() } }, { 'isLive': false }, { 'isTemp': false }, { 'isPublished': false }, { 'quiz': { '$eq': null } } ] };
                addPaginationAndSortToQuery(query);
                const response = await this.service.getAll( query );
                
                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
            }

            // get courses that have quizes either drafted or live or published to modify quizes + owned by the user;
            if( req.query.isForModifyOwnedQuiz ) {
                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ), 'limit': req.query.count, '$and': [ { 'owner_id': { '$eq': userDoc._id.toString() } }, { 'isTemp': false }, { 'quiz': { '$ne': null } } ] };
                addPaginationAndSortToQuery(query);
                const response = await this.service.getAll( query );
                
                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
            }
            

            // get courses that have quizes live/published to modify quizes for admin
            if( req.query.isForModifyAllQuiz ) {
                if( user.role != 'admin' ){
                    const error = new Error( 'Unauthorized' );

                    error.statusCode = 401;
                    throw error;
                }
                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ), 'limit': req.query.count, '$and': [ { 'isTemp': false }, { '$or': [ { 'isLive': true }, { 'isPublished': true } ] }, { 'quiz': { '$ne': null } } ] };
                addPaginationAndSortToQuery(query);

                const response = await this.service.getAll( query );
                
                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
            }


            // get courses that need request approval
            if( req.query.isChangeRequested ) {
                if( user.role != 'admin' ){
                    const error = new Error( 'Unauthorized' );

                    error.statusCode = 401;
                    throw error;
                }
                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ), 'limit': req.query.count, '$and': [ { 'isLive': false }, { 'isTemp': true }] };
                const response = await this.service.getAll( query );
                
                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
            }

            // get published courses
            if( req.query.isPublished ) {
                if( user.role != 'admin' ){
                    const error = new HttpError('Unauthorized');

                    error.statusCode = 401;
                    throw error;
                }

                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ), 'limit': req.query.count, '$and': [ { 'isPublished': true, 'isTemp': false } ] };
                const response = await this.service.getAll( query );
                
                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
            }
            
            
            // get owned and live courses: used for editing live courses.
            if( req.query.isLive && req.query.isOwned ) {

                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ), 'limit': req.query.count, '$and': [ { 'owner_id': userDoc._id.toString() }, { 'isLive': true } ] };
                const response = await this.service.getAll( query );
                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
            
            }

            // get all live courses for admin:
            if( req.query.isLive ) {
                if( user.role != 'admin' ){
                    const error = new HttpError('Unauthorized');

                    error.statusCode = 401;
                    throw error;
                }

                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ), 'limit': req.query.count, 'isLive': true };
                const response = await this.service.getAll( query );
                
                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
            
            }

            // get courses with no accoumplishments
            if( req.query.isForAddAccomplishment ) {
                if( user.role != 'admin' ){
                    const error = new HttpError('Unauthorized');

                    error.statusCode = 401;
                    throw error;
                }
                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ), 'limit': req.query.count, '$or': [ 
                    {'$and': [ { 'accoumplishments': { '$eq': null } }, { '$or': [ { 'isPublished': true }, { 'isLive': true } ] } ] }
                    ,{ '$and': [ { 'accoumplishments': { '$eq': null } }, { 'owner_id': req.user['_id'] },{ 'isTemp':false } ] } ] };
                addPaginationAndSortToQuery(query);

                const response = await this.service.getAll( query );
                
                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );

            }

            // get all courses with accoumlishments
            if( req.query.isForModifyAccomplishment ) {
                if( user.role != 'admin' ){
                    const error = new HttpError('Unauthorized');

                    error.statusCode = 401;
                    throw error;
                }

                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ), 'limit': req.query.count, 
                '$or': [ 
                    {'$and': [ { 'accoumplishments': { '$ne': null } }, { '$or': [ { 'isPublished': true }, { 'isLive': true } ] } ] }
                    ,{ '$and': [ { 'accoumplishments': { '$ne': null } }, { 'owner_id': req.user['_id'] },{ 'isTemp':false } ] } ] };
                addPaginationAndSortToQuery(query);

                const response = await this.service.getAll( query );
                
                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
            }


            if( req.query.type == 'allTypes' && typeof ( Number( req.query.itemPerTypeCount ) ) == 'number' ) {
                const response = await this.getAllCourses( req );
                
                return res.status( 200 ).json( new HttpResponse( response ) );
            }

            if( Boolean( req.query.ownedCourses ) == true && typeof ( Number( req.query.itemPerTypeCount ) ) == 'number' ) {
                res.status( 200 ).json( new HttpResponse( await this.getOwnedCourses( req ) ) );
                return;
            }

        
            if( req.query.type == 'upcomming' ) {
                const completedCourse = Array.from( req.user[ 'completed_courses' ].keys() );
                const ownedCoursesIds = [];
                
                for( const item of req.user[ 'progress_array' ] ) {
                    ownedCoursesIds.push( item.course );
                }
                

                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ),
                    'limit': req.query.count,
                    'owner_id': {'$ne': userId },
                    'pre_requisites': {
                        '$elemMatch': {
                            'course_id':
                                { '$nin': completedCourse }
                        }
                            
                    },
                    'isTemp':false 
                };

                addCategoryToQuery( query );

                const response = await this.service.getAllByArrayOfIds( query, ownedCoursesIds, 'exclude' );
                
                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
            }
            
            if( req.query.type == 'recommended' ) {
                const completedCourse = Array.from( req.user[ 'completed_courses' ].keys() );
                const ownedCoursesIds = [];
                
                for( const item of req.user[ 'progress_array' ] ) {
                    ownedCoursesIds.push( item.course );
                }
                

                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ),
                    'limit': req.query.count,
                    'owner_id': {'$ne': userId },
                    'pre_requisites': {
                        '$not': {
                            '$elemMatch': {
                                'course_id':
                                    { '$nin': completedCourse }
                            }
                        }
                    },
                    'isTemp':false
                };

                addCategoryToQuery( query );

                const response = await this.service.getAllByArrayOfIds( query, ownedCoursesIds, 'exclude' );
                
                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );

            }
            
            if( req.query.type == 'ongoing' ) {
                const ownedCoursesIds = [];
                
                for( const item of req.user[ 'progress_array' ] ) {
                    ownedCoursesIds.push( item.course );
                }
                

                const dynamicProprety = `on_going_users.${ userDoc._id.toString() }`;
                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ),
                    'limit': req.query.count,
                    'isTemp':false 
                };

                query[ dynamicProprety ] = { '$exists': true };

                const response = await this.service.getAllByArrayOfIds( query, ownedCoursesIds, 'include' );

                addCategoryToQuery( query );


                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
            }
            if( req.query.type == 'completed' ) {
                const ownedCoursesIds = [];
                
                for( const item of req.user[ 'progress_array' ] ) {
                    ownedCoursesIds.push( item.course );
                }
                
                const dynamicProprety = `completed_users.${ userDoc._id.toString() }`;

                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ),
                    'limit': req.query.count,
                    // eslint-disable-next-line quote-props
                    'isTemp':false 
                };

                query[ dynamicProprety ] = { '$exists': true };

                addCategoryToQuery( query );


                const response = await this.service.getAllByArrayOfIds( query, ownedCoursesIds, 'include' );

                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
            }

            if( req.query.type == 'free' ) {
                const ownedCoursesIds = [];
                
                for( const item of req.user[ 'progress_array' ] ) {
                    ownedCoursesIds.push( item.course );
                }
                

                const query = { 'skip': Number( req.query.count ) * ( Number( req.query.page ) - 1 ),
                    'limit': req.query.count,
                    'price': { '$eq': 0 },
                    'isTemp':false 
                };

                addCategoryToQuery( query );

                const response = await this.service.getAllByArrayOfIds( query, ownedCoursesIds, 'exclude' );

                return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
            }

        }catch( e ) {
            console.log(e)
            next( e );
        }
    }
    
    // get upcomming courses
    async getUpcomingCourses( req, ownedCompletedCourse, ownedCoursesIds, categoryFilter = 'all' ) {

        const pageOptions = {
            skip: parseInt(req.query.count, 10),
            limit: parseInt(req.query.count, 10),
            upcommingpage: parseInt(req.query.page,10) || 0
        };


        let upcommingCount = 0;

        let page = 0;

        const upcommingCourses = [];

        let results;

        do{
            let query = { 'skip': pageOptions.skip * page, 'limit': pageOptions.limit };

            results = await this.service.getAll( query );
            results = results.data;

            for( let result of results ) {

                if ( categoryFilter != 'all' || result.category != categoryFilter ) {
                    continue;
                }
                
                if( isOwned( result, ownedCoursesIds ) ) {
                    continue;
                }

                const isUpcommingObject = isUpcomming( ownedCompletedCourse, result );

                if( isUpcommingObject.isUpcomming ) {
                    result = ( ( { name, category, description, pictures, price } ) => ( { name, category, description, pictures, price } ) ) ( result );
                    result[ 'undone_pre_requisites' ] = isUpcommingObject.preRequisitesUndone;
                    upcommingCourses.push( result );
                    upcommingCount += 1;
                    page = page + 1;
                }

            }
   
        }while( results.length == pageOptions.limit && upcommingCount < pageOptions.limit * pageOptions.upcommingpage );

        results = upcommingCourses.slice( pageOptions.upcommingpage * pageOptions.skip - 1 , upcommingCourses.length );

        return results;
    }
    async delete( req, res, next) {
        const courseDoc = await this.service.get(req.params.id);
        if(courseDoc['isPublished'] && !courseDoc['isLive']){
            notificationController.insertCourseLiveNotificationForInstructor(courseDoc['_id'].toString(),false);
        }
        super.delete(req,res,next);
        
    }
  
    async getAllCourses( req ) {
        const userId = req.user[ '_id' ];
        const onGoingCourses = Array.from( req.user[ 'on_going_courses' ].keys() );
        const completedCourse = Array.from( req.user[ 'completed_courses' ].keys() );

        const ownedCoursesIds = [ onGoingCourses, completedCourse ].flat();
        
        const categorizedData = { 'recommended': [], 'upcomming': [], 'freeForYou': [] };
        const categoriesCount = { 'recommended': 0, 'upcomming': 0, 'freeForYou': 0 };

        const categoriesTypeCount = 3;
        const itemPerCategoryCount = req.query.itemPerTypeCount;
        const pageOptions = {
            'skip': parseInt( itemPerCategoryCount * categoriesTypeCount ),
            'limit': parseInt( itemPerCategoryCount * categoriesTypeCount )
        };

        let page = 0;

        let results;


        do{
            const queryBuffer = { 'projection': 'name pictures price description pre_requisites owner_id','owner_id': {'$ne': userId },'isTemp':false  ,'skip': ( pageOptions.skip * page ), 'limit': ( pageOptions.limit ) };

            results = await this.service.getAll( queryBuffer );
            results = results.items;

            results.forEach( ( result ) => {

                if( isOwned( result, ownedCoursesIds ) ) {
                    return;
                }

                if( ( categoriesCount.upcomming < itemPerCategoryCount || categoriesCount.recommended < itemPerCategoryCount ) ) {

                    if( isUpcomming( completedCourse, result ).isUpcomming ) {
                        if( categoriesCount.upcomming >= itemPerCategoryCount ) {
                            return;
                        }
                        categorizedData.upcomming.push( result );
                        categoriesCount.upcomming += 1;
                    }else{
                        if( categoriesCount.recommended >= itemPerCategoryCount ) {
                            return;
                        }
                        categorizedData.recommended.push( result );
                        categoriesCount.recommended += 1;
                    }
                    
                }

                
                if( categoriesCount.freeForYou < itemPerCategoryCount ) {
                    if( isFreeForYou( result ) ) {
                        categorizedData.freeForYou.push( result );
                        categoriesCount.freeForYou += 1;
                    }
                }
                    
            }

            );
            page = page + 1;
        }while( ( results.length == pageOptions.limit ) && ( categoriesCount.freeForYou < itemPerCategoryCount ) && ( categoriesCount.recommended < itemPerCategoryCount ) && ( categoriesCount.upcomming < itemPerCategoryCount ) );
        


 
        return categorizedData;
    }


    async getOwnedCompletedCourses( req, res, next ) {

        const ownedCompletedCourses = [];
        const categorizedDataCount = { 'completed': 0 };

        req.query.page = req.query.page || 0;
        req.query.count = req.query.page || 5;
        const pageOptions = {
            'skip': parseInt( req.query.page * req.query.count ),
            'limit': parseInt( req.query.count )
        };

        let index = 0;

        for( const courseProgress of req.user[ 'progress_array' ] ) {
            index += 1;

            if ( courseProgress[ 'is_eligible_for_certificate' ] == true ) {
                
                if( pageOptions.skip <= index ) {
                    ownedCompletedCourses.push( courseProgress );
                    categorizedDataCount.completed += 1;
                }
                
            }

            if( pageOptions.limit <= categorizedDataCount.completed ) {
                break;
            }

        }

        res.status( 200 ).json( new HttpResponse( ownedCompletedCourses ) );

    }

    async getOwnedOnGoingCourses( req, res, next ) {
        const ownedCompletedCourses = [];
        const categorizedDataCount = { 'completed': 0 };

        req.query.page = req.query.page || 0;
        req.query.count = req.query.page || 5;
        const pageOptions = {
            'skip': parseInt( req.query.page * req.query.count ),
            'limit': parseInt( req.query.count )
        };

        let index = 0;

        for( const courseProgress of req.user[ 'progress_array' ] ) {
            index += 1;

            if ( courseProgress[ 'is_eligible_for_certificate' ] == false ) {
                
                if( pageOptions.skip <= index ) {
                    ownedCompletedCourses.push( courseProgress );
                    categorizedDataCount.completed += 1;
                }
                
            }

            if( pageOptions.limit <= categorizedDataCount.completed ) {
                break;
            }

        }

        res.status( 200 ).json( new HttpResponse( ownedCompletedCourses ) );

    }

    async insert( req, res, next ) {

        await this.courseRequestCleaning( req );
        await this.courseRequesFormatingAndValidating( req );

        req.body[ 'owner_id' ] = req.user[ '_id' ];
        try{


            const response = await this.service.insert( req.body );
            res.status(200).json(new HttpResponse(response));
            req.user['completed_courses'].set(response['_id'].toString(),true);
            req.user.save();
        }catch( e ) {
            next(e);
        }
    }

    async update( req, res, next ) {
        
        await this.courseRequestCleaning( req );
        await this.courseRequesFormatingAndValidating( req );

        req.params.id = req.params.courseId;

        const courseDoc = await this.service.update(req.params.courseId, req.body );
        res.status(200).json(new HttpResponse(courseDoc));
        if(req.user.role == 'admin' &&  courseDoc.isLive ){
            notificationController.insertCoursesChangedForUserNotification(req.params.courseId);
        }

    }

    // extra validation for pre-requsites and categories
    async courseRequesFormatingAndValidating( req ) {
        const categoryName = req.body[ 'category' ];

        let preRequesites = req.body[ 'pre_requisites' ];

        try{

            const category = await this.categoryService.getBy( { 'search': { 'category_name': categoryName } } );
            const errors = [];

            if( !category ) {
                errors.push( `The category ${ categoryName } is not found ` );
                
            }

            req.body[ 'category' ] = category[ 'category_name' ];
           
            preRequesites = await Promise.all(
                preRequesites.map( async( preRequisite ) => {
                    const currentCourse = await this.service.get( preRequisite[ 'course_id' ] );

                    if( !currentCourse ) {
                        errors.push( `The pre requisite course with id ${ preRequisite[ 'course_id' ] } is not found ` );
                        return;
                    }

                    return { 'course_id': currentCourse._id, 'course_name': currentCourse.name };
                }
                )
            );

            req.body[ 'pre_requisites' ] = preRequesites;

            if( req.body['pictures'] && req.body['pictures'].length > 0 ){
                mediaService.linkImage( req.body['pictures'][0] );
            }



            if( errors.length > 0 ) {
                const error = new HttpError( 'Bad request' );

                error.errors = errors;
                error.statusCode = 400;
                throw error;
            }

        }catch( error ) {
            throw error;
        }

    };

    courseRequestCleaning( req ) {
        const validKeys = [ 'name', 'pictures', 'price', 'description', 'category', 'pre_requisites' ];

        Object.keys( req.body ).forEach( ( key ) => validKeys.includes( key ) || delete req.body[ key ] );
    };

    async publishCourse( req, res, next ) {
        const role = req.user.role;

        try{

            const courseDoc = await this.service.get( req.params.courseId );
            validateSections(courseDoc);

            const item = await this.service.publishCourse( courseDoc, role );


            if( role == 'instructor'){
                notificationController.insertCoursePublishRequestforAdmin(courseDoc['_id'].toString());
            }
            if( role == 'admin' ){
                notificationController.insertCourseLiveNotificationForInstructor(courseDoc['_id'].toString(),true);
            }
            return res.status( 200 ).json( new HttpResponse( item ) );
            

        }catch( e ) {
            next( e );
        }

    }


    async addSection( req, res, next ) {
        const courseId = req.params.courseId;

        try{
            const item = await this.service.addSection( courseId, req.body );

            if( !item ) {
                throw new HttpError( 'Something went wrong' );
            }
            const response = item.sections.splice(-1)[0]._doc;
            return res.status( 200 ).json( new HttpResponse( response) );
        }catch( e ) {
            next( e );
        }
    }

    async removeSection( req, res, next ) {
        const courseId = req.params.courseId;
        const sectionId = req.params.sectionId;
        try{
            const response = await this.service.removeSection( courseId, sectionId );
            res.status(200).json(new HttpResponse(response))
        }catch(error){
            console.log(error)
        }
        
    }

    async patchSection( req, res, next ) {
        const courseId = req.params.courseId;
        const sectionId = req.params.sectionId;
        const newSectionData = req.body;

        try {
        const response = await this.service.patchSection( courseId, sectionId, newSectionData );
        res.status(200).json(new HttpResponse(response.sections.find(section => section['_id'] == sectionId)))
        }catch(error){
            next(error)
        }
    }

    async patchContent( req, res, next ) {
        const courseId = req.params.courseId;
        const sectionId = req.params.sectionId;
        const contentId = req.params.contentId;

        const newContentData = req.body;

        try{
            const response = await this.service.patchContent( courseId, sectionId, contentId, newContentData );

            res.status( 200 ).json( new HttpResponse( response ) );
        }catch ( error ) {
            next( error );
        }
    }

    async deleteSection( req, res, next) {
        const courseId = req.params.courseId;
        const sectionId = req.params.sectionId;
        
        try {
            const response = await this.service.deleteSection( courseId, sectionId );

            res.status( 200 ).json( new HttpResponse( response ) );
        }catch( error ) {

            next( error );

        }
    };

    async deleteContent( req, res, next ) {
        const courseId = req.params.courseId;
        const sectionId = req.params.sectionId;
        const contentId = req.params.contentId;

        
        try{
            const response = await this.service.deleteContent( courseId, sectionId, contentId );

            res.status( 200 ).json( new HttpResponse( response ) );
        }catch( error ) {
            next( error );
        }
    }

    async addContent( req, res, next ) {
        const courseId = req.params.courseId;
        const sectionId = req.params.sectionId;

        try{
            const item = await this.service.addContent( courseId, sectionId, req.body );

            if( !item ) {
                throw new HttpError( 'Something went wrong' );
            }
            return res.status( 200 ).json( new HttpResponse( item ) );
        }catch( e ) {
            next( e );
        }
    }

    async insertQuiz( req, res, next ) {
        const courseId = req.params.courseId;

        req.body[ 'owner_id' ] = req.user._id.toString();
        req.body[ 'course' ] = courseId;
        try{

            const item = await this.service.insertQuiz( courseId, req.body );

            if( !item ) {
                throw new HttpError( 'Something went wrong' );
            }
            return res.status( 200 ).json( new HttpResponse( item ) );
        }catch( e ) {
            next( e );
        }
    }

    async startEditingCourse( req, res, next ) {
        const courseId = req.params.courseId;
        const item = await this.service.startEditingCourse( courseId );
        
        return res.status( 200 ).json( new HttpResponse( item ) );
    }


    async checkIfUserIsEligibleToUpdate( req, res, next ) {
        const courseId = req.params.courseId || req.params.id;
        let error;
        try {
            const item = await this.service.get( courseId );

            // admin can change on all courses that are live
            if ( req.user.role == 'admin' && item[ 'isLive' ] == true && item[ 'isTemp' ] == false ) {
                next( );
                return;

            // admin can change on all courses that are published but not yet live;
            } else if ( req.user.role == 'admin' && item[ 'isPublished' ] == true && item[ 'isLive' ] == false ) {
                next();
                return;
            // admin can change on all courses that are being posted for change
            } else if ( req.user.role == 'admin' && item[ 'isChangeBlocked' ] == true && item[ 'isTemp' ] == true ) {
                next();
                return;
            // user can change on all courses that are either he own and they are drafted or he start editing and yet not post them for change request
            }else if( ( item[ 'owner_id' ].toString() == req.user[ '_id' ].toString() ) && ( item[ 'isTemp' ] == true || ( item[ 'isPublished' ] == false && item[ 'isLive' ] == false ) ) && item[ 'isChangeBlocked' ] == false ) {
                next();
                return;
            }

            error = new Error( 'Forbbiden' );

            error.statusCode = 401;
            throw error;

        } catch( e ) {
            next( e );
        }
    };



    async askForChange( req, res, next ) {
        const originalCourseId = req.params.courseId;
        const user = req.user;

        try {

            const originalItem = await this.service.get( originalCourseId );
            const item = await this.service.get( originalItem[ 'temp_object_for_change' ] );

            if ( item[ 'isChangeBlocked' ] == true ) {
                const error = new Error( 'You already posted a change request for that course wait for admin approval for any further changes' );

                error.statusCode = 409;
                throw error;

            }

            if( !( ( item[ 'owner_id' ].toString() == user[ '_id' ].toString() ) && ( item[ 'isTemp' ] == true ) ) ) {

                const error = new Error( 'Unauthorized' );

                error.statusCode = 401;
                throw error;

            }
            validateSections(item);


            const response = await this.changeService.changeCourseProprities( originalItem, item );
            notificationController.insertCourseChangeRequestForAdmin(originalCourseId,response._id);
            res.status( 200 ).json( new HttpResponse( response ) );
            
        } catch( e ) {
            next( e );
        }

    }

    
}
    

module.exports = new CourseController( courseService, changeService, categoryService, userService );
