const { Controller } = require( '../../system/controllers/Controller' );
const { transactionService } = require( '../services/TransactionService' );
const { HttpResponse } = require( '../../system/helpers/HttpResponse' );
const autoBind = require( 'auto-bind' );
const { courseService } = require('../services/CourseService' );

class TransactionController extends Controller {

    constructor( service, courseServiceDependency ) {
        super( service );
        this.courseService = courseServiceDependency;
        autoBind( this );
    }


    async getUserPerchausedCourses( req, res, next ) {
        const userId = req.params.userId;

        try{
            const query = { ...req.mongooseParsedQueries.pagination, 'sortBy': { ...req.mongooseParsedQueries.sortBy }, '$and': [ { 'from': userId.toString() }, { 'transaction_type': 'course' } ] };


            const response = await this.service.getAllForAdmin( query );
            
            return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
        }catch( error ) {
            next( error );
        }
        
    };


    async getInstructorEarning( req, res, next ) {
        const user = req.user;

        try{
            const query = { ...req.mongooseParsedQueries.pagination, 'sortBy': { ...req.mongooseParsedQueries.sortBy }, 'to': user._id.toString() };


            const response = await this.service.getAllForAdmin( query );

            return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
        }catch( error ) {
            next( error );
        }

    }
    async getUserDonation( req, res, next ) {
        const user = req.user;

        try{
            const query = { ...req.mongooseParsedQueries.pagination, 'sortBy': { ...req.mongooseParsedQueries.sortBy }, 'from': user._id.toString() };

            const response = await this.service.getAllForAdmin( query );

            return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
        }catch( error ) {
            next( error );
        }
    }

    async getAllDonationsTransactionsForAdmin( req, res, next ) {
        try{
            const query = { ...req.mongooseParsedQueries.pagination, 'sortBy': { ...req.mongooseParsedQueries.sortBy }, 'transaction_type': 'donation' };

            const response = await this.service.getAllForAdmin( query );

            return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
        }catch( error ) {
            next( error );
        }
    }
    async getAllCoursesTransactionsForAdmin( req, res, next ) {

        try{
            const query = { ...req.mongooseParsedQueries.pagination, 'sortBy': { ...req.mongooseParsedQueries.sortBy }, 'transaction_type': 'course' };

            const response = await this.service.getAllForAdmin( query );

            return res.status( 200 ).json( new HttpResponse( response.items, { 'totalCount': response.totalCount } ) );
        }catch( error ) {
            next( error );
        }
    }
    // create a payment
    async createPayment( req, res, next ) {

        const orderDetails = req.body;
        const userDoc = req.user;
        const paymentType = orderDetails.type;
        const donationAmount = orderDetails.amount;
        const courseId = orderDetails.id;

        try{
            
            if( paymentType != 'donation' && paymentType != 'course' ) {
                const error = new Error( 'Bad request' );

                error.statusCode = 400;
                throw error;
            }

            let result;

            if( paymentType == 'donation' ) {
                result = await this.service.createDonationOrder( donationAmount, userDoc );
            }else if ( paymentType == 'course' ) {

                result = await this.service.createCourseOrder( userDoc, courseId );
            }

            res.status( 200 ).json( new HttpResponse( result ) );

        }catch( e ) {
            next( e );
        }
    }

    async getPaymentDetails( req, res, next) {
        const paymentDetails = req.body;
        const userDoc = req.user;
        const orderId = paymentDetails.orderId;
        const paymentId = paymentDetails.paymentId;
        const response = await this.service.fetchOrder( orderId, paymentId, userDoc );

        res.status( 200 ).json( response );
    }
    
}

module.exports = new TransactionController( transactionService, courseService );
