const dynamicSort = (property) => {
    let sortOrder = 1;

    return function (a,b) {
        /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
    return 
}


const sortAlphaNum = (a, b) => a.localeCompare(b, 'en', { numeric: true })

module.exports = { sortAlphaNum, dynamicSort}