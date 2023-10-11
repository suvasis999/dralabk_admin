const { Controller } = require( '../../system/controllers/Controller' );
const { userService } = require( './../services/UserService' );
const { notificationController } = require( './../controllers/Notifications' );

const { HttpResponse } = require( '../../system/helpers/HttpResponse' );
const { HttpError } = require( '../../system/helpers/HttpError' );
const autoBind = require( 'auto-bind' );
const { courseService } = require( '../services/CourseService' );
const { transactionService } = require( '../services/TransactionService' );
const { courseProgressStatsService } = require( '../services/StatsService' );
const { UserTemp } = require( '../models/TempUser' );

const bcrypt = require( 'bcrypt' ),
    SALT_WORK_FACTOR = 10;

class UserController extends Controller {

    constructor( service, courseServiceDependency, userTempModel, transactionServiceDependency, courseProgressStatsServiceDependency ) {
        super( service );
        this.courseService = courseServiceDependency;
        this.userTempModel = userTempModel;
        this.courseProgressStatsService = courseProgressStatsServiceDependency;
        this.transactionService = transactionServiceDependency;
        autoBind( this );
    }

    async sendContactEmail( req, res, next ) {
        const message = req.body.message;
        const phoneNumber = req.body.phone;
        const email = req.body.email;
        const subject = req.body.subject;
        const name = req.body.name;

        try{
            await this.service.sendContactEmail(message,phoneNumber,email,subject, name );
            return res.status( 200 ).json( new HttpResponse( { 'emailSend': true } ) );
        }catch(error){
            next(error);
        }
    }

    async getAdminStats( req, res, next ) {
        // eslint-disable-next-line quotes
        const searchGraphParams = req.query.date ? new Date( req.query.date.substring( 1, req.query.date.length - 1 ) ) : new Date();
        const { coursesStats, completedCoursesGraphData, ongGoingCoursesGraphData } = await this.courseProgressStatsService.getCourseProgressStatistics( searchGraphParams );
        const { membersStatis, loginGraphData } = await this.courseProgressStatsService.getAdminUserStatistics( searchGraphParams );
       

        return res.status( 200 ).json( new HttpResponse( { coursesStats, completedCoursesGraphData, ongGoingCoursesGraphData, membersStatis, loginGraphData } ) );
    }

    async getUserListForChat (req, res, next ){
        const response = await this.service.getAllForChatList( { '_id':{'$ne':req.user[ '_id' ].toString() }, 'account_status':'finished',sortBy:{'last_name': -1 }, projection: 'image name last_name _id' });
        return res.status( 200 ).json( new HttpResponse(response));
    }

    async getMemberStat( req, res, next ) {
        const userId = req.user[ '_id' ];
        const coursesStats = await this.courseProgressStatsService.getProgressForUser( userId );
        
        return res.status( 200 ).json( new HttpResponse( coursesStats ) );

    }

    async getInstructorStats( req, res, next ) {
        const userId = req.user[ '_id' ];
        const { registredIndicator, createdCoursesIndicator, createdCoursesCount, registredCount } = await this.courseProgressStatsService.getInstructorStats( userId );

        return res.status( 200 ).json( new HttpResponse( { 'instructorStats': { registredIndicator, createdCoursesIndicator, createdCoursesCount, registredCount } } ) );

    }


    async getEnrolledUsersForInstructor( req, res, next ) {
        const query = { ...req.mongooseParsedQueries.pagination,'sortBy': { ...req.mongooseParsedQueries.sortBy } } ;

        
        const instructorId = req.user[ '_id' ];


        try{
            
            const response = await this.service.getEnrolledUsersForInstructor( instructorId, query );

            return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
        }catch( error ) {
            next( error );
        }

    }

    async getUserCreatedCourse( req, res, next ) {

        const userId = req.params.userId;

        try{
            const query = { ...req.mongooseParsedQueries.pagination, 'sortBy': { ...req.mongooseParsedQueries.sortBy }, '$and': [ { 'owner_id': userId.toString() }, { 'isTemp': false } ] };
            

            const response = await this.courseService.getAll( query );

            return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
        }catch( error ) {
            next( error );
        }
        

    }
    async refreshAuthentication( req, res, next ) {
        return res.status( 200 ).json( new HttpResponse( req.user ) );
    }

    
    async getAllUsersForAdmin( req, res, next ) {

        const query = { ...req.mongooseParsedQueries.pagination, ...req.mongooseParsedQueries.or, 'sortBy': { ...req.mongooseParsedQueries.sortBy } };


        console.log( query );

        try{
            const response = await this.service.getAll( query );
            
            res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
        }catch( error ) {
            next( error );
        }
    }
    

    async getUserDetails( req, res, next ) {
        const userId = req.params.userId;

        try{
            let isEnrolledMember = false;

            const adminCreatedCourses = req.user['created_courses'];
            
            const userDoc = await this.service.get( userId );

            for( const createdCourse of adminCreatedCourses ){
                if( userDoc['on_going_courses'].get(createdCourse) || userDoc['completed_courses'].get(createdCourse)){
                    isEnrolledMember = true;
                }
            }

            console.log(isEnrolledMember)

            if( req.user._id.toString() != userId && req.user.role != 'admin' && !isEnrolledMember) {
                const error = new HttpError( 'Unauthorized' );

                error.statusCode = 401;
                throw error;
            }
            let response;

            let isChangedRequested = false;
            
       
            response = userDoc;

            if( userDoc[ 'temp_object' ] ) {
                response = await this.userTempModel.findById( userDoc[ 'temp_object' ].toString() );
                isChangedRequested = true;
            }


            return res.status( 200 ).json( new HttpResponse( { 'details': response, 'isChangedRequested': isChangedRequested } ) );
          
        }catch( error ) {
            next( error );
        }
    }


    async update( req, res, next ) {
        let response = {};

        try {

            const requestOwnerDoc = req.user;
            const data = req.body;
            const userId = req.params.id;

            if( requestOwnerDoc[ 'role' ] === 'admin' && req.params.id.toString() != requestOwnerDoc[ '_id' ].toString() ) {
                const props = [ 'admin_note','role' ];
                const finalData = {};
                for ( const prop of props ) {
                    if( ( data[ prop ] == undefined || data[ prop ] == null || data[ prop ] ) == '' ) {
                        delete data[ prop ];
                    }else{
                        finalData[ prop ] = data[ prop ];
                    }
                }
                response = await this.service.update( userId, finalData );
            }

            if( requestOwnerDoc[ 'role' ] === 'admin' && req.params.id.toString() == requestOwnerDoc[ '_id' ].toString() ) {
                response = await this.service.update( requestOwnerDoc[ '_id' ], finalData );
            }


            if( req.params.id.toString() == requestOwnerDoc[ '_id' ].toString() ) {
                const finalData = {};

                if( requestOwnerDoc[ 'account_status' ] == 'active' ) {

                    const props = [ 'name', 'last_name', 'image', 'sex', 'image', 'birth_date', 'adresse_line_1', 'state', 'city', 'zip_code', 'country', 'phone_number' ];
                    const OptionaProps = ['password', 'spirtual_name', 'middle_name', 'dralla_wallet_adress', 'adresse_line_2' ];


                    finalData[ 'account_status' ] = 'completed';

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


            if( finalData[ 'password'] && finalData[ 'password' ].length > 6 ) {

                const salt = await bcrypt.genSalt( SALT_WORK_FACTOR);

                const newHashedPassword = await new Promise((resolve,reject)=>{
                     bcrypt.hash( finalData[ 'password'], salt, async( hashErr, hashBuffer ) => {
                    if ( hashErr ) {
                        return reject( hashErr );
                    }
                        return resolve(hashBuffer);
                    })
                }
                )

                finalData['password'] = newHashedPassword;
            }

                    response = await this.service.update( requestOwnerDoc[ '_id' ], finalData );
                
                }else if( requestOwnerDoc[ 'account_status' ] == 'completed' ) {
                    finalData[ 'account_status' ] = 'finished';
                    response = await this.service.update( requestOwnerDoc[ '_id' ], finalData );
                    notificationController.insertNewRegistredMemberOnWebSiteNotification(requestOwnerDoc[ '_id' ].toString());

                }

            }


            

            return res.status( 200 ).json( new HttpResponse( response ) );

        } catch( e ) {
            next( e );
        }
    }


    async getFreeCourse( req, res, next ) {
        const userId = req.user[ '_id' ];
        const courseId = req.params.courseId;
        const userDoc = req.user;

        try {
            if( userDoc.progress_array.filter( ( courseDocBuffer ) => courseDocBuffer.course.toString() == courseId.toString() ).length > 0 ) {
                const error = new HttpError( 'Course is already owned by this user ' );

                error.statusCode = 423;
                throw error;
            }

            const courseDoc = await this.courseService.get( courseId );

            if( courseDoc[ 'owner_id' ].toString() == userId.toString() ) {
                const error = new HttpError( 'You cant buy courses that you created' );

                error.statusCode = 423;
                throw error;
            }
            const response = await this.transactionService.validateCourseTransaction( userId, courseDoc, 0 );

            res.status( 200 ).json( new HttpResponse( response ) );
        }catch( error ) {
            next( error );
        }
    }

    async getProgress( req, res, next ) {
        const userId = req.user[ '_id' ];
        const courseId = req.params.course;
        
        try {
            const courseProgress = await this.service.getProgress( userId, courseId );
            
            res.status( 200 ).json( new HttpResponse( courseProgress ) );
        }catch( e ) {
            next( e );
        }

    }

    async addProgress( req, res, next ) {

        const userId = req.user[ '_id' ];
        const courseId = req.params.course;
        const contentDoneId = req.params.contentId;
        const sectionDoneId = req.params.sectionId;

        // add paypal integration
        try {
            const courseProgress = await this.service.addProgress( userId, courseId, sectionDoneId, contentDoneId );
            
            res.status( 200 ).json( new HttpResponse( courseProgress ) );
        }catch( e ) {
            next( e );
        }
    }

    async getAccoumplishments( req, res, next ) {
        const userId = req.user[ '_id' ];
        const courseId = req.params.courseId;

        try {
            const response = await this.service.getAccoumplishments( userId, courseId );

            return res.status( 200 ).json( new HttpResponse( response ) );
        }catch( error ) {
            next( error );
        }
    }

    // ask for digits code
    async sendVerificationMail( req, res, next ) {
        const userId = req.user[ '_id' ];
        
        try {
            const userDoc = await this.service.get( userId );
        
            let generatedTimeCounter = await this.service.generateActivationCode( userDoc );

            console.log(generatedTimeCounter);
            generatedTimeCounter.generatedTimeCounter = parseInt(generatedTimeCounter.generatedTimeCounter,10);
            res.status(200).json(new HttpResponse( generatedTimeCounter ))
        }catch( e ) {
            next( e );
        }
    }

    // validate digits code
    async activateAccount( req, res, next) {
        const userId = req.user[ '_id' ];
        const userDoc = await this.service.get( userId );
        const token = req.query.token;

        try {
        
            if( userDoc[ 'account_status' ] != 'not_active' && userDoc[ 'new_email' ].length == 0 ) {
                const error = new HttpError( 'This user email is already verified' );
                
                error.statusCode = 423;
                throw error;
            }
            const newAccountStatus = await this.service.activateAccount( userDoc, token );

            res.status( 200 ).json( new HttpResponse( { 'account_status': newAccountStatus } ) );
        }catch( error ) {
            next( error );
        }
    }

    async generatePasswordToken (req,res,next){
        const email = req.body.email;
        try{
            return res.status(200).json( new HttpResponse(await this.service.generatePasswordToken(email)));
        }
        catch(error){
            next(error);
        }
    }
    
}


module.exports = new UserController( userService, courseService, UserTemp, transactionService, courseProgressStatsService );
