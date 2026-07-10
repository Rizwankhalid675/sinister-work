function preMapFunction(options) {
  return options.data.map((d) => {
    
    var fullName = d.login.split(' ')
//Split the Name into firstname and Lastname by spaces.
    if (fullName.length <= 1) {
      d.FirstName = fullName.join('');
      d.LastName = '.';
    }
    else {
      d.FirstName = fullName.slice(0, -1).join(' ');
      d.LastName = fullName.slice(-1).join('');
    }
    return {
      data: d
    }
  })
}
