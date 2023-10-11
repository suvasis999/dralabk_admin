'use strict';
const TransactionController = require( '../controllers/TransactionController' );
const express = require( 'express' ),
    router = express.Router();
const AuthController = require( '../controllers/AuthController' );
const { parseSearchParams } = require( '../middlewares/mongooseSearchQueryParsers' );

router.get( '/admin/courses', AuthController.isAdmin, parseSearchParams,TransactionController.getAllCoursesTransactionsForAdmin );
router.get( '/admin/donations', AuthController.isAdmin, parseSearchParams,TransactionController.getAllDonationsTransactionsForAdmin );
router.get( '/admin/users/:userId', AuthController.checkLogin, AuthController.isActive, parseSearchParams, TransactionController.getUserPerchausedCourses );

router.get( '/donations', AuthController.checkLogin, AuthController.isActive, parseSearchParams,TransactionController.getUserDonation );
router.get( '/earnings', AuthController.checkLogin, AuthController.isActive, parseSearchParams,TransactionController.getInstructorEarning );

router.put( '/:id', AuthController.isAdmin, TransactionController.update );

// transactions
router.get( '/', AuthController.isAdmin, TransactionController.getAll );
router.put( '/:id', AuthController.isAdmin, TransactionController.update );
router.post( '/orders', AuthController.checkLogin, TransactionController.createPayment );

// consume order in front end.
router.post( '/payments', AuthController.checkLogin, TransactionController.getPaymentDetails );
module.exports = router;
