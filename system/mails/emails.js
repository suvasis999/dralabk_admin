const acitvationMailData = (recieverEmail, tokenValue) => {
return  {
     from: '"SOTNAC Admin" <admin@spiritoftruthnativeamericanchurch.org>',// sender address
     to: recieverEmail,   // list of receivers
     subject: 'Activation email for SOTNAC',
     text: 'this link is temporary and should be used as fast as possible',
     html: `<b> To activate your Spirit of Truth NAC account please use code: ${ tokenValue }</b>`
    }

};


const forgetPasswordMailData = (recieverId,tokenValue) => {
    return {
        from: '"SOTNAC Admin" <admin@spiritoftruthnativeamericanchurch.org>',// sender address
        to: recieverEmail,   // list of receivers
        subject: 'Reset password email for SOTNAC',
        text: 'this link is temporary and should be used as fast as possible',
        html: `<b> your activation query param is ${ tokenValue} : </b>`
    };
};

module.exports = {acitvationMailData,forgetPasswordMailData}
