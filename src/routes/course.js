'use strict';
const express = require( 'express' ),
    router = express.Router();
const CourseController = require( '../controllers/CourseController' );
const AuthController = require( '../controllers/AuthController' );
const { parseSearchParams } = require( '../middlewares/mongooseSearchQueryParsers' );

// getting course
router.get( '/', AuthController.checkLogin, AuthController.isActive, parseSearchParams, CourseController.getAll );

// getting all courses that needs an approvment query params to getAll


// generate and modify a letter
router.get( '/:courseId/accoumplishments', AuthController.checkLogin, AuthController.isActive, CourseController.getAccoumplishments );
router.put( '/:courseId/accoumplishments', AuthController.checkLogin, AuthController.isActive, CourseController.setAccoumplishments );
router.post( '/:courseId/accoumplishments', AuthController.checkLogin, AuthController.isActive, CourseController.setAccoumplishments );

// router.put( '/:courseId/letter', AuthController.checkLogin, AuthController.isActive, AuthController.isAdmin, CourseController.modifyLetter );
// router.put( '/:courseId/certificate', AuthController.checkLogin, AuthController.isActive, AuthController.isAdmin, CourseController.modifyCertificate );

// generate and modify a certificate


// approve a course will return a problem if certificates is not setted
router.post( '/:courseId/approve', AuthController.checkLogin, AuthController.isActive, AuthController.isAdmin, CourseController.approveCourse );

// getting courses that are not live
// get recommended courses
// will need the the pre-requistes of the user.

// get continued courses

// will need the courses that user have

// get upcoming courses
// need the pre-requistes


// adding courses
// get course information
router.get( '/ongoing', AuthController.checkLogin, AuthController.isActive, CourseController.getOwnedOnGoingCourses );
router.get( '/completed', AuthController.checkLogin, AuthController.isActive, CourseController.getOwnedCompletedCourses );

router.delete( '/:id', AuthController.checkLogin, AuthController.isActive, CourseController.checkIfUserIsEligibleToUpdate, CourseController.delete );
router.get( '/:courseId', AuthController.checkLogin, AuthController.isActive, CourseController.isEligibleToGetCourseDetails, CourseController.get );

router.get( '/:courseId/operation', AuthController.checkLogin, AuthController.isActive, CourseController.getUserOnCourseOperation );

router.patch( '/:courseId', AuthController.checkLogin, AuthController.isActive, CourseController.checkIfUserIsEligibleToUpdate, CourseController.update );
// adding the course for an instructor and admin (keep in mind that admin have both instructor and admin privilliges)
router.post( '/', AuthController.checkLogin, AuthController.isActive, AuthController.isInstructor, CourseController.insert );

router.post( '/:courseId/publish', AuthController.checkLogin, AuthController.isActive, CourseController.publishCourse );
router.post( '/:courseId/approve', AuthController.checkLogin, AuthController.isActive, CourseController.approveCourse );

// post a temporay object for editing
router.post( '/:courseId/copy', AuthController.checkLogin, AuthController.isActive, AuthController.isInstructor, CourseController.startEditingCourse );
// post a change request
router.post( '/:courseId/validateChange', AuthController.checkLogin, AuthController.isActive, CourseController.askForChange );


// routes for sections
router.post( '/:courseId/sections', AuthController.checkLogin, AuthController.isActive, CourseController.checkIfUserIsEligibleToUpdate, CourseController.addSection );
router.delete( '/:courseId/sections/:sectionId', AuthController.checkLogin, AuthController.isActive, CourseController.checkIfUserIsEligibleToUpdate, CourseController.deleteSection );
router.patch( '/:courseId/sections/:sectionId', AuthController.checkLogin, AuthController.isActive, CourseController.checkIfUserIsEligibleToUpdate, CourseController.patchSection );

// routes for contents;
router.get( '/:courseId/sections/:sectionId/contents/:contentId', AuthController.checkLogin, AuthController.isActive, CourseController.isEligibleToGetContent, CourseController.getContent );
router.post( '/:courseId/sections/:sectionId/contents', AuthController.checkLogin, AuthController.isActive, CourseController.checkIfUserIsEligibleToUpdate, CourseController.addContent );
router.patch( '/:courseId/sections/:sectionId/contents/:contentId', AuthController.checkLogin, AuthController.isActive, CourseController.checkIfUserIsEligibleToUpdate, CourseController.patchContent );
router.delete( '/:courseId/sections/:sectionId/contents/:contentId', AuthController.checkLogin, AuthController.isActive, CourseController.checkIfUserIsEligibleToUpdate, CourseController.deleteContent );

// quizes

router.post( '/:courseId/quizzes', AuthController.checkLogin, AuthController.isActive, CourseController.checkIfUserIsEligibleToUpdate, CourseController.insertQuiz );

module.exports = router;
