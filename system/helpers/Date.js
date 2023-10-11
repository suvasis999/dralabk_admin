const getDayStartEnd = ( day ) => {

    const start = new Date( day );

    start.setHours( 0, 0, 0, 0 );

    
    const end = new Date( day );

    end.setHours( 23, 59, 59, 999 );
    
    return { start, end };

};

const getPreviousDay = ( date = new Date() ) => {
    const previous = new Date( date.getTime() );

    previous.setDate( date.getDate() - 1 );
  
    return previous;
};

const dayMonthYear = ( d ) => {
    const parsedDate = new Date( d );

    const ye = new Intl.DateTimeFormat( 'en', { 'year': 'numeric' } ).format( parsedDate ),
        mo = new Intl.DateTimeFormat( 'en', { 'month': '2-digit' } ).format( parsedDate ),
        da = new Intl.DateTimeFormat( 'en', { 'day': '2-digit' } ).format( parsedDate );

    return `${ye}-${mo}-${da}`;
};


module.exports = { getDayStartEnd, getPreviousDay, dayMonthYear };
