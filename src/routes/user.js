'use strict';
const UserController = require( '../controllers/UserController' );
const express = require( 'express' ),
    router = express.Router();
const AuthController = require( '../controllers/AuthController' );

const { parseSearchParams } = require( '../middlewares/mongooseSearchQueryParsers' );
const { notificationController } = require('../controllers/Notifications');


router.patch( '/:id', AuthController.checkLogin, UserController.update );
router.post( '/forgetPassword', UserController.generatePasswordToken );
router.get( '/chats', AuthController.checkLogin, AuthController.isActive, parseSearchParams, UserController.getUserListForChat );
router.get( '/notifications', AuthController.checkLogin, AuthController.isActive, parseSearchParams, notificationController.getNotifications );
router.patch( '/notifications/:id', AuthController.checkLogin, AuthController.isActive, parseSearchParams, notificationController.seeNotification );
router.get( '/admin/stats', AuthController.checkLogin, AuthController.isActive, parseSearchParams, UserController.getAdminStats );
router.get( '/member/stats', AuthController.checkLogin, AuthController.isActive, parseSearchParams, UserController.getMemberStat );
router.get( '/instructor/stats', AuthController.checkLogin, AuthController.isActive, parseSearchParams, UserController.getInstructorStats );
router.post( '/contancts', UserController.sendContactEmail );

router.get( '/courses/enrolled', AuthController.checkLogin, AuthController.isActive, parseSearchParams, UserController.getEnrolledUsersForInstructor );
router.get( '/:userId/courses', AuthController.checkLogin, AuthController.isActive, parseSearchParams, UserController.getUserCreatedCourse );
router.get( '/admin', AuthController.checkLogin, AuthController.isActive, parseSearchParams, UserController.getAllUsersForAdmin );

router.get( '/refresh', AuthController.checkLogin, UserController.refreshAuthentication );
router.post( '/activate', AuthController.checkLogin, UserController.activateAccount );
router.post( '/register', AuthController.register );
router.get( '/activate', AuthController.checkLogin, UserController.sendVerificationMail );
router.post( '/courses/:course/progress/section/:sectionId/content/:contentId', AuthController.checkLogin, AuthController.isActive, UserController.addProgress );
router.get( '/courses/:courseId/accoumplishments', AuthController.checkLogin, AuthController.isActive, UserController.getAccoumplishments );
router.post( '/courses/:courseId/free', AuthController.checkLogin, AuthController.isActive, UserController.getFreeCourse );

router.get( '/courses/:course', AuthController.checkLogin, AuthController.isActive, UserController.getProgress );

router.get( '/:userId', AuthController.checkLogin, AuthController.isActive, UserController.getUserDetails );



module.exports = router;
