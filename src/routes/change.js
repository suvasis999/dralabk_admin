'use strict';
const express = require( 'express' ),
    router = express.Router();
const ChangeController = require( '../controllers/ChangeController' );
const AuthController = require( '../controllers/AuthController' );
const { parseSearchParams } = require( '../middlewares/mongooseSearchQueryParsers' );

// Post a new change for user
router.put( '/users', AuthController.checkLogin, AuthController.isActive, ChangeController.changeUserProprities );
router.post( '/users/:requestId/approve', AuthController.checkLogin, AuthController.isActive, ChangeController.approveUserChangeRequest );
router.post( '/users/:requestId/disapprove', AuthController.checkLogin, AuthController.isActive, ChangeController.disApproveUserChangeRequest );

router.post( '/courses/:requestId/approve', AuthController.checkLogin, AuthController.isActive, ChangeController.approveCourseEditRequest );
router.post( '/courses/:requestId/disapprove', AuthController.checkLogin, AuthController.isActive, ChangeController.disapproveCourseEditRequest );


router.get( '/users', AuthController.checkLogin, AuthController.isActive, parseSearchParams, ChangeController.getUserChangeRequest );
router.get( '/courses', AuthController.checkLogin, AuthController.isActive, parseSearchParams, ChangeController.getCoursesChangeRequest );
router.get( '/courses/:courseId', AuthController.checkLogin, AuthController.isActive, ChangeController.getCourseChangesForView );


router.get( '/:id', AuthController.checkLogin, AuthController.isActive, ChangeController.get );

module.exports = router;
