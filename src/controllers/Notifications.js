const { chatService } = require( './../services/ChatService' );
const { courseService } = require( './../services/CourseService' );
const { quizService } = require( './../services/QuizService' );

const { userService } = require( './../services/UserService' );
const { mediaService } = require( './../services/MediaService' );
const { Notification } = require('./../models/Notification');
const autoBind = require( 'auto-bind' );
const { HttpResponse } = require('../../system/helpers/HttpResponse');
const { adminsIds } = require('../../config/AppConfig');
class NotificationController {

    constructor( ) {
        autoBind( this );   
    }

    async insertNotification(title,body,link,userId){
        Notification.create({title:title,body:body,link:link,to:userId});
        const userDoc = await userService.update(userId,{$inc : {'unseen_notifications_count' : 1}});
        const unseenNotifications = userDoc['unseen_notifications_count'];
          // to all clients in room1 in namespace "myNamespace"
        global.io.of("/users").to(`notifications/${userId}`).emit('updated_notification',unseenNotifications);
    }

    // check these notifications.

    //course changes notifications

        // working
    async insertCoursesChangedForUserNotification(courseId) {
        const courseDoc = await courseService.get(courseId);
        const usersIds = Array.from( courseDoc['on_going_users'].keys() ).concat(Array.from( courseDoc['completed_users'].keys()));
        
        for( const userId of usersIds ){
            const title = `The Course ${courseDoc['name']} got some updates`;
            const body = `Check what's is new`;
            const link = `/courses/${courseDoc['_id'].toString()}`;
            this.insertNotification(title,body,link,userId);
        }

    }
        // working
    async insertCourseChangeRequestNotificationForInstructor(courseId,isApproved){
        const courseDoc = await courseService.get(courseId);   

            const title = `The Course ${courseDoc['name']} requested changes are ${isApproved ? 'Approved' : 'Disapproved'}`;
            const body = ` Check your other courses `;
            const link = `/courses/owned`;
            this.insertNotification(title,body,link,courseDoc['owner_id']);
    
    }


    // working
    async insertCourseLiveNotificationForInstructor(courseId,isApproved){
        const courseDoc = await courseService.get(courseId);   

            const title = `The Course ${courseDoc['name']} you published is ${isApproved ? 'Approved' : 'Disapproved'}`;
            const body = ` Check your other courses`;
            const link = `/courses/owned`;
            this.insertNotification(title,body,link,courseDoc['owner_id']);
    
    }

    // working
    async insertCoursePublishRequestforAdmin(courseId){
        const courseDoc = await courseService.get(courseId);   

            const title = `The instructor ${courseDoc['author'].last_name} ${courseDoc['author'].name} requested a course publish`;
            const body = `View course details`;
            const link = `/courses/pending/${courseDoc['_id'].toString()}`;

            for( const adminId of adminsIds){
                this.insertNotification(title,body,link,adminId);
            }

    }
        

    // working
    async insertProfileChangesRequstNotification(userId,isApproved){

            const title = `Your profile requested changes are ${isApproved ? 'Approved' : 'Disapproved'}`;
            const body = `Check your profile details`;
            const link = `/profile`;
            this.insertNotification(title,body,link,userId);
    }

    // working
    async insertCourseCompletionNotification(userId,courseId) {

        const courseDoc = await courseService.get(courseId);       
        const title = `You have completed the course ${courseDoc['name']} and now eligible for accomplishments`;
        const body = `Download your letter and certificate`;
        const link = `/courses/accoumplishments/${courseDoc['_id'].toString()}`;

        this.insertNotification(title,body,link,userId);
        const userDoc = await userService.get(userId);
        const titleForInstructor = `The user ${userDoc['last_name']} ${userDoc['name']} completed your course`;
        const bodyForInstructor = `View more about this user`;
        const linkForInstructor = `/users/${userId}`;

        this.insertNotification(titleForInstructor,bodyForInstructor,linkForInstructor,courseDoc['owner_id'].toString());

    }

    // working
    async insertNewRegistredMemberOnCourseNotification(userId,courseId){

        const courseDoc = await courseService.get(courseId); 
        const userDoc = await userService.get(userId);    

        const title = `The user ${userDoc['last_name']} ${userDoc['name']} registered into your course`;
        const body = `View more about this user`;
        const link = `/users/${userDoc['_id'].toString()}`;

        this.insertNotification(title,body,link,courseDoc['owner_id']);

        const titleForLearner = `You have registered into The Course ${courseDoc['name']}`;
        const bodyForLearner = `View your new obtained course, complete the course material and do the quizzes to get your accomplishments( A Certificate and A Letter )`;
        const linkForLearner = `/courses/${courseDoc['_id'].toString()}`;

        this.insertNotification(titleForLearner,bodyForLearner,linkForLearner,userId);

    }

    // working
    async insertNewRegistredMemberOnWebSiteNotification(userId){
        
        const userDoc = await userService.get(userId);    

        const title = `A new user ${userDoc['last_name']} ${userDoc['name']} registered into the application`;
        const body = `View user details`;
        const link = `/users/${userId}`;

        for( const adminId of adminsIds){
            this.insertNotification(title,body,link,adminId);
        }

        if(userDoc.isDonated){
            const titleForLearner = `${userDoc['last_name']} ${userDoc['name']} Thank you for joining the family`;
            const bodyForLearner = `We know that you donated and we love you, now you can get your id card`;
            const linkForUser = `/ID-CARD`;
            this.insertNotification(titleForLearner,bodyForLearner,linkForUser,userId);

        }

        if(!userDoc.isDonated){
            //Original Message below changed requested by client.
            // const titleForLearner = `Thank you for joining the family ${userDoc['last_name']} ${userDoc['name']}`;
            const titleForLearner = `Thank you for joining our church family.`;
            const bodyForLearner = `Get your ID card.`;
            const linkForUser = `/ID-CARD`;

            this.insertNotification(titleForLearner,bodyForLearner,linkForUser,userId);

        }

    }

    // working
    async insertCourseChangeRequestForAdmin(courseId,changeRequestId) {
        const courseDoc = await courseService.get(courseId); 

        const title = `The instructor ${courseDoc['author']['last_name']} ${courseDoc['author']['name']} request changes on the course ${courseDoc['name']}`;
        const body = `View the requested changes`;
        const link = `/courses/changes/${changeRequestId}`;

        for( const adminId of adminsIds){
            this.insertNotification(title,body,link,adminId);
        }


    }


    // working
    async insertProfileChangeForAdmin(userId,requestId){
        const userDoc = await userService.get(userId);

        const title = `The User ${userDoc['last_name']} ${userDoc['name']} request a profile change.`;
        const body = `View the requested changes`;
        const link = `/users/changes/${requestId}`;

        for( const adminId of adminsIds){
            this.insertNotification(title,body,link,adminId);
        }

    }

    // working
    async insertInstructorQuizModification(quizId) {

        const quizDoc = await quizService.get(quizId); 
        const userDoc = await userService.get(quizDoc['owner_id']); 

        const title = `The instructor ${userDoc['last_name']} ${userDoc['name']} had modified quiz for the course ${quizDoc['course']['name']}`;
        const body = `View new quiz`;
        const link = `/quizzes/view/${quizId}`;

        for( const adminId of adminsIds){
            this.insertNotification(title,body,link,adminId);
        }

    }
    // working
    async insertAdminQuizModification(quizId) {
        const quizDoc = await quizService.get(quizId); 
        const title = `The Admin modified the quiz for your ${quizDoc['course']['name']} course`;
        const body = `View new quiz`;
        const link = `/quizzes/view/${quizId}`;


        this.insertNotification(title,body,link,quizDoc['owner_id'].toString());
    }
    // working
    async insertSitepageAdminNotification(sitepageId) {
        const sitepageDoc = await sitepageService.get(sitepageId);
        const title = `The Admin modified the sitepage for your ${sitepageDoc['course']['name']} course`;
        const body = `View new sitepage`;
        const link = `/sitepages/view/${sitepageId}`;


        this.insertNotification(title,body,link,sitepageDoc['owner_id'].toString());
    }


    async getNotifications( req, res, next ){

        const ownerId = req.user._id.toString();
        const skip = Number(req.query.skip);

        try{
            const count = await Notification.count({'to':ownerId });
            const items = await Notification.find({'to':ownerId }).sort({'createdAt':-1}).skip(skip).limit(10);
            const rest = Math.max( count - (skip), 0 )
            
            const messages = {items,rest};
                userService.update(ownerId,{'unseen_notifications_count':0})
            global.io.of("/users").to(`notifications/${ownerId}`).emit('updated_notification',0);
            return res.status(200).json( new HttpResponse(messages));
        }catch(error){
            next(error);
        }
    }

    async seeNotification( req, res, next ){

        const notificationId = req.params.id;

        try{
            const response = await Notification.findByIdAndUpdate(notificationId,{'isSeen':false})
            return res.status(200).json( new HttpResponse({'isSeen':false}));
        }catch(error){
            next(error);
        }
    }
}
const notificationController = new NotificationController();

module.exports = {notificationController};
