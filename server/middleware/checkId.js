const {isValidObjectId} = require("mongoose");

const checkId = (req, res, next) => {
    
    if(!isValidObjectId(req.params.id)) {
        return res.status(400).json({msg: "Invalid Id"});
    }
    

    next();
}


module.exports = checkId