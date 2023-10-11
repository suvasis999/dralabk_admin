const { Service } = require( '../../system/services/Service' );
const { createOrder, fetchOrder, fetchPayment } = require( '../../system/helpers/Paypal' );
const { Order } = require( '../models/Order' );
const { Payment } = require( '../models/Payment' );

const { courseService } = require( '../services/CourseService' );
const { userService } = require( '../services/UserService' );

const { HttpError } = require( '../../system/helpers/HttpError' );
const { Transaction } = require('../models/Transaction');
const { notificationController } = require('../controllers/Notifications');
const { response } = require('express');


class TransactionService extends Service {


    constructor( model, orderModel, paymentmodel, courseServiceDependency, userServiceDependency ) {
        super( model );
        this.orderModel = orderModel;
        this.paymentModel = paymentmodel;
        this.courseService = courseServiceDependency;
        this.userService = userServiceDependency;
    }


    async getAllForAdmin( query ) {

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
                    .sort( sortBy )
                    .skip( skip )
                    .limit( limit )
                    .populate( 'to', 'name last_name email' )
                    .populate( 'from', 'name last_name email' ),
                total = await this.model.countDocuments( query );

            return { 'items': items, 'totalCount': total };
        } catch ( errors ) {
            throw errors;
        }
    }


    // create order for donation
    async createDonationOrder( amount, userDoc ) {
        return await this.createOrder( amount, 'USD', 1, 'DIGITAL_GOODS', userDoc, 'donation', 'donation' );
    }

    // create order for course
    async createCourseOrder( userDoc, courseId ) {
        const courseDoc = await this.courseService.get( courseId );

        try{

            if( userDoc.progress_array.filter( ( courseDocBuffer ) => courseDocBuffer.course.toString() == courseId.toString() ).length > 0 ) {
                const error = new HttpError( 'Course is already owned by this user ' );

                error.statusCode = 423;
                throw error;
            }

            

            if( courseDoc[ 'owner_id' ].toString() == userDoc[ '_id' ].toString() ) {
                const error = new HttpError( 'You cant buy courses that you created' );

                error.statusCode = 423;
                throw error;
            }

            if( !this.userService.verifiyCourseEligibility( userDoc, courseDoc ) ) {

                const error = new Error( 'Pre requisites for this course are not done yet' );
                
                error.statusCode = 409;
                throw error;

            }else {

                const courseVerifiedId = courseDoc[ '_id' ];
                const courseName = courseDoc[ 'name' ];
                const coursePrice = courseDoc[ 'price' ];

                return await this.createOrder( coursePrice, 'USD', 1, 'DIGITAL_GOODS', userDoc, courseName, 'course', courseVerifiedId );
            
            }
        }catch( error ) {
            throw error;
        }
    }


    // amount, currency, itemName, quantity, category
    async createOrder( amount, currency, quantity, category, userDoc, itemName, type, itemId = ' ' ) {
        const userId = userDoc[ '_id' ];
        const userEmail = userDoc[ 'email' ];

        try {
            
            // generating the order for payment from  front end.

            // create order for donation
            const response = await createOrder( amount, currency, itemName, quantity, category );
            

            if ( response.statusCode !== 201 ) {
                console.log( {
                    level: 'error',
                    message: '[order.ts] /paypal/:cohortId (create order)',
                    metadata: response,
                }
                );
                return;

                // this should throw an error

                /*
                return res.status( 500 ).json( {
                    message: 'Order creation failed at Paypal',
                    notice: 'Something went wrong while fetching order! Please try again later.',
                }
                );
                */
            }

            // odrer details that is going to be stored in database
            const orderDetails = {
                'order_id': response.result.id,
                'parchause_details': { 'parchause_type': type, 'course_id': itemId },
                'user_id': userId,
                'amount': amount.toString(),
                'status': 'PENDING',
                'order_details': response.result,
                'merchant': 'Paypal',

            };
            
            // new Payment().getInstance()

            const OrderModel = this.orderModel;
            const order = new OrderModel( orderDetails );

            await order.save();

            return response.result;

        } catch ( err ) {
            console.log( {
                'level': 'error',
                'message': '[order.ts] /paypal/:cohortId (send order)',
                'metadata': { 'error': err, 'email': userEmail },
            }
            );
            throw err;
        }

    }
  
    async updateOrderStatus( orderId, status, paymentId ) {
        const orderModelDoc = await this.orderModel.findOneAndUpdate(
            { 'order_id': orderId },
            {
                'status': status,
                'payment_id': paymentId,
            }
        );
        return orderModelDoc;
    }
    async addPayment( paymentDetails ) {
        const PaymentModel = this.paymentModel;
        const newPayment = new PaymentModel( paymentDetails );

        return await newPayment.save();

    }

    async validateTransaction( orderDetails, userDoc ) {
        const userId = orderDetails[ 'user_id' ];
        const transactionAmount = orderDetails[ 'amount' ];
        const transactionType = orderDetails[ 'parchause_details' ][ 'parchause_type' ];

        if( transactionType == 'donation' ) {
        
            await this.validateDonationTransaction( userId, transactionAmount );
            if( userDoc[ 'isDonated' ] == false ) {
                await this.userService.update( userId, { 'isDonated': true } );
            } ;
        
        }else if( transactionType == 'course' ) {

            const courseId = orderDetails[ 'parchause_details' ][ 'course_id' ];
            const courseDoc = await this.courseService.get( courseId );
            
            await this.validateCourseTransaction( userId, courseDoc, transactionAmount );

        }
        userDoc[ 'total_amount_donated' ] = Number(userDoc[ 'total_amount_donated' ]) + Number(transactionAmount) ;
        userDoc.save();
    }

    async fetchOrder( orderId, paymentId, userDoc ) {

        /* const paymentDetails = req.body;
        const orderId = paymentDetails.orderId;
        const paymentId = paymentDetails.paymentId;
        */


        const orderAndPaymentIdObject = { orderId, paymentId };

        try {
            /**
             * Verifying paypal payment is a 2 step process
             * 1. Verify if the order is completed using order Id
             * 2. Verify if the payment is completed using payment Id
             *
             * Once step 1 and 2 are verified
             * Modify the status of Orders table to completed
             * Store the payment details in Payments table
             */


            // handling orders part getting order details
            const orderObject = await fetchOrder( orderId );

            if ( orderObject.statusCode == '500' ) {

                console.log( {

                    'level': 'error',
                    'message': '[payment.ts] /paypal (fetch order)',
                    'metadata': orderAndPaymentIdObject,

                }
                );

                error = new HttpError( 'Error while fetching order status from paypal. Check with XYZ team if amount is debited from your bank!' );
                error.statusCode = 500;
                throw error;


            } else if ( orderObject.status !== 'COMPLETED' ) {
                console.log( {
                    'level': 'error',
                    'message': '[payment.ts] /paypal (paypal payment not completed)',
                    'metadata': orderAndPaymentIdObject,
                }
                );

                error = new HttpError( 'Paypal order status is not Completed. Check with XYZ team if amount is debited from your bank!' );
                error.statusCode = 500;
                throw error;

            } else {

                // Update Orders table's status to Completed for the above order id
                const updatedOrder = await this.updateOrderStatus(
                    orderId,
                    'complete',
                    paymentId
                );
      
      
                // Fetch payment details and if completed store it in database table
                const paymentObject = await fetchPayment( paymentId );

                if ( paymentObject.statusCode == '500' ) {
                    console.log( {
                        'level': 'error',
                        'message': '[payment.ts] /paypal (paypal fetching payment issue)',
                        'metadata': orderAndPaymentIdObject,
                    }
                    );

                    error = new HttpError( 'Error while fetching payment status from paypal. Check with XYZ team if amount is debited from your bank!' );
                    error.statusCode = 500;
                    throw error;

                } else if ( paymentObject.result.status !== 'COMPLETED' ) {
                    console.log( {
                        'level': 'error',
                        'message': '[payment.ts] /paypal (paypal fetching returned incomplete)',
                        'metadata': orderAndPaymentIdObject,
                    }
                    );


                    error = new HttpError( 'Paypal payment status is not Completed. Please complete your payment!' );
                    error.statusCode = 500;
                    throw error;

                } else {

                    const paymentDetails = {
                        'payment_id': paymentId,
                        'user_id': updatedOrder[ 'user_id' ],
                        'order_id': orderId,
                        '_id': updatedOrder[ '_id' ],
                        'payment_details': paymentObject.result,
                        'merchant': 'Paypal',
                    };
      
                    const paymentInfo = await this.addPayment( paymentDetails );

                    console.log( {
                        'level': 'info',
                        'message': '[payment.ts] /paypal (payment successful)',
                        'metadata': orderAndPaymentIdObject,
                    }
                    );
                    await this.validateTransaction( updatedOrder, userDoc );
                    // In production push a message to SQS to mail user for successful payment
                    return { 'message': 'Transaction Successful', 'id': paymentInfo[ '_id' ] } ;
                }
            }
        } catch ( error ) {
            console.log( {
                'level': 'error',
                'message': '[payment.ts] /paypal (paypal processing issue)',
                'metadata': orderAndPaymentIdObject,
            }
            );
            
            throw( error );
        }
    }


    // should be very carful about errors
    async validateCourseTransaction( userId, courseDoc, amount ) {

        const transactionData = { 'from': userId, 'to': courseDoc[ 'owner_id' ], 'perchaused_item': courseDoc[ 'name' ], 'amount': amount, 'transaction_type': 'course' };

        await this.insert( transactionData );
        const respnonse = await this.userService.insertCourseToUser( userId.toString(), courseDoc._id.toString() );
        notificationController.insertNewRegistredMemberOnCourseNotification(userId.toString(),courseDoc['_id'].toString());
        return response;
  
    }

    // should be very carful about errros
    async validateDonationTransaction( userId, amount ) {

        const transactionData = { 'from': userId, 'perchaused_item': 'donation', 'amount': amount, 'status': 'COMPLETED', 'transaction_type': 'donation' };

        return await this.insert( transactionData );
    }


}

const transactionService = new TransactionService( Transaction, Order, Payment, courseService, userService );

module.exports = { TransactionService, transactionService };
